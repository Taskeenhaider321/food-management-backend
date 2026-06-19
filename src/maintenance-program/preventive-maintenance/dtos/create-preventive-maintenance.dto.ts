import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePreventiveMaintenanceDto {
  @ApiProperty({ description: 'Machine ID' })
  @IsString()
  machineId: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Date type', example: 'Daily' })
  @IsString()
  dateType: string;

  @ApiProperty({ description: 'Nature of fault' })
  @IsString()
  natureOfFault: string;

  @ApiProperty({ description: 'Root cause' })
  @IsString()
  rootCause: string;

  @ApiProperty({ description: 'Detail of work' })
  @IsString()
  detailOfWork: string;

  @ApiProperty({ description: 'Replacement' })
  @IsString()
  replacement: string;

  @ApiPropertyOptional({ description: 'JSON array of image URLs' })
  @IsOptional()
  @IsString()
  imageUrls?: string;

  @ApiPropertyOptional({ description: 'JSON array of certificate/document URLs' })
  @IsOptional()
  @IsString()
  certificateUrls?: string;

  @ApiPropertyOptional({ description: 'Generate certificate', required: false })
  @IsOptional()
  @IsString()
  generateCertificate?: string;

  @ApiPropertyOptional({ description: 'Submit by', required: false })
  @IsOptional()
  @IsString()
  submitBy?: string;
}
