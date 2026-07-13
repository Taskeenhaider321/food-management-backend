import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CalibrationRecordService } from './calibration-record.service';
import { CreateCalibrationRecordDto } from './dtos/create-calibration-record.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

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

  /** Must be registered before parameterized GET routes. */
  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download calibration records directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadCalibrationRecordsPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.calibrationRecordService.downloadCalibrationRecordsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /**
   * Must be registered before `by-equipment/:equipmentId/:departmentId`
   * so `download-pdf` is not captured as a departmentId.
   */
  @Get('by-equipment/:equipmentId/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download calibration records PDF for one equipment',
  })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadCalibrationRecordsByEquipmentPdf(
    @Param('equipmentId') equipmentId: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.calibrationRecordService.downloadCalibrationRecordsByEquipmentPdf(
        equipmentId,
        actor,
      );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
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

  /** Must be registered before any broader `GET :id` route. */
  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single calibration record PDF' })
  @ApiParam({ name: 'id', description: 'Calibration record ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadCalibrationRecordPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.calibrationRecordService.downloadCalibrationRecordPdf(
        id,
        actor,
      );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
