// TEST/hr/yearly-training-plan/yearly-training-plan.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Header,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { YearlyTrainingPlanService } from './yearly-training-plan.service';
import { CreateYearlyTrainingPlanDto } from './dtos/create-yearly-training-plan.dto';
import { UpdateYearlyTrainingPlanDto } from './dtos/update-yearly-training-plan.dto';

@ApiTags('Yearly Training Plans')
@Controller('yearly-training-plans')
export class YearlyTrainingPlanController {
  constructor(private readonly service: YearlyTrainingPlanService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update yearly training plan' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plan created/updated successfully',
  })
  async create(
    @Body() createDto: CreateYearlyTrainingPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.create(createDto, user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get yearly plans for your company',
    description:
      'Resolves company from the authenticated user and returns plans for all departments in that company.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plans found' })
  async findForCompany(@CurrentUser() user: any) {
    return this.service.findForActor(user);
  }

  /** Must be registered before parameterized `:id` routes. */
  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download yearly training plans directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadYearlyTrainingPlansPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.service.downloadYearlyTrainingPlansPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before parameterized `:id` routes. */
  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single yearly training plan PDF' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadYearlyTrainingPlanPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.service.downloadYearlyTrainingPlanPdf(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update yearly training plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateYearlyTrainingPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete yearly plan by id' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all yearly plans' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All plans deleted successfully',
  })
  async deleteAll() {
    return this.service.deleteAll();
  }
}
