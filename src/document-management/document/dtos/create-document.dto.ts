import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CREATION_METHODS, DOCUMENT_TYPES } from '../../common/constants';
import type { CreationMethod, DocumentType } from '../../common/constants';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsEnum(DOCUMENT_TYPES)
  documentType: DocumentType;

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

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsEnum(DOCUMENT_TYPES)
  documentType?: DocumentType;

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
