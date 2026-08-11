import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    @InjectModel('ProcessDetail')
    private processDetailModel: Model<ProcessDetail>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('Company') private companyModel: Model<any>,
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

  private stepNames(details: any[]): string {
    if (!Array.isArray(details) || details.length === 0) return '---';
    const names = details.map((d) => d?.Name).filter(Boolean);
    return names.length ? names.join(', ') : String(details.length);
  }

  private mapProcessPdfRow(process: any) {
    const details = Array.isArray(process?.ProcessDetails)
      ? process.ProcessDetails
      : [];
    return {
      DocumentId: asText(process?.DocumentId),
      ProcessName: asText(process?.ProcessName),
      department: this.departmentLabel(
        process?.Department || process?.UserDepartment,
      ),
      DocumentType: asText(process?.DocumentType),
      Status: asText(process?.Status),
      steps: this.stepNames(details),
      stepsCount: String(details.length),
      CreatedBy: asText(process?.CreatedBy),
      CreationDate: formatDate(process?.CreationDate),
    };
  }

  async findAllForActor(actor: any) {
    const deptIds = await this.companyDepartmentIds(actor);
    const filter = withOwnScopeFilter(
      actor,
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {},
    );
    const processes = await this.processesModel
      .find(filter as any)
      .populate('Department')
      .populate('UserDepartment')
      .populate({
        path: 'ProcessDetails',
        populate: nestedSubProcessPopulate(),
      })
      .exec();
    return { status: true, data: processes };
  }

  async downloadProcessesPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAllForActor(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Flow Diagrams Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'DocumentId', label: 'DOC ID', width: 1.2 },
        { key: 'ProcessName', label: 'PROCESS', width: 1.8 },
        { key: 'department', label: 'DEPT', width: 1.3 },
        { key: 'DocumentType', label: 'TYPE', width: 1.1 },
        { key: 'Status', label: 'STATUS', width: 1.2 },
        { key: 'steps', label: 'STEPS', width: 1.8 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.3 },
      ],
      rows: (data || []).map((p) => this.mapProcessPdfRow(p)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('flow-diagrams', 'directory'),
    };
  }

  async downloadProcessPdf(processId: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: process } = await this.getProcess(processId, actor);
    const row = this.mapProcessPdfRow(process);
    const details = Array.isArray((process as any)?.ProcessDetails)
      ? (process as any).ProcessDetails
      : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.ProcessName !== '---' ? row.ProcessName : 'Flow Diagram',
      subtitle: row.DocumentId !== '---' ? row.DocumentId : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.DocumentId],
        ['Process Name', row.ProcessName],
        ['Department', row.department],
        ['Document Type', row.DocumentType],
        ['Status', row.Status],
        ['Steps', row.steps],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
      sections: details.map((step: any, i: number) => ({
        heading: `Step ${i + 1}${step?.Name ? `: ${step.Name}` : ''}`,
        rows: [
          ['Name', asText(step?.Name)],
          ['Process Number', asText(step?.ProcessNum)],
          ['Description', asText(step?.Description)],
        ],
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.DocumentId || row.ProcessName || 'flow-diagram',
        'flow-diagram',
      ),
    };
  }

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

  async createProcess(createProcessesDto: CreateProcessesDto, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        createProcessesDto.departmentId || createProcessesDto.Department,
      );

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
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
    });
    initCreatedTimeline(mainProcessDoc, createProcessesDto.createdBy);

    await mainProcessDoc.save();
    console.log('Created Main Process : ' + mainProcessDoc);
    return {
      status: true,
      message: 'Process document created successfully',
      data: mainProcessDoc,
    };
  }

  async getAllProcesses(departmentId: string, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    const processes = await this.processesModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
        }) as any,
      )
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

    return { status: true, data: processes };
  }

  async getApprovedProcesses(departmentId: string, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    const processes = await this.processesModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
          Status: 'Approved',
        }) as any,
      )
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

    return { status: true, data: processes };
  }

  async getProcess(processId: string, actor?: any) {
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
      throw new NotFoundException(
        `Process document with ID: ${processId} not found`,
      );
    }

    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    return { status: true, data: process };
  }

  /**
   * ProcessDetail has no company/department fields. Resolve the owning
   * Processes document by walking parent ProcessDetail.subProcesses links
   * until a Processes.ProcessDetails reference is found, then assert tenant.
   */
  private async findParentProcessForDetail(detailId: string) {
    let currentId = String(detailId);
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const parentProcess = await this.processesModel
        .findOne({ ProcessDetails: currentId as any })
        .populate('Department')
        .populate('UserDepartment')
        .exec();
      if (parentProcess) return parentProcess;

      const parentDetail = await this.processDetailModel
        .findOne({ subProcesses: currentId as any })
        .select('_id')
        .lean();
      if (!parentDetail?._id) break;
      currentId = String(parentDetail._id);
    }

    return null;
  }

  async getProcessDetail(processDetailId: string, actor?: any) {
    const detail = await this.processDetailModel
      .findById(processDetailId)
      .populate(nestedSubProcessPopulate())
      .exec();

    if (!detail) {
      throw new NotFoundException(
        `Process document with ID: ${processDetailId} not found`,
      );
    }

    if (actor) {
      const parentProcess =
        await this.findParentProcessForDetail(processDetailId);
      if (!parentProcess) {
        throw new ForbiddenException(
          'You may only access resources for your company',
        );
      }
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        parentProcess,
      );
    }

    return { status: true, data: detail };
  }

  async deleteProcess(id: string, actor?: any) {
    const existing = await this.processesModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`Process document with ID: ${id} not found`);
    }
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existing,
      );
    if (!canEditRecord(existing)) {
      throw new BadRequestException(
        'Only records in review, rejected, or disapproved can be deleted',
      );
    }

    const deletedProcess = await this.processesModel.findByIdAndDelete(id);
    if (!deletedProcess) {
      throw new NotFoundException(`Process document with ID: ${id} not found`);
    }

    return {
      status: true,
      message: 'Process document deleted successfully',
      data: deletedProcess,
    };
  }

  async deleteAllProcesses(actor?: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    let filter: Record<string, unknown> = {};
    if (actor && !isGlobalFoodSafetyActor(actor)) {
      const deptIds = await this.companyDepartmentIds(actor);
      filter = foodSafetyCompanyDeleteFilter(actor, deptIds);
    }
    const result = await this.processesModel.deleteMany(filter);
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Process documents found to delete!');
    }

    return {
      status: true,
      message: 'All Process documents have been deleted!',
      data: result,
    };
  }

  async updateProcess(
    processId: string,
    updateProcessesDto: UpdateProcessesDto,
    actor?: any,
  ) {
    const existingProcess = await this.processesModel.findById(processId);
    if (!existingProcess) {
      throw new NotFoundException(
        `Process document with ID: ${processId} not found`,
      );
    }
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existingProcess,
      );
    if (!canEditRecord(existingProcess)) {
      throw new BadRequestException(
        'Reviewed or approved processes cannot be modified',
      );
    }

    const trackChanges = shouldTrackChanges(existingProcess);

    const processDetailsIds = await Promise.all(
      (updateProcessesDto.ProcessDetails || []).map((processObj) => {
        const { _id, ...rest } = processObj as ProcessDetailInput & {
          _id?: string;
        };
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
    if (updateProcessesDto.ProcessName)
      existingProcess.ProcessName = updateProcessesDto.ProcessName;
    if (
      updateProcessesDto.DocumentType &&
      updateProcessesDto.DocumentType !== existingProcess.DocumentType
    ) {
      throw new BadRequestException(
        'Document type cannot be changed after creation',
      );
    }
    existingProcess.UpdatedBy = updateProcessesDto.updatedBy;
    existingProcess.UpdationDate = new Date();

    const promoted = promoteChangeRequestToReview(
      existingProcess,
      updateProcessesDto.updatedBy || 'System',
    );

    const updatedProcess = await existingProcess.save();
    return {
      status: true,
      message: trackChanges
        ? 'Process updated and resubmitted'
        : promoted
          ? 'Process updated and submitted for review'
          : 'Process document updated successfully',
      data: updatedProcess,
    };
  }

  async reviewProcess(id: string, actorName: string, actor?: any) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    reviewRecord(process, actorName);
    await process.save();
    return {
      status: true,
      message: 'Process reviewed successfully',
      data: process,
    };
  }

  async approveProcess(approveProcessesDto: ApproveProcessesDto, actor?: any) {
    const process = await this.processesModel.findById(approveProcessesDto.id);
    if (!process)
      throw new NotFoundException(
        `Process with ID: ${approveProcessesDto.id} not found.`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    approveRecord(process, approveProcessesDto.approvedBy);
    await process.save();
    return {
      status: true,
      message: 'The Process has been marked as approved.',
      data: process,
    };
  }

  async rejectProcess(
    id: string,
    actorName: string,
    reason: string,
    actor?: any,
  ) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    rejectRecord(process, actorName, reason);
    await process.save();
    return { status: true, message: 'Process rejected', data: process };
  }

  async disapproveProcess(
    disapproveProcessesDto: DisapproveProcessesDto,
    actor?: any,
  ) {
    const process = await this.processesModel.findById(
      disapproveProcessesDto.id,
    );
    if (!process)
      throw new NotFoundException(
        `Process with ID: ${disapproveProcessesDto.id} not found.`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    disapproveRecord(
      process,
      disapproveProcessesDto.disapprovedBy,
      disapproveProcessesDto.Reason,
    );
    await process.save();
    return {
      status: true,
      message: 'The Process has been marked as disapproved.',
      data: process,
    };
  }

  async toggleProcessEnabled(id: string, actorName: string, actor?: any) {
    const process = await this.processesModel.findById(id);
    if (!process) throw new NotFoundException('Process not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        process,
      );
    toggleEnabledRecord(process, actorName);
    await process.save();
    return {
      status: true,
      message: process.enabled ? 'Process enabled' : 'Process disabled',
      data: process,
    };
  }
}
