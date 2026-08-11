import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dtos/create-report.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Add report' })
  @ApiBearerAuth()
  async addReport(@Body() createDto: CreateReportDto) {
    return this.reportsService.addReport(createDto);
  }

  /** Must be registered before `GET :reportId`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download NCR reports directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadReportsPdf(@CurrentUser() actor: any): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.reportsService.downloadReportsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :reportId`. */
  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download a single NCR report PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadReportPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.reportsService.downloadReportPdf(
      id,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async readReports(@Param('departmentId') departmentId: string) {
    return this.reportsService.readReports(departmentId);
  }

  @Get('by-audit/:auditId/:departmentId')
  @ApiBearerAuth()
  async readReportByAuditId(
    @Param('auditId') auditId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.reportsService.readReportByAuditId(auditId, departmentId);
  }

  @Get(':reportId')
  @ApiBearerAuth()
  async readReportById(@Param('reportId') reportId: string) {
    return this.reportsService.readReportById(reportId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteReport(@Body('id') id: string) {
    return this.reportsService.deleteReport(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllReports(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.reportsService.deleteAllReports();
  }
}
