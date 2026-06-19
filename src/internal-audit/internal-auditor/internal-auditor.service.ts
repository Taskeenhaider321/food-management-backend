import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAuditorDto } from './dtos/create-auditor.dto';
import { UpdateAuditorDto } from './dtos/update-auditor.dto';
import {
  AddAccountCredentialsDto,
  ResetAccountCredentialsDto,
} from './dtos/account-credentials.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { EmailService } from '../../email/email.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';
import {
  InternalAuditor,
  InternalAuditorDocument,
} from './schemas/internal-auditor.schema';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import { User, UserDocument } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileDocument } from '../../admin-management/profile/schemas/profile.schema';

@Injectable()
export class InternalAuditorService {
  constructor(
    @InjectModel(InternalAuditor.name)
    private internalAuditorModel: Model<InternalAuditorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  async addAuditor(createDto: CreateAuditorDto, files: Record<string, Express.Multer.File[] | undefined>) {
    const { actorUserId, user, profile, auditor } = createDto;

    if (!user.companyId) {
      throw new BadRequestException('user.companyId is required');
    }

    const requestUser = await this.userModel
      .findById(actorUserId)
      .populate('companyId')
      .populate('departmentId')
      .exec();
    if (!requestUser) {
      throw new NotFoundException('Actor user not found');
    }

    const existing = await this.userModel.findOne({ userName: user.userName });
    if (existing) {
      throw new BadRequestException('Username already exists!');
    }

    const emailTaken = await this.userModel.findOne({ email: user.email.toLowerCase() });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    let auditorImageUrl: string | undefined;
    const supportingDocUrls: string[] = [];
    const approvalDocUrls: string[] = [];

    if (files['AuditorImage']?.[0]) {
      auditorImageUrl = await this.cloudinaryService.uploadFile(files['AuditorImage'][0]);
    }

    if (files['SupportingDocuments']) {
      for (const file of files['SupportingDocuments']) {
        supportingDocUrls.push(
          await this.uploadWithOptionalWatermark(file, requestUser, 'Auditor Supporting Document'),
        );
      }
    }

    if (files['ApprovalDocuments']) {
      for (const file of files['ApprovalDocuments']) {
        approvalDocUrls.push(
          await this.uploadWithOptionalWatermark(file, requestUser, 'Approved Auditor Document'),
        );
      }
    }

    const profilePayload = {
      ...profile,
      avatar: auditorImageUrl ?? profile.avatar,
      docs: [
        ...(profile.docs ?? []),
        ...supportingDocUrls.map((url) => ({ label: 'Supporting document', url })),
      ],
    };

    const row = await this.profileService.withTransaction(async (session) => {
      const u = await this.userService.createUserRecord(
        {
          name: user.name,
          email: user.email,
          userName: user.userName,
          passwordPlain: user.password,
          roleType: 'super-admin',
          companyId: user.companyId!,
          departmentId: user.departmentId,
        },
        session,
      );

      const p = await this.profileService.createForUser(u._id, profilePayload, session);

      const ia = new this.internalAuditorModel({
        profileId: p._id,
        departmentId: user.departmentId ? new Types.ObjectId(user.departmentId) : undefined,
        roleInTeam: auditor.roleInTeam,
        experience: auditor.experience,
        skills: auditor.skills ?? [],
        education: auditor.education,
        supportingDocuments: supportingDocUrls,
        isApprovedAuditor: auditor.isApprovedAuditor ?? false,
        approvalDocuments: approvalDocUrls,
        approvedAuditorLetter: auditor.approvedAuditorLetter,
        createdBy: actorUserId,
      });
      return ia.save({ session });
    });

    const populated = await this.internalAuditorModel
      .findById(row._id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId')
      .exec();

    const udoc = populated?.profileId && (populated.profileId as any).userId;
    if (udoc) {
      const emailBody = `Dear ${udoc.name},

Your auditor account has been created successfully.

Username: ${udoc.userName}
Password: ${user.password}

Please login and change your password.

Best regards,
Food Safety Quality Team`;

      try {
        await this.emailService.sendEmail(udoc.email, 'Auditor Registration Confirmation', emailBody);
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }

    return { status: true, message: 'The Auditor is added!', data: populated };
  }

  async updateAuditor(updateDto: UpdateAuditorDto, files?: Record<string, Express.Multer.File[] | undefined>) {
    const auditor = await this.internalAuditorModel.findById(updateDto._id);
    if (!auditor) throw new NotFoundException('Auditor not found');

    const updateData: any = {};
    if (updateDto.roleInTeam) updateData.roleInTeam = updateDto.roleInTeam;
    if (updateDto.experience !== undefined) updateData.experience = updateDto.experience;
    if (updateDto.skills) updateData.skills = updateDto.skills;
    if (updateDto.education !== undefined) updateData.education = updateDto.education;
    if (updateDto.isApprovedAuditor !== undefined) updateData.isApprovedAuditor = updateDto.isApprovedAuditor;

    // ── Personal information lives on the linked Profile / User documents ──
    const profileUpdate: any = {};
    if (updateDto.designation !== undefined) profileUpdate.designation = updateDto.designation;
    if (updateDto.age !== undefined) profileUpdate.age = updateDto.age;
    if (updateDto.phoneNo !== undefined) profileUpdate.phoneNo = updateDto.phoneNo;

    if (files?.['AuditorImage']?.[0]) {
      profileUpdate.avatar = await this.cloudinaryService.uploadFile(files['AuditorImage'][0]);
    }

    if (Object.keys(profileUpdate).length > 0) {
      await this.profileModel.findByIdAndUpdate(auditor.profileId, profileUpdate);
    }

    if (updateDto.name || updateDto.email) {
      const profile = await this.profileModel.findById(auditor.profileId);
      if (profile) {
        const userUpdate: any = {};
        if (updateDto.name) userUpdate.name = updateDto.name;
        if (updateDto.email) {
          const emailTaken = await this.userModel.findOne({
            email: updateDto.email.toLowerCase(),
            _id: { $ne: profile.userId },
          });
          if (emailTaken) throw new ConflictException('Email already in use');
          userUpdate.email = updateDto.email.toLowerCase();
        }
        await this.userModel.findByIdAndUpdate(profile.userId, userUpdate);
      }
    }

    if (files?.['SupportingDocuments']) {
      const urls: string[] = [];
      for (const file of files['SupportingDocuments']) {
        const url = await this.cloudinaryService.uploadFile(file);
        urls.push(url);
      }
      updateData.supportingDocuments = [...(auditor.supportingDocuments || []), ...urls];
    }

    if (files?.['ApprovalDocuments']) {
      const urls: string[] = [];
      for (const file of files['ApprovalDocuments']) {
        const url = await this.cloudinaryService.uploadFile(file);
        urls.push(url);
      }
      updateData.approvalDocuments = [...(auditor.approvalDocuments || []), ...urls];
    }

    const updated = await this.internalAuditorModel
      .findByIdAndUpdate(updateDto._id, updateData, { returnDocument: 'after' })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId');

    return { status: true, message: 'Auditor updated successfully!', data: updated };
  }

  async getAuditorById(auditorId: string) {
    const auditor = await this.internalAuditorModel
      .findById(auditorId)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId')
      .exec();
    if (!auditor) throw new NotFoundException('Auditor not found');
    return { status: true, message: 'Auditor profile retrieved!', data: auditor };
  }

  async toggleStatus(auditorId: string) {
    const auditor = await this.internalAuditorModel.findById(auditorId);
    if (!auditor) throw new NotFoundException('Auditor not found');

    auditor.isEnabled = !auditor.isEnabled;
    await auditor.save();

    return {
      status: true,
      message: `Auditor has been ${auditor.isEnabled ? 'enabled' : 'disabled'}!`,
      data: auditor,
    };
  }

  async addAccountCredentials(dto: AddAccountCredentialsDto) {
    const auditor = await this.internalAuditorModel.findById(dto.auditorId).populate('profileId');
    if (!auditor) throw new NotFoundException('Auditor not found');

    const profile = auditor.profileId as any;
    if (!profile) throw new NotFoundException('Auditor profile not found');

    const existingUser = await this.userModel.findOne({ userName: dto.userName });
    if (existingUser) throw new ConflictException('Username already taken');

    await this.userModel.findByIdAndUpdate(profile.userId, {
      userName: dto.userName,
      password: dto.password,
    });

    return { status: true, message: 'Account credentials added successfully!' };
  }

  async resetAccountCredentials(dto: ResetAccountCredentialsDto) {
    const auditor = await this.internalAuditorModel.findById(dto.auditorId).populate('profileId');
    if (!auditor) throw new NotFoundException('Auditor not found');

    const profile = auditor.profileId as any;
    if (!profile) throw new NotFoundException('Auditor profile not found');

    const existingUser = await this.userModel.findOne({
      userName: dto.newUserName,
      _id: { $ne: profile.userId },
    });
    if (existingUser) throw new ConflictException('Username already taken');

    await this.userService.resetCredentials(profile.userId, dto.newUserName, dto.newPassword);

    return { status: true, message: 'Account credentials reset successfully!' };
  }

  async readAuditor(departmentId: string) {
    const auditors = await this.internalAuditorModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['departmentId'] },
      })
      .populate('departmentId')
      .exec();

    return { status: true, message: 'The Following are the Auditors!', data: auditors };
  }

