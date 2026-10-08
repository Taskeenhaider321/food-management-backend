import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DepartmentItemDto {
  @ApiProperty({ example: 'Human Resources' })
  @IsString()
  departmentName: string;

  @ApiProperty({ example: 'HR' })
  @IsString()
  shortName: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'inactive', 'paused'],
    description: 'Department status',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'paused'])
  status?: string;
}

export class CreateDepartmentDto {
  @ApiProperty({
    type: [DepartmentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentItemDto)
  departments: DepartmentItemDto[];

  /** Super Admin must pass the target company when user has no companyId. */
  @ApiPropertyOptional({ description: 'Target company (Super Admin)' })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
