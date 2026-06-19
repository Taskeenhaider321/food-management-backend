import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UserCoreDto } from '../../../admin-management/users/dtos/user-core.dto';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { TrainerRolePayloadDto } from './create-trainer.dto';

/** Partial user fields; company and department are not patchable here. */
export class UpdateTrainerUserDto extends OmitType(PartialType(UserCoreDto), [
  'companyId',
  'departmentId',
] as const) {}

export class UpdateTrainerDto {
  @ApiPropertyOptional({ type: UpdateTrainerUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTrainerUserDto)
  user?: UpdateTrainerUserDto;

  @ApiPropertyOptional({ type: ProfilePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile?: ProfilePayloadDto;

  @ApiPropertyOptional({ type: TrainerRolePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrainerRolePayloadDto)
  trainer?: TrainerRolePayloadDto;
}
