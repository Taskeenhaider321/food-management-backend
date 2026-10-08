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
import { ProcessDetailDto } from './process-detail.dto';

export class CreateProcessesDto {
  @IsString()
  @IsNotEmpty()
  Department: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsOptional()
  @IsString()
  ProcessName?: string;

  @IsString()
  @IsNotEmpty()
  DocumentType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  DocumentTypeCode?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessDetailDto)
  ProcessDetails: ProcessDetailDto[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
