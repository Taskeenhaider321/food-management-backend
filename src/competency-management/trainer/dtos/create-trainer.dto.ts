import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';

export class TrainerRolePayloadDto {
  @ApiPropertyOptional({ type: [String], description: 'Training record references (optional)' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  trainingIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialities?: string[];
}

/** Trainer user fields (company comes from JWT; no department on create). */
export class TrainerUserInputDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ali@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ali123' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(7)
  password: string;

  @ApiPropertyOptional({ description: 'RBAC role _id' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiPropertyOptional({
    description:
      'Also accepts SUPER_ADMIN, COMPANY_ADMIN, USER for backward compatibility',
  })
  @IsOptional()
  @IsString()
  roleType?: string;
}

export class CreateTrainerDto {
  @ApiProperty({ type: TrainerUserInputDto })
  @ValidateNested()
  @Type(() => TrainerUserInputDto)
  user: TrainerUserInputDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: TrainerRolePayloadDto })
  @ValidateNested()
  @Type(() => TrainerRolePayloadDto)
  trainer: TrainerRolePayloadDto;

  @ApiPropertyOptional({
    description:
      'HTTPS URL of the trainer PDF from POST /upload/cloudinary (stored as-is by default; fast)',
  })
  @IsOptional()
  @IsString()
  trainerDocumentUrl?: string;

  @ApiPropertyOptional({
    description:
      'If true, downloads the PDF and applies company cover/watermarks (slow). Default is false.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  applyTrainerDocumentBranding?: boolean;
}

/** @deprecated Tab assignment removed; use RBAC roles. */
export class AssignTabsDto {
  @ApiPropertyOptional()
  @IsOptional()
  Tabs?: unknown[];
}
