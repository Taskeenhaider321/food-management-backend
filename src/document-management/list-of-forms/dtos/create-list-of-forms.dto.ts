import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DOCUMENT_TYPES, QUESTION_TYPES } from '../../common/constants';
import type { DocumentType, QuestionType } from '../../common/constants';

export class FormQuestionDto {
  @ApiProperty({ enum: QUESTION_TYPES })
  @IsEnum(QUESTION_TYPES)
  questionType: QuestionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rows?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class FormCustomSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequencyRule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reminderConfiguration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  themeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formStyling?: string;
}

export class CreateListOfFormsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  formName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsEnum(DOCUMENT_TYPES)
  documentType: DocumentType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  departments: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  maintenanceFrequency: string;

  @ApiPropertyOptional({ type: FormCustomSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormCustomSettingsDto)
  customSettings?: FormCustomSettingsDto;

  @ApiProperty({ type: [FormQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormQuestionDto)
  questions: FormQuestionDto[];
}

export class UpdateListOfFormsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsEnum(DOCUMENT_TYPES)
  documentType?: DocumentType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  departments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceFrequency?: string;

  @ApiPropertyOptional({ type: FormCustomSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormCustomSettingsDto)
  customSettings?: FormCustomSettingsDto;

  @ApiPropertyOptional({ type: [FormQuestionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormQuestionDto)
  questions?: FormQuestionDto[];
}

export class FormActionReasonDto {
  @ApiProperty({ description: 'Reason for the rejection / disapproval' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
