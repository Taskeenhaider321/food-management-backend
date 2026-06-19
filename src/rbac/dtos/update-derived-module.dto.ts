import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDerivedModuleDto {
  @ApiPropertyOptional({ example: 'Team Control' })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({
    example: { user: 'Team Members' },
    description: 'Custom resource labels (key = resource string, value = custom label)',
  })
  @IsOptional()
  @IsObject()
  resourceCustomNames?: Record<string, string>;

  @ApiPropertyOptional({
    type: [String],
    description: 'Replace the selected permission subset',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedPermissionIds?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
