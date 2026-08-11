import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { YearlyAuditingPlan } from './schemas/yearly-auditing-plan.schema';
import { CreateYearlyPlanDto } from './dtos/create-yearly-plan.dto';
import { UpdateYearlyPlanDto } from './dtos/update-yearly-plan.dto';
import { ProcessOwner } from '../process-owner/schemas/process-owner.schema';
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

const RISK_MIN_AUDITS: Record<string, number> = {
  'High Risk': 3,
  'Medium Risk': 2,
  'Low Risk': 1,
};

const YEARLY_PLAN_POPULATE = [
  {
    path: 'Selected.Process',
    populate: {
      path: 'profileId',
      populate: { path: 'userId' },
    },
  },
  {
    path: 'Selected.AssignedAuditor',
    populate: {
      path: 'profileId',
      populate: { path: 'userId' },
    },
  },
  { path: 'UserDepartment' },
];

@Injectable()
export class YearlyAuditingPlanService {
  constructor(
    @InjectModel(YearlyAuditingPlan.name)
    private yearlyPlanModel: Model<YearlyAuditingPlan>,
    @InjectModel(ProcessOwner.name)
    private processOwnerModel: Model<ProcessOwner>,
    @InjectModel('Company') private readonly companyModel: Model<any>,
  ) {}

  private validateRiskSchedule(
    selected: { Risk: string; monthNames: string[] }[],
  ) {
    for (const item of selected) {
      const minRequired = RISK_MIN_AUDITS[item.Risk];
      if (minRequired && item.monthNames.length < minRequired) {
        throw new BadRequestException(
          `${item.Risk} processes must be scheduled at least ${minRequired} time(s) per year. Got ${item.monthNames.length}.`,
        );
      }
    }
  }

  async addYearlyAuditPlan(createDto: CreateYearlyPlanDto) {
    const existing = await this.yearlyPlanModel.findOne({
      Year: createDto.Year,
      UserDepartment: createDto.departmentId as any,
    });
    if (existing) {
      throw new BadRequestException(
        "YearlyAuditPlan for this year already exists. You can't create new one directly. Please edit the added plan.",
      );
    }

    this.validateRiskSchedule(createDto.Selected);

    const plan = new this.yearlyPlanModel({
      ...createDto,
      UserDepartment: createDto.departmentId,
      CreationDate: new Date(),
    });

    await plan.save();
    return {
      status: true,
      message: 'The YearlyAuditPlan is added!',
      data: plan,
    };
  }

  async editYearlyAuditPlan(updateDto: UpdateYearlyPlanDto) {
    const existing = await this.yearlyPlanModel.findOne({
      Year: updateDto.Year,
      UserDepartment: updateDto.departmentId as any,
    });
    if (!existing) {
      throw new BadRequestException(
        'YearlyAuditPlan for this year is not added. Please add new plan for this year.',
      );
    }

    if (updateDto.Selected) {
      this.validateRiskSchedule(updateDto.Selected);
    }

    const { _id, departmentId, ...rest } = updateDto;
    const updated = await this.yearlyPlanModel.findByIdAndUpdate(
      _id,
      { ...rest, UserDepartment: departmentId },
      { returnDocument: 'after' },
    );
    return {
      status: true,
      message: 'The YearlyAuditPlan is Updated!',
      data: updated,
    };
  }

  async readYearlyAuditPlan(departmentId: string) {
    const plans = await this.yearlyPlanModel
      .find({ UserDepartment: departmentId as any })
      .populate({
        path: 'Selected.Process',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate({
        path: 'Selected.AssignedAuditor',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate('UserDepartment');
    return {
      status: true,
      message: 'Yearly Audit Plans retrieved successfully',
      data: plans,
    };
  }

  async readYearlyAuditPlanById(planId: string) {
    const plan = await this.yearlyPlanModel
      .findById(planId)
      .populate({
        path: 'Selected.Process',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate({
        path: 'Selected.AssignedAuditor',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate('UserDepartment');
    if (!plan) throw new NotFoundException('YearlyAuditPlan not found');
    return {
      status: true,
      message: 'The following is the yearlyAuditPlan!',
      data: plan,
    };
  }

  async deleteYearlyAuditPlan(planId: string) {
    const deleted = await this.yearlyPlanModel.findByIdAndDelete(planId);
    if (!deleted)
      throw new NotFoundException('This YearlyAuditPlan is Not found!');
    return {
      status: true,
      message: 'The following yearlyAuditPlan has been Deleted!',
      data: deleted,
    };
  }

  async deleteAllYearlyAuditPlans(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.yearlyPlanModel.deleteMany({});
    if (result.deletedCount === 0)
      throw new NotFoundException('No YearlyAuditPlans Found to delete!');
    return {
      status: true,
      message: 'All yearlyAuditPlans have been deleted!',
      data: result,
    };
  }

  private mapYearlyPlanPdfRow(plan: any) {
    const selected = Array.isArray(plan?.Selected) ? plan.Selected : [];
    const department =
      plan?.UserDepartment?.departmentName ||
      plan?.UserDepartment?.shortName ||
      '---';
    return {
      Year: asText(plan?.Year),
      Status: asText(plan?.Status),
      department: asText(department),
      processesCount: String(selected.length),
      CreatedBy: asText(plan?.CreatedBy),
      CreationDate: formatDate(plan?.CreationDate || plan?.created_at),
    };
  }

  private selectedItemRows(plan: any): Array<[string, string]> {
    const selected = Array.isArray(plan?.Selected) ? plan.Selected : [];
    return selected.map((item: any, index: number) => {
      const processName =
        item?.Process?.processName || item?.Process?.processCode || '---';
      const auditorName =
        item?.AssignedAuditor?.profileId?.userId?.name ||
        item?.AssignedAuditor?.profileId?.name ||
        '---';
      const months = asText(item?.monthNames);
      const risk = asText(item?.Risk);
      return [
        `Item ${index + 1}`,
        `Process: ${processName} | Risk: ${risk} | Months: ${months} | Auditor: ${auditorName}`,
      ];
    });
  }

  async downloadYearlyPlansPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const data = await this.yearlyPlanModel
      .find()
      .populate(YEARLY_PLAN_POPULATE)
      .sort({ Year: -1 })
      .exec();

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Audit Schedules Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'Year', label: 'YEAR', width: 1 },
        { key: 'Status', label: 'STATUS', width: 1.3 },
        { key: 'department', label: 'DEPARTMENT', width: 1.8 },
        { key: 'processesCount', label: 'PROCESSES', width: 1.2 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.5 },
        { key: 'CreationDate', label: 'CREATED', width: 1.3 },
      ],
      rows: (data || []).map((r) => this.mapYearlyPlanPdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('audit-schedules', 'directory'),
    };
  }

  async downloadYearlyPlanPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const plan = await this.yearlyPlanModel
      .findById(id)
      .populate(YEARLY_PLAN_POPULATE)
      .exec();
    if (!plan) throw new NotFoundException('YearlyAuditPlan not found');

    const row = this.mapYearlyPlanPdfRow(plan);
    const selectedRows = this.selectedItemRows(plan);

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.Year !== '---' ? `Year ${row.Year}` : 'Audit Schedule',
      subtitle: row.department !== '---' ? row.department : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Year', row.Year],
        ['Status', row.Status],
        ['Department', row.department],
        ['Processes Count', row.processesCount],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
      sections: selectedRows.length
        ? [{ heading: 'Selected Processes', rows: selectedRows }]
        : [],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.Year !== '---' ? `year-${row.Year}` : 'audit-schedule',
        'plan',
      ),
    };
  }
}
