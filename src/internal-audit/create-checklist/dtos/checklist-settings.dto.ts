import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ChecklistSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  themeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['None', 'Hourly', 'Daily', 'Weekly', 'Monthly'] })
  @IsOptional()
  @IsEnum(['None', 'Hourly', 'Daily', 'Weekly', 'Monthly'])
  auditFrequency?: string;
}
