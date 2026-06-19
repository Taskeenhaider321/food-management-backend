import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { RoleUserDto } from '../../common/role-user.dto';
import { TransformJsonTo } from '../../common/multipart-json.util';

export class InternalAuditorRolePayloadDto {
  @ApiProperty({ enum: ['Lead Auditor', 'Staff Auditor'] })
  @IsEnum(['Lead Auditor', 'Staff Auditor'])
  roleInTeam: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isApprovedAuditor?: boolean;

  @ApiPropertyOptional({ description: 'URL after upload' })
  @IsOptional()
  @IsString()
  approvedAuditorLetter?: string;
}

export class CreateAuditorDto {
  @ApiProperty({ description: 'Existing user performing the registration (for PDF branding)' })
  @IsMongoId()
  actorUserId: string;

  @ApiProperty({ type: RoleUserDto })
  @TransformJsonTo(RoleUserDto)
  @ValidateNested()
  @Type(() => RoleUserDto)
  user: RoleUserDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @TransformJsonTo(ProfilePayloadDto)
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: InternalAuditorRolePayloadDto })
  @TransformJsonTo(InternalAuditorRolePayloadDto)
  @ValidateNested()
  @Type(() => InternalAuditorRolePayloadDto)
  auditor: InternalAuditorRolePayloadDto;
}
