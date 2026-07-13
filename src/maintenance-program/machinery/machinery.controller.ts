// TEST/tech/machinery/machinery.controller.ts
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
import { MachineryService } from './machinery.service';
import { CreateMachineryDto } from './dtos/create-machinery.dto';
import { UpdateMachineryDto } from './dtos/update-machinery.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Machinery')
@Controller('machines')
export class MachineryController {
  constructor(private readonly service: MachineryService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create machinery' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Machinery created successfully',
  })
  async create(@Body() createDto: CreateMachineryDto) {
    return this.service.create(createDto);
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all machinery' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Machinery found' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all machinery by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Machinery found' })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.service.findByDepartment(departmentId);
  }

  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download machinery directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadMachineryPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.service.downloadMachineryPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single machinery PDF' })
  @ApiParam({ name: 'id', description: 'Machinery ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadMachineryByIdPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.service.downloadMachineryByIdPdf(
      id,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get machinery by ID' })
  @ApiParam({ name: 'id', description: 'Machinery ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Machinery found' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update machinery by ID' })
  @ApiParam({ name: 'id', description: 'Machinery ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Machinery updated successfully',
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateMachineryDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete machinery by ID' })
  @ApiParam({ name: 'id', description: 'Machinery ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Machinery deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all machinery' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All machinery deleted successfully',
  })
  async removeAll() {
    return this.service.removeAll();
  }
}
