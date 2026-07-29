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
  ChangeRequestTargetModel,
} from './schemas/change-request.schema';
import {
  CreateChangeRequestDto,
  DisapproveChangeRequestDto,
  UpdateChangeRequestDto,
} from './dtos/create-change-request.dto';

import { actorDisplayName } from '../common/document-id.util';
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';
import { HaccpTeam } from '../../food-safety/haccp-team/schemas/haccp-team.schema';

const DOCUMENT_POPULATE = {
  path: 'document',
  select:
    'documentId name formName documentType status creationMethod fileUrl fileName editorContent description questions DocumentId TeamName ProcessName ProductDetails',
};

type TargetModelConfig = {
  model: Model<any>;
  idField: 'documentId' | 'DocumentId';
  resolveName: (target: any) => string;
  pendingStatus: string;
  approvedStatus: string;
  disapprovedStatus: string;
  statusField: 'status' | 'Status';
  hasTimeline: boolean;
  category: string;
};

const TARGET_CATEGORY_LABELS: Record<ChangeRequestTargetModel, string> = {
  Document: 'Document',
  ListOfForms: 'Form',
  HaccpTeam: 'HACCP Team',
  Processes: 'Flow Diagram',
  Product: 'Product',
  ConductHaccp: 'Risk Assessment',
  DecisionTree: 'Decision Tree',
  FoodSafety: 'Food Safety Plan',
};

@Injectable()
export class ChangeRequestService {
  constructor(
    @InjectModel(ChangeRequest.name)
    private readonly changeRequestModel: Model<ChangeRequestDocument>,
    @InjectModel('Document') private readonly documentModel: Model<any>,
    @InjectModel('ListOfForms') private readonly listOfFormsModel: Model<any>,
    @InjectModel(HaccpTeam.name) private readonly haccpTeamModel: Model<any>,
    @InjectModel('Processes') private readonly processesModel: Model<any>,
    @InjectModel('Product') private readonly productModel: Model<any>,
    @InjectModel('ConductHaccp') private readonly conductHaccpModel: Model<any>,
    @InjectModel('DecisionTree') private readonly decisionTreeModel: Model<any>,
    @InjectModel('FoodSafety') private readonly foodSafetyModel: Model<any>,
    @InjectModel('Company') private readonly companyModel: Model<any>,
    @InjectModel('Department') private readonly departmentModel: Model<any>,
  ) {}

