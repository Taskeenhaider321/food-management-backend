// TEST/tech/equipment/dtos/create-equipment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

export class CreateEquipmentDto {
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
