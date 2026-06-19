import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTrainingDto {
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  TrainingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  EvaluationCriteria?: string;
}
