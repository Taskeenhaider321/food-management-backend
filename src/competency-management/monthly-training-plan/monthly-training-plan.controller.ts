// TEST/hr/monthly-training-plan/monthly-training-plan.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary:
      'Create or update monthly training plan (upsert by year, month, training)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plan created or updated successfully',
  })
  async create(
    @Body() createDto: CreateMonthlyTrainingPlanDto,
    @CurrentUser() user: any,
  ) {
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

  /** Must be registered before parameterized GET routes. */
  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download monthly training plans directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadMonthlyTrainingPlansPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.service.downloadMonthlyTrainingPlansPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assigned trainings found',
  })
  async assigned(@CurrentUser() user: any) {
    return this.service.findAssignedToTrainer(user);
  }

  @Get('record-details/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get training record details with per-employee evaluations',
  })
  @ApiParam({ name: 'id', description: 'Monthly plan ID' })
  async getRecordDetails(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.service.getRecordDetails(id, actor);
  }

  /** Must be registered before other parameterized `:id` routes. */
  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single monthly training plan PDF' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadMonthlyTrainingPlanPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.service.downloadMonthlyTrainingPlanPdf(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
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
  @ApiOperation({
    summary: 'Mark employee training as conducted with documents',
  })
  async conductEmployee(
    @Body() dto: ConductEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.conductEmployee(dto, user);
  }

  @Patch('assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign employees to monthly plan' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employees assigned successfully',
  })
  async assignEmployee(
    @Body() assignDto: AssignEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.assignEmployee(assignDto, user);
  }

  @Patch('training-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update training status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status updated successfully',
  })
  async updateTrainingStatus(
    @Body() updateDto: UpdateTrainingStatusDto[],
    @CurrentUser() actor: any,
  ) {
    return this.service.updateTrainingStatus(updateDto, actor);
  }

  @Patch('images')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload images to monthly plan' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Images uploaded successfully',
  })
  @UseInterceptors(FilesInterceptor('Images'))
  async uploadImages(
    @Body() body: UploadImagesDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: any,
  ) {
    return this.service.uploadImages(body.planId, files, actor);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update monthly training plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan updated successfully',
  })
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All plans deleted successfully',
  })
  async removeAll(@CurrentUser() actor: any) {
    return this.service.deleteAll(actor);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete monthly plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan deleted successfully',
  })
  async remove(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.service.delete(id, actor);
  }
}
