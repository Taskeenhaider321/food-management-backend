import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsMongoId,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ChecklistQuestionDto } from './checklist-question.dto';
import { ChecklistSettingsDto } from './checklist-settings.dto';

export class CreateChecklistDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Custom or legacy document type title for this checklist',
  })
  @IsString()
  DocumentType: string;

  @ApiPropertyOptional({
    description: 'Numeric type code from custom document type (1–99)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  DocumentTypeCode?: number;

  @ApiProperty({ description: 'Primary department for document ID generation' })
  @IsMongoId()
  Department: string;

  @ApiPropertyOptional({
    description: 'Multiple departments associated',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  Departments?: string[];

  @ApiProperty({ description: 'User department (for filtering)' })
  @IsMongoId()
  departmentId: string;

  @ApiProperty()
  @IsString()
  createdBy: string;

  @ApiProperty({ type: [ChecklistQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistQuestionDto)
  ChecklistQuestions: ChecklistQuestionDto[];

  @ApiPropertyOptional({ type: ChecklistSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChecklistSettingsDto)
  settings?: ChecklistSettingsDto;
}
