import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Processes } from './schemas/processes.schema';
import { ProcessDetail } from './schemas/process-detail.schema';
import { CreateProcessesDto } from './dtos/create-processes.dto';
import { UpdateProcessesDto } from './dtos/update-processes.dto';
import { ApproveProcessesDto } from './dtos/approve-processes.dto';
import { DisapproveProcessesDto } from './dtos/disapprove-processes.dto';
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

type ProcessDetailInput = {
  Name: string;
  ProcessNum?: string;
  Description: string;
  subProcesses?: ProcessDetailInput[];
  _id?: string;
};

function nestedSubProcessPopulate(depth = 8): any {
  if (depth <= 0) return undefined;
  return {
    path: 'subProcesses',
    model: 'ProcessDetail',
    populate: nestedSubProcessPopulate(depth - 1),
  };
}

@Injectable()
export class ProcessesService {
  constructor(
    @InjectModel('Processes') private processesModel: Model<Processes>,
    @InjectModel('ProcessDetail') private processDetailModel: Model<ProcessDetail>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

  private async saveProcessDetailTree(detail: ProcessDetailInput) {
    let subProcessIds: ProcessDetail['_id'][] = [];

    if (detail.subProcesses?.length) {
      subProcessIds = await Promise.all(
        detail.subProcesses.map((sub) => this.saveProcessDetailTree(sub)),
      );
    }

    const doc = new this.processDetailModel({
      Name: detail.Name,
      ProcessNum: detail.ProcessNum,
      Description: detail.Description,
      ...(subProcessIds.length ? { subProcesses: subProcessIds } : {}),
    });
    await doc.save();
    return doc._id;
  }

  async createProcess(createProcessesDto: CreateProcessesDto) {
  const processDetailsIds = await Promise.all(
    createProcessesDto.ProcessDetails.map((processObj) =>
      this.saveProcessDetailTree(processObj),
    ),
  );

  const mainProcessDoc = new this.processesModel({
    Department: createProcessesDto.Department,
    ProcessName: createProcessesDto.ProcessName,
    DocumentType: createProcessesDto.DocumentType,
    CreatedBy: createProcessesDto.createdBy,
    UserDepartment: createProcessesDto.departmentId,
    ProcessDetails: processDetailsIds,
    CreationDate: new Date(),
  });
  initCreatedTimeline(mainProcessDoc, createProcessesDto.createdBy);

  await mainProcessDoc.save();
  console.log('Created Main Process : ' + mainProcessDoc);
  return { status: true, message: 'Process document created successfully', data: mainProcessDoc };
}


  async getAllProcesses(departmentId: string) {
    const processes = await this.processesModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'ProcessDetails',
        populate: nestedSubProcessPopulate(),
      })
      .exec();

    if (!processes) {
      throw new NotFoundException('Process documents not found');
    }

