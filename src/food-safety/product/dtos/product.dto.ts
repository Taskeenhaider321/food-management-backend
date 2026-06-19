import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductDetailsDto {
  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsString()
  @IsOptional()
  Origin?: string;

  @IsString()
  @IsOptional()
  RawMaterial?: string;

  @IsString()
  @IsOptional()
  PackingMaterial?: string;

  @IsString()
  @IsOptional()
  PhysicalProperties?: string;

  @IsString()
  @IsOptional()
  ChemicalProperties?: string;

  @IsString()
  @IsOptional()
  ProductDescription?: string;

  @IsString()
  @IsOptional()
  MicrobialProperties?: string;

  @IsString()
  @IsOptional()
  Allergens?: string;

  @IsString()
  @IsOptional()
  IntendedUsers?: string;

  @IsString()
  @IsOptional()
  StorageConditions?: string;

  @IsString()
  @IsOptional()
  LabellingInstructions?: string;

  @IsString()
  @IsOptional()
  Transportation?: string;

  @IsString()
  @IsOptional()
  FoodSafetyRisk?: string;

  @IsString()
  @IsOptional()
  ShelfLife?: string;

  @IsString()
  @IsOptional()
  Consumer?: string;

  @IsString()
  @IsOptional()
  TargtMarket?: string;
}

export class CreateProductDto {
  @IsMongoId()
  @IsNotEmpty()
  Department: string;

  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  @IsNotEmpty()
  DocumentType: string;

  @ValidateNested()
  @Type(() => ProductDetailsDto)
  @IsNotEmpty()
  ProductDetails: ProductDetailsDto;

  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class UpdateProductDto {
  @IsMongoId()
  @IsOptional()
  Department?: string;

  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  @IsOptional()
  DocumentType?: string;

  @ValidateNested()
  @Type(() => ProductDetailsDto)
  @IsOptional()
  ProductDetails?: ProductDetailsDto;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;
}

export class ApproveProductDto {
  @IsMongoId()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}

export class DisapproveProductDto {
  @IsMongoId()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  Reason: string;

  @IsString()
  @IsNotEmpty()
  disapprovedBy: string;
}