  private targetConfig(documentModel: string): TargetModelConfig {
    const configs: Record<ChangeRequestTargetModel, TargetModelConfig> = {
      Document: {
        model: this.documentModel,
        idField: 'documentId',
        resolveName: (target) => target.name || target.documentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.Document,
      },
      ListOfForms: {
        model: this.listOfFormsModel,
        idField: 'documentId',
        resolveName: (target) => target.formName || target.documentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.ListOfForms,
      },
      HaccpTeam: {
        model: this.haccpTeamModel,
        idField: 'DocumentId',
        resolveName: (target) => target.TeamName || target.DocumentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.HaccpTeam,
      },
      Processes: {
        model: this.processesModel,
        idField: 'DocumentId',
        resolveName: (target) => target.ProcessName || target.DocumentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.Processes,
      },
      Product: {
        model: this.productModel,
        idField: 'DocumentId',
        resolveName: (target) =>
          target.ProductDetails?.Name || target.DocumentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.Product,
      },
      ConductHaccp: {
        model: this.conductHaccpModel,
        idField: 'DocumentId',
        resolveName: (target) => target.DocumentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.ConductHaccp,
      },
      DecisionTree: {
        model: this.decisionTreeModel,
        idField: 'DocumentId',
        resolveName: (target) => target.DocumentId,
        pendingStatus: 'In Review',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: true,
        category: TARGET_CATEGORY_LABELS.DecisionTree,
      },
      FoodSafety: {
        model: this.foodSafetyModel,
        idField: 'DocumentId',
        resolveName: (target) => target.DocumentId,
        pendingStatus: 'Pending',
        approvedStatus: 'Approved',
        disapprovedStatus: 'Disapproved',
        statusField: 'Status',
        hasTimeline: false,
        category: TARGET_CATEGORY_LABELS.FoodSafety,
      },
    };

    const config = configs[documentModel as ChangeRequestTargetModel];
    if (!config) {
      throw new BadRequestException(`Unsupported document model: ${documentModel}`);
    }
    return config;
  }

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId =
      actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  private actorCompanyId(actor: any): string | undefined {
    return (
      actor?.companyId?._id?.toString() || actor?.companyId?.toString() || undefined
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

  private foodSafetyDepartmentFilter(
    deptIds: Types.ObjectId[],
  ): Record<string, unknown> {
    return deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {};
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
    const config = this.targetConfig(documentModel);
    const target = await config.model.findById(documentId).lean();
    if (!target) {
      throw new NotFoundException('Selected document not found');
    }
    const ref = target[config.idField];
    if (!ref) {
      throw new BadRequestException(
        'The selected document has no generated Document ID',
      );
    }
    return { target, config, documentRef: ref as string };
  }

  private assertTargetIsApproved(
    target: any,
    config: TargetModelConfig,
  ): void {
    const currentStatus = target[config.statusField];
    if (currentStatus !== config.approvedStatus) {
      throw new BadRequestException(
        'Change requests can only be created against approved documents',
      );
    }
  }

  private async syncTargetStatusWithChangeRequest(
    documentId: string,
    documentModel: string,
    actor: any,
    outcome: 'pending' | 'approved' | 'disapproved',
    reason?: string,
  ) {
    const { target, config } = await this.resolveTarget(documentId, documentModel);
    const userName = actorDisplayName(actor);

    const statusByOutcome = {
      pending: config.pendingStatus,
      approved: config.approvedStatus,
      disapproved: config.disapprovedStatus,
    };
    const actionByOutcome = {
      pending: 'Change Request Created',
      approved: 'Change Request Approved',
      disapproved: 'Change Request Disapproved',
    };

    const newStatus = statusByOutcome[outcome];
    const currentStatus = target[config.statusField];

    if (outcome === 'pending' && currentStatus === newStatus) {
      return;
    }

    const update: Record<string, unknown> = {
      [config.statusField]: newStatus,
    };

    if (config.hasTimeline && Array.isArray(target.timeline)) {
      update.timeline = [
        ...target.timeline,
        {
          action: actionByOutcome[outcome],
          status: newStatus,
          user: userName,
          at: new Date(),
          ...(reason ? { reason } : {}),
        },
      ];
    }

    if (config.statusField === 'status') {
      update.updatedBy = userName;
      if (outcome === 'disapproved' && reason) {
        update.reason = reason;
      } else if (outcome === 'approved') {
        update.reason = undefined;
      }
    } else {
      update.UpdatedBy = userName;
      update.UpdationDate = new Date();
      if (outcome === 'approved') {
        update.ApprovedBy = userName;
        update.ApprovalDate = new Date();
        update.DisapprovedBy = undefined;
        update.DisapprovalDate = undefined;
        update.Reason = undefined;
      } else if (outcome === 'disapproved') {
        update.Reason = reason;
        update.DisapprovedBy = userName;
        update.DisapprovalDate = new Date();
        update.ApprovedBy = undefined;
        update.ApprovalDate = undefined;
      }
    }

    await config.model.findByIdAndUpdate(documentId, update);
  }

  private async markTargetAsPending(
    documentId: string,
    documentModel: string,
    actor: any,
    changeReason: string,
  ) {
    await this.syncTargetStatusWithChangeRequest(
      documentId,
      documentModel,
      actor,
      'pending',
      changeReason,
    );
  }

  async getControlledDocuments(actor: any) {
    const companyFilter = this.companyScopedFilter(actor);
    const deptIds = await this.companyDepartmentIds(actor);
    const foodSafetyFilter = this.foodSafetyDepartmentFilter(deptIds);

    const [
      documents,
      forms,
      haccpTeams,
      processes,
      products,
      conductHaccp,
      decisionTrees,
      foodSafetyPlans,
    ] = await Promise.all([
      this.documentModel
        .find({
          ...companyFilter,
          documentId: { $exists: true, $ne: '' },
          status: 'Approved',
        })
        .select('_id documentId name documentType status')
        .lean(),
      this.listOfFormsModel
        .find({
          ...companyFilter,
          documentId: { $exists: true, $ne: '' },
          status: 'Approved',
        })
        .select('_id documentId formName documentType status')
        .lean(),
      this.haccpTeamModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId TeamName DocumentType Status')
        .lean(),
      this.processesModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId ProcessName DocumentType Status')
        .lean(),
      this.productModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId ProductDetails DocumentType Status')
        .lean(),
      this.conductHaccpModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId DocumentType Status')
        .lean(),
      this.decisionTreeModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId DocumentType Status')
        .lean(),
      this.foodSafetyModel
        .find({
          ...foodSafetyFilter,
          DocumentId: { $exists: true, $ne: '' },
          Status: 'Approved',
        })
        .select('_id DocumentId DocumentType Status')
        .lean(),
    ]);

    const items: Array<{
      id: string;
      model: ChangeRequestTargetModel;
      documentId: string;
      name: string;
      category: string;
      status?: string;
    }> = [];

    for (const doc of documents) {
      items.push({
        id: doc._id.toString(),
        model: 'Document',
        documentId: doc.documentId,
        name: doc.name,
        category: TARGET_CATEGORY_LABELS.Document,
        status: doc.status,
      });
    }
    for (const form of forms) {
      items.push({
        id: form._id.toString(),
        model: 'ListOfForms',
        documentId: form.documentId,
        name: form.formName,
        category: TARGET_CATEGORY_LABELS.ListOfForms,
        status: form.status,
      });
    }
    for (const team of haccpTeams) {
      items.push({
        id: team._id.toString(),
        model: 'HaccpTeam',
        documentId: team.DocumentId,
        name: team.TeamName || team.DocumentId,
        category: TARGET_CATEGORY_LABELS.HaccpTeam,
        status: team.Status,
      });
    }
    for (const process of processes) {
      items.push({
        id: process._id.toString(),
        model: 'Processes',
        documentId: process.DocumentId,
        name: process.ProcessName || process.DocumentId,
        category: TARGET_CATEGORY_LABELS.Processes,
        status: process.Status,
      });
    }
    for (const product of products) {
      items.push({
        id: product._id.toString(),
        model: 'Product',
        documentId: product.DocumentId,
        name: product.ProductDetails?.Name || product.DocumentId,
        category: TARGET_CATEGORY_LABELS.Product,
        status: product.Status,
      });
    }
    for (const record of conductHaccp) {
      items.push({
        id: record._id.toString(),
        model: 'ConductHaccp',
        documentId: record.DocumentId,
        name: record.DocumentId,
        category: TARGET_CATEGORY_LABELS.ConductHaccp,
        status: record.Status,
      });
    }
    for (const tree of decisionTrees) {
      items.push({
        id: tree._id.toString(),
        model: 'DecisionTree',
        documentId: tree.DocumentId,
        name: tree.DocumentId,
        category: TARGET_CATEGORY_LABELS.DecisionTree,
        status: tree.Status,
      });
    }
    for (const plan of foodSafetyPlans) {
      items.push({
        id: plan._id.toString(),
        model: 'FoodSafety',
        documentId: plan.DocumentId,
        name: plan.DocumentId,
        category: TARGET_CATEGORY_LABELS.FoodSafety,
        status: plan.Status,
      });
    }

    items.sort((a, b) => a.documentId.localeCompare(b.documentId));

    return { status: true, data: items };
  }

  async create(dto: CreateChangeRequestDto, actor: any) {
    const { target, config, documentRef } = await this.resolveTarget(
      dto.document,
      dto.documentModel,
    );
    this.assertTargetIsApproved(target, config);
    const userName = actorDisplayName(actor);
    const companyId =
      actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const changeRequest = new this.changeRequestModel({
      requestNumber: await this.nextRequestNumber(),
      companyId: companyId
        ? new Types.ObjectId(companyId)
        : (target.companyId ?? undefined),
      document: new Types.ObjectId(dto.document),
      documentModel: dto.documentModel,
      documentRef,
      documentName: config.resolveName(target),
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

    await this.markTargetAsPending(
      dto.document,
      dto.documentModel,
      actor,
      dto.changeReason,
    );

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
      const isSameDocument =
        dto.document === request.document.toString() &&
        dto.documentModel === request.documentModel;
      const { target, config, documentRef } = await this.resolveTarget(
        dto.document,
        dto.documentModel,
      );
      if (!isSameDocument) {
        this.assertTargetIsApproved(target, config);
      }
      request.document = new Types.ObjectId(dto.document);
      request.documentModel = dto.documentModel;
      request.documentRef = documentRef;
      request.documentName = config.resolveName(target);
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

    const targetId = dto.document || request.document.toString();
    const targetModel = dto.documentModel || request.documentModel;
    await this.markTargetAsPending(
      targetId,
      targetModel,
      actor,
      dto.changeReason || request.changeReason,
    );

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

    await this.syncTargetStatusWithChangeRequest(
      request.document.toString(),
      request.documentModel,
      actor,
      'approved',
    );

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

    await this.syncTargetStatusWithChangeRequest(
      request.document.toString(),
      request.documentModel,
      actor,
      'disapproved',
      dto.reason,
    );

    return {
      status: true,
      message: 'Change request disapproved',
      data: request,
    };
  }

  private mapChangeRequestPdfRow(request: any) {
    return {
      requestNumber: asText(request?.requestNumber),
      documentName: asText(request?.documentName),
      documentModel: asText(request?.documentModel),
      changeReason: asText(request?.changeReason),
      status: asText(request?.status),
      createdBy: asText(request?.createdBy),
      created_at: formatDate(request?.created_at),
    };
  }

  async downloadChangeRequestsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAll(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Change Requests Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'requestNumber', label: 'REQUEST #', width: 1.2 },
        { key: 'documentName', label: 'DOCUMENT', width: 2 },
        { key: 'documentModel', label: 'MODEL', width: 1.2 },
        { key: 'changeReason', label: 'REASON', width: 2 },
        { key: 'status', label: 'STATUS', width: 1.5 },
        { key: 'createdBy', label: 'CREATED BY', width: 1.3 },
        { key: 'created_at', label: 'CREATED', width: 1.2 },
      ],
      rows: (data || []).map((r) => this.mapChangeRequestPdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('change-requests', 'directory'),
    };
  }

  async downloadChangeRequestPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const request = await this.changeRequestModel
      .findById(id)
      .populate(DOCUMENT_POPULATE)
      .exec();
    if (!request) throw new NotFoundException('Change request not found');

    const row = this.mapChangeRequestPdfRow(request);

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title:
        row.requestNumber !== '---'
          ? row.requestNumber
          : 'Change Request',
      subtitle: row.documentName !== '---' ? row.documentName : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Request Number', row.requestNumber],
        ['Document Name', row.documentName],
        ['Document Model', row.documentModel],
        ['Change Reason', row.changeReason],
        ['Status', row.status],
        ['Created By', row.createdBy],
        ['Created At', row.created_at],
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.requestNumber || row.documentName || 'change-request',
        'change-request',
      ),
    };
  }
}
