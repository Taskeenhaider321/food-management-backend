import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dtos/create-report.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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
