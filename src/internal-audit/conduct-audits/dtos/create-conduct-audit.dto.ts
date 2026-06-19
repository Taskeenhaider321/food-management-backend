import { IsMongoId, IsArray, IsOptional } from 'class-validator';

export class CreateConductAuditDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  Checklist: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsArray()
  Answers: any[];

  @IsArray()
  files: any[];
}
