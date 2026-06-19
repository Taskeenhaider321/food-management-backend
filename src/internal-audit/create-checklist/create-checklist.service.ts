import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Checklist } from './schemas/checklist.schema';
import { ChecklistQuestion } from './schemas/checklist-question.schema';
import { ResponseGroup } from './schemas/response-group.schema';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { ApproveChecklistDto } from './dtos/approve-checklist.dto';
import { DisapproveChecklistDto } from './dtos/disapprove-checklist.dto';
import { ReviewChecklistDto } from './dtos/review-checklist.dto';
import { RejectChecklistDto } from './dtos/reject-checklist.dto';
import { CreateResponseGroupDto, UpdateResponseGroupDto } from './dtos/response-group.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class CreateChecklistService {
  constructor(
    @InjectModel(Checklist.name) private checklistModel: Model<Checklist>,
    @InjectModel(ChecklistQuestion.name) private checklistQuestionModel: Model<ChecklistQuestion>,
    @InjectModel(ResponseGroup.name) private responseGroupModel: Model<ResponseGroup>,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ─── Checklist CRUD ────────────────────────────────────────────────

  async addChecklist(createDto: CreateChecklistDto) {
    const questionsIds: Types.ObjectId[] = [];
    for (let idx = 0; idx < createDto.ChecklistQuestions.length; idx++) {
      const q = createDto.ChecklistQuestions[idx];
      const doc = new this.checklistQuestionModel({
        questionText: q.questionText,
        description: q.description,
        Required: q.Required ?? false,
        responseGroup: q.responseGroup ? new Types.ObjectId(q.responseGroup) : undefined,
        ComplianceType: q.ComplianceType,
        order: q.order ?? idx,
      });
      const saved = await doc.save();
      questionsIds.push(saved._id as Types.ObjectId);
    }

    const checklist = new this.checklistModel({
      title: createDto.title,
      description: createDto.description,
      DocumentType: createDto.DocumentType,
      Department: createDto.Department,
      Departments: createDto.Departments ?? [createDto.Department],
      CreatedBy: createDto.createdBy,
      CreationDate: new Date(),
      ChecklistQuestions: questionsIds,
      UserDepartment: createDto.departmentId,
      Status: 'In Review',
      settings: createDto.settings ?? {},
      statusTimeline: [
        {
          status: 'In Review',
          userName: createDto.createdBy,
          date: new Date(),
        },
      ],
    });

    await checklist.save();
    return { status: true, message: 'The checklist is added!', data: checklist };
  }

  async getChecklists(departmentId: string) {
    const checklists = await this.checklistModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department Departments UserDepartment')
      .populate({ path: 'ChecklistQuestions', model: 'ChecklistQuestion', populate: { path: 'responseGroup' } });
    return { status: true, message: 'The following are Checklists!', data: checklists };
  }

  async getChecklistById(checklistId: string) {
    const checklist = await this.checklistModel
      .findById(checklistId)
      .populate('Department Departments UserDepartment')
      .populate({ path: 'ChecklistQuestions', model: 'ChecklistQuestion', populate: { path: 'responseGroup' } });
    if (!checklist) throw new NotFoundException('Checklist not found');
    return { status: true, message: 'Checklist retrieved!', data: checklist };
  }

  async updateChecklist(updateDto: UpdateChecklistDto) {
    const currentChecklist = await this.checklistModel.findById(updateDto._id);
    if (!currentChecklist) throw new NotFoundException('Checklist not found');

    const allowedEditStatuses = ['In Review', 'Rejected', 'Disapproved'];
    if (!allowedEditStatuses.includes(currentChecklist.Status)) {
      throw new BadRequestException(
        `Cannot edit checklist in "${currentChecklist.Status}" status. Only editable when In Review, Rejected, or Disapproved.`,
      );
    }

    const isAfterRejection = currentChecklist.Status === 'Rejected' || currentChecklist.Status === 'Disapproved';

    let questionsIds: any = currentChecklist.ChecklistQuestions;
    if (updateDto.ChecklistQuestions) {
      const newIds: Types.ObjectId[] = [];
      for (let idx = 0; idx < updateDto.ChecklistQuestions.length; idx++) {
        const { _id, ...q } = updateDto.ChecklistQuestions[idx];
        const doc = new this.checklistQuestionModel({
          questionText: q.questionText,
          description: q.description,
          Required: q.Required ?? false,
          responseGroup: q.responseGroup ? new Types.ObjectId(q.responseGroup) : undefined,
          ComplianceType: q.ComplianceType,
          order: q.order ?? idx,
        });
        const saved = await doc.save();
        newIds.push(saved._id as Types.ObjectId);
      }
      questionsIds = newIds;
    }

    const updatedData: any = {
      ChecklistQuestions: questionsIds,
      UpdatedBy: updateDto.updatedBy,
      UpdationDate: new Date(),
    };

    if (updateDto.title) updatedData.title = updateDto.title;
    if (updateDto.description !== undefined) updatedData.description = updateDto.description;
    if (updateDto.settings) updatedData.settings = { ...currentChecklist.settings, ...updateDto.settings };

    if (isAfterRejection) {
      updatedData.RevisionNo = currentChecklist.RevisionNo + 1;
      updatedData.Status = 'In Review';

      const versionEntries: any[] = [];
      if (updateDto.title && updateDto.title !== currentChecklist.title) {
        versionEntries.push({
          field: 'title',
          previousValue: currentChecklist.title,
          updatedValue: updateDto.title,
          modifiedBy: updateDto.updatedBy,
          dateTime: new Date(),
        });
      }
      if (updateDto.ChecklistQuestions) {
        versionEntries.push({
          field: 'ChecklistQuestions',
          previousValue: `${currentChecklist.ChecklistQuestions.length} questions`,
          updatedValue: `${updateDto.ChecklistQuestions.length} questions`,
          modifiedBy: updateDto.updatedBy,
          dateTime: new Date(),
        });
      }
      if (versionEntries.length > 0) {
        updatedData.$push = { versionHistory: { $each: versionEntries } };
      }

      updatedData.$push = {
        ...(updatedData.$push || {}),
        statusTimeline: {
          status: 'In Review',
          userName: updateDto.updatedBy,
          date: new Date(),
          reason: 'Resubmitted after revision',
        },
      };
    }

    const updated = await this.checklistModel.findByIdAndUpdate(
      updateDto._id,
      updatedData,
      { returnDocument: 'after' },
    );
    return { status: true, message: 'The checklist is updated!', data: updated };
  }

  async deleteChecklist(id: string) {
    const deleted = await this.checklistModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Checklist not found');
    return { status: true, message: 'The checklist is deleted!', data: deleted };
  }

  async deleteAllChecklists(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.checklistModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No Checklists Found to Delete!');
    return { status: true, message: 'All Checklists have been Deleted!', data: result };
  }

  // ─── Approval Workflow ─────────────────────────────────────────────

  async reviewChecklist(dto: ReviewChecklistDto) {
    const checklist = await this.checklistModel.findById(dto.id);
    if (!checklist) throw new NotFoundException('Checklist not found');
    if (checklist.Status !== 'In Review') {
      throw new BadRequestException('Checklist can only be reviewed from "In Review" status');
    }

    checklist.Status = 'Reviewed';
    checklist.ReviewedBy = dto.reviewedBy;
    checklist.ReviewDate = new Date();
    checklist.statusTimeline.push({
      status: 'Reviewed',
      userName: dto.reviewedBy,
      date: new Date(),
    });

    await checklist.save();
    return { status: true, message: 'Checklist has been marked as Reviewed.', data: checklist };
  }

  async approveChecklist(approveDto: ApproveChecklistDto) {
    const checklist = await this.checklistModel.findById(approveDto.id);
    if (!checklist) throw new NotFoundException('Checklist not found');
    if (checklist.Status !== 'Reviewed') {
      throw new BadRequestException('Checklist can only be approved from "Reviewed" status');
    }

    checklist.Status = 'Approved';
    checklist.ApprovedBy = approveDto.approvedBy;
    checklist.ApprovalDate = new Date();
    checklist.statusTimeline.push({
      status: 'Approved',
      userName: approveDto.approvedBy,
      date: new Date(),
    });

    await checklist.save();
    return { status: true, message: 'The Checklist has been approved.', data: checklist };
  }

  async rejectChecklist(rejectDto: RejectChecklistDto) {
    const checklist = await this.checklistModel.findById(rejectDto.id);
    if (!checklist) throw new NotFoundException('Checklist not found');
    if (!['In Review', 'Reviewed'].includes(checklist.Status)) {
      throw new BadRequestException('Checklist can only be rejected from "In Review" or "Reviewed" status');
    }

    checklist.Status = 'Rejected';
    checklist.RejectedBy = rejectDto.rejectedBy;
    checklist.RejectionDate = new Date();
    checklist.Reason = rejectDto.Reason;
    checklist.statusTimeline.push({
      status: 'Rejected',
      userName: rejectDto.rejectedBy,
      date: new Date(),
      reason: rejectDto.Reason,
    });

    await checklist.save();
    return { status: true, message: 'The Checklist has been rejected.', data: checklist };
  }

  async disapproveChecklist(disapproveDto: DisapproveChecklistDto) {
    const checklist = await this.checklistModel.findById(disapproveDto.id);
    if (!checklist) throw new NotFoundException('Checklist not found');
    if (checklist.Status !== 'Approved') {
      throw new BadRequestException('Checklist can only be disapproved from "Approved" status');
    }

    checklist.Status = 'Disapproved';
    checklist.DisapprovedBy = disapproveDto.disapprovedBy;
    checklist.DisapprovalDate = new Date();
    checklist.Reason = disapproveDto.Reason;
    checklist.statusTimeline.push({
      status: 'Disapproved',
      userName: disapproveDto.disapprovedBy,
      date: new Date(),
      reason: disapproveDto.Reason,
    });

    await checklist.save();
    return { status: true, message: 'The Checklist has been disapproved.', data: checklist };
  }

  // ─── Enable / Disable ─────────────────────────────────────────────

  async toggleChecklistStatus(checklistId: string) {
    const checklist = await this.checklistModel.findById(checklistId);
    if (!checklist) throw new NotFoundException('Checklist not found');

    const currentEnabled = checklist.settings?.isEnabled ?? true;
    checklist.settings = { ...checklist.settings, isEnabled: !currentEnabled } as any;
    await checklist.save();

    return {
      status: true,
      message: `Checklist has been ${!currentEnabled ? 'enabled' : 'disabled'}!`,
      data: checklist,
    };
  }

  // ─── Settings / Banner ─────────────────────────────────────────────

  async updateSettings(checklistId: string, settings: any) {
    const checklist = await this.checklistModel.findById(checklistId);
    if (!checklist) throw new NotFoundException('Checklist not found');

    checklist.settings = { ...checklist.settings, ...settings } as any;
    await checklist.save();

    return { status: true, message: 'Checklist settings updated!', data: checklist };
  }

  async uploadBanner(checklistId: string, file: Express.Multer.File) {
    const checklist = await this.checklistModel.findById(checklistId);
    if (!checklist) throw new NotFoundException('Checklist not found');

    const url = await this.cloudinaryService.uploadFile(file);
    checklist.settings = { ...checklist.settings, bannerImage: url } as any;
    await checklist.save();

    return { status: true, message: 'Banner uploaded!', data: checklist };
  }

  // ─── Shareable Link ────────────────────────────────────────────────

  async generateShareableLink(checklistId: string) {
    const checklist = await this.checklistModel.findById(checklistId);
    if (!checklist) throw new NotFoundException('Checklist not found');

    const link = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/checklist/view/${randomUUID()}`;
    checklist.settings = { ...checklist.settings, shareableLink: link } as any;
    await checklist.save();

    return { status: true, message: 'Shareable link generated!', data: { link, checklist } };
  }

  // ─── Timeline & Version History ────────────────────────────────────

  async getTimeline(checklistId: string) {
    const checklist = await this.checklistModel.findById(checklistId).select('statusTimeline');
    if (!checklist) throw new NotFoundException('Checklist not found');
    return { status: true, message: 'Status timeline retrieved!', data: checklist.statusTimeline };
  }

  async getVersionHistory(checklistId: string) {
    const checklist = await this.checklistModel.findById(checklistId).select('versionHistory');
    if (!checklist) throw new NotFoundException('Checklist not found');
    return { status: true, message: 'Version history retrieved!', data: checklist.versionHistory };
  }

  // ─── Response Groups ───────────────────────────────────────────────

  async createResponseGroup(dto: CreateResponseGroupDto) {
    const options = [
      ...dto.options,
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ];

    const group = new this.responseGroupModel({
      name: dto.name,
      options,
      isDefault: false,
      UserDepartment: dto.departmentId,
      CreatedBy: dto.createdBy,
    });

    await group.save();
    return { status: true, message: 'Response group created!', data: group };
  }

  async getResponseGroups() {
    const groups = await this.responseGroupModel.find().exec();
    return { status: true, message: 'Response groups retrieved!', data: groups };
  }

  async updateResponseGroup(dto: UpdateResponseGroupDto) {
    const group = await this.responseGroupModel.findById(dto._id);
    if (!group) throw new NotFoundException('Response group not found');
    if (group.isDefault) throw new BadRequestException('Cannot edit default response groups');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.options) {
      const hasNA = dto.options.some((o) => o.label === 'N/A');
      updateData.options = hasNA
        ? dto.options
        : [...dto.options, { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' }];
    }

    const updated = await this.responseGroupModel.findByIdAndUpdate(dto._id, updateData, { returnDocument: 'after' });
    return { status: true, message: 'Response group updated!', data: updated };
  }

  async deleteResponseGroup(id: string) {
    const group = await this.responseGroupModel.findById(id);
    if (!group) throw new NotFoundException('Response group not found');
    if (group.isDefault) throw new BadRequestException('Cannot delete default response groups');

    await this.responseGroupModel.findByIdAndDelete(id);
    return { status: true, message: 'Response group deleted!' };
  }
}
