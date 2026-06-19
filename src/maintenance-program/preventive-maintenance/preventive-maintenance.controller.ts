import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { PreventiveMaintenanceService } from './preventive-maintenance.service';
import { CreatePreventiveMaintenanceDto } from './dtos/create-preventive-maintenance.dto';

@ApiTags('Preventive Maintenance')
@Controller('preventive-maintenance')
export class PreventiveMaintenanceController {
  constructor(
    private readonly maintenanceService: PreventiveMaintenanceService,
  ) {}

  @Post(':machineId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add preventive maintenance record' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('Image'))
  async create(
    @Param('machineId') machineId: string,
    @Body() dto: CreatePreventiveMaintenanceDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    dto.machineId = machineId;
    return this.maintenanceService.create(dto, image);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all maintenance records by department' })
  async findAll(@Param('departmentId') departmentId: string) {
    return this.maintenanceService.findAll(departmentId);
  }

  @Get('by-machine/:machineId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get maintenance records by machine ID' })
  async findByMachine(@Param('machineId') machineId: string) {
    return this.maintenanceService.findByMachineId(machineId);
  }

  @Get('by-machine/:machineId/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get maintenance records by machine ID and department' })
  async findByMachineId(
    @Param('machineId') machineId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.maintenanceService.findByMachineId(machineId, departmentId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get maintenance record by ID' })
  async findById(@Param('id') id: string) {
    return this.maintenanceService.findById(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all maintenance records' })
  async removeAll() {
    return this.maintenanceService.removeAll();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete maintenance record by ID' })
  async remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