    console.log('Process documents retrieved successfully');
    return { status: true, data: processes };
  }

  async getApprovedProcesses(departmentId: string) {
    const processes = await this.processesModel
      .find({ UserDepartment: departmentId as any, Status: 'Approved' })
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'ProcessDetails',
        populate: nestedSubProcessPopulate(),
      })
      .exec();

    if (!processes) {
      throw new NotFoundException('Process documents not found');
    }

    console.log('Process documents retrieved successfully');
    return { status: true, data: processes };
  }

  async getProcess(processId: string) {
    const process = await this.processesModel
      .findById(processId)
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'ProcessDetails',
        populate: nestedSubProcessPopulate(),
      })
      .exec();

    if (!process) {
      throw new NotFoundException(`Process document with ID: ${processId} not found`);
    }

    console.log(`Process document with ID: ${processId} retrieved successfully`);
    return { status: true, data: process };
  }

  async getProcessDetail(processId: string) {
    const process = await this.processDetailModel
      .findById(processId)
      .populate(nestedSubProcessPopulate())
      .exec();

    if (!process) {
      throw new NotFoundException(`Process document with ID: ${processId} not found`);
    }

    console.log(`Process document with ID: ${processId} retrieved successfully`);
    return { status: true, data: process };
  }

  async deleteProcess(id: string) {
    const existing = await this.processesModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`Process document with ID: ${id} not found`);
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException('Only records in review, rejected, or disapproved can be deleted');
    }

    const deletedProcess = await this.processesModel.findByIdAndDelete(id);
    if (!deletedProcess) {
      throw new NotFoundException(`Process document with ID: ${id} not found`);
    }

    console.log(`Process document with ID: ${id} deleted successfully`);
    return { status: true, message: 'Process document deleted successfully', data: deletedProcess };
  }

  async deleteAllProcesses(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.processesModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Process documents found to delete!');
    }

    console.log(new Date().toLocaleString() + ' ' + 'DELETE All Process documents Successfully!');
    return { status: true, message: 'All Process documents have been deleted!', data: result };
  }

  async updateProcess(processId: string, updateProcessesDto: UpdateProcessesDto) {
  const existingProcess = await this.processesModel.findById(processId);
  if (!existingProcess) {
    throw new NotFoundException(`Process document with ID: ${processId} not found`);
  }
  if (!canEditRecord(existingProcess)) {
    throw new BadRequestException('Reviewed or approved processes cannot be modified');
  }

  const trackChanges = shouldTrackChanges(existingProcess);

  const processDetailsIds = await Promise.all(
    (updateProcessesDto.ProcessDetails || []).map((processObj) => {
      const { _id, ...rest } = processObj as ProcessDetailInput & { _id?: string };
      return this.saveProcessDetailTree(rest);
    }),
  );

  if (trackChanges) {
    resubmitRecord(
      existingProcess,
      updateProcessesDto.updatedBy || 'System',
      ['Process Details'],
      { ProcessName: existingProcess.ProcessName },
    );
  }

  existingProcess.ProcessDetails = processDetailsIds as any;
  if (updateProcessesDto.ProcessName) existingProcess.ProcessName = updateProcessesDto.ProcessName;
  if (updateProcessesDto.DocumentType) existingProcess.DocumentType = updateProcessesDto.DocumentType;
  existingProcess.UpdatedBy = updateProcessesDto.updatedBy;
  existingProcess.UpdationDate = new Date();

  const updatedProcess = await existingProcess.save();
  return { status: true, message: trackChanges ? 'Process updated and resubmitted' : 'Process document updated successfully', data: updatedProcess };
}

  async reviewProcess(id: string, actor: string) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    reviewRecord(process, actor);
    await process.save();
    return { status: true, message: 'Process reviewed successfully', data: process };
  }

  async approveProcess(approveProcessesDto: ApproveProcessesDto) {
    const process = await this.processesModel.findById(approveProcessesDto.id);
    if (!process) throw new NotFoundException(`Process with ID: ${approveProcessesDto.id} not found.`);
    approveRecord(process, approveProcessesDto.approvedBy);
    await process.save();
    return { status: true, message: 'The Process has been marked as approved.', data: process };
  }

  async rejectProcess(id: string, actor: string, reason: string) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    rejectRecord(process, actor, reason);
    await process.save();
    return { status: true, message: 'Process rejected', data: process };
  }

  async disapproveProcess(disapproveProcessesDto: DisapproveProcessesDto) {
    const process = await this.processesModel.findById(disapproveProcessesDto.id);
    if (!process) throw new NotFoundException(`Process with ID: ${disapproveProcessesDto.id} not found.`);
    disapproveRecord(process, disapproveProcessesDto.disapprovedBy, disapproveProcessesDto.Reason);
    await process.save();
    return { status: true, message: 'The Process has been marked as disapproved.', data: process };
  }

  async toggleProcessEnabled(id: string, actor: string) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    toggleEnabledRecord(process, actor);
    await process.save();
    return {
      status: true,
      message: process.enabled ? 'Process enabled' : 'Process disabled',
      data: process,
    };
  }
}
