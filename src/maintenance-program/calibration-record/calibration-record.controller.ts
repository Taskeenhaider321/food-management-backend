import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { CalibrationRecordService } from './calibration-record.service';
import { CreateCalibrationRecordDto } from './dtos/create-calibration-record.dto';

@ApiTags('Calibration Records')
@Controller('calibration-record')
export class CalibrationRecordController {
  constructor(
    private readonly calibrationRecordService: CalibrationRecordService,
  ) {}

  @Post(':equipmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add calibration record for equipment' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'Image', maxCount: 1 },
      { name: 'Certificate', maxCount: 1 },
      { name: 'exCertificate', maxCount: 1 },
      { name: 'masterCertificate', maxCount: 1 },
    ]),
  )
  async create(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateCalibrationRecordDto,
    @UploadedFiles()
    files?: {
      Image?: Express.Multer.File[];
      Certificate?: Express.Multer.File[];
      exCertificate?: Express.Multer.File[];
      masterCertificate?: Express.Multer.File[];
    },
  ) {
    return this.calibrationRecordService.create(equipmentId, dto, files);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all calibration records by department' })
  async findAll(@Param('departmentId') departmentId: string) {
    return this.calibrationRecordService.findAll(departmentId);
  }

  @Get('by-equipment/:equipmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get calibration records by equipment ID' })
  async findByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.calibrationRecordService.findByEquipmentId(equipmentId);
  }

  @Get('by-equipment/:equipmentId/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get calibration records by equipment ID' })
  async findByEquipmentId(
    @Param('equipmentId') equipmentId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.calibrationRecordService.findByEquipmentId(
      equipmentId,
      departmentId,
    );
  }
}
