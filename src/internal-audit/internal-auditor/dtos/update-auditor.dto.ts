import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TransformBoolean,
  TransformJsonArray,
} from '../../common/multipart-json.util';

export class UpdateAuditorDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  // ── Personal information (stored on User / Profile) ──
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNo?: string;

  // ── Auditor role information ──
  @ApiPropertyOptional({ enum: ['Lead Auditor', 'Staff Auditor'] })
  @IsOptional()
  @IsEnum(['Lead Auditor', 'Staff Auditor'])
  roleInTeam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @TransformJsonArray()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  isApprovedAuditor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
