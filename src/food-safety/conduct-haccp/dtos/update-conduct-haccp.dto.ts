import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HazardDto } from './hazard.dto';

export class UpdateConductHaccpDto {
  @IsOptional()
  @IsString()
  Department?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType?: string;

  @IsOptional()
  @IsString()
  Process?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  Teams?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HazardDto)
  Hazards?: HazardDto[];

  @IsString()
  updatedBy: string;
}
