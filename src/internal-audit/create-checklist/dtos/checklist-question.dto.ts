import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsMongoId, IsNumber } from 'class-validator';

export class ChecklistQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty()
  @IsString()
  questionText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  Required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  responseGroup?: string;

  @ApiPropertyOptional({
    enum: [
      'Yes/No',
      'GradingSystem',
      'Good/Fair/Poor',
      'Safe/AtRisk',
      'Pass/Fail',
      'Compliant/NonCompliant',
      'Conform/MinorNonConform/MajorNonConform/CriticalNonConform/Observation',
      'Custom',
    ],
  })
  @IsOptional()
  @IsEnum([
    'Yes/No',
    'GradingSystem',
    'Good/Fair/Poor',
    'Safe/AtRisk',
    'Pass/Fail',
    'Compliant/NonCompliant',
    'Conform/MinorNonConform/MajorNonConform/CriticalNonConform/Observation',
    'Custom',
  ])
  ComplianceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}
