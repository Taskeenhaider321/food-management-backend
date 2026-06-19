import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DecisionDto } from './decision.dto';

export class UpdateDecisionTreeDto {
  @IsOptional()
  @IsString()
  Department?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType?: string;

  @IsOptional()
  @IsString()
  ConductHaccp?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecisionDto)
  Decisions?: DecisionDto[];

  @IsString()
  updatedBy: string;
}
