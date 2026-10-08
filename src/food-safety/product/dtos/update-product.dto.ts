import { IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductDetailsDto } from './product-details.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  Department?: string;

  @IsOptional()
  @IsString()
  @IsString()
  DocumentType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDetailsDto)
  ProductDetails?: ProductDetailsDto;

  @IsString()
  updatedBy: string;
}
