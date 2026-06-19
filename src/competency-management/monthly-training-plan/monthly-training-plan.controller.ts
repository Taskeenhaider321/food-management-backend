// TEST/hr/monthly-training-plan/monthly-training-plan.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MonthlyTrainingPlanService } from './monthly-training-plan.service';
import {
  CreateMonthlyTrainingPlanDto,
  AssignEmployeeDto,
  UpdateTrainingStatusDto,
  UploadImagesDto,
} from './dtos/create-monthly-training-plan.dto';
import { UpdateMonthlyTrainingPlanDto } from './dtos/update-monthly-training-plan.dto';
import {
  ConductEmployeeDto,
  EvaluateEmployeeDto,
} from './dtos/evaluate-conduct.dto';

@ApiTags('Monthly Training Plans')
@Controller('monthly-training-plans')
export class MonthlyTrainingPlanController {
  constructor(private readonly service: MonthlyTrainingPlanService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update monthly training plan (upsert by year, month, training)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Plan created or updated successfully' })
  async create(@Body() createDto: CreateMonthlyTrainingPlanDto, @CurrentUser() user: any) {
    return this.service.create(createDto, user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get monthly plans for your company',
    description:
      'Resolves company from the authenticated user and returns plans for all departments in that company.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plans found' })
  async findForCompany(@CurrentUser() user: any) {
    return this.service.findForActor(user);
  }

  @Get('analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get competency schedule analytics for dashboards' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analytics found' })
  async analytics(@CurrentUser() user: any) {
    return this.service.analytics(user);
  }

  @Get('assigned')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trainings assigned to the signed-in trainer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assigned trainings found' })
  async assigned(@CurrentUser() user: any) {
    return this.service.findAssignedToTrainer(user);
  }

  @Get('record-details/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get training record details with per-employee evaluations' })
  @ApiParam({ name: 'id', description: 'Monthly plan ID' })
  async getRecordDetails(@Param('id') id: string) {
    return this.service.getRecordDetails(id);
  }

  @Patch('evaluate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save trainer evaluation for an assigned employee' })
  async evaluateEmployee(
    @Body() dto: EvaluateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.evaluateEmployee(dto, user);
  }

  @Patch('conduct-employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark employee training as conducted with documents' })
  async conductEmployee(
    @Body() dto: ConductEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.conductEmployee(dto, user);
  }

  @Patch('assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign employees to monthly plan' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Employees assigned successfully' })
  async assignEmployee(
    @Body() assignDto: AssignEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.assignEmployee(assignDto, user);
  }

  @Patch('training-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update training status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated successfully' })
  async updateTrainingStatus(@Body() updateDto: UpdateTrainingStatusDto[]) {
    return this.service.updateTrainingStatus(updateDto);
  }

  @Patch('images')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload images to monthly plan' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.OK, description: 'Images uploaded successfully' })
  @UseInterceptors(FilesInterceptor('Images'))
  async uploadImages(@Body() body: UploadImagesDto, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.uploadImages(body.planId, files);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update monthly training plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plan updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMonthlyTrainingPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all monthly plans' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All plans deleted successfully' })
  async removeAll() {
    return this.service.deleteAll();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete monthly plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plan deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
