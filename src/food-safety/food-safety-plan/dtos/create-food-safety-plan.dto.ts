import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanDto } from './plan.dto';

export class CreateFoodSafetyPlanDto {
  @IsString()
  @IsNotEmpty()
  Department: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

  @IsOptional()
  @IsString()
  DecisionTree?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDto)
  Plans: PlanDto[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
