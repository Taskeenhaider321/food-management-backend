import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class UpdateConductAuditDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  conductAuditId: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsArray()
  Answers: any[];

  @IsArray()
  files: any[];
}
