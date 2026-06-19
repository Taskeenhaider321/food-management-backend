import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessDetailDto } from './process-detail.dto';

export class UpdateProcessesDto {
  @IsOptional()
  @IsString()
  Department?: string;

  @IsOptional()
  @IsString()
  ProcessName?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessDetailDto)
  ProcessDetails?: ProcessDetailDto[];

  @IsString()
  updatedBy: string;
}
