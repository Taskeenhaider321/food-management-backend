import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomDocumentTypeDto {
  @ApiProperty({ example: 'Team Record' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Team composition and training records' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 5, description: 'Used in DocumentId third segment' })
  @IsInt()
  @Min(1)
  @Max(99)
  documentNumber: number;

  @ApiProperty({ example: 'users', description: 'Icon key from allowed set' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({
    example: 'food-safety.team',
    description: 'Form/tab scope — types never cross scopes',
  })
  @IsString()
  @IsNotEmpty()
  scopeKey: string;

  @ApiProperty({ description: 'Owning company' })
  @IsMongoId()
  companyId: string;
}

export class ListCustomDocumentTypesQueryDto {
  @ApiProperty({ example: 'food-safety.team' })
  @IsString()
  @IsNotEmpty()
  scopeKey: string;

  @ApiProperty({ description: 'Owning company' })
  @IsMongoId()
  companyId: string;
}
