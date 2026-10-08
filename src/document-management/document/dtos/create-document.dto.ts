import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CREATION_METHODS } from '../../common/constants';
import type { CreationMethod } from '../../common/constants';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Custom document type title' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiPropertyOptional({ description: 'Numeric DocumentId code' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  documentTypeCode?: number;

  @ApiProperty({
    description: 'JSON array (or comma separated list) of department ids',
  })
  @IsString()
  @IsNotEmpty()
  departments: string;

  @ApiProperty({ enum: CREATION_METHODS })
  @IsEnum(CREATION_METHODS)
  creationMethod: CreationMethod;

  @ApiPropertyOptional({ description: 'Rich text HTML (editor method)' })
  @IsOptional()
  @IsString()
  editorContent?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Custom document type title' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Numeric DocumentId code' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  documentTypeCode?: number;

  @ApiPropertyOptional({
    description: 'JSON array (or comma separated list) of department ids',
  })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiPropertyOptional({ description: 'Rich text HTML (editor method)' })
  @IsOptional()
  @IsString()
  editorContent?: string;
}

export class ActionReasonDto {
  @ApiProperty({ description: 'Reason for the rejection / disapproval' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
