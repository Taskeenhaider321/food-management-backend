import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../admin-management/users/schemas/user.schema';
import { HaccpTeam } from './schemas/haccp-team.schema';
import { TeamMember } from './schemas/team-member.schema';
import { CreateHaccpTeamDto } from './dtos/create-haccp-team.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';
import {
  approveRecord,
  canEditRecord,
  disapproveRecord,
  initCreatedTimeline,
  rejectRecord,
  reviewRecord,
  toggleEnabledRecord,
} from '../common/haccp-workflow.util';

@Injectable()
export class HaccpTeamService {
  constructor(
    @InjectModel(HaccpTeam.name) private haccpTeamModel: Model<HaccpTeam>,
    @InjectModel(TeamMember.name) private teamMemberModel: Model<TeamMember>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private resolveUserDepartmentId(
    userDepartment: unknown,
    fallbackDepartment?: string,
  ): Types.ObjectId {
    if (userDepartment instanceof Types.ObjectId) {
      return userDepartment;
    }
    if (typeof userDepartment === 'string' && Types.ObjectId.isValid(userDepartment)) {
      return new Types.ObjectId(userDepartment);
    }
    if (
      userDepartment &&
      typeof userDepartment === 'object' &&
      '_id' in userDepartment
    ) {
      return new Types.ObjectId(
        String((userDepartment as { _id: unknown })._id),
      );
    }
    if (fallbackDepartment && Types.ObjectId.isValid(fallbackDepartment)) {
      return new Types.ObjectId(fallbackDepartment);
    }
    throw new BadRequestException(
      'A department is required to create a HACCP team',
    );
  }

  async createHaccpTeam(createDto: CreateHaccpTeamDto) {
    const requestUser = await this.userModel
      .findById(createDto.userId)
      .populate('companyId')
      .populate('departmentId')
      .exec();
    if (!requestUser) {
      throw new NotFoundException('User not found');
    }

    const userDepartmentId = this.resolveUserDepartmentId(
      requestUser.departmentId,
      createDto.Department,
    );

    const createdTeam = new this.haccpTeamModel({
      DocumentType: createDto.DocumentType,
      TeamName: createDto.teamName,
      Department: createDto.Department,
      UserDepartment: userDepartmentId,
      CreatedBy: requestUser.name,
      CreationDate: new Date(),
    });
    initCreatedTimeline(createdTeam, requestUser.name);
    await createdTeam.save();

    // Process supporting documents
    if (createDto.files && createDto.files.length > 0) {
      for (const fileData of createDto.files) {
        const index = parseInt(fileData.fieldname.split('-')[1], 10);
        const outputBuffer = await this.prepareMemberDocument(
          fileData.buffer,
          fileData.mimetype,
          requestUser,
          createdTeam,
          0,
        );
        const uploadResult = await this.cloudinaryService.uploadBuffer(outputBuffer);
        createDto.TeamMembers[index].documentUrl = uploadResult;
      }
    }

    // Create team members
    const membersIds = await Promise.all(
      createDto.TeamMembers.map(async (member) => {
        const addedUser = new this.teamMemberModel({
          fullName: member.fullName,
          profileId: member.profileId || undefined,
          designation: member.designation,
          roleInTeam: member.roleInTeam,
          trainingAttended: member.trainingAttended ?? [],
          documentUrl: member.documentUrl,
        });
        await addedUser.save();
        return addedUser._id;
      })
    );

    await this.haccpTeamModel.findByIdAndUpdate(createdTeam._id, { TeamMembers: membersIds }, { returnDocument: 'after' });
    return { status: true, message: 'HACCP Team document created successfully', data: createdTeam };
  }

  private normalizeCompany(user: any) {
    const raw = user?.companyId;
    if (!raw || typeof raw !== 'object') {
      return {
        companyName: 'Company',
        address: '',
        companyLogo: '',
      };
    }
    return {
      companyName: raw.companyName || raw.CompanyName || 'Company',
      address: raw.address || raw.Address || '',
      companyLogo: raw.companyLogo || raw.CompanyLogo || '',
    };
  }

  private isValidHttpUrl(value?: string) {
    if (!value || typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async prepareMemberDocument(
    buffer: Buffer,
    mimetype: string | undefined,
    user: any,
    team: any,
    revisionNo: number,
  ): Promise<Buffer> {
    if (mimetype === 'application/pdf') {
      return this.processPdfWithWatermark(buffer, user, team, revisionNo);
    }
    return buffer;
  }

  private async processPdfWithWatermark(
    buffer: Buffer,
    user: any,
    team: any,
    revisionNo: number,
  ): Promise<Buffer> {
    const company = this.normalizeCompany(user);
    const pdfDoc = await PDFDocument.load(buffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let pdfLogoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    if (this.isValidHttpUrl(company.companyLogo)) {
      try {
        const response = await axios.get(company.companyLogo, {
          responseType: 'arraybuffer',
        });
        const logoImage = Buffer.from(response.data);
        const lowerLogo = company.companyLogo.toLowerCase();
        const isJpg =
          lowerLogo.includes('.jpeg') ||
          lowerLogo.includes('.jpg') ||
          lowerLogo.includes('image/jpeg');
        pdfLogoImage = isJpg
          ? await pdfDoc.embedJpg(logoImage)
          : await pdfDoc.embedPng(logoImage);
      } catch {
        pdfLogoImage = null;
      }
    }

    const firstPage = pdfDoc.insertPage(0);
    this.addFirstPage(
      firstPage,
      pdfLogoImage,
      helveticaFont,
      company,
      user,
      team.DocumentId,
      revisionNo,
    );

    pdfDoc.getPages().slice(1).forEach((page) => {
      const { width, height } = page.getSize();
      const extraSpace = 24;
      page.setSize(width, height + extraSpace);
      page.translateContent(0, -extraSpace);

      page.drawText('HACCP Team Member Document', {
        x:
          width / 2 -
          helveticaFont.widthOfTextAtSize('HACCP Team Member Document', 15) / 2,
        y: height + extraSpace - 10,
        size: 15,
        color: rgb(0, 0, 0),
      });

      page.drawText(company.companyName, {
        x: width - helveticaFont.widthOfTextAtSize(company.companyName, 10) - 20,
        y: height + extraSpace,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Document ID : ${team.DocumentId}`, {
        x:
          width -
          helveticaFont.widthOfTextAtSize(`Document ID : ${team.DocumentId}`, 10) -
          20,
        y: height + extraSpace - 12,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Revision No : ${revisionNo}`, {
        x:
          width -
          helveticaFont.widthOfTextAtSize(`Revision No : ${revisionNo}`, 10) -
          20,
        y: height + extraSpace - 24,
        size: 10,
        color: rgb(0, 0, 0),
      });
    });

    return Buffer.from(await pdfDoc.save());
  }

  private addFirstPage(
    page: any,
    logoImage: any,
    helveticaFont: any,
    company: { companyName: string; address: string },
    user: any,
    documentId: string,
    revisionNo: number,
  ) {
    const { width, height } = page.getSize();
    const centerTextX = width / 2;

    if (logoImage) {
      const logoDims = { width: 300, height: 300 };
      page.drawImage(logoImage, {
        x: centerTextX - logoDims.width / 2,
        y: height - 400,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    page.drawText(company.companyName, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.companyName, 25) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: 25,
    });

    if (company.address) {
      page.drawText(company.address, {
        x: centerTextX - helveticaFont.widthOfTextAtSize(company.address, 25) / 2,
        y: height - 450,
        color: rgb(0, 0, 0),
        size: 25,
      });
    }

    page.drawText(`Created By : ${user.name}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Created By : ${user.name}`, 20) / 2,
      y: height - 530,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Creation Date : ${new Date().toLocaleDateString('en-GB')}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(
          `Creation Date : ${new Date().toLocaleDateString('en-GB')}`,
          20,
        ) /
          2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Document ID : ${documentId}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Document ID : ${documentId}`, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Revision No : ${revisionNo}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Revision No : ${revisionNo}`, 20) / 2,
      y: height - 620,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  async getAllHaccpTeams(departmentId: string) {
    const teams = await this.haccpTeamModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    return { status: true, data: teams };
  }

  async getApprovedHaccpTeams(departmentId: string) {
    const teams = await this.haccpTeamModel
      .find({ UserDepartment: departmentId as any, Status: 'Approved' })
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    return { status: true, data: teams };
  }

  async getHaccpTeam(teamId: string) {
    const team = await this.haccpTeamModel
      .findById(teamId)
      .populate('UserDepartment')
      .populate('Department')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    if (!team) throw new NotFoundException(`HACCP Team document with ID: ${teamId} not found`);
    return { status: true, data: team };
  }

  async deleteHaccpTeam(teamId: string) {
    const team = await this.haccpTeamModel.findById(teamId);
    if (!team) throw new NotFoundException(`HACCP Team document with ID: ${teamId} not found`);
    if (!canEditRecord(team)) {
      throw new BadRequestException('Only records in review, rejected, or disapproved can be deleted');
    }

    const deletedTeam = await this.haccpTeamModel.findByIdAndDelete(teamId);
    if (!deletedTeam) throw new NotFoundException(`HACCP Team document with ID: ${teamId} not found`);
    
    // Delete team members
    for (const memberId of deletedTeam.TeamMembers) {
      await this.teamMemberModel.findByIdAndDelete(memberId);
    }
    
    return { status: true, message: 'HACCP Team document deleted successfully', data: deletedTeam };
  }

  async deleteAllHaccpTeams(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.haccpTeamModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No HACCP Team documents found to delete!');
    return { status: true, message: 'All HACCP Team documents have been deleted!', data: result };
  }

  async reviewHaccpTeam(id: string, actor: string) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    reviewRecord(team, actor);
    const updated = await team.save();
    return { status: true, message: 'HACCP Team reviewed successfully', data: updated };
  }

  async approveHaccpTeam(id: string, approvedBy: string) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    approveRecord(team, approvedBy);
    const updated = await team.save();
    return { status: true, message: 'The HaccpTeam has been marked as approved.', data: updated };
  }

  async rejectHaccpTeam(id: string, actor: string, reason: string) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    rejectRecord(team, actor, reason);
    const updated = await team.save();
    return { status: true, message: 'HACCP Team rejected', data: updated };
  }

  async disapproveHaccpTeam(id: string, disapprovedBy: string, reason: string) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    disapproveRecord(team, disapprovedBy, reason);
    const updated = await team.save();
    return { status: true, message: 'The HaccpTeam has been marked as disapproved.', data: updated };
  }

  async toggleHaccpTeamEnabled(id: string, actor: string) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    toggleEnabledRecord(team, actor);
    const updated = await team.save();
    return {
      status: true,
      message: team.enabled ? 'HACCP Team enabled' : 'HACCP Team disabled',
      data: updated,
    };
  }
}
