import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
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
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessDetailDto)
  ProcessDetails: ProcessDetailDto[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
