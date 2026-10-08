import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HazardDto } from './hazard.dto';

export class CreateConductHaccpDto {
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

  @IsString()
  @IsNotEmpty()
  Process: string;

  @IsArray()
  @IsString({ each: true })
  Teams: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HazardDto)
  Hazards: HazardDto[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
