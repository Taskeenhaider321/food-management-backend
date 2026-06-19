// TEST/hr/supplier/dtos/update-supplier.dto.ts
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsString } from 'class-validator';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class ApproveSupplierDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  approvedBy: string;
}

export class DisapproveSupplierDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  disapprovedBy: string;

  @ApiProperty({ example: 'Quality issues' })
  @IsString()
  Reason: string;
}
