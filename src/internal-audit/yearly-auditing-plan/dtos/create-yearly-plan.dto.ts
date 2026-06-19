import { IsNumber, IsArray, IsString, IsMongoId, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelectedDto {
  @ApiProperty()
  @IsMongoId()
  Process: string;

  @ApiProperty({ enum: ['High Risk', 'Medium Risk', 'Low Risk'] })
  @IsEnum(['High Risk', 'Medium Risk', 'Low Risk'])
  Risk: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  monthNames: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  AssignedAuditor?: string;
}

export class CreateYearlyPlanDto {
  @ApiProperty()
  @IsMongoId()
  departmentId: string;

  @ApiProperty()
  @IsNumber()
  Year: number;

  @ApiProperty({ type: [SelectedDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedDto)
  Selected: SelectedDto[];

  @ApiProperty()
  @IsString()
  createdBy: string;
}