  async deleteAuditor(id: string) {
    const auditor = await this.internalAuditorModel.findById(id);
    if (!auditor) throw new NotFoundException('This Auditor is Not found!');

    await this.profileService.withTransaction(async (session) => {
      await this.internalAuditorModel.deleteOne({ _id: auditor._id }).session(session);
      const profile = await this.profileModel.findById(auditor.profileId).session(session);
      if (profile) {
        await this.userModel.deleteOne({ _id: profile.userId }).session(session);
        await this.profileModel.deleteOne({ _id: profile._id }).session(session);
      }
    });

    return { status: true, message: 'The following Auditor has been Deleted!', data: auditor };
  }

  async deleteAllAuditors(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.internalAuditorModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No Auditors Found to Delete!');
    return { status: true, message: 'All Auditors have been Deleted!', data: result };
  }

  /** Watermarking only works for PDFs with a configured company logo; fall back to a plain upload otherwise. */
  private async uploadWithOptionalWatermark(
    file: Express.Multer.File,
    actor: any,
    watermarkText: string,
  ): Promise<string> {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname?.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const modifiedPdf = await this.processPdfWithWatermark(file.buffer, actor, watermarkText);
        return await this.cloudinaryService.uploadBuffer(modifiedPdf);
      } catch (error) {
        console.error('PDF watermarking failed, uploading original file:', error);
      }
    }
    return this.cloudinaryService.uploadFile(file);
  }

  private async processPdfWithWatermark(buffer: Buffer, actor: any, watermarkText: string): Promise<Buffer> {
    const company = actor.companyId as any;
    const response = await axios.get(company.CompanyLogo, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(buffer);
    const logoImage = Buffer.from(response.data);
    const isJpg = company.CompanyLogo.includes('.jpeg') || company.CompanyLogo.includes('.jpg');
    const pdfLogoImage = isJpg ? await pdfDoc.embedJpg(logoImage) : await pdfDoc.embedPng(logoImage);

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(firstPage, pdfLogoImage, company, actor);

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc.getPages().slice(1).forEach((page) => {
      const { width, height } = page.getSize();
      const extraSpace = 24;
      page.setSize(width, height + extraSpace);
      page.translateContent(0, -extraSpace);

      page.drawText(watermarkText, {
        x: width / 2 - helveticaFont.widthOfTextAtSize(watermarkText, 15) / 2,
        y: height + extraSpace - 10,
        size: 15,
        color: rgb(0, 0, 0),
      });

      page.drawText(company.CompanyName, {
        x: width - helveticaFont.widthOfTextAtSize(company.CompanyName, 10) - 20,
        y: height + extraSpace,
        size: 10,
        color: rgb(0, 0, 0),
      });
    });

    return Buffer.from(await pdfDoc.save());
  }

  private async addFirstPage(page: any, logoImage: any, company: any, user: any) {
    const { width, height } = page.getSize();
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const logoDims = { width: 300, height: 300 };
    const centerTextX = width / 2;

    page.drawImage(logoImage, {
      x: centerTextX - logoDims.width / 2,
      y: height - 400,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawText(company.CompanyName, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.CompanyName, 25) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: 25,
    });

    page.drawText(company.Address, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.Address, 25) / 2,
      y: height - 450,
      color: rgb(0, 0, 0),
      size: 25,
    });

    page.drawText(`Uploaded By : ${user.name}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Uploaded By : ${user.name}`, 20) / 2,
      y: height - 530,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Uploaded Date : ${new Date().toLocaleDateString('en-GB')}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Uploaded Date : ${new Date().toLocaleDateString('en-GB')}`, 20) / 2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }
}
