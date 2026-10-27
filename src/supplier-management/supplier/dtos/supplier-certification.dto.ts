import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SupplierCertificationDto {
  @ApiProperty({ example: 'iso-22000' })
  @IsString()
  catalogueId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    enum: ['certification', 'regulatory', 'individual_qualification'],
  })
  @IsOptional()
  @IsEnum(['certification', 'regulatory', 'individual_qualification'])
  kind?: 'certification' | 'regulatory' | 'individual_qualification';

  @ApiProperty({ example: 'CERT-2024-001' })
  @IsString()
  certificateNumber: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 'https://cdn.example.com/cert.pdf' })
  @IsString()
  documentUrl: string;
}

export class UpdateSupplierCertificationsDto {
  @ApiProperty({ type: [SupplierCertificationDto] })
  @ValidateNested({ each: true })
  @Type(() => SupplierCertificationDto)
  certifications: SupplierCertificationDto[];
}
