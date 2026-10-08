import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DecisionDto } from './decision.dto';

export class CreateDecisionTreeDto {
  @IsString()
  @IsNotEmpty()
  Department: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  DocumentType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  DocumentTypeCode?: number;

  @IsOptional()
  @IsString()
  ConductHaccp?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecisionDto)
  Decisions: DecisionDto[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
