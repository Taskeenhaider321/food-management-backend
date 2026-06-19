import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentDto } from './create-equipment.dto';

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CreationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  callibration?: object;
}
