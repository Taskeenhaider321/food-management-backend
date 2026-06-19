import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProcessLimitDto {
  @IsOptional()
  @IsString()
  TargetRange?: string;

  @IsOptional()
  @IsString()
  ActionPoint?: string;

  @IsOptional()
  @IsString()
  CriticalCtrlPoint?: string;
}

class MonitoringPlanDto {
  @IsOptional()
  @IsString()
  Who?: string;

  @IsOptional()
  @IsString()
  When?: string;

  @IsOptional()
  @IsString()
  What?: string;

  @IsOptional()
  @IsString()
  How?: string;
}

class VerificationPlanDto {
  @IsOptional()
  @IsString()
  Who?: string;

  @IsOptional()
  @IsString()
  When?: string;

  @IsOptional()
  @IsString()
  What?: string;

  @IsOptional()
  @IsString()
  How?: string;
}

export class PlanDto {
  @IsOptional()
  @IsString()
  Decision?: string;

  @IsOptional()
  @IsString()
  HazardToControl?: string;

  @IsOptional()
  @IsString()
  ControlMeasures?: string;

  @IsOptional()
  @IsString()
  JustificationLink?: string;

  @IsOptional()
  @IsString()
  CorrectiveAction?: string;

  @IsOptional()
  @IsString()
  MonitoringRef?: string;

  @IsOptional()
  @IsString()
  VerificationRef?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessLimitDto)
  ProcessLimit?: ProcessLimitDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MonitoringPlanDto)
  MonitoringPlan?: MonitoringPlanDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationPlanDto)
  VerificationPlan?: VerificationPlanDto;
}
