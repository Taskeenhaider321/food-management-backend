import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsMongoId,
  IsArray,
  IsOptional,
  IsEnum,
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

  @ApiProperty({ enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

  @ApiProperty({ description: 'Primary department for document ID generation' })
  @IsMongoId()
  Department: string;

  @ApiPropertyOptional({ description: 'Multiple departments associated', type: [String] })
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
