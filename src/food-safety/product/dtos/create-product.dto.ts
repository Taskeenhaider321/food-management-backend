import { IsString, IsNotEmpty, IsEnum, ValidateNested } from 'class-validator';
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
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;

  @ValidateNested()
  @Type(() => ProductDetailsDto)
  ProductDetails: ProductDetailsDto;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
