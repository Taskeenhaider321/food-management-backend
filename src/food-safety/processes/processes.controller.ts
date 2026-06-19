import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { CreateProcessesDto } from './dtos/create-processes.dto';
import { UpdateProcessesDto } from './dtos/update-processes.dto';
import { ApproveProcessesDto } from './dtos/approve-processes.dto';
import { DisapproveProcessesDto } from './dtos/disapprove-processes.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @ApiBearerAuth()
  async createProcess(@Body() createProcessesDto: CreateProcessesDto) {
    return this.processesService.createProcess(createProcessesDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllProcesses(@Param('departmentId') departmentId: string) {
    return this.processesService.getAllProcesses(departmentId);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedProcesses(@Param('departmentId') departmentId: string) {
    return this.processesService.getApprovedProcesses(departmentId);
  }

  @Get(':processId')
  @ApiBearerAuth()
  async getProcess(@Param('processId') processId: string) {
    return this.processesService.getProcess(processId);
  }

  @Get('detail/:processId')
  @ApiBearerAuth()
  async getProcessDetail(@Param('processId') processId: string) {
    return this.processesService.getProcessDetail(processId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteProcess(@Body('id') id: string) {
    return this.processesService.deleteProcess(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllProcesses(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.processesService.deleteAllProcesses();
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewProcess(@Body() body: { id: string; actor: string }) {
    return this.processesService.reviewProcess(body.id, body.actor);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectProcess(@Body() body: { id: string; actor: string; reason: string }) {
    return this.processesService.rejectProcess(body.id, body.actor, body.reason);
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleProcessEnabled(@Body() body: { id: string; actor: string }) {
    return this.processesService.toggleProcessEnabled(body.id, body.actor);
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveProcess(@Body() approveProcessesDto: ApproveProcessesDto) {
    return this.processesService.approveProcess(approveProcessesDto);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveProcess(
    @Body() disapproveProcessesDto: DisapproveProcessesDto,
  ) {
    return this.processesService.disapproveProcess(disapproveProcessesDto);
  }

  @Patch(':processId')
  @ApiBearerAuth()
  async updateProcess(
    @Param('processId') processId: string,
    @Body() updateProcessesDto: UpdateProcessesDto,
  ) {
    return this.processesService.updateProcess(processId, updateProcessesDto);
  }
}
