import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DecisionTree } from './schemas/decision-tree.schema';
import { Decision } from './schemas/decision.schema';
import { CreateDecisionTreeDto } from './dtos/create-decision-tree.dto';
import { UpdateDecisionTreeDto } from './dtos/update-decision-tree.dto';
import { ApproveDecisionTreeDto } from './dtos/approve-decision-tree.dto';
import { DisapproveDecisionTreeDto } from './dtos/disapprove-decision-tree.dto';
import {
  approveRecord,
  canEditRecord,
  disapproveRecord,
  initCreatedTimeline,
  promoteChangeRequestToReview,
  rejectRecord,
  resubmitRecord,
  reviewRecord,
  shouldTrackChanges,
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
  isGlobalFoodSafetyActor,
  withOwnScopeFilter,
} from '../common/food-safety-tenant.util';

@Injectable()
export class DecisionTreeService {
  constructor(
    @InjectModel('DecisionTree') private decisionTreeModel: Model<DecisionTree>,
    @InjectModel('Decision') private decisionModel: Model<Decision>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
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

  private yn(value: boolean | null | undefined): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '---';
  }

  private linkedLabel(tree: any): string {
    const conduct = tree?.ConductHaccp;
    if (!conduct || typeof conduct !== 'object') return '---';
    const processName = conduct?.Process?.ProcessName || conduct?.Process?.Name;
    const parts = [conduct?.DocumentId, processName].filter(Boolean);
    return parts.length ? parts.join(' / ') : '---';
  }

  private mapDecisionTreePdfRow(tree: any) {
    return {
      DocumentId: asText(tree?.DocumentId),
      linked: this.linkedLabel(tree),
      Status: asText(tree?.Status),
      CreatedBy: asText(tree?.CreatedBy),
      CreationDate: formatDate(tree?.CreationDate),
      DocumentType: asText(tree?.DocumentType),
    };
  }

