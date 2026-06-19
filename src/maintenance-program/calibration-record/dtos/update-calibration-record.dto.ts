import { PartialType } from '@nestjs/swagger';
import { CreateCalibrationRecordDto } from './create-calibration-record.dto';

export class UpdateCalibrationRecordDto extends PartialType(CreateCalibrationRecordDto) {}
