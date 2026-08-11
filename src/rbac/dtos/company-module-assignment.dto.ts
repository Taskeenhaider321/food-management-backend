import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignCompanyModuleDto {
  @ApiProperty({ description: 'MasterModule _id' })
  @IsMongoId()
  masterModuleId: string;

  @ApiPropertyOptional({
    example: 'Employee Management',
    description: 'Display name for this company (internal key unchanged)',
  })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({
    description: 'Resource key → custom label map',
    example: { employee: 'Staff' },
  })
  @IsOptional()
  @IsObject()
  resourceCustomNames?: Record<string, string>;

  @ApiProperty({
    type: [String],
    description:
      'MasterPermission _ids this company may use (subset of the master module)',
  })
  @IsArray()
  @IsMongoId({ each: true })
  selectedPermissionIds: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignCompanyModulesBulkDto {
  @ApiProperty({ type: [AssignCompanyModuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignCompanyModuleDto)
  modules: AssignCompanyModuleDto[];
}

export class UpdateCompanyModuleAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  resourceCustomNames?: Record<string, string>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedPermissionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
