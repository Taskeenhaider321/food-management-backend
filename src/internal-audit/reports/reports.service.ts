import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reports } from './schemas/reports.schema';
import { CreateReportDto } from './dtos/create-report.dto';
import { Checklist } from '../create-checklist/schemas/checklist.schema';
import { ConductAudits } from '../conduct-audits/schemas/conduct-audits.schema';
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

function applyReportPopulate<T>(query: T): T {
  return (query as any)
    .populate('UserDepartment')
    .populate({
      path: 'ConductAudit',
      populate: [
        { path: 'Checklist', populate: { path: 'Department' } },
        { path: 'Answers', populate: { path: 'question' } },
      ],
    })
    .populate({
      path: 'SelectedAnswers.Answer',
      populate: { path: 'question' },
    });
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Reports.name) private reportsModel: Model<Reports>,
    @InjectModel(Checklist.name) private checklistModel: Model<Checklist>,
    @InjectModel(ConductAudits.name)
    private conductAuditsModel: Model<ConductAudits>,
    @InjectModel('Company') private readonly companyModel: Model<any>,
  ) {}

  private async departmentChecklistIds(
    departmentId: string,
  ): Promise<string[]> {
    const checklistIds = await this.checklistModel
      .find({
        $or: [
          { UserDepartment: departmentId as any },
          { Department: departmentId as any },
          { Departments: departmentId as any },
        ],
      })
      .distinct('_id');
    return checklistIds.map((id) => String(id));
  }

  private async departmentConductAuditIds(
    departmentId: string,
  ): Promise<string[]> {
    const checklistIdStrings = await this.departmentChecklistIds(departmentId);
    const auditFilter =
      checklistIdStrings.length > 0
        ? {
            $or: [
              { UserDepartment: departmentId },
              { Checklist: { $in: checklistIdStrings } },
            ],
          }
        : { UserDepartment: departmentId };

    const auditIds = await this.conductAuditsModel
      .find(auditFilter as any)
      .distinct('_id');
    return auditIds.map((id) => String(id));
  }

  private async departmentReportFilter(departmentId: string) {
    const conductAuditIds = await this.departmentConductAuditIds(departmentId);
    if (conductAuditIds.length > 0) {
      return {
        $or: [
          { UserDepartment: departmentId },
          { ConductAudit: { $in: conductAuditIds } },
        ],
      };
    }
    return { UserDepartment: departmentId };
  }

  async addReport(createDto: CreateReportDto) {
    const report = new this.reportsModel({
      ConductAudit: createDto.ConductAudit,
      ReportBy: createDto.reportBy,
      ReportDate: new Date(),
      UserDepartment: createDto.departmentId,
      SelectedAnswers: createDto.SelectedAnswers || [],
    });

    await report.save();
    const populated = await applyReportPopulate(
      this.reportsModel.findById(report._id),
    );
    return {
      status: true,
      message: 'The Report is added!',
      data: populated ?? report,
    };
  }

  async readReports(departmentId: string) {
    const reports = await applyReportPopulate(
      this.reportsModel.find(
        (await this.departmentReportFilter(departmentId)) as any,
      ),
    ).sort({ ReportDate: -1 });
    return {
      status: true,
      message: 'The following are Reports!',
      data: reports,
    };
  }

  async readReportByAuditId(auditId: string, _departmentId: string) {
    const reports = await applyReportPopulate(
      this.reportsModel.find({ ConductAudit: auditId as any }),
    ).sort({ ReportDate: -1 });
    return {
      status: true,
      message: 'The following are Reports!',
      data: reports,
    };
  }

  async readReportById(reportId: string) {
    const report = await applyReportPopulate(
      this.reportsModel.findById(reportId),
    );
    if (!report) throw new NotFoundException('Report not found!');

    const totalCollections = await this.reportsModel.countDocuments();
    return {
      status: true,
      message: 'The following are Reports!',
      totaldocuments: totalCollections,
      data: report,
    };
  }

  async deleteReport(id: string) {
    const deleted = await this.reportsModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Report not found!');
    return { status: true, message: 'Report has been deleted!', data: deleted };
  }

  async deleteAllReports(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.reportsModel.deleteMany({});
    if (result.deletedCount === 0)
      throw new NotFoundException('No Reports Found to Delete!');
    return {
      status: true,
      message: 'All Reports have been deleted!',
      data: result,
    };
  }

  private mapReportPdfRow(report: any) {
    const findings = Array.isArray(report?.SelectedAnswers)
      ? report.SelectedAnswers
      : [];
    const shortId = report?._id
      ? String(report._id).slice(-8).toUpperCase()
      : '---';
    return {
      id: asText(shortId),
      ReportBy: asText(report?.ReportBy),
      ReportDate: formatDate(report?.ReportDate || report?.created_at),
      findingsCount: String(findings.length),
      CreatedBy: asText(report?.CreatedBy || report?.ReportBy),
      checklistTitle: asText(
        report?.ConductAudit?.Checklist?.title ||
          report?.ConductAudit?.Checklist?.ChecklistId,
      ),
    };
  }

  private findingsSummaryRows(report: any): Array<[string, string]> {
    const findings = Array.isArray(report?.SelectedAnswers)
      ? report.SelectedAnswers
      : [];
    return findings.map((item: any, index: number) => {
      const questionText =
        item?.Answer?.question?.questionText ||
        item?.Answer?.questionText ||
        'Finding';
      const target = formatDate(item?.TargetDate);
      return [
        `Finding ${index + 1}`,
        `${asText(questionText)} | Target: ${target}`,
      ];
    });
  }

  async downloadReportsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const data = await applyReportPopulate(this.reportsModel.find()).sort({
      ReportDate: -1,
    });

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'NCR Reports Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'id', label: 'ID', width: 1.2 },
        { key: 'ReportBy', label: 'REPORT BY', width: 1.8 },
        { key: 'ReportDate', label: 'REPORT DATE', width: 1.4 },
        { key: 'findingsCount', label: 'FINDINGS', width: 1.2 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.8 },
      ],
      rows: (data || []).map((r) => this.mapReportPdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('ncr-reports', 'directory'),
    };
  }

  async downloadReportPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const report = await applyReportPopulate(this.reportsModel.findById(id));
    if (!report) throw new NotFoundException('Report not found!');

    const row = this.mapReportPdfRow(report);
    const findingsRows = this.findingsSummaryRows(report);

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.id !== '---' ? `NCR ${row.id}` : 'NCR Report',
      subtitle: row.checklistTitle !== '---' ? row.checklistTitle : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Report ID', row.id],
        ['Report By', row.ReportBy],
        ['Report Date', row.ReportDate],
        ['Findings Count', row.findingsCount],
        ['Created By', row.CreatedBy],
        ['Checklist', row.checklistTitle],
      ],
      sections: findingsRows.length
        ? [{ heading: 'Findings Summary', rows: findingsRows }]
        : [],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.id !== '---' ? `ncr-${row.id}` : 'ncr-report',
        'report',
      ),
    };
  }
}
