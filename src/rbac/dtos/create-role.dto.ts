import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Quality Manager' })
  @IsString()
  roleName: string;

  @ApiPropertyOptional({ example: 'Can manage quality records for the site' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Scope the role to a company (for company-admin/company-user roles)' })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'MasterModule IDs — grants ALL permissions for these seeded modules',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  moduleIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'DerivedModule IDs — grants only the cherry-picked permission subset',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  derivedModuleIds?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
