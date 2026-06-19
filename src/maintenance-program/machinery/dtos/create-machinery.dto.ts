import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class MaintenanceFrequencyDto {
  @ApiProperty({ example: 'Monthly' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Reason for selecting this maintenance frequency' })
  @IsString()
  reason: string;
}

export class CreateMachineryDto {
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  createdBy: string;

  @ApiProperty()
  @IsString()
  machineName: string;

  @ApiProperty()
  @IsString()
  machinaryLocation: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => MaintenanceFrequencyDto)
  maintenanceFrequency: MaintenanceFrequencyDto;
}
