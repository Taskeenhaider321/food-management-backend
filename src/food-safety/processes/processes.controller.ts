import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { CreateProcessesDto } from './dtos/create-processes.dto';
import { UpdateProcessesDto } from './dtos/update-processes.dto';
import { ApproveProcessesDto } from './dtos/approve-processes.dto';
import { DisapproveProcessesDto } from './dtos/disapprove-processes.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @ApiBearerAuth()
  async createProcess(
    @Body() createProcessesDto: CreateProcessesDto,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.createProcess(createProcessesDto, actor);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllProcesses(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.getAllProcesses(departmentId, actor);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedProcesses(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.getApprovedProcesses(departmentId, actor);
  }

  /** Must be registered before `GET :processId`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download flow diagrams directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadProcessesPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.processesService.downloadProcessesPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :processId`. */
  @Get(':processId/download-pdf')
  @ApiOperation({ summary: 'Download a single flow diagram PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadProcessPdf(
    @Param('processId') processId: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.processesService.downloadProcessPdf(
      processId,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :processId`. */
  @Get('detail/:processId')
  @ApiBearerAuth()
  async getProcessDetail(
    @Param('processId') processId: string,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.getProcessDetail(processId, actor);
  }

  @Get(':processId')
  @ApiBearerAuth()
  async getProcess(
    @Param('processId') processId: string,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.getProcess(processId, actor);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteProcess(@Body('id') id: string, @CurrentUser() actor: any) {
    return this.processesService.deleteProcess(id, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllProcesses(@CurrentUser() actor: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.processesService.deleteAllProcesses(actor);
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewProcess(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.processesService.reviewProcess(
      body.id,
      body.actor,
      currentUser,
    );
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectProcess(
    @Body() body: { id: string; actor: string; reason: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.processesService.rejectProcess(
      body.id,
      body.actor,
      body.reason,
      currentUser,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleProcessEnabled(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.processesService.toggleProcessEnabled(
      body.id,
      body.actor,
      currentUser,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveProcess(
    @Body() approveProcessesDto: ApproveProcessesDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.processesService.approveProcess(
      approveProcessesDto,
      currentUser,
    );
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveProcess(
    @Body() disapproveProcessesDto: DisapproveProcessesDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.processesService.disapproveProcess(
      disapproveProcessesDto,
      currentUser,
    );
  }

  @Patch(':processId')
  @ApiBearerAuth()
  async updateProcess(
    @Param('processId') processId: string,
    @Body() updateProcessesDto: UpdateProcessesDto,
    @CurrentUser() actor: any,
  ) {
    return this.processesService.updateProcess(
      processId,
      updateProcessesDto,
      actor,
    );
  }
}