  async findAllForActor(actor: any) {
    const deptIds = await this.companyDepartmentIds(actor);
    const filter = withOwnScopeFilter(
      actor,
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {},
    );
    const decisionTrees = await this.decisionTreeModel
      .find(filter as any)
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          {
            path: 'Teams',
            model: 'HaccpTeam',
            populate: { path: 'TeamMembers', model: 'User' },
          },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: {
          path: 'Hazard',
          model: 'Hazard',
          populate: { path: 'Process', model: 'ProcessDetail' },
        },
      })
      .exec();
    return { status: true, data: decisionTrees };
  }

  async downloadDecisionTreesPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAllForActor(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'CCP/OPRP Assessments Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'DocumentId', label: 'DOC ID', width: 1.4 },
        { key: 'linked', label: 'LINKED PROCESS/CONDUCT', width: 3 },
        { key: 'Status', label: 'STATUS', width: 1.4 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.8 },
      ],
      rows: (data || []).map((t) => this.mapDecisionTreePdfRow(t)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('ccp-oprp-assessments', 'directory'),
    };
  }

  async downloadDecisionTreePdf(treeId: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: tree } = await this.getDecisionTree(treeId, actor);
    const row = this.mapDecisionTreePdfRow(tree);
    const decisions = Array.isArray((tree as any)?.Decisions)
      ? (tree as any).Decisions
      : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.DocumentId !== '---' ? row.DocumentId : 'CCP/OPRP Assessment',
      subtitle: row.linked !== '---' ? row.linked : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.DocumentId],
        ['Linked Process/Conduct', row.linked],
        ['Document Type', row.DocumentType],
        ['Status', row.Status],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
      sections: decisions.map((d: any, i: number) => ({
        heading: `Decision ${i + 1}${
          d?.Hazard?.type ? `: ${d.Hazard.type}` : ''
        }`,
        rows: [
          ['Hazard Type', asText(d?.Hazard?.type)],
          ['Hazard Description', asText(d?.Hazard?.Description)],
          ['Process Step', asText(d?.Hazard?.Process?.Name)],
          ['Q1', this.yn(d?.Q1)],
          ['Q1A', this.yn(d?.Q1A)],
          ['Q2', this.yn(d?.Q2)],
          ['Q3', this.yn(d?.Q3)],
          ['Q4', this.yn(d?.Q4)],
          ['Classification', asText(d?.classification)],
        ],
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(row.DocumentId || 'ccp-oprp', 'ccp-oprp'),
    };
  }

  async createDecisionTree(
    createDecisionTreeDto: CreateDecisionTreeDto,
    actor?: any,
  ) {
    if (actor) {
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        createDecisionTreeDto.departmentId || createDecisionTreeDto.Department,
      );
    }

    const createdDecisions = await this.decisionModel.create(
      createDecisionTreeDto.Decisions as any,
    );
    const decisionsArr = Object.values(createdDecisions);
    const decisionIds = decisionsArr.map((decisionObj: any) => decisionObj._id);

    const createdDecisionTree = new this.decisionTreeModel({
      Department: createDecisionTreeDto.Department,
      DocumentType: createDecisionTreeDto.DocumentType,
      ConductHaccp: createDecisionTreeDto.ConductHaccp,
      Decisions: decisionIds,
      CreatedBy: createDecisionTreeDto.createdBy,
      CreationDate: new Date(),
      UserDepartment: createDecisionTreeDto.departmentId,
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
    });
    initCreatedTimeline(createdDecisionTree, createDecisionTreeDto.createdBy);

    await createdDecisionTree.save();
    console.log('Created Decision Document :' + createdDecisionTree);
    return {
      status: true,
      message: 'DecisionTree document created successfully',
      data: createdDecisionTree,
    };
  }

  async getAllDecisionTrees(departmentId: string, actor?: any) {
    if (actor) {
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    }
    const decisionTrees = await this.decisionTreeModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
        }) as any,
      )
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          {
            path: 'Teams',
            model: 'HaccpTeam',
            populate: { path: 'TeamMembers', model: 'User' },
          },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: {
          path: 'Hazard',
          model: 'Hazard',
          populate: { path: 'Process', model: 'ProcessDetail' },
        },
      })
      .exec();

    if (!decisionTrees) {
      throw new NotFoundException('DecisionTree documents not found');
    }

    console.log('DecisionTree documents retrieved successfully');
    return { status: true, data: decisionTrees };
  }

  async getApprovedDecisionTrees(departmentId: string, actor?: any) {
    if (actor) {
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    }
    const decisionTrees = await this.decisionTreeModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
          Status: 'Approved',
        }) as any,
      )
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          {
            path: 'Teams',
            model: 'HaccpTeam',
            populate: { path: 'TeamMembers', model: 'User' },
          },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: {
          path: 'Hazard',
          model: 'Hazard',
          populate: { path: 'Process', model: 'ProcessDetail' },
        },
      })
      .exec();

    if (!decisionTrees) {
      throw new NotFoundException('DecisionTree documents not found');
    }

    console.log('DecisionTree documents retrieved successfully');
    return { status: true, data: decisionTrees };
  }

  async getDecisionTree(treeId: string, actor?: any) {
    const decisionTree = await this.decisionTreeModel
      .findById(treeId)
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          {
            path: 'Teams',
            model: 'HaccpTeam',
            populate: { path: 'TeamMembers', model: 'User' },
          },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: {
          path: 'Hazard',
          model: 'Hazard',
          populate: { path: 'Process', model: 'ProcessDetail' },
        },
      })
      .exec();

    if (!decisionTree) {
      throw new NotFoundException(
        `DecisionTree document with ID: ${treeId} not found`,
      );
    }

    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        decisionTree,
      );
    }

    console.log(
      `DecisionTree document with ID: ${treeId} retrieved successfully`,
    );
    return { status: true, data: decisionTree };
  }

  async deleteDecisionTree(id: string, actor?: any) {
    const existing = await this.decisionTreeModel.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `DecisionTree document with ID: ${id} not found`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existing,
      );
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException(
        'Only records in review, rejected, or disapproved can be deleted',
      );
    }

    const deletedDecisionTree =
      await this.decisionTreeModel.findByIdAndDelete(id);
    if (!deletedDecisionTree) {
      throw new NotFoundException(
        `DecisionTree document with ID: ${id} not found`,
      );
    }

    console.log(`DecisionTree document with ID: ${id} deleted successfully`);
    return {
      status: true,
      message: 'DecisionTree document deleted successfully',
      data: deletedDecisionTree,
    };
  }

  async deleteAllDecisionTrees(actor?: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    let filter: Record<string, unknown> = {};
    if (actor && !isGlobalFoodSafetyActor(actor)) {
      const deptIds = await this.companyDepartmentIds(actor);
      filter = foodSafetyCompanyDeleteFilter(actor, deptIds);
    }
    const result = await this.decisionTreeModel.deleteMany(filter);
    if (result.deletedCount === 0) {
      throw new NotFoundException('No DecisionTree documents found to delete!');
    }

    console.log(
      new Date().toLocaleString() +
        ' ' +
        'DELETE All DecisionTree documents Successfully!',
    );
    return {
      status: true,
      message: 'All DecisionTree documents have been deleted!',
      data: result,
    };
  }

  async updateDecisionTree(
    treeId: string,
    updateDecisionTreeDto: UpdateDecisionTreeDto,
    actor?: any,
  ) {
    const existingDecisionTree = await this.decisionTreeModel.findById(treeId);
    if (!existingDecisionTree) {
      throw new NotFoundException(
        `DecisionTree document with ID: ${treeId} not found`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existingDecisionTree,
      );
    }
    if (!canEditRecord(existingDecisionTree)) {
      throw new BadRequestException(
        'Reviewed or approved CCP/OPRP assessments cannot be modified',
      );
    }

    const trackChanges = shouldTrackChanges(existingDecisionTree);

    const createdDecisions = await this.decisionModel.create(
      (updateDecisionTreeDto.Decisions || []).map((decisionObj: any) => {
        const { _id, ...obj } = decisionObj;
        return obj;
      }),
    );
    const decisionsArr = Object.values(createdDecisions);
    const decisionIds = decisionsArr.map((decisionObj: any) => decisionObj._id);

    if (trackChanges) {
      resubmitRecord(
        existingDecisionTree,
        updateDecisionTreeDto.updatedBy || 'System',
        ['Decision Tree'],
      );
    }

    existingDecisionTree.Decisions = decisionIds;

    const promoted = promoteChangeRequestToReview(
      existingDecisionTree,
      updateDecisionTreeDto.updatedBy || 'System',
    );

    const updatedDecisionTree = await existingDecisionTree.save();
    return {
      status: true,
      message: trackChanges
        ? 'CCP/OPRP updated and resubmitted'
        : promoted
          ? 'CCP/OPRP updated and submitted for review'
          : 'DecisionTree document updated successfully',
      data: updatedDecisionTree,
    };
  }

  async reviewDecisionTree(id: string, actorName: string, actor?: any) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        record,
      );
    }
    reviewRecord(record, actorName);
    await record.save();
    return {
      status: true,
      message: 'CCP/OPRP assessment reviewed successfully',
      data: record,
    };
  }

  async approveDecisionTree(
    approveDecisionTreeDto: ApproveDecisionTreeDto,
    actor?: any,
  ) {
    const decisionTree = await this.decisionTreeModel.findById(
      approveDecisionTreeDto.id,
    );
    if (!decisionTree)
      throw new NotFoundException(
        `DecisionTree with ID: ${approveDecisionTreeDto.id} not found.`,
      );
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        decisionTree,
      );
    }
    approveRecord(decisionTree, approveDecisionTreeDto.approvedBy);
    await decisionTree.save();
    return {
      status: true,
      message: 'The DecisionTree has been marked as approved.',
      data: decisionTree,
    };
  }

  async rejectDecisionTree(
    id: string,
    actorName: string,
    reason: string,
    actor?: any,
  ) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        record,
      );
    }
    rejectRecord(record, actorName, reason);
    await record.save();
    return {
      status: true,
      message: 'CCP/OPRP assessment rejected',
      data: record,
    };
  }

  async disapproveDecisionTree(
    disapproveDecisionTreeDto: DisapproveDecisionTreeDto,
    actor?: any,
  ) {
    const decisionTree = await this.decisionTreeModel.findById(
      disapproveDecisionTreeDto.id,
    );
    if (!decisionTree)
      throw new NotFoundException(
        `DecisionTree with ID: ${disapproveDecisionTreeDto.id} not found.`,
      );
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        decisionTree,
      );
    }
    disapproveRecord(
      decisionTree,
      disapproveDecisionTreeDto.disapprovedBy,
      disapproveDecisionTreeDto.Reason,
    );
    await decisionTree.save();
    return {
      status: true,
      message: 'The DecisionTree has been marked as disapproved.',
      data: decisionTree,
    };
  }

  async toggleDecisionTreeEnabled(id: string, actorName: string, actor?: any) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        record,
      );
    }
    toggleEnabledRecord(record, actorName);
    await record.save();
    return {
      status: true,
      message: record.enabled ? 'CCP/OPRP enabled' : 'CCP/OPRP disabled',
      data: record,
    };
  }
}
