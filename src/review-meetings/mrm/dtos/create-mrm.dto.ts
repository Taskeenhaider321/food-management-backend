import { IsMongoId, IsArray, IsString, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AgendaDetailDto {
  @IsMongoId()
  Agenda: string;

  @IsOptional()
  @IsDateString()
  TargetDate?: Date;

  @IsOptional()
  @IsString()
  Discussion?: string;

  @IsOptional()
  @IsString()
  Responsibilities?: string;

  @IsArray()
  @IsMongoId({ each: true })
  Participants: string[];
}

export class CreateMRMDto {
  @IsMongoId()
  departmentId: string;

  @IsMongoId()
  Notification: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaDetailDto)
  AgendaDetails: AgendaDetailDto[];
}
