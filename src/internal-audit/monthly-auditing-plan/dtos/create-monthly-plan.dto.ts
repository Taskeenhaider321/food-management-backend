import { IsNumber, IsString, IsMongoId, IsArray } from 'class-validator';

export class CreateMonthlyPlanDto {
  @IsMongoId()
  departmentId: string;

  @IsNumber()
  Date: number;

  @IsString()
  Month: string;

  @IsString()
  Year: string;

  @IsMongoId()
  Department: string;

  @IsMongoId()
  ProcessOwner: string;

  @IsMongoId()
  LeadAuditor: string;

  @IsMongoId()
  TeamAuditor: string;

  @IsMongoId()
  YearlyAuditingPlan: string;

  @IsString()
  createdBy: string;

  @IsArray()
  Auditor: string[];

  @IsArray()
  Process: string[];
}
