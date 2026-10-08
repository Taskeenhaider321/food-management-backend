import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductDetailsDto } from './product-details.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  Department: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  DocumentType: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  DocumentTypeCode?: number;

  @ValidateNested()
  @Type(() => ProductDetailsDto)
  ProductDetails: ProductDetailsDto;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
