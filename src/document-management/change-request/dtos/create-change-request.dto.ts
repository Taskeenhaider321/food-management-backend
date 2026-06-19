import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CHANGE_REQUEST_TARGET_MODELS } from '../schemas/change-request.schema';

export class CreateChangeRequestDto {
  @ApiProperty({ description: 'Mongo id of the controlled document / form' })
  @IsMongoId()
  document: string;

  @ApiProperty({ enum: CHANGE_REQUEST_TARGET_MODELS })
  @IsEnum(CHANGE_REQUEST_TARGET_MODELS)
  documentModel: string;

  @ApiProperty({ description: 'Reason for the requested change' })
  @IsString()
  @IsNotEmpty()
  changeReason: string;
}

export class UpdateChangeRequestDto {
  @ApiPropertyOptional({ description: 'Mongo id of the controlled document / form' })
  @IsOptional()
  @IsMongoId()
  document?: string;

  @ApiPropertyOptional({ enum: CHANGE_REQUEST_TARGET_MODELS })
  @IsOptional()
  @IsEnum(CHANGE_REQUEST_TARGET_MODELS)
  documentModel?: string;

  @ApiPropertyOptional({ description: 'Reason for the requested change' })
  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class DisapproveChangeRequestDto {
  @ApiProperty({ description: 'Reason for disapproval' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
