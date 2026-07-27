import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConductHaccp } from './schemas/conduct-haccp.schema';
import { Hazard } from './schemas/hazard.schema';
import { CreateConductHaccpDto } from './dtos/create-conduct-haccp.dto';
import { UpdateConductHaccpDto } from './dtos/update-conduct-haccp.dto';
import { ApproveConductHaccpDto } from './dtos/approve-conduct-haccp.dto';
import { DisapproveConductHaccpDto } from './dtos/disapprove-conduct-haccp.dto';
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
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

@Injectable()
export class ConductHaccpService {
  constructor(
    @InjectModel('ConductHaccp') private conductHaccpModel: Model<ConductHaccp>,
    @InjectModel('Hazard') private hazardModel: Model<Hazard>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

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

  private processName(process: any): string {
    if (!process || typeof process !== 'object') return '---';
    return asText(process.ProcessName || process.Name);
  }

  private mapConductHaccpPdfRow(record: any) {
    const hazards = Array.isArray(record?.Hazards) ? record.Hazards : [];
    return {
      DocumentId: asText(record?.DocumentId),
      processName: this.processName(record?.Process),
      Status: asText(record?.Status),
      hazardCount: String(hazards.length),
      CreatedBy: asText(record?.CreatedBy),
      CreationDate: formatDate(record?.CreationDate),
      DocumentType: asText(record?.DocumentType),
    };
  }

  async findAllForActor(actor: any) {
    const deptIds = await this.companyDepartmentIds(actor);
    const filter: Record<string, unknown> =
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {};
    const conductHaccps = await this.conductHaccpModel
      .find(filter as any)
      .populate('Department Process UserDepartment')
      .populate({
        path: 'Hazards',
        populate: { path: 'Process', model: 'ProcessDetail' },
      })
      .populate({ path: 'Teams', model: 'HaccpTeam' })
      .exec();
    return { status: true, data: conductHaccps };
  }

  async downloadConductHaccpsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAllForActor(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Risk Assessments Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'DocumentId', label: 'DOC ID', width: 1.4 },
        { key: 'processName', label: 'PROCESS', width: 2.2 },
        { key: 'Status', label: 'STATUS', width: 1.4 },
        { key: 'hazardCount', label: 'HAZARDS', width: 1.2 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.8 },
      ],
      rows: (data || []).map((r) => this.mapConductHaccpPdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('risk-assessments', 'directory'),
    };
  }

  async downloadConductHaccpPdf(haccpId: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: record } = await this.getConductHaccp(haccpId);
    const row = this.mapConductHaccpPdfRow(record);
    const hazards = Array.isArray((record as any)?.Hazards)
      ? (record as any).Hazards
      : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title:
        row.DocumentId !== '---' ? row.DocumentId : 'Risk Assessment',
      subtitle: row.processName !== '---' ? row.processName : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.DocumentId],
        ['Process', row.processName],
        ['Document Type', row.DocumentType],
        ['Status', row.Status],
        ['Hazard Count', row.hazardCount],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
      sections: hazards.map((h: any, i: number) => ({
        heading: `Hazard ${i + 1}${h?.type ? `: ${h.type}` : ''}`,
        rows: [
          ['Type', asText(h?.type)],
          ['Process Step', asText(h?.Process?.Name)],
          ['Description', asText(h?.Description)],
          ['Control Measures', asText(h?.ControlMeasures)],
          ['Occurrence', asText(h?.Occurence)],
          ['Severity', asText(h?.Severity)],
          ['Significance Level', asText(h?.SignificanceLevel)],
        ],
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.DocumentId || 'risk-assessment',
        'risk-assessment',
      ),
    };
  }

  async createConductHaccp(createConductHaccpDto: CreateConductHaccpDto) {
    const createdHazards = await this.hazardModel.create(
      createConductHaccpDto.Hazards as any,
    );
    const hazardsArr = Object.values(createdHazards);
    const hazardsIds = hazardsArr.map((hazardObj: any) => hazardObj._id);

    const createdConductHaccp = new this.conductHaccpModel({
      Department: createConductHaccpDto.Department,
      DocumentType: createConductHaccpDto.DocumentType,
      Process: createConductHaccpDto.Process,
      Teams: createConductHaccpDto.Teams,
      CreatedBy: createConductHaccpDto.createdBy,
      Hazards: hazardsIds,
      UserDepartment: createConductHaccpDto.departmentId,
      CreationDate: new Date(),
    });
    initCreatedTimeline(createdConductHaccp, createConductHaccpDto.createdBy);

    await createdConductHaccp.save();
    console.log('Created HACCAP Conduction' + createdConductHaccp);
    return {
      status: true,
      message: 'ConductHaccp document created successfully',
      data: createdConductHaccp,
    };
  }

  async getAllConductHaccp(departmentId: string) {
    const conductHaccps = await this.conductHaccpModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department Process UserDepartment')
      .populate({
        path: 'Hazards',
        populate: { path: 'Process', model: 'ProcessDetail' },
      })
      .populate({ path: 'Teams', model: 'HaccpTeam' })
      .exec();

    if (!conductHaccps) {
      throw new NotFoundException('ConductHaccp documents not found');
    }

    console.log('ConductHaccp documents retrieved successfully');
    return { status: true, data: conductHaccps };
  }

  async getApprovedConductHaccp(departmentId: string) {
    const conductHaccps = await this.conductHaccpModel
      .find({ UserDepartment: departmentId as any, Status: 'Approved' })
      .populate('Department Process UserDepartment')
      .populate({
        path: 'Hazards',
        populate: { path: 'Process', model: 'ProcessDetail' },
      })
      .populate({ path: 'Teams', model: 'HaccpTeam' })
      .exec();

    if (!conductHaccps) {
      throw new NotFoundException('ConductHaccp documents not found');
    }

    console.log('ConductHaccp documents retrieved successfully');
    return { status: true, data: conductHaccps };
  }

  async getConductHaccp(haccpId: string) {
    const conductHaccp = await this.conductHaccpModel
      .findById(haccpId)
      .populate('Department Process UserDepartment')
      .populate({
        path: 'Hazards',
        populate: { path: 'Process', model: 'ProcessDetail' },
      })
      .populate({ path: 'Teams', model: 'HaccpTeam' })
      .exec();

    if (!conductHaccp) {
      throw new NotFoundException(
        `ConductHaccp document with ID: ${haccpId} not found`,
      );
    }

    console.log(
      `ConductHaccp document with ID: ${haccpId} retrieved successfully`,
    );
    return { status: true, data: conductHaccp };
  }

  async deleteConductHaccp(id: string) {
    const existing = await this.conductHaccpModel.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `ConductHaccp document with ID: ${id} not found`,
      );
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException(
        'Only records in review, rejected, or disapproved can be deleted',
      );
    }

    const deletedConductHaccp =
      await this.conductHaccpModel.findByIdAndDelete(id);
    if (!deletedConductHaccp) {
      throw new NotFoundException(
        `ConductHaccp document with ID: ${id} not found`,
      );
    }

    console.log(`ConductHaccp document with ID: ${id} deleted successfully`);
    return {
      status: true,
      message: 'ConductHaccp document deleted successfully',
      data: deletedConductHaccp,
    };
  }

  async deleteAllConductHaccp(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.conductHaccpModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No ConductHaccp documents found to delete!');
    }

    console.log(
      new Date().toLocaleString() +
        ' ' +
        'DELETE All ConductHaccp documents Successfully!',
    );
    return {
      status: true,
      message: 'All ConductHaccp documents have been deleted!',
      data: result,
    };
  }

  async updateConductHaccp(
    haccpId: string,
    updateConductHaccpDto: UpdateConductHaccpDto,
  ) {
    const existingConductHaccp = await this.conductHaccpModel.findById(haccpId);
    if (!existingConductHaccp) {
      throw new NotFoundException(
        `ConductHaccp document with ID: ${haccpId} not found`,
      );
    }
    if (!canEditRecord(existingConductHaccp)) {
      throw new BadRequestException(
        'Reviewed or approved risk assessments cannot be modified',
      );
    }

    const trackChanges = shouldTrackChanges(existingConductHaccp);

    const createdHazards = await this.hazardModel.create(
      (updateConductHaccpDto.Hazards || []).map((hazard: any) => {
        if (hazard._id) {
          const { _id, ...newHazard } = hazard;
          return newHazard;
        }
        return hazard;
      }),
    );
    const hazardsArr = Object.values(createdHazards);
    const hazardsIds = hazardsArr.map((hazardObj: any) => hazardObj._id);

    if (trackChanges) {
      resubmitRecord(
        existingConductHaccp,
        updateConductHaccpDto.updatedBy || 'System',
        ['Hazard Assessment'],
      );
    }

    existingConductHaccp.Hazards = hazardsIds;
    existingConductHaccp.UpdatedBy = updateConductHaccpDto.updatedBy;
    existingConductHaccp.UpdationDate = new Date();

    const updatedConductHaccp = await existingConductHaccp.save();
    return {
      status: true,
      message: trackChanges
        ? 'Risk assessment updated and resubmitted'
        : 'ConductHaccp document updated successfully',
      data: updatedConductHaccp,
    };
  }

  async reviewConductHaccp(id: string, actor: string) {
    const record = await this.conductHaccpModel.findById(id);
    if (!record) throw new NotFoundException('ConductHaccp not found');
    reviewRecord(record, actor);
    await record.save();
    return {
      status: true,
      message: 'Risk assessment reviewed successfully',
      data: record,
    };
  }

  async approveConductHaccp(approveConductHaccpDto: ApproveConductHaccpDto) {
    const conductHaccp = await this.conductHaccpModel.findById(
      approveConductHaccpDto.id,
    );
    if (!conductHaccp)
      throw new NotFoundException(
        `ConductHaccp with ID: ${approveConductHaccpDto.id} not found.`,
      );
    approveRecord(conductHaccp, approveConductHaccpDto.approvedBy);
    await conductHaccp.save();
    return {
      status: true,
      message: 'The ConductHaccp has been marked as approved.',
      data: conductHaccp,
    };
  }

  async rejectConductHaccp(id: string, actor: string, reason: string) {
    const record = await this.conductHaccpModel.findById(id);
    if (!record) throw new NotFoundException('ConductHaccp not found');
    rejectRecord(record, actor, reason);
    await record.save();
    return { status: true, message: 'Risk assessment rejected', data: record };
  }

  async disapproveConductHaccp(
    disapproveConductHaccpDto: DisapproveConductHaccpDto,
  ) {
    const conductHaccp = await this.conductHaccpModel.findById(
      disapproveConductHaccpDto.id,
    );
    if (!conductHaccp)
      throw new NotFoundException(
        `ConductHaccp with ID: ${disapproveConductHaccpDto.id} not found.`,
      );
    disapproveRecord(
      conductHaccp,
      disapproveConductHaccpDto.disapprovedBy,
      disapproveConductHaccpDto.Reason,
    );
    await conductHaccp.save();
    return {
      status: true,
      message: 'The ConductHaccp has been marked as disapproved.',
      data: conductHaccp,
    };
  }

  async toggleConductHaccpEnabled(id: string, actor: string) {
    const record = await this.conductHaccpModel.findById(id);
    if (!record) throw new NotFoundException('ConductHaccp not found');
    toggleEnabledRecord(record, actor);
    await record.save();
    return {
      status: true,
      message: record.enabled
        ? 'Risk assessment enabled'
        : 'Risk assessment disabled',
      data: record,
    };
  }
}
