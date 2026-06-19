import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ListOfForms } from './schemas/list-of-forms.schema';
import {
  CreateListOfFormsDto,
  FormActionReasonDto,
  UpdateListOfFormsDto,
} from './dtos/create-list-of-forms.dto';

import {
  actorDisplayName,
  generateDocumentId,
} from '../common/document-id.util';

const DEPARTMENT_POPULATE = {
  path: 'departments',
  select: 'departmentName shortName departmentCode',
};

@Injectable()
export class ListOfFormsService {
  constructor(
    @InjectModel(ListOfForms.name)
    private readonly listOfFormsModel: Model<ListOfForms>,
    @InjectModel('Department')
    private readonly departmentModel: Model<any>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  private async getOrFail(id: string) {
    const form = await this.listOfFormsModel.findById(id);
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  private normalizeQuestions(questions: CreateListOfFormsDto['questions']) {
    return questions.map((question, index) => ({
      ...question,
      required: question.required ?? false,
      order: question.order ?? index,
    }));
  }

  async create(dto: CreateListOfFormsDto, actor: any) {
    const { documentId, companyId } = await generateDocumentId(
      this.departmentModel,
      this.listOfFormsModel,
      dto.departments[0],
      dto.documentType,
    );

    const userName = actorDisplayName(actor);
    const form = new this.listOfFormsModel({
      documentId,
      companyId,
      formName: dto.formName,
      description: dto.description,
      documentType: dto.documentType,
      departments: dto.departments.map((id) => new Types.ObjectId(id)),
      maintenanceFrequency: dto.maintenanceFrequency,
      customSettings: dto.customSettings,
      questions: this.normalizeQuestions(dto.questions),
      status: 'In Review',
      createdBy: userName,
      timeline: [
        { action: 'Created', status: 'In Review', user: userName, at: new Date() },
      ],
    });

    const saved = await form.save();
    const populated = await saved.populate(DEPARTMENT_POPULATE);
    return {
      status: true,
      message: 'Form created successfully',
      data: populated,
    };
  }

  async findAll(actor: any) {
    const forms = await this.listOfFormsModel
      .find(this.companyScopedFilter(actor))
      .populate(DEPARTMENT_POPULATE)
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: forms };
  }

  async findById(id: string) {
    const form = await this.listOfFormsModel
      .findById(id)
      .populate(DEPARTMENT_POPULATE)
      .exec();
    if (!form) throw new NotFoundException('Form not found');
    return { status: true, data: form };
  }

  async update(id: string, dto: UpdateListOfFormsDto, actor: any) {
    const form = await this.getOrFail(id);

    if (form.status === 'Reviewed' || form.status === 'Approved') {
      throw new BadRequestException(
        'Reviewed or approved forms cannot be modified',
      );
    }

    const trackChanges =
      form.status === 'Rejected' || form.status === 'Disapproved';
    const userName = actorDisplayName(actor);

    const previous = {
      revisionNo: form.revisionNo,
      formName: form.formName,
      description: form.description,
      maintenanceFrequency: form.maintenanceFrequency,
      questions: form.toObject().questions ?? [],
    };

    const changedFields: string[] = [];

    if (dto.formName !== undefined && dto.formName !== form.formName) {
      form.formName = dto.formName;
      changedFields.push('Form Name');
    }
    if (dto.description !== undefined && dto.description !== form.description) {
      form.description = dto.description;
      changedFields.push('Description');
    }
    if (
      dto.documentType !== undefined &&
      dto.documentType !== form.documentType
    ) {
      form.documentType = dto.documentType;
      changedFields.push('Document Type');
    }
    if (dto.departments !== undefined) {
      const next = dto.departments.map(String).sort().join(',');
      const current = form.departments.map(String).sort().join(',');
      if (next !== current) {
        form.departments = dto.departments.map(
          (deptId) => new Types.ObjectId(deptId),
        );
        changedFields.push('Departments');
      }
    }
    if (
      dto.maintenanceFrequency !== undefined &&
      dto.maintenanceFrequency !== form.maintenanceFrequency
    ) {
      form.maintenanceFrequency = dto.maintenanceFrequency;
      changedFields.push('Maintenance Frequency');
    }
    if (dto.customSettings !== undefined) {
      form.customSettings = dto.customSettings as any;
      changedFields.push('Custom Settings');
    }
    if (dto.questions !== undefined) {
      form.set('questions', this.normalizeQuestions(dto.questions));
      changedFields.push('Questions');
    }

    form.updatedBy = userName;

    if (trackChanges) {
      form.versions.push({
        ...previous,
        changedFields:
          changedFields.length > 0 ? changedFields : ['No fields changed'],
        changedBy: userName,
        changedAt: new Date(),
      } as any);
      form.revisionNo += 1;
      form.status = 'In Review';
      form.reason = undefined;
      form.timeline.push({
        action: 'Resubmitted',
        status: 'In Review',
        user: userName,
        at: new Date(),
      } as any);
    }

    const saved = await form.save();
    const populated = await saved.populate(DEPARTMENT_POPULATE);
    return {
      status: true,
      message: trackChanges
        ? 'Form updated and resubmitted for review'
        : 'Form updated successfully',
      data: populated,
    };
  }

  async review(id: string, actor: any) {
    const form = await this.getOrFail(id);
    if (form.status !== 'In Review') {
      throw new BadRequestException(
        'Only forms in review can be marked as reviewed',
      );
    }

    const userName = actorDisplayName(actor);
    form.status = 'Reviewed';
    form.timeline.push({
      action: 'Reviewed',
      status: 'Reviewed',
      user: userName,
      at: new Date(),
    } as any);

    await form.save();
    return { status: true, message: 'Form reviewed successfully', data: form };
  }

  async approve(id: string, actor: any) {
    const form = await this.getOrFail(id);
    if (form.status !== 'Reviewed') {
      throw new BadRequestException('Only reviewed forms can be approved');
    }

    const userName = actorDisplayName(actor);
    form.status = 'Approved';
    form.timeline.push({
      action: 'Approved',
      status: 'Approved',
      user: userName,
      at: new Date(),
    } as any);

    await form.save();
    return { status: true, message: 'Form approved successfully', data: form };
  }

  async reject(id: string, dto: FormActionReasonDto, actor: any) {
    const form = await this.getOrFail(id);
    if (form.status !== 'In Review' && form.status !== 'Reviewed') {
      throw new BadRequestException(
        'Only forms in review or reviewed can be rejected',
      );
    }

    const userName = actorDisplayName(actor);
    form.status = 'Rejected';
    form.reason = dto.reason;
    form.timeline.push({
      action: 'Rejected',
      status: 'Rejected',
      user: userName,
      at: new Date(),
      reason: dto.reason,
    } as any);

    await form.save();
    return { status: true, message: 'Form rejected', data: form };
  }

  async disapprove(id: string, dto: FormActionReasonDto, actor: any) {
    const form = await this.getOrFail(id);
    if (form.status !== 'Approved') {
      throw new BadRequestException('Only approved forms can be disapproved');
    }

    const userName = actorDisplayName(actor);
    form.status = 'Disapproved';
    form.reason = dto.reason;
    form.timeline.push({
      action: 'Disapproved',
      status: 'Disapproved',
      user: userName,
      at: new Date(),
      reason: dto.reason,
    } as any);

    await form.save();
    return { status: true, message: 'Form disapproved', data: form };
  }

  async toggleEnabled(id: string, actor: any) {
    const form = await this.getOrFail(id);
    if (form.status !== 'Reviewed' && form.status !== 'Approved') {
      throw new BadRequestException(
        'Only reviewed or approved forms can be enabled or disabled',
      );
    }

    const userName = actorDisplayName(actor);
    form.enabled = !form.enabled;
    form.timeline.push({
      action: form.enabled ? 'Enabled' : 'Disabled',
      status: form.status,
      user: userName,
      at: new Date(),
    } as any);

    await form.save();
    return {
      status: true,
      message: `Form ${form.enabled ? 'enabled' : 'disabled'} successfully`,
      data: form,
    };
  }
}
