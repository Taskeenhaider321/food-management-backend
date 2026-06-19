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
import { IsEmail } from 'class-validator';
import { DeputyProcessOwnerDto } from './create-process-owner.dto';

export class ProcessOwnerPersonUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateProcessOwnerDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processName?: string;

  @ApiPropertyOptional({ enum: ['High Risk', 'Medium Risk', 'Low Risk'] })
  @IsOptional()
  @IsEnum(['High Risk', 'Medium Risk', 'Low Risk'])
  riskAssessment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activities?: string[];

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasDeputy?: boolean;

  @ApiPropertyOptional({ type: DeputyProcessOwnerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeputyProcessOwnerDto)
  deputyOwner?: DeputyProcessOwnerDto;

  @ApiPropertyOptional({ type: ProcessOwnerPersonUpdateDto, description: 'Process owner personal info updates' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessOwnerPersonUpdateDto)
  owner?: ProcessOwnerPersonUpdateDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
