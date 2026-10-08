import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanDto } from './plan.dto';

export class UpdateFoodSafetyPlanDto {
  @IsOptional()
  @IsString()
  Department?: string;

  @IsOptional()
  @IsString()
  @IsString()
  DocumentType?: string;

  @IsOptional()
  @IsString()
  DecisionTree?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDto)
  Plans?: PlanDto[];

  @IsString()
  updatedBy: string;
}
