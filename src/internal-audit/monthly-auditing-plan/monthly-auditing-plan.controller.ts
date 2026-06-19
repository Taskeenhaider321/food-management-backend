import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MonthlyAuditingPlanService } from './monthly-auditing-plan.service';
import { CreateMonthlyPlanDto } from './dtos/create-monthly-plan.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Monthly Audit Plan')
@Controller('monthly-audit-plan')
export class MonthlyAuditingPlanController {
  constructor(
    private readonly monthlyPlanService: MonthlyAuditingPlanService,
  ) {}

  @Post()
  @ApiBearerAuth()
  async addMonthlyAuditingPlan(@Body() createDto: CreateMonthlyPlanDto) {
    return this.monthlyPlanService.addMonthlyAuditingPlan(createDto);
  }

  @Get(':departmentId')
  @ApiBearerAuth()
  async readMonthlyAuditPlan(@Param('departmentId') departmentId: string) {
    return this.monthlyPlanService.readMonthlyAuditPlan(departmentId);
  }

  @Get(':planId')
  @ApiBearerAuth()
  async readMonthlyAuditPlanById(@Param('planId') planId: string) {
    return this.monthlyPlanService.readMonthlyAuditPlanById(planId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteMonthlyPlan(@Body('id') id: string) {
    return this.monthlyPlanService.deleteMonthlyPlan(id);
  }
}
