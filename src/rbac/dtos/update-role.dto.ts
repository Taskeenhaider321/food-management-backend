import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateRoleDto } from './create-role.dto';

/**
 * PATCH body for role update. Omitting moduleIds/derivedModuleIds leaves
 * grants unchanged; sending either replaces the grant set (same as create).
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Ignored for tenant actors — server forces own company',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  moduleIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  derivedModuleIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
