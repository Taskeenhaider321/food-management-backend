import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDerivedModuleDto {
  @ApiProperty({ description: 'Master module _id to derive from' })
  @IsMongoId()
  masterModuleId: string;

  @ApiPropertyOptional({
    example: 'Quality Documents (Read-Only)',
    description: 'Custom display name. Falls back to master module name if omitted.',
  })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({
    example: { upload_documents: 'Quality Uploads', form_records: 'Quality Forms' },
    description: 'Custom resource labels (key = resource string, value = custom label)',
  })
  @IsOptional()
  @IsObject()
  resourceCustomNames?: Record<string, string>;

  @ApiProperty({
    type: [String],
    description: 'Selected MasterPermission _ids (subset of the master module permissions)',
  })
  @IsArray()
  @IsMongoId({ each: true })
  selectedPermissionIds: string[];
}
