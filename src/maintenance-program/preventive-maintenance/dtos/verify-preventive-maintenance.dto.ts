import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MAINTENANCE_VERIFICATION_ANSWERS,
  MAINTENANCE_VERIFICATION_CHECKLIST,
} from '../../common/maintenance-verification.constants';

export class VerificationChecklistItemDto {
  @ApiProperty({
    enum: MAINTENANCE_VERIFICATION_CHECKLIST.map((item) => item.key),
  })
  @IsString()
  key: string;

  @ApiProperty({ enum: MAINTENANCE_VERIFICATION_ANSWERS })
  @IsIn([...MAINTENANCE_VERIFICATION_ANSWERS])
  answer: string;

  @ApiPropertyOptional()
  @ValidateIf((item) => item.answer === 'No')
  @IsString()
  reason?: string;
}

export class VerifyMaintenanceDto {
  @ApiProperty()
  @IsString()
  verifiedBy: string;

  @ApiProperty({ type: [VerificationChecklistItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VerificationChecklistItemDto)
  checklist: VerificationChecklistItemDto[];
}

export class UpdatePreventiveMaintenanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  natureOfFault?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailOfWork?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replacement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrls?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrls?: string;
}
