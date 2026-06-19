import { Controller, Post, Get, Put, Patch, Delete, Body, Param } from '@nestjs/common';
import { ProcessOwnerService } from './process-owner.service';
import { CreateProcessOwnerDto } from './dtos/create-process-owner.dto';
import { UpdateProcessOwnerDto } from './dtos/update-process-owner.dto';
import {
  AddProcessOwnerCredentialsDto,
  ResetProcessOwnerCredentialsDto,
} from './dtos/account-credentials.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Process Owner')
@Controller('process-owner')
export class ProcessOwnerController {
  constructor(private readonly processOwnerService: ProcessOwnerService) {}

  @Post()
  @ApiOperation({ summary: 'Add process with owner (Step 1 & 2)' })
  @ApiBearerAuth()
  async addProcess(@Body() createDto: CreateProcessOwnerDto) {
    return this.processOwnerService.addProcess(createDto);
  }

  @Put()
  @ApiOperation({ summary: 'Update process details' })
  @ApiBearerAuth()
  async updateProcess(@Body() updateDto: UpdateProcessOwnerDto) {
    return this.processOwnerService.updateProcess(updateDto);
  }

  @Get('all/:departmentId')
  @ApiOperation({ summary: 'Get all processes by department' })
  @ApiBearerAuth()
  async readProcess(@Param('departmentId') departmentId: string) {
    return this.processOwnerService.readProcess(departmentId);
  }

  @Get(':processId')
  @ApiOperation({ summary: 'Get process by ID' })
  @ApiBearerAuth()
  async getProcessById(@Param('processId') processId: string) {
    return this.processOwnerService.getProcessById(processId);
  }

  @Patch('toggle-status/:processId')
  @ApiOperation({ summary: 'Enable/Disable process' })
  @ApiBearerAuth()
  async toggleStatus(@Param('processId') processId: string) {
    return this.processOwnerService.toggleStatus(processId);
  }

  @Post('add-credentials')
  @ApiOperation({ summary: 'Add account credentials for process owner' })
  @ApiBearerAuth()
  async addAccountCredentials(@Body() dto: AddProcessOwnerCredentialsDto) {
    return this.processOwnerService.addAccountCredentials(dto);
  }

  @Patch('reset-credentials')
  @ApiOperation({ summary: 'Reset account credentials for process owner' })
  @ApiBearerAuth()
  async resetAccountCredentials(@Body() dto: ResetProcessOwnerCredentialsDto) {
    return this.processOwnerService.resetAccountCredentials(dto);
  }

  @Delete(':processId')
  @ApiBearerAuth()
  async deleteProcess(@Param('processId') processId: string) {
    return this.processOwnerService.deleteProcess(processId);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllProcesses(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.processOwnerService.deleteAllProcesses();
  }
}
