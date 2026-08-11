import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
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

export class VerifyWorkRequestDto {
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
