import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserCoreDto } from '../../../admin-management/users/dtos/user-core.dto';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';

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

export class CreateSupplierDto {
  @ApiProperty({ type: UserCoreDto })
  @ValidateNested()
  @Type(() => UserCoreDto)
  user: UserCoreDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: SupplierRolePayloadDto })
  @ValidateNested()
  @Type(() => SupplierRolePayloadDto)
  supplier: SupplierRolePayloadDto;

  @ApiPropertyOptional({ description: 'Scope supplier listing by department' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  createdBy: string;
}
