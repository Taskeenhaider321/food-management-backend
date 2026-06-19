// TEST/hr/training/training.controller.ts
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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TrainingService } from './training.service';
import { CreateTrainingDto } from './dtos/create-training.dto';
import { UpdateTrainingDto } from './dtos/update-training.dto';

@ApiTags('Trainings')
@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List trainings for your company' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trainings found' })
  async findAll(@CurrentUser() actor: any) {
    return this.trainingService.findAllForActor(actor);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create training with material upload' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Training created successfully',
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'TrainingMaterial', maxCount: 1 }]),
  )
  async create(
    @Body() createTrainingDto: CreateTrainingDto,
    @UploadedFiles() files: { TrainingMaterial?: Express.Multer.File[] },
    @CurrentUser() actor: any,
  ) {
    return this.trainingService.create(createTrainingDto, files, actor);
  }

  @Get(':departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trainings by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trainings found' })
  async findByDepartment(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.trainingService.findByDepartment(departmentId, actor);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update training by id' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training updated successfully',
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'TrainingMaterial', maxCount: 1 }]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTrainingDto,
    @UploadedFiles() files: { TrainingMaterial?: Express.Multer.File[] },
    @CurrentUser() actor: any,
  ) {
    return this.trainingService.update(id, updateDto, files, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all trainings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All trainings deleted successfully',
  })
  async deleteAll() {
    return this.trainingService.deleteAll();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete training by id' })
  @ApiParam({ name: 'id', description: 'Training ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return this.trainingService.delete(id);
  }
}
