import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { RoleUserDto } from '../../common/role-user.dto';

export class DeputyProcessOwnerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ProcessOwnerRolePayloadDto {
  @ApiProperty()
  @IsString()
  processName: string;

  @ApiProperty({ enum: ['High Risk', 'Medium Risk', 'Low Risk'] })
  @IsEnum(['High Risk', 'Medium Risk', 'Low Risk'])
  riskAssessment: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  activities: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialInstructions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shiftBreaks?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criticalAreas?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateProcessOwnerDto {
  @ApiProperty({ type: RoleUserDto })
  @ValidateNested()
  @Type(() => RoleUserDto)
  user: RoleUserDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: ProcessOwnerRolePayloadDto })
  @ValidateNested()
  @Type(() => ProcessOwnerRolePayloadDto)
  processOwner: ProcessOwnerRolePayloadDto;

  @ApiProperty({ description: 'Actor user id for audit' })
  @IsString()
  createdBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasDeputy?: boolean;

  @ApiPropertyOptional({ type: DeputyProcessOwnerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeputyProcessOwnerDto)
  deputyOwner?: DeputyProcessOwnerDto;
}
