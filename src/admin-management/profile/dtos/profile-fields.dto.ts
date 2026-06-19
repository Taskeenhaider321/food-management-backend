import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProfileIdentityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

export class ProfileDocItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  // @ApiPropertyOptional()
  // @IsOptional()
  // @IsDateString()
  // uploadedAt?: string;
}

/** Shared profile payload for nested creates (user → profile → role). */
export class ProfilePayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ example: '1998-01-01' })
  @IsOptional()
  @IsDateString()
  DOB?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: ProfileIdentityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileIdentityDto)
  identity?: ProfileIdentityDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualification?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experience?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [ProfileDocItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProfileDocItemDto)
  docs?: ProfileDocItemDto[];
}
