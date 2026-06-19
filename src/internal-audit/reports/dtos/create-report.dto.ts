import { IsMongoId, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsMongoId()
  departmentId: string;

  @IsMongoId()
  ConductAudit: string;

  @IsString()
  reportBy: string;

  @IsOptional()
  @IsArray()
  SelectedAnswers?: any[];
}
