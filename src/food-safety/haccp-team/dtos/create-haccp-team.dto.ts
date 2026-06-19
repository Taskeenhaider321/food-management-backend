import { IsString, IsMongoId, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamMemberDto } from './team-member.dto';

export class CreateHaccpTeamDto {
  @IsMongoId()
  userId: string;

  @IsString()
  teamName: string;

  @IsMongoId()
  Department: string;

  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  TeamMembers: TeamMemberDto[];

  @IsArray()
  files: any[];
}
