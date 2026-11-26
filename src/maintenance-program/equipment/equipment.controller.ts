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
  Header,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dtos/create-equipment.dto';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

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
  async create(
    @Body() createDto: CreateEquipmentDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.create(createDto, actor);
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all equipment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findAll(@CurrentUser() actor: any) {
    return this.service.findAll(actor);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all equipment by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findByDepartment(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.service.findByDepartment(departmentId, actor);
  }

  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download equipment directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadEquipmentPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.service.downloadEquipmentPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single equipment PDF' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadEquipmentByIdPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.service.downloadEquipmentByIdPdf(
      id,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Equipment updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEquipmentDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.update(id, updateDto, actor);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equipment found' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.service.findOne(id, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all equipment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All equipment deleted successfully',
  })
  async removeAll(@CurrentUser() actor: any) {
    return this.service.removeAll(actor);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Equipment deleted successfully',
  })
  async remove(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.service.remove(id, actor);
  }
}
