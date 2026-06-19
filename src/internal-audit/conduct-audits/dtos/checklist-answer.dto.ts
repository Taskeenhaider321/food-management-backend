import { IsMongoId, IsString, IsNumber, IsOptional } from 'class-validator';

export class ChecklistAnswerDto {
  @IsMongoId()
  question: string;

  @IsOptional()
  @IsString()
  Remarks?: string;

  @IsOptional()
  @IsString()
  EvidenceDoc?: string;

  @IsOptional()
  @IsString()
  YesNoAnswer?: string;

  @IsOptional()
  @IsNumber()
  GradingSystemAnswer?: number;

  @IsOptional()
  @IsString()
  GoodFairPoorAnswer?: string;

  @IsOptional()
  @IsString()
  SafeAtRiskAnswer?: string;

  @IsOptional()
  @IsString()
  PassFailAnswer?: string;

  @IsOptional()
  @IsString()
  CompliantNonCompliantAnswer?: string;

  @IsOptional()
  @IsString()
  ConformObservationAnswer?: string;
}
