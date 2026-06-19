import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  rejectRecord,
  resubmitRecord,
  reviewRecord,
  shouldTrackChanges,
  toggleEnabledRecord,
} from '../common/haccp-workflow.util';

@Injectable()
export class DecisionTreeService {
  constructor(
    @InjectModel('DecisionTree') private decisionTreeModel: Model<DecisionTree>,
    @InjectModel('Decision') private decisionModel: Model<Decision>,
  ) {}

  async createDecisionTree(createDecisionTreeDto: CreateDecisionTreeDto) {
    const createdDecisions = await this.decisionModel.create(createDecisionTreeDto.Decisions as any);
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
    });
    initCreatedTimeline(createdDecisionTree, createDecisionTreeDto.createdBy);

    await createdDecisionTree.save();
    console.log('Created Decision Document :' + createdDecisionTree);
    return { status: true, message: 'DecisionTree document created successfully', data: createdDecisionTree };
  }

  async getAllDecisionTrees(departmentId: string) {
    const decisionTrees = await this.decisionTreeModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          { path: 'Teams', model: 'HaccpTeam', populate: { path: 'TeamMembers', model: 'User' } },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: { path: 'Hazard', model: 'Hazard', populate: { path: 'Process', model: 'ProcessDetail' } },
      })
      .exec();

    if (!decisionTrees) {
      throw new NotFoundException('DecisionTree documents not found');
    }

    console.log('DecisionTree documents retrieved successfully');
    return { status: true, data: decisionTrees };
  }

  async getApprovedDecisionTrees(departmentId: string) {
    const decisionTrees = await this.decisionTreeModel
      .find({ UserDepartment: departmentId as any, Status: 'Approved' })
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          { path: 'Teams', model: 'HaccpTeam', populate: { path: 'TeamMembers', model: 'User' } },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: { path: 'Hazard', model: 'Hazard', populate: { path: 'Process', model: 'ProcessDetail' } },
      })
      .exec();

    if (!decisionTrees) {
      throw new NotFoundException('DecisionTree documents not found');
    }

    console.log('DecisionTree documents retrieved successfully');
    return { status: true, data: decisionTrees };
  }

  async getDecisionTree(treeId: string) {
    const decisionTree = await this.decisionTreeModel
      .findById(treeId)
      .populate('Department UserDepartment')
      .populate({
        path: 'ConductHaccp',
        model: 'ConductHaccp',
        populate: [
          { path: 'Teams', model: 'HaccpTeam', populate: { path: 'TeamMembers', model: 'User' } },
          { path: 'Process', model: 'Processes' },
        ],
      })
      .populate({
        path: 'Decisions',
        model: 'Decision',
        populate: { path: 'Hazard', model: 'Hazard', populate: { path: 'Process', model: 'ProcessDetail' } },
      })
      .exec();

    if (!decisionTree) {
      throw new NotFoundException(`DecisionTree document with ID: ${treeId} not found`);
    }

    console.log(`DecisionTree document with ID: ${treeId} retrieved successfully`);
    return { status: true, data: decisionTree };
  }

  async deleteDecisionTree(id: string) {
    const existing = await this.decisionTreeModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`DecisionTree document with ID: ${id} not found`);
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException('Only records in review, rejected, or disapproved can be deleted');
    }

    const deletedDecisionTree = await this.decisionTreeModel.findByIdAndDelete(id);
    if (!deletedDecisionTree) {
      throw new NotFoundException(`DecisionTree document with ID: ${id} not found`);
    }

    console.log(`DecisionTree document with ID: ${id} deleted successfully`);
    return { status: true, message: 'DecisionTree document deleted successfully', data: deletedDecisionTree };
  }

  async deleteAllDecisionTrees(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.decisionTreeModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No DecisionTree documents found to delete!');
    }

    console.log(new Date().toLocaleString() + ' ' + 'DELETE All DecisionTree documents Successfully!');
    return { status: true, message: 'All DecisionTree documents have been deleted!', data: result };
  }

  async updateDecisionTree(treeId: string, updateDecisionTreeDto: UpdateDecisionTreeDto) {
    const existingDecisionTree = await this.decisionTreeModel.findById(treeId);
    if (!existingDecisionTree) {
      throw new NotFoundException(`DecisionTree document with ID: ${treeId} not found`);
    }
    if (!canEditRecord(existingDecisionTree)) {
      throw new BadRequestException('Reviewed or approved CCP/OPRP assessments cannot be modified');
    }

    const trackChanges = shouldTrackChanges(existingDecisionTree);

    const createdDecisions = await this.decisionModel.create(
      (updateDecisionTreeDto.Decisions || []).map((decisionObj: any) => {
        const { _id, ...obj } = decisionObj;
        return obj;
      })
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
    const updatedDecisionTree = await existingDecisionTree.save();
    return { status: true, message: trackChanges ? 'CCP/OPRP updated and resubmitted' : 'DecisionTree document updated successfully', data: updatedDecisionTree };
  }

  async reviewDecisionTree(id: string, actor: string) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    reviewRecord(record, actor);
    await record.save();
    return { status: true, message: 'CCP/OPRP assessment reviewed successfully', data: record };
  }

  async approveDecisionTree(approveDecisionTreeDto: ApproveDecisionTreeDto) {
    const decisionTree = await this.decisionTreeModel.findById(approveDecisionTreeDto.id);
    if (!decisionTree) throw new NotFoundException(`DecisionTree with ID: ${approveDecisionTreeDto.id} not found.`);
    approveRecord(decisionTree, approveDecisionTreeDto.approvedBy);
    await decisionTree.save();
    return { status: true, message: 'The DecisionTree has been marked as approved.', data: decisionTree };
  }

  async rejectDecisionTree(id: string, actor: string, reason: string) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    rejectRecord(record, actor, reason);
    await record.save();
    return { status: true, message: 'CCP/OPRP assessment rejected', data: record };
  }

  async disapproveDecisionTree(disapproveDecisionTreeDto: DisapproveDecisionTreeDto) {
    const decisionTree = await this.decisionTreeModel.findById(disapproveDecisionTreeDto.id);
    if (!decisionTree) throw new NotFoundException(`DecisionTree with ID: ${disapproveDecisionTreeDto.id} not found.`);
    disapproveRecord(decisionTree, disapproveDecisionTreeDto.disapprovedBy, disapproveDecisionTreeDto.Reason);
    await decisionTree.save();
    return { status: true, message: 'The DecisionTree has been marked as disapproved.', data: decisionTree };
  }

  async toggleDecisionTreeEnabled(id: string, actor: string) {
    const record = await this.decisionTreeModel.findById(id);
    if (!record) throw new NotFoundException('DecisionTree not found');
    toggleEnabledRecord(record, actor);
    await record.save();
    return {
      status: true,
      message: record.enabled ? 'CCP/OPRP enabled' : 'CCP/OPRP disabled',
      data: record,
    };
  }
}
