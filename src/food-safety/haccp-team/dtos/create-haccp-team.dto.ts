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

export class CreateHaccpTeamDto {
  @IsMongoId()
  userId: string;

  @IsString()
  teamName: string;

  @IsMongoId()
  Department: string;

  /** Custom document type title (scoped to Team form). */
  @IsString()
  DocumentType: string;

  /** Numeric DocumentId code from the selected custom document type. */
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
}
