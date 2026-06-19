import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
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
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

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
