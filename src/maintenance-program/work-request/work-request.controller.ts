import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { WorkRequestService } from './work-request.service';
import {
  CreateWorkRequestDto,
  RejectWorkRequestDto,
  AcceptWorkRequestDto,
  CompleteWorkRequestDto,
  ChangePriorityDto,
  ResubmitWorkRequestDto,
} from './dtos/create-work-request.dto';
import { UpdateWorkRequestDto } from './dtos/update-work-request.dto';

@ApiTags('Work Request')
@Controller('work-requests')
export class WorkRequestController {
  constructor(private readonly workRequestService: WorkRequestService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create work request' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mwrImages', maxCount: 10 },
      { name: 'mwrDocuments', maxCount: 10 },
    ]),
  )
  async create(
    @Body() dto: CreateWorkRequestDto,
    @UploadedFiles()
    files: {
      mwrImages?: Express.Multer.File[];
      mwrDocuments?: Express.Multer.File[];
    },
  ) {
    return this.workRequestService.create(dto, files?.mwrImages || [], files?.mwrDocuments || []);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject work request' })
  async reject(@Param('id') id: string, @Body() dto: RejectWorkRequestDto) {
    return this.workRequestService.reject(id, dto);
  }

  @Patch(':id/accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept work request' })
  async accept(@Param('id') id: string, @Body() dto: AcceptWorkRequestDto) {
    return this.workRequestService.accept(id, dto);
  }

  @Patch(':id/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete work request' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'completionImages', maxCount: 10 },
      { name: 'completionDocuments', maxCount: 10 },
    ]),
  )
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteWorkRequestDto,
    @UploadedFiles()
    files: {
      completionImages?: Express.Multer.File[];
      completionDocuments?: Express.Multer.File[];
    },
  ) {
    return this.workRequestService.complete(
      id,
      dto,
      files?.completionImages || [],
      files?.completionDocuments || [],
    );
  }

  @Patch(':id/change-priority')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change work request priority' })
  async changePriority(@Param('id') id: string, @Body() dto: ChangePriorityDto) {
    return this.workRequestService.changePriority(id, dto);
  }

  @Patch(':id/resubmit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resubmit rejected work request' })
  async resubmit(@Param('id') id: string, @Body() dto: ResubmitWorkRequestDto) {
    return this.workRequestService.resubmit(id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pending/rejected work request' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mwrImages', maxCount: 10 },
      { name: 'mwrDocuments', maxCount: 10 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkRequestDto,
    @UploadedFiles()
    files: {
      mwrImages?: Express.Multer.File[];
      mwrDocuments?: Express.Multer.File[];
    },
  ) {
    return this.workRequestService.update(
      id,
      dto,
      files?.mwrImages || [],
      files?.mwrDocuments || [],
    );
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all work requests' })
  async findAll() {
    return this.workRequestService.findAll();
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all work requests by department' })
  async findAllByDepartment(@Param('departmentId') departmentId: string) {
    return this.workRequestService.findAll(departmentId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get work request by ID' })
  async findById(@Param('id') id: string) {
    return this.workRequestService.findById(id);
  }

  @Get('by-machine/:machineId/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get work requests by machine ID' })
  async findByMachineId(
    @Param('machineId') machineId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.workRequestService.findByMachineId(machineId, departmentId);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all work requests' })
  async removeAll() {
    return this.workRequestService.removeAll();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete work request by ID' })
  async remove(@Param('id') id: string) {
    return this.workRequestService.remove(id);
  }
}
