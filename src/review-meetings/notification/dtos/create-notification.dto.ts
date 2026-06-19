import { IsString, IsArray, IsDateString, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AgendaDto {
  @IsString()
  Name: string;

  @IsOptional()
  @IsString()
  Description?: string;
}

export class MemberAgendaBlockDto {
  @IsMongoId()
  participantId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaDto)
  agendas: AgendaDto[];
}

export class CreateNotificationDto {
  @IsMongoId()
  departmentId: string;

  @IsString()
  Venue: string;

  @IsString()
  MRMNo: string;

  /** @deprecated use memberAgendaBlocks for per-member agendas */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaDto)
  Agendas?: AgendaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberAgendaBlockDto)
  memberAgendaBlocks?: MemberAgendaBlockDto[];

  @IsDateString()
  Date: Date;

  @IsString()
  Time: string;

  @IsArray()
  @IsMongoId({ each: true })
  Participants: string[];
}
