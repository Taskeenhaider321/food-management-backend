// TEST/tech/equipment/dtos/create-equipment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class CreateEquipmentDto {
  @ApiPropertyOptional({
    description:
      'Company ID (super-admin only; ignored for company users, who always create in their own company)',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty()
  @IsString()
  createdBy: string;

  @ApiProperty()
  @IsString()
  equipmentName: string;

  @ApiProperty()
  @IsString()
  equipmentLocation: string;

  @ApiProperty()
  @IsString()
  Range: string;

  @ApiProperty()
  @IsObject()
  callibration: object;
}
