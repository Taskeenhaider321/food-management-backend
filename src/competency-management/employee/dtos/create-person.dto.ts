import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { EmployeeRolePayloadDto } from './create-employee.dto';
import { TrainerRolePayloadDto } from '../../trainer/dtos/create-trainer.dto';
import { InternalAuditorRolePayloadDto } from '../../../internal-audit/internal-auditor/dtos/create-auditor.dto';

export const CREATE_PERSON_ROLES = ['employee', 'trainer', 'auditor'] as const;
export type CreatePersonRole = (typeof CREATE_PERSON_ROLES)[number];

export class CreatePersonUserDto {
  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Khan' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Ali Khan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ali@test.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'ali123' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ example: 'SecurePass1' })
  @IsOptional()
  @IsString()
  @MinLength(7)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Optional RBAC role _id' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;
}

export class CreatePersonProfileDto extends ProfilePayloadDto {}

export class CreatePersonDto {
  @ApiProperty({
    type: [String],
    enum: CREATE_PERSON_ROLES,
    example: ['employee'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CREATE_PERSON_ROLES, { each: true })
  roles: CreatePersonRole[];

  @ApiProperty({ type: CreatePersonUserDto })
  @ValidateNested()
  @Type(() => CreatePersonUserDto)
  user: CreatePersonUserDto;

  @ApiProperty({ type: CreatePersonProfileDto })
  @ValidateNested()
  @Type(() => CreatePersonProfileDto)
  profile: CreatePersonProfileDto;

  @ApiPropertyOptional({ type: EmployeeRolePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeRolePayloadDto)
  employee?: EmployeeRolePayloadDto;

  @ApiPropertyOptional({ type: TrainerRolePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrainerRolePayloadDto)
  trainer?: TrainerRolePayloadDto;

  @ApiPropertyOptional({ type: InternalAuditorRolePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InternalAuditorRolePayloadDto)
  auditor?: InternalAuditorRolePayloadDto;

  @ApiPropertyOptional({
    description: 'HTTPS URL of trainer PDF (stored on profile docs when trainer role)',
  })
  @IsOptional()
  @IsString()
  trainerDocumentUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  applyTrainerDocumentBranding?: boolean;
}
