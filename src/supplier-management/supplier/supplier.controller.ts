// TEST/hr/supplier/supplier.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import {
  ApproveSupplierDto,
  DisapproveSupplierDto,
} from './dtos/update-supplier.dto';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Supplier created successfully',
  })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all suppliers by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of suppliers' })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.supplierService.findByDepartment(departmentId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Supplier found' })
  async findOne(@Param('supplierId') id: string) {
    return this.supplierService.findOne(id);
  }

  @Delete()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete supplier by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier deleted successfully',
  })
  async remove(@Body() body: { id: string }) {
    return this.supplierService.remove(body.id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all suppliers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All suppliers deleted successfully',
  })
  async removeAll() {
    return this.supplierService.removeAll();
  }

  @Patch('approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve supplier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier approved successfully',
  })
  async approve(@Body() approveDto: ApproveSupplierDto) {
    return this.supplierService.approve(approveDto.id, approveDto.approvedBy);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disapprove supplier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier disapproved successfully',
  })
  async disapprove(@Body() disapproveDto: DisapproveSupplierDto) {
    return this.supplierService.disapprove(
      disapproveDto.id,
      disapproveDto.disapprovedBy,
      disapproveDto.Reason,
    );
  }
}
