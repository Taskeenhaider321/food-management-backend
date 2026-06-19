import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTrainerDto } from './dtos/create-trainer.dto';
import { UpdateTrainerDto } from './dtos/update-trainer.dto';
import { UpdateUserDto } from '../../admin-management/users/dtos/update-user.dto';
import { normalizeRoleType } from '../../admin-management/users/dtos/user-core.dto';
import { UserRoleType } from '../../admin-management/users/schemas/user.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { EmailService } from '../../email/email.service';
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Trainer, TrainerDocument } from './schemas/trainer.schema';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import {
  User,
  UserDocument,
} from '../../admin-management/users/schemas/user.schema';
import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';
import {
  Training,
  TrainingDocument,
} from '../training/schemas/training.schema';

@Injectable()
export class TrainerService {
  constructor(
    @InjectModel(Trainer.name) private trainerModel: Model<TrainerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Training.name) private trainingModel: Model<TrainingDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  async create(
    createTrainerDto: CreateTrainerDto,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: TrainerDocument }> {
    const { user, profile, trainer, trainerDocumentUrl, applyTrainerDocumentBranding } =
      createTrainerDto;

    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const emailTaken = await this.userModel.findOne({
      email: user.email.toLowerCase(),
    });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const requestedTrainingIds = trainer.trainingIds ?? [];
    if (requestedTrainingIds.length > 0) {
      const trainingObjectIds = requestedTrainingIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException('One or more trainings are invalid');
        }
        return new Types.ObjectId(id);
      });
      const validTrainings = await this.trainingModel
        .find({
          _id: { $in: trainingObjectIds },
          companyId: new Types.ObjectId(companyId),
        })
        .select('_id')
        .lean();
      if (validTrainings.length !== trainingObjectIds.length) {
        throw new BadRequestException(
          'One or more selected trainings do not belong to your company',
        );
      }
    }

    const rawDocUrl = trainerDocumentUrl?.trim();
    let documentUrl: string | undefined;
    if (rawDocUrl) {
      if (applyTrainerDocumentBranding === true) {
        const company = await this.companyModel.findById(companyId).exec();
        if (!company) {
          throw new NotFoundException('Company not found');
        }
        let pdfBuffer: Buffer;
        try {
          const docRes = await axios.get(rawDocUrl, {
            responseType: 'arraybuffer',
          });
          pdfBuffer = Buffer.from(docRes.data);
        } catch {
          throw new BadRequestException(
            'Could not download trainer document from trainerDocumentUrl',
          );
        }
        const uploadedBy =
          typeof actor?.name === 'string' && actor.name.trim()
            ? actor.name.trim()
            : 'System';
        documentUrl = await this.processTrainerDocumentBuffer(
          pdfBuffer,
          company,
          uploadedBy,
        );
      } else {
        documentUrl = rawDocUrl;
      }
    }

    const profilePayload = {
      ...profile,
      docs: [
        ...(profile.docs ?? []),
        ...(documentUrl
          ? [{ label: 'Trainer document', url: documentUrl }]
          : []),
      ],
    };

    const savedTrainer = await this.profileService.withTransaction(
      async (session) => {
        const u = await this.userService.createUserRecord(
          {
            name: user.name,
            email: user.email,
            userName: user.userName,
            passwordPlain: user.password,
            roleType: UserRoleType.SUPER_ADMIN,
            companyId,
          },
          session,
        );

        const p = await this.profileService.createForUser(
          u._id,
          profilePayload,
          session,
        );

        const trainings =
          trainer.trainingIds?.map((id) => ({
            training: new Types.ObjectId(id),
          })) ?? [];

        const row = new this.trainerModel({
          profileId: p._id,
          specialities: trainer.specialities ?? [],
          trainings,
        });
        return row.save({ session });
      },
    );

    const populated = await this.trainerModel
      .findById(savedTrainer._id)
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId', 'roleId'],
        },
      })
      .populate('trainings.training')
      .exec();

    const udoc = populated?.profileId && (populated.profileId as any).userId;
    if (udoc) {
      await this.emailService.sendTrainerRegistrationEmail(
        udoc.email,
        udoc.name,
        udoc.userName,
        user.password,
      );
    }

    return { status: true, message: 'The Trainer is added!', data: populated! };
  }

  private resolveCompanyLogoUrl(company: any): string {
    const raw = company?.companyLogo ?? company?.CompanyLogo;
    return typeof raw === 'string' ? raw.trim() : '';
  }

  private isHttpUrl(s: string): boolean {
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async processTrainerDocumentBuffer(
    pdfBuffer: Buffer,
    company: any,
    uploadedBy: string,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const logoUrl = this.resolveCompanyLogoUrl(company);
    let pdfLogoImage: any;

    if (logoUrl && this.isHttpUrl(logoUrl)) {
      try {
        const response = await axios.get(logoUrl, {
          responseType: 'arraybuffer',
        });
        const logoImage = Buffer.from(response.data);
        try {
          pdfLogoImage = await pdfDoc.embedJpg(logoImage);
        } catch {
          pdfLogoImage = await pdfDoc.embedPng(logoImage);
        }
      } catch {
        pdfLogoImage = undefined;
      }
    }

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(
      firstPage,
      pdfLogoImage,
      company,
      uploadedBy,
      pdfDoc,
    );

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc
      .getPages()
      .slice(1)
      .forEach((page) => {
        const { width, height } = page.getSize();
        const extraSpace = 24;

        page.setSize(width, height + extraSpace);
        page.translateContent(0, -extraSpace);

        const watermarkText = 'Trainer Document';
        const watermarkFontSize = 15;
        const watermarkTextWidth = helveticaFont.widthOfTextAtSize(
          watermarkText,
          watermarkFontSize,
        );
        const centerWatermarkX = width / 2 - watermarkTextWidth / 2;
        const centerWatermarkY = height + extraSpace - 10;

        page.drawText(watermarkText, {
          x: centerWatermarkX,
          y: centerWatermarkY,
          size: watermarkFontSize,
          color: rgb(0, 0, 0),
        });

        const companyText = `${company.companyName ?? company.CompanyName ?? ''}`;
        const companyTextFontSize = 10;
        const companyTextWidth = helveticaFont.widthOfTextAtSize(
          companyText,
          companyTextFontSize,
        );
        const centerCompanyTextX = width - companyTextWidth - 20;
        const centerCompanyTextY = height + extraSpace;

        page.drawText(companyText, {
          x: centerCompanyTextX,
          y: centerCompanyTextY,
          size: companyTextFontSize,
          color: rgb(0, 0, 0),
        });
      });

    const modifiedPdfBuffer = Buffer.from(await pdfDoc.save());
    return this.cloudinaryService.uploadBuffer(modifiedPdfBuffer);
  }

  private async addFirstPage(
    page: any,
    logoImage: any,
    company: any,
    uploadedBy: string,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    const { width, height } = page.getSize();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const logoDims = { width: 300, height: 300 };
    const centerTextX = width / 2;

    const companyName = company.companyName ?? company.CompanyName ?? '';
    const phone = company.contactNo ?? company.PhoneNo ?? '';
    const email = company.email ?? company.Email ?? '';

    if (logoImage) {
      page.drawImage(logoImage, {
        x: centerTextX - logoDims.width / 2,
        y: height - 400,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    const fontSize = 25;
    let textY = logoImage ? height - 420 : height - 280;

    page.drawText(companyName, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(companyName, fontSize) / 2,
      y: textY,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    textY -= 30;
    const contactText = `Contact # ${phone}`;
    page.drawText(contactText, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(contactText, fontSize) / 2,
      y: textY,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    textY -= 30;
    page.drawText(email, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(email, fontSize) / 2,
      y: textY,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    const uploadByText = `Uploaded By : ${uploadedBy}`;
    page.drawText(uploadByText, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(uploadByText, 20) / 2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });

    const uploadDateText = `Uploaded Date : ${new Date().toLocaleDateString('en-GB')}`;
    page.drawText(uploadDateText, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(uploadDateText, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  /** Trainer profile linked to the signed-in user, if any. */
  async findMe(actor: any): Promise<{
    status: boolean;
    message: string;
    data: TrainerDocument | null;
  }> {
    const userId = actor?._id;
    if (!userId) {
      throw new BadRequestException('User context is required');
    }

    const profile = await this.profileModel
      .findOne({ userId })
      .select('_id')
      .lean();
    if (!profile) {
      return { status: true, message: 'No trainer profile', data: null };
    }

    const trainer = await this.trainerModel
      .findOne({ profileId: profile._id })
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId', 'roleId'],
        },
      })
      .populate('trainings.training')
      .exec();

    return {
      status: true,
      message: trainer ? 'Trainer profile found' : 'No trainer profile',
      data: trainer,
    };
  }

  /**
   * Trainers whose user belongs to the actor's company (or all for super-admin).
   */
  async findAllForCompany(actor: any): Promise<{
    status: boolean;
    message: string;
    data: TrainerDocument[];
  }> {
    const trainers = await this.trainerModel
      .find()
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId', 'roleId'],
        },
      })
      .populate('trainings.training')
      .sort({ createdAt: -1 })
      .exec();
    return {
      status: true,
      message: 'The Following are the Trainers!',
      data: trainers,
    };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{ status: boolean; message: string; data: TrainerDocument[] }> {
    const users = await this.userModel
      .find({ departmentId })
      .select('_id')
      .lean();
    const userIds = users.map((u) => u._id);
    const profiles = await this.profileModel
      .find({ userId: { $in: userIds } })
      .select('_id')
      .lean();
    const profileIds = profiles.map((p) => p._id);

    const trainers = await this.trainerModel
      .find({ profileId: { $in: profileIds } })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['departmentId'] },
      })
      .populate('trainings.training')
      .exec();

    return {
      status: true,
      message: 'The Following are the Trainers!',
      data: trainers,
    };
  }

  async update(
    id: string,
    dto: UpdateTrainerDto,
    actor?: unknown,
  ): Promise<{ status: boolean; message: string; data: TrainerDocument }> {
    const existing = await this.trainerModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('This Trainer is Not found!');
    }

    const populated = await this.trainerModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId', 'roleId'] },
      })
      .exec();

    const profileDoc = populated?.profileId as ProfileDocument | undefined;
    const userDoc = profileDoc?.userId as UserDocument | undefined;

    if (dto.user && userDoc) {
      const u = dto.user;
      const updatePayload: UpdateUserDto = {};
      if (u.name !== undefined) updatePayload.name = u.name;
      if (u.email !== undefined) updatePayload.email = u.email;
      if (u.userName !== undefined) updatePayload.userName = u.userName;
      if (u.password !== undefined) updatePayload.password = u.password;
      if (u.roleId !== undefined) updatePayload.roleId = u.roleId;
      if (u.roleType !== undefined) {
        updatePayload.roleType = normalizeRoleType(u.roleType) as UserRoleType;
      }
      if (Object.keys(updatePayload).length > 0) {
        await this.userService.update(String(userDoc._id), updatePayload, actor);
      }
    }

    if (dto.profile && profileDoc) {
      const p = dto.profile;
      const $set: Record<string, unknown> = {};
      if (p.avatar !== undefined) $set.avatar = p.avatar;
      if (p.DOB !== undefined) $set.DOB = new Date(p.DOB);
      if (p.phoneNo !== undefined) $set.phoneNo = p.phoneNo;
      if (p.address !== undefined) $set.address = p.address;
      if (p.identity !== undefined) $set.identity = p.identity;
      if (p.qualification !== undefined) $set.qualification = p.qualification;
      if (p.experience !== undefined) $set.experience = p.experience;
      if (p.skills !== undefined) $set.skills = p.skills;
      if (p.docs !== undefined) {
        $set.docs = p.docs.map((d) => ({
          ...d,
          // uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : undefined,
        }));
      }
      if (Object.keys($set).length > 0) {
        await this.profileModel.findByIdAndUpdate(profileDoc._id, $set).exec();
      }
    }

    if (dto.trainer) {
      const t = dto.trainer;
      const trainerUpdate: Record<string, unknown> = {};
      if (t.specialities !== undefined) trainerUpdate.specialities = t.specialities;
      if (t.trainingIds !== undefined) {
        trainerUpdate.trainings = t.trainingIds.map((tid) => ({
          training: new Types.ObjectId(tid),
        }));
      }
      if (Object.keys(trainerUpdate).length > 0) {
        await this.trainerModel.findByIdAndUpdate(id, trainerUpdate).exec();
      }
    }

    const data = await this.trainerModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId', 'roleId'] },
      })
      .populate('trainings.training')
      .exec();

    return { status: true, message: 'The Trainer is updated!', data: data! };
  }

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const trainer = await this.trainerModel.findById(id);
    if (!trainer) {
      throw new NotFoundException('This Trainer is Not found!');
    }
    await this.trainerModel.deleteOne({ _id: trainer._id });
    return { status: true, message: 'The following Trainer has been Deleted!' };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.trainerModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Trainers Found to Delete!');
    }
    return { status: true, message: 'All Trainers have been Deleted!' };
  }
}
