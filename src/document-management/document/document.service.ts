import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Document, DocumentDocument } from './schemas/document.schema';
import {
  ActionReasonDto,
  CreateDocumentDto,
  UpdateDocumentDto,
} from './dtos/create-document.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

import {
  actorDisplayName,
  generateDocumentId,
} from '../common/document-id.util';

const DEPARTMENT_POPULATE = {
  path: 'departments',
  select: 'departmentName shortName departmentCode',
};

export function parseDepartmentIds(raw?: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // fall through to comma parsing
    }
  }
  return trimmed
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,
    @InjectModel('Department')
    private readonly departmentModel: Model<any>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  private async getOrFail(id: string) {
    const document = await this.documentModel.findById(id);
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async create(
    dto: CreateDocumentDto,
    file: Express.Multer.File | undefined,
    actor: any,
  ) {
    const departmentIds = parseDepartmentIds(dto.departments);
    if (departmentIds.length === 0) {
      throw new BadRequestException('Select at least one department');
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (dto.creationMethod === 'upload') {
      if (!file) {
        throw new BadRequestException('A file is required to upload a document');
      }
      fileUrl = await this.cloudinaryService.uploadFile(file);
      fileName = file.originalname;
    } else if (!dto.editorContent?.trim()) {
      throw new BadRequestException('Document content is required');
    }

    const { documentId, companyId } = await generateDocumentId(
      this.departmentModel,
      this.documentModel,
      departmentIds[0],
      dto.documentType,
    );

    const userName = actorDisplayName(actor);
    const document = new this.documentModel({
      documentId,
      companyId,
      name: dto.name,
      documentType: dto.documentType,
      departments: departmentIds.map((id) => new Types.ObjectId(id)),
      creationMethod: dto.creationMethod,
      fileUrl,
      fileName,
      editorContent:
        dto.creationMethod === 'editor' ? dto.editorContent : undefined,
      status: 'In Review',
      createdBy: userName,
      timeline: [
        { action: 'Created', status: 'In Review', user: userName, at: new Date() },
      ],
    });

    const saved = await document.save();
    const populated = await saved.populate(DEPARTMENT_POPULATE);
    return {
      status: true,
      message: 'Document created successfully',
      data: populated,
    };
  }

  async findAll(actor: any) {
    const documents = await this.documentModel
      .find(this.companyScopedFilter(actor))
      .populate(DEPARTMENT_POPULATE)
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: documents };
  }

  async findById(id: string) {
    const document = await this.documentModel
      .findById(id)
      .populate(DEPARTMENT_POPULATE)
      .populate({ path: 'versions.departments', select: 'departmentName shortName' })
      .exec();
    if (!document) throw new NotFoundException('Document not found');
    return { status: true, data: document };
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    file: Express.Multer.File | undefined,
    actor: any,
  ) {
    const document = await this.getOrFail(id);

    if (document.status === 'Reviewed' || document.status === 'Approved') {
      throw new BadRequestException(
        'Reviewed or approved documents cannot be modified',
      );
    }

    const trackChanges =
      document.status === 'Rejected' || document.status === 'Disapproved';
    const userName = actorDisplayName(actor);

    const previous = {
      revisionNo: document.revisionNo,
      name: document.name,
      documentType: document.documentType,
      departments: [...document.departments],
      editorContent: document.editorContent,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
    };

    const changedFields: string[] = [];

    if (dto.name !== undefined && dto.name !== document.name) {
      document.name = dto.name;
      changedFields.push('Document Name');
    }
    if (
      dto.documentType !== undefined &&
      dto.documentType !== document.documentType
    ) {
      document.documentType = dto.documentType;
      changedFields.push('Document Type');
    }
    if (dto.departments !== undefined) {
      const departmentIds = parseDepartmentIds(dto.departments);
      if (departmentIds.length === 0) {
        throw new BadRequestException('Select at least one department');
      }
      const next = departmentIds.map(String).sort().join(',');
      const current = document.departments.map(String).sort().join(',');
      if (next !== current) {
        document.departments = departmentIds.map(
          (deptId) => new Types.ObjectId(deptId),
        );
        changedFields.push('Departments');
      }
    }
    if (
      document.creationMethod === 'editor' &&
      dto.editorContent !== undefined &&
      dto.editorContent !== document.editorContent
    ) {
      document.editorContent = dto.editorContent;
      changedFields.push('Document Content');
    }
    if (file) {
      document.fileUrl = await this.cloudinaryService.uploadFile(file);
      document.fileName = file.originalname;
      changedFields.push('Document File');
    }

    document.updatedBy = userName;

    if (trackChanges) {
      document.versions.push({
        ...previous,
        changedFields:
          changedFields.length > 0 ? changedFields : ['No fields changed'],
        changedBy: userName,
        changedAt: new Date(),
      } as any);
      document.revisionNo += 1;
      document.status = 'In Review';
      document.reason = undefined;
      document.timeline.push({
        action: 'Resubmitted',
        status: 'In Review',
        user: userName,
        at: new Date(),
      } as any);
    }

    const saved = await document.save();
    const populated = await saved.populate(DEPARTMENT_POPULATE);
    return {
      status: true,
      message: trackChanges
        ? 'Document updated and resubmitted for review'
        : 'Document updated successfully',
      data: populated,
    };
  }

  async review(id: string, actor: any) {
    const document = await this.getOrFail(id);
    if (document.status !== 'In Review') {
      throw new BadRequestException(
        'Only documents in review can be marked as reviewed',
      );
    }

    const userName = actorDisplayName(actor);
    document.status = 'Reviewed';
    document.timeline.push({
      action: 'Reviewed',
      status: 'Reviewed',
      user: userName,
      at: new Date(),
    } as any);

    await document.save();
    return { status: true, message: 'Document reviewed successfully', data: document };
  }

  async approve(id: string, actor: any) {
    const document = await this.getOrFail(id);
    if (document.status !== 'Reviewed') {
      throw new BadRequestException(
        'Only reviewed documents can be approved',
      );
    }

    const userName = actorDisplayName(actor);
    document.status = 'Approved';
    document.timeline.push({
      action: 'Approved',
      status: 'Approved',
      user: userName,
      at: new Date(),
    } as any);

    await document.save();
    return { status: true, message: 'Document approved successfully', data: document };
  }

  async reject(id: string, dto: ActionReasonDto, actor: any) {
    const document = await this.getOrFail(id);
    if (document.status !== 'In Review' && document.status !== 'Reviewed') {
      throw new BadRequestException(
        'Only documents in review or reviewed can be rejected',
      );
    }

    const userName = actorDisplayName(actor);
    document.status = 'Rejected';
    document.reason = dto.reason;
    document.timeline.push({
      action: 'Rejected',
      status: 'Rejected',
      user: userName,
      at: new Date(),
      reason: dto.reason,
    } as any);

    await document.save();
    return { status: true, message: 'Document rejected', data: document };
  }

  async disapprove(id: string, dto: ActionReasonDto, actor: any) {
    const document = await this.getOrFail(id);
    if (document.status !== 'Approved') {
      throw new BadRequestException(
        'Only approved documents can be disapproved',
      );
    }

    const userName = actorDisplayName(actor);
    document.status = 'Disapproved';
    document.reason = dto.reason;
    document.timeline.push({
      action: 'Disapproved',
      status: 'Disapproved',
      user: userName,
      at: new Date(),
      reason: dto.reason,
    } as any);

    await document.save();
    return { status: true, message: 'Document disapproved', data: document };
  }

  async toggleEnabled(id: string, actor: any) {
    const document = await this.getOrFail(id);
    if (document.status !== 'Reviewed' && document.status !== 'Approved') {
      throw new BadRequestException(
        'Only reviewed or approved documents can be enabled or disabled',
      );
    }

    const userName = actorDisplayName(actor);
    document.enabled = !document.enabled;
    document.timeline.push({
      action: document.enabled ? 'Enabled' : 'Disabled',
      status: document.status,
      user: userName,
      at: new Date(),
    } as any);

    await document.save();
    return {
      status: true,
      message: `Document ${document.enabled ? 'enabled' : 'disabled'} successfully`,
      data: document,
    };
  }
}
