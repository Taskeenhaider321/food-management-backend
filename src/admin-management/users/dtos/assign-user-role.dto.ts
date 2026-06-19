import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class AssignUserRoleDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  roleId: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Optional tenant boundary check',
  })
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
