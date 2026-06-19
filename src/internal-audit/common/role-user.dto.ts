import { OmitType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { UserCoreDto } from '../../admin-management/users/dtos/user-core.dto';

/**
 * User payload for internal-audit role entities (auditors, process owners).
 * `roleId` is optional here because these services assign the role type
 * internally and ignore RBAC role ids.
 */
export class RoleUserDto extends OmitType(UserCoreDto, ['roleId'] as const) {
  @ApiPropertyOptional({ description: 'Role _id (optional for audit roles)' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;
}
