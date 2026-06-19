import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { YearlyAuditingPlanService } from './yearly-auditing-plan.service';
import { CreateYearlyPlanDto } from './dtos/create-yearly-plan.dto';
import { UpdateYearlyPlanDto } from './dtos/update-yearly-plan.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Yearly Audit Plan')
@Controller('yearly-audit-plan')
export class YearlyAuditingPlanController {
  constructor(private readonly yearlyPlanService: YearlyAuditingPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Add yearly audit plan' })
  @ApiBearerAuth()
  async addYearlyAuditPlan(@Body() createDto: CreateYearlyPlanDto) {
    return this.yearlyPlanService.addYearlyAuditPlan(createDto);
  }

  @Put(':planId')
  @ApiBearerAuth()
  async editYearlyAuditPlan(@Body() updateDto: UpdateYearlyPlanDto) {
    return this.yearlyPlanService.editYearlyAuditPlan(updateDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async readYearlyAuditPlan(@Param('departmentId') departmentId: string) {
    return this.yearlyPlanService.readYearlyAuditPlan(departmentId);
  }

  @Get(':planId')
  @ApiBearerAuth()
  async readYearlyAuditPlanById(@Param('planId') planId: string) {
    return this.yearlyPlanService.readYearlyAuditPlanById(planId);
  }

  @Delete(':planId')
  @ApiBearerAuth()
  async deleteYearlyAuditPlan(@Param('planId') planId: string) {
    return this.yearlyPlanService.deleteYearlyAuditPlan(planId);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllYearlyAuditPlans(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.yearlyPlanService.deleteAllYearlyAuditPlans();
  }
}
