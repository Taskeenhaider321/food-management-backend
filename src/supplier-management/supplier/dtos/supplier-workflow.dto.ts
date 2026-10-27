import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SupplierWorkflowActorDto {
  @ApiProperty({ example: 'Jane Reviewer' })
  @IsString()
  by: string;

  @ApiPropertyOptional({ example: 'Please upload updated HACCP certificate.' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class SupplierEvaluationCategoryDto {
  @ApiProperty({ example: 'food_safety_system' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Food safety management system' })
  @IsString()
  label: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  weight: number;
}

export class SaveSupplierEvaluationDto {
  @ApiProperty({ type: [SupplierEvaluationCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierEvaluationCategoryDto)
  categories: SupplierEvaluationCategoryDto[];

  @ApiProperty({ example: 'Jane Reviewer' })
  @IsString()
  evaluatedBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'When true, approval is blocked until resolved.',
  })
  @IsOptional()
  @IsBoolean()
  criticalIssuesFlag?: boolean;
}

export class ApproveSupplierByIdDto {
  @ApiProperty({ example: 'Jane Approver' })
  @IsString()
  approvedBy: string;

  @ApiPropertyOptional({ example: 'Raw materials — spices and herbs' })
  @IsOptional()
  @IsString()
  approvedScope?: string;
}
