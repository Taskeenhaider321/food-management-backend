import { Type } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCalibrationRecordDto {
  @ApiProperty({ description: 'Company ID', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: 'Pre-uploaded image URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Pre-uploaded calibration certificate URL', required: false })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiProperty({ description: 'Pre-uploaded master certificate URL', required: false })
  @IsOptional()
  @IsString()
  masterCertificateUrl?: string;

  @ApiProperty({ description: 'Pre-uploaded external certificate URL', required: false })
  @IsOptional()
  @IsString()
  exCertificateUrl?: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Last calibration date' })
  @IsString()
  lastDate: string;

  @ApiProperty({ description: 'Next calibration date' })
  @IsString()
  nextDate: string;

  @ApiProperty({ description: 'Date type' })
  @IsString()
  dateType: string;

  @ApiProperty({ description: 'Calibration type', enum: ['Internal', 'External'] })
  @IsEnum(['Internal', 'External'])
  callibrationType: string;

  @ApiProperty({ description: 'CR number' })
  @IsString()
  CR: string;

  @ApiProperty({ description: 'Comment' })
  @IsString()
  comment: string;

  @ApiProperty({ description: 'First reading' })
  @Type(() => Number)
  @IsNumber()
  firstReading: number;

  @ApiProperty({ description: 'Second reading' })
  @Type(() => Number)
  @IsNumber()
  secondReading: number;

  @ApiProperty({ description: 'Third reading' })
  @Type(() => Number)
  @IsNumber()
  thirdReading: number;

  @ApiProperty({ description: 'Company name for external calibration', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Master reference for external calibration', required: false })
  @IsOptional()
  @IsString()
  masterReference?: string;
}
