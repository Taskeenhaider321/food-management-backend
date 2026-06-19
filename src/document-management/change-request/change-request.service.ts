import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChangeRequest,
  ChangeRequestDocument,
} from './schemas/change-request.schema';
import {
  CreateChangeRequestDto,
  DisapproveChangeRequestDto,
  UpdateChangeRequestDto,
} from './dtos/create-change-request.dto';

import { actorDisplayName } from '../common/document-id.util';

const DOCUMENT_POPULATE = {
  path: 'document',
  select: 'documentId name formName documentType status creationMethod fileUrl fileName editorContent description questions',
};

@Injectable()
export class ChangeRequestService {
  constructor(
    @InjectModel(ChangeRequest.name)
    private readonly changeRequestModel: Model<ChangeRequestDocument>,
    @InjectModel('Document') private readonly documentModel: Model<any>,
    @InjectModel('ListOfForms') private readonly listOfFormsModel: Model<any>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  private async nextRequestNumber(): Promise<string> {
    const latest = await this.changeRequestModel
      .findOne({}, { requestNumber: 1 })
      .sort({ created_at: -1 })
      .lean();
    let next = 1;
    if (latest?.requestNumber) {
      const numeric = parseInt(latest.requestNumber.replace(/^CR/i, ''), 10);
      if (!Number.isNaN(numeric)) next = numeric + 1;
    }
    return `CR${next.toString().padStart(3, '0')}`;
  }

  private async resolveTarget(documentId: string, documentModel: string) {
    const model =
      documentModel === 'ListOfForms'
        ? this.listOfFormsModel
        : this.documentModel;
    const target = await model.findById(documentId).lean();
    if (!target) {
      throw new NotFoundException('Selected document not found');
    }
    if (!target.documentId) {
      throw new BadRequestException(
        'The selected document has no generated Document ID',
      );
    }
    return target;
  }

  async create(dto: CreateChangeRequestDto, actor: any) {
    const target = await this.resolveTarget(dto.document, dto.documentModel);
    const userName = actorDisplayName(actor);
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const changeRequest = new this.changeRequestModel({
      requestNumber: await this.nextRequestNumber(),
      companyId: companyId
        ? new Types.ObjectId(companyId)
        : (target.companyId ?? undefined),
      document: new Types.ObjectId(dto.document),
      documentModel: dto.documentModel,
      documentRef: target.documentId,
      documentName: target.name || target.formName || target.documentId,
      changeReason: dto.changeReason,
      status: 'Request Pending',
      createdBy: userName,
      timeline: [
        {
          action: 'Request Created',
          status: 'Request Pending',
          user: userName,
          at: new Date(),
          reason: dto.changeReason,
        },
      ],
    });

    const saved = await changeRequest.save();
    return {
      status: true,
      message: 'Change request created successfully',
      data: saved,
    };
  }

  async findAll(actor: any) {
    const requests = await this.changeRequestModel
      .find(this.companyScopedFilter(actor))
      .populate(DOCUMENT_POPULATE)
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: requests };
  }

  async findById(id: string) {
    const request = await this.changeRequestModel
      .findById(id)
      .populate(DOCUMENT_POPULATE)
      .exec();
    if (!request) throw new NotFoundException('Change request not found');
    return { status: true, data: request };
  }

  async update(id: string, dto: UpdateChangeRequestDto, actor: any) {
    const request = await this.changeRequestModel.findById(id);
    if (!request) throw new NotFoundException('Change request not found');

    if (request.status === 'Approved') {
      throw new BadRequestException(
        'Approved change requests cannot be modified',
      );
    }

    const userName = actorDisplayName(actor);

    if (dto.document && dto.documentModel) {
      const target = await this.resolveTarget(dto.document, dto.documentModel);
      request.document = new Types.ObjectId(dto.document);
      request.documentModel = dto.documentModel;
      request.documentRef = target.documentId;
      request.documentName =
        target.name || target.formName || target.documentId;
    }
    if (dto.changeReason !== undefined) {
      request.changeReason = dto.changeReason;
    }

    const resubmitted = request.status === 'Disapproved';
    request.status = 'Request Pending';
    request.reason = undefined;
    request.updatedBy = userName;
    request.timeline.push({
      action: resubmitted ? 'Resubmitted' : 'Updated',
      status: 'Request Pending',
      user: userName,
      at: new Date(),
    } as any);

    const saved = await request.save();
    return {
      status: true,
      message: resubmitted
        ? 'Change request resubmitted successfully'
        : 'Change request updated successfully',
      data: saved,
    };
  }

  async approve(id: string, actor: any) {
    const request = await this.changeRequestModel.findById(id);
    if (!request) throw new NotFoundException('Change request not found');

    if (request.status !== 'Request Pending') {
      throw new BadRequestException(
        'Only pending change requests can be approved',
      );
    }

    const userName = actorDisplayName(actor);
    request.status = 'Approved';
    request.timeline.push({
      action: 'Approved',
      status: 'Approved',
      user: userName,
      at: new Date(),
    } as any);

    await request.save();
    return {
      status: true,
      message: 'Change request approved successfully',
      data: request,
    };
  }

  async disapprove(id: string, dto: DisapproveChangeRequestDto, actor: any) {
    const request = await this.changeRequestModel.findById(id);
    if (!request) throw new NotFoundException('Change request not found');

    if (request.status !== 'Request Pending') {
      throw new BadRequestException(
        'Only pending change requests can be disapproved',
      );
    }

    const userName = actorDisplayName(actor);
    request.status = 'Disapproved';
    request.reason = dto.reason;
    request.timeline.push({
      action: 'Disapproved',
      status: 'Disapproved',
      user: userName,
      at: new Date(),
      reason: dto.reason,
    } as any);

    await request.save();
    return {
      status: true,
      message: 'Change request disapproved',
      data: request,
    };
  }
}
