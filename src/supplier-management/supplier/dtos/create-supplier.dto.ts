import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { SUPPLIER_TYPES } from '../constants/supplier.enums';
import { SupplierCertificationDto } from './supplier-certification.dto';

export class SupplierAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

/** Legacy nested supplier fields when creating via user/profile. */
export class SupplierRolePayloadDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactNo?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productServiceOffered?: string[];

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  riskCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentApprovalAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextApprovalAt?: string;
}

export class LegacySupplierUserDto {
  @ApiProperty({ example: 'Ali Supplier' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ali.supplier@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ali.supplier' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(7)
  password: string;

  @ApiProperty()
  @IsMongoId()
  companyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleType?: string;
}

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Required for the non-legacy create path (no user account).',
  })
  @ValidateIf((dto) => !dto.user)
  @IsString()
  supplierName?: string;

  @ApiProperty({
    description: 'Required for the non-legacy create path.',
  })
  @ValidateIf((dto) => !dto.user)
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Alias for productServiceOffered' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productServiceOffered?: string[];

  @ApiPropertyOptional({ type: SupplierAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierAddressDto)
  address?: SupplierAddressDto;

  @ApiPropertyOptional({ enum: SUPPLIER_TYPES })
  @IsOptional()
  @IsEnum(SUPPLIER_TYPES)
  supplierType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactNo?: string[];

  @ApiPropertyOptional({ type: [SupplierCertificationDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SupplierCertificationDto)
  certifications?: SupplierCertificationDto[];

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  riskCategory?: string;

  @ApiProperty()
  @IsString()
  createdBy: string;

  @ApiPropertyOptional({ description: 'Legacy path — creates linked user + profile' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegacySupplierUserDto)
  user?: LegacySupplierUserDto;

  @ApiPropertyOptional({ type: ProfilePayloadDto })
  @ValidateIf((dto) => !!dto.user)
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile?: ProfilePayloadDto;

  @ApiPropertyOptional({ type: SupplierRolePayloadDto })
  @ValidateIf((dto) => !!dto.user)
  @ValidateNested()
  @Type(() => SupplierRolePayloadDto)
  supplier?: SupplierRolePayloadDto;

  @ApiPropertyOptional({ description: 'Scope supplier listing by department (legacy)' })
  @IsOptional()
  @IsMongoId()
  departmentId?: string;
}
