// TEST/hr/training/dtos/create-training.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateTrainingDto {
  @ApiProperty({ description: 'Department ID', example: '507f1f77bcf86cd799439012' })
  @IsString()
  departmentId: string;

  @ApiProperty({ example: 'Food Safety Training' })
  @IsString()
  TrainingName: string;

  @ApiProperty({ example: 'Comprehensive training on food safety practices' })
  @IsString()
  Description: string;

  @ApiProperty({ example: 'Pass/Fail based on 80% score' })
  @IsString()
  EvaluationCriteria: string;

  @ApiPropertyOptional({
    description: 'HTTPS URL from POST /upload/cloudinary (preferred for any file type)',
    example: 'https://res.cloudinary.com/.../raw/upload/v1/...',
  })
  @IsOptional()
  @IsString()
  TrainingMaterialUrl?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  TrainingMaterial?: any;
}
