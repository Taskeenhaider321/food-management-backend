import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  roleId: string;

  @ApiProperty({
    required: false,
    example: '507f1f77bcf86cd799439013',
    description: 'Optional tenant boundary check',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
