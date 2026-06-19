import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested } from 'class-validator';
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
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

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
