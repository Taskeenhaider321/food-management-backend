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
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

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
    @InjectModel('Company')
    private readonly companyModel: Model<any>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId =
      actor?.companyId?._id?.toString() || actor?.companyId?.toString();
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
        {
          action: 'Created',
          status: 'In Review',
          user: userName,
          at: new Date(),
        },
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
    const wasChangeRequest = form.status === 'Change Request';
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
      throw new BadRequestException(
        'Document type cannot be changed after creation',
      );
    }
    if (dto.departments !== undefined) {
      const next = dto.departments.map(String).sort().join(',');
      const current = form.departments.map(String).sort().join(',');
      if (next !== current) {
        throw new BadRequestException(
          'Departments cannot be changed after creation',
        );
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
    } else if (wasChangeRequest) {
      form.status = 'In Review';
      form.timeline.push({
        action: 'Updated',
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
        : wasChangeRequest
          ? 'Form updated and submitted for review'
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

  private departmentNames(form: any): string {
    return asText(
      (form?.departments || [])
        .map((d: any) => d?.departmentName || d?.shortName || '')
        .filter(Boolean),
    );
  }

  private mapFormPdfRow(form: any) {
    const questions = Array.isArray(form?.questions) ? form.questions : [];
    return {
      documentId: asText(form?.documentId),
      formName: asText(form?.formName),
      documentType: asText(form?.documentType),
      status: asText(form?.status),
      revisionNo: asText(form?.revisionNo ?? 0),
      departments: this.departmentNames(form),
      questionCount: String(questions.length),
    };
  }

  async downloadFormsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAll(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Forms Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'documentId', label: 'DOC ID', width: 1.8 },
        { key: 'formName', label: 'FORM NAME', width: 2 },
        { key: 'documentType', label: 'TYPE', width: 1.2 },
        { key: 'status', label: 'STATUS', width: 1.2 },
        { key: 'revisionNo', label: 'REV', width: 0.8 },
        { key: 'departments', label: 'DEPARTMENTS', width: 1.8 },
        { key: 'questionCount', label: 'QUESTIONS', width: 1 },
      ],
      rows: (data || []).map((f) => this.mapFormPdfRow(f)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('forms', 'directory'),
    };
  }

  async downloadFormPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const form = await this.listOfFormsModel
      .findById(id)
      .populate(DEPARTMENT_POPULATE)
      .exec();
    if (!form) throw new NotFoundException('Form not found');

    const row = this.mapFormPdfRow(form);
    const questions = Array.isArray(form.questions) ? form.questions : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.formName !== '---' ? row.formName : 'Form',
      subtitle: row.documentId !== '---' ? row.documentId : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.documentId],
        ['Form Name', row.formName],
        ['Document Type', row.documentType],
        ['Status', row.status],
        ['Revision No', row.revisionNo],
        ['Departments', row.departments],
        ['Question Count', row.questionCount],
      ],
      sections:
        questions.length > 0
          ? [
              {
                heading: 'Questions',
                rows: questions.map((q: any, index: number) => [
                  `Q${index + 1} (${asText(q?.questionType)})`,
                  asText(q?.questionText),
                ]),
              },
            ]
          : undefined,
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.formName || row.documentId || 'form',
        'form',
      ),
    };
  }
}
