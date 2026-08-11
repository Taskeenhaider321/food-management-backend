import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
} from '../../admin-management/users/schemas/user.schema';
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
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';
import {
  assertActorMayAccessDepartmentId,
  assertActorMayAccessFoodSafetyRecord,
  foodSafetyCompanyDeleteFilter,
  withOwnScopeFilter,
  isGlobalFoodSafetyActor,
} from '../common/food-safety-tenant.util';

@Injectable()
export class HaccpTeamService {
  constructor(
    @InjectModel(HaccpTeam.name) private haccpTeamModel: Model<HaccpTeam>,
    @InjectModel(TeamMember.name) private teamMemberModel: Model<TeamMember>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private actorCompanyId(actor: any): string | undefined {
    return (
      actor?.companyId?._id?.toString() ||
      actor?.companyId?.toString() ||
      undefined
    );
  }

  private async companyDepartmentIds(actor: any): Promise<Types.ObjectId[]> {
    const companyId = this.actorCompanyId(actor);
    if (!companyId) return [];
    const depts = await this.departmentModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .select('_id')
      .lean();
    return depts.map((d: any) => d._id);
  }

  private departmentLabel(dept: any): string {
    if (!dept || typeof dept !== 'object') return '---';
    return asText(dept.departmentName || dept.shortName);
  }

  private memberNames(members: any[]): string {
    if (!Array.isArray(members) || members.length === 0) return '---';
    const names = members
      .map(
        (m) =>
          m?.fullName || m?.profileId?.userId?.name || m?.profileId?.fullName,
      )
      .filter(Boolean);
    return names.length ? names.join(', ') : String(members.length);
  }

  private mapHaccpTeamPdfRow(team: any) {
    const members = Array.isArray(team?.TeamMembers) ? team.TeamMembers : [];
    return {
      DocumentId: asText(team?.DocumentId),
      TeamName: asText(team?.TeamName),
      department: this.departmentLabel(
        team?.Department || team?.UserDepartment,
      ),
      DocumentType: asText(team?.DocumentType),
      Status: asText(team?.Status),
      members: this.memberNames(members),
      membersCount: String(members.length),
      CreatedBy: asText(team?.CreatedBy),
      CreationDate: formatDate(team?.CreationDate),
    };
  }

  async findAllForActor(actor: any) {
    const deptIds = await this.companyDepartmentIds(actor);
    const filter = withOwnScopeFilter(
      actor,
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {},
    );
    const teams = await this.haccpTeamModel
      .find(filter as any)
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      })
      .exec();
    return { status: true, data: teams };
  }

  async downloadHaccpTeamsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAllForActor(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'HACCP Teams Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'DocumentId', label: 'DOC ID', width: 1.2 },
        { key: 'TeamName', label: 'TEAM', width: 1.8 },
        { key: 'department', label: 'DEPT', width: 1.3 },
        { key: 'DocumentType', label: 'TYPE', width: 1.1 },
        { key: 'Status', label: 'STATUS', width: 1.2 },
        { key: 'members', label: 'MEMBERS', width: 1.8 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.2 },
        { key: 'CreationDate', label: 'CREATED', width: 1.1 },
      ],
      rows: (data || []).map((t) => this.mapHaccpTeamPdfRow(t)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('haccp-teams', 'directory'),
    };
  }

  async downloadHaccpTeamPdf(teamId: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: team } = await this.getHaccpTeam(teamId, actor);
    const row = this.mapHaccpTeamPdfRow(team);
    const members = Array.isArray((team as any)?.TeamMembers)
      ? (team as any).TeamMembers
      : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.TeamName !== '---' ? row.TeamName : 'HACCP Team',
      subtitle: row.DocumentId !== '---' ? row.DocumentId : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.DocumentId],
        ['Team Name', row.TeamName],
        ['Department', row.department],
        ['Document Type', row.DocumentType],
        ['Status', row.Status],
        ['Members', row.members],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
      sections: members.map((m: any, i: number) => ({
        heading: `Member ${i + 1}`,
        rows: [
          ['Full Name', asText(m?.fullName)],
          ['Designation', asText(m?.designation)],
          ['Role In Team', asText(m?.roleInTeam)],
          [
            'Training Attended',
            asText(
              Array.isArray(m?.trainingAttended)
                ? m.trainingAttended.join(', ')
                : m?.trainingAttended,
            ),
          ],
        ],
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.DocumentId || row.TeamName || 'haccp-team',
        'haccp-team',
      ),
    };
  }

  private resolveUserDepartmentId(
    userDepartment: unknown,
    fallbackDepartment?: string,
  ): Types.ObjectId {
    if (userDepartment instanceof Types.ObjectId) {
      return userDepartment;
    }
    if (
      typeof userDepartment === 'string' &&
      Types.ObjectId.isValid(userDepartment)
    ) {
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

  async createHaccpTeam(createDto: CreateHaccpTeamDto, actor?: any) {
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

    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        userDepartmentId.toString(),
      );

    const createdTeam = new this.haccpTeamModel({
      DocumentType: createDto.DocumentType,
      TeamName: createDto.teamName,
      Department: createDto.Department,
      UserDepartment: userDepartmentId,
      CreatedBy: requestUser.name,
      CreationDate: new Date(),
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
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
        const uploadResult =
          await this.cloudinaryService.uploadBuffer(outputBuffer);
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
      }),
    );

    await this.haccpTeamModel.findByIdAndUpdate(
      createdTeam._id,
      { TeamMembers: membersIds },
      { returnDocument: 'after' },
    );
    return {
      status: true,
      message: 'HACCP Team document created successfully',
      data: createdTeam,
    };
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

    pdfDoc
      .getPages()
      .slice(1)
      .forEach((page) => {
        const { width, height } = page.getSize();
        const extraSpace = 24;
        page.setSize(width, height + extraSpace);
        page.translateContent(0, -extraSpace);

        page.drawText('HACCP Team Member Document', {
          x:
            width / 2 -
            helveticaFont.widthOfTextAtSize('HACCP Team Member Document', 15) /
              2,
          y: height + extraSpace - 10,
          size: 15,
          color: rgb(0, 0, 0),
        });

        page.drawText(company.companyName, {
          x:
            width -
            helveticaFont.widthOfTextAtSize(company.companyName, 10) -
            20,
          y: height + extraSpace,
          size: 10,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Document ID : ${team.DocumentId}`, {
          x:
            width -
            helveticaFont.widthOfTextAtSize(
              `Document ID : ${team.DocumentId}`,
              10,
            ) -
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
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(company.companyName, 25) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: 25,
    });

    if (company.address) {
      page.drawText(company.address, {
        x:
          centerTextX -
          helveticaFont.widthOfTextAtSize(company.address, 25) / 2,
        y: height - 450,
        color: rgb(0, 0, 0),
        size: 25,
      });
    }

    page.drawText(`Created By : ${user.name}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(`Created By : ${user.name}`, 20) / 2,
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
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(`Document ID : ${documentId}`, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Revision No : ${revisionNo}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(`Revision No : ${revisionNo}`, 20) / 2,
      y: height - 620,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  async getAllHaccpTeams(departmentId: string, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    const teams = await this.haccpTeamModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
        }) as any,
      )
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    return { status: true, data: teams };
  }

  async getApprovedHaccpTeams(departmentId: string, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    const teams = await this.haccpTeamModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
          Status: 'Approved',
        }) as any,
      )
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    return { status: true, data: teams };
  }

  async getHaccpTeam(teamId: string, actor?: any) {
    const team = await this.haccpTeamModel
      .findById(teamId)
      .populate('UserDepartment')
      .populate('Department')
      .populate({
        path: 'TeamMembers',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    if (!team)
      throw new NotFoundException(
        `HACCP Team document with ID: ${teamId} not found`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    return { status: true, data: team };
  }

  async deleteHaccpTeam(teamId: string, actor?: any) {
    const team = await this.haccpTeamModel.findById(teamId);
    if (!team)
      throw new NotFoundException(
        `HACCP Team document with ID: ${teamId} not found`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    if (!canEditRecord(team)) {
      throw new BadRequestException(
        'Only records in review, rejected, or disapproved can be deleted',
      );
    }

    const deletedTeam = await this.haccpTeamModel.findByIdAndDelete(teamId);
    if (!deletedTeam)
      throw new NotFoundException(
        `HACCP Team document with ID: ${teamId} not found`,
      );

    for (const memberId of deletedTeam.TeamMembers) {
      await this.teamMemberModel.findByIdAndDelete(memberId);
    }

    return {
      status: true,
      message: 'HACCP Team document deleted successfully',
      data: deletedTeam,
    };
  }

  async deleteAllHaccpTeams(actor?: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    let filter: Record<string, unknown> = {};
    if (actor && !isGlobalFoodSafetyActor(actor)) {
      const deptIds = await this.companyDepartmentIds(actor);
      filter = foodSafetyCompanyDeleteFilter(actor, deptIds);
    }
    const result = await this.haccpTeamModel.deleteMany(filter);
    if (result.deletedCount === 0)
      throw new NotFoundException('No HACCP Team documents found to delete!');
    return {
      status: true,
      message: 'All HACCP Team documents have been deleted!',
      data: result,
    };
  }

  async reviewHaccpTeam(id: string, actorName: string, actor?: any) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    reviewRecord(team, actorName);
    const updated = await team.save();
    return {
      status: true,
      message: 'HACCP Team reviewed successfully',
      data: updated,
    };
  }

  async approveHaccpTeam(id: string, approvedBy: string, actor?: any) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    approveRecord(team, approvedBy);
    const updated = await team.save();
    return {
      status: true,
      message: 'The HaccpTeam has been marked as approved.',
      data: updated,
    };
  }

  async rejectHaccpTeam(
    id: string,
    actorName: string,
    reason: string,
    actor?: any,
  ) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    rejectRecord(team, actorName, reason);
    const updated = await team.save();
    return { status: true, message: 'HACCP Team rejected', data: updated };
  }

  async disapproveHaccpTeam(
    id: string,
    disapprovedBy: string,
    reason: string,
    actor?: any,
  ) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    disapproveRecord(team, disapprovedBy, reason);
    const updated = await team.save();
    return {
      status: true,
      message: 'The HaccpTeam has been marked as disapproved.',
      data: updated,
    };
  }

  async toggleHaccpTeamEnabled(id: string, actorName: string, actor?: any) {
    const team = await this.haccpTeamModel.findById(id);
    if (!team) throw new NotFoundException('HaccpTeam not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        team,
      );
    toggleEnabledRecord(team, actorName);
    const updated = await team.save();
    return {
      status: true,
      message: team.enabled ? 'HACCP Team enabled' : 'HACCP Team disabled',
      data: updated,
    };
  }
}
