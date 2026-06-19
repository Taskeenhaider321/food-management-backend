import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UserCoreDto } from '../../../admin-management/users/dtos/user-core.dto';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';
import { EmployeeRolePayloadDto } from './create-employee.dto';

export class UpdateEmployeeUserDto extends OmitType(PartialType(UserCoreDto), [
  'companyId',
  'roleId',
  'roleType',
  'password',
] as const) {}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ type: UpdateEmployeeUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEmployeeUserDto)
  user?: UpdateEmployeeUserDto;

  @ApiPropertyOptional({ type: ProfilePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile?: ProfilePayloadDto;

  @ApiPropertyOptional({ type: EmployeeRolePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeRolePayloadDto)
  employee?: EmployeeRolePayloadDto;
}
