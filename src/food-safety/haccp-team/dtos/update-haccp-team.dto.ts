import {
  IsString,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TeamMemberDto } from './team-member.dto';

export class UpdateHaccpTeamDto {
  @IsMongoId()
  userId: string;

  @IsString()
  teamName: string;

  @IsMongoId()
  Department: string;

  @IsString()
  DocumentType: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  DocumentTypeCode?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  TeamMembers: TeamMemberDto[];

  @IsArray()
  files: any[];

  @IsString()
  updatedBy: string;
}
