import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { MaintenanceFrequencyDto } from './create-machinery.dto';

export class UpdateMachineryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machinaryLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MaintenanceFrequencyDto)
  maintenanceFrequency?: MaintenanceFrequencyDto;

  @ApiPropertyOptional({ description: 'Creation date override for status testing' })
  @IsOptional()
  @IsDateString()
  CreationDate?: string;

  @ApiPropertyOptional({ description: 'Last maintenance date override for status testing' })
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Next maintenance due date override for status testing' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDueDate?: string;
}
