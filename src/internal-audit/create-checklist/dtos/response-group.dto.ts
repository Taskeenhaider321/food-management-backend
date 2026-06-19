import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ResponseOptionDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textColor?: string;
}

export class CreateResponseGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [ResponseOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseOptionDto)
  options: ResponseOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateResponseGroupDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [ResponseOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseOptionDto)
  options?: ResponseOptionDto[];
}
