// TEST/tech/equipment/equipment.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dtos/create-equipment.dto';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';

@ApiTags('Equipment')
@Controller('equipments')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create equipment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Equipment created successfully',
  })
  async create(@Body() createDto: CreateEquipmentDto) {
    return this.service.create(createDto);
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all equipment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all equipment by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.service.findByDepartment(departmentId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateEquipmentDto) {
    return this.service.update(id, updateDto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Equipment deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all equipment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All equipment deleted successfully',
  })
  async removeAll() {
    return this.service.removeAll();
  }
}
