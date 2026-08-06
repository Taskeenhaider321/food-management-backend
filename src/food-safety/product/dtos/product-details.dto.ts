import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductCustomSectionDto {
  @IsString()
  Heading: string;

  @IsString()
  Content: string;
}

export class ProductDetailsDto {
  @IsString()
  Name: string;

  @IsOptional()
  @IsString()
  Origin?: string;

  @IsOptional()
  @IsString()
  RawMaterial?: string;

  @IsOptional()
  @IsString()
  PackingMaterial?: string;

  @IsOptional()
  @IsString()
  PhysicalProperties?: string;

  @IsOptional()
  @IsString()
  ChemicalProperties?: string;

  @IsOptional()
  @IsString()
  ProductDescription?: string;

  @IsOptional()
  @IsString()
  MicrobialProperties?: string;

  @IsOptional()
  @IsString()
  Allergens?: string;

  @IsOptional()
  @IsString()
  IntendedUsers?: string;

  @IsOptional()
  @IsString()
  StorageConditions?: string;

  @IsOptional()
  @IsString()
  LabellingInstructions?: string;

  @IsOptional()
  @IsString()
  Transportation?: string;

  @IsOptional()
  @IsString()
  FoodSafetyRisk?: string;

  @IsOptional()
  @IsString()
  ShelfLife?: string;

  @IsOptional()
  @IsString()
  Consumer?: string;

  @IsOptional()
  @IsString()
  TargtMarket?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductCustomSectionDto)
  CustomSections?: ProductCustomSectionDto[];
}
