import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsMongoId,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ChecklistQuestionDto } from './checklist-question.dto';
import { ChecklistSettingsDto } from './checklist-settings.dto';

export class UpdateChecklistDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [ChecklistQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistQuestionDto)
  ChecklistQuestions?: ChecklistQuestionDto[];

  @ApiPropertyOptional({ type: ChecklistSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChecklistSettingsDto)
  settings?: ChecklistSettingsDto;

  @ApiProperty()
  @IsString()
  updatedBy: string;
}
