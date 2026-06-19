import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateChecklistService } from './create-checklist.service';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { ApproveChecklistDto } from './dtos/approve-checklist.dto';
import { DisapproveChecklistDto } from './dtos/disapprove-checklist.dto';
import { ReviewChecklistDto } from './dtos/review-checklist.dto';
import { RejectChecklistDto } from './dtos/reject-checklist.dto';
import { CreateResponseGroupDto, UpdateResponseGroupDto } from './dtos/response-group.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Checklist')
@Controller('checklist')
export class CreateChecklistController {
  constructor(
    private readonly createChecklistService: CreateChecklistService,
  ) {}

  // ─── Checklist CRUD ────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create checklist' })
  @ApiBearerAuth()
  async addChecklist(@Body() createDto: CreateChecklistDto) {
    return this.createChecklistService.addChecklist(createDto);
  }

  @Get('all/:departmentId')
  @ApiOperation({ summary: 'Get all checklists by department' })
  @ApiBearerAuth()
  async getChecklists(@Param('departmentId') departmentId: string) {
    return this.createChecklistService.getChecklists(departmentId);
  }

  @Get(':checklistId')
  @ApiOperation({ summary: 'Get checklist by ID' })
  @ApiBearerAuth()
  async getChecklistById(@Param('checklistId') checklistId: string) {
    return this.createChecklistService.getChecklistById(checklistId);
  }

  @Put()
  @ApiOperation({ summary: 'Update checklist (only when In Review, Rejected, or Disapproved)' })
  @ApiBearerAuth()
  async updateChecklist(@Body() updateDto: UpdateChecklistDto) {
    return this.createChecklistService.updateChecklist(updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  async deleteChecklist(@Param('id') id: string) {
    return this.createChecklistService.deleteChecklist(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllChecklists(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.createChecklistService.deleteAllChecklists();
  }

  // ─── Approval Workflow ─────────────────────────────────────────────

  @Patch('review')
  @ApiOperation({ summary: 'Mark checklist as Reviewed' })
  @ApiBearerAuth()
  async reviewChecklist(@Body() dto: ReviewChecklistDto) {
    return this.createChecklistService.reviewChecklist(dto);
  }

  @Patch('approve')
  @ApiOperation({ summary: 'Approve checklist' })
  @ApiBearerAuth()
  async approveChecklist(@Body() approveDto: ApproveChecklistDto) {
    return this.createChecklistService.approveChecklist(approveDto);
  }

  @Patch('reject')
  @ApiOperation({ summary: 'Reject checklist (requires reason)' })
  @ApiBearerAuth()
  async rejectChecklist(@Body() rejectDto: RejectChecklistDto) {
    return this.createChecklistService.rejectChecklist(rejectDto);
  }

  @Patch('disapprove')
  @ApiOperation({ summary: 'Disapprove checklist (requires reason)' })
  @ApiBearerAuth()
  async disapproveChecklist(@Body() disapproveDto: DisapproveChecklistDto) {
    return this.createChecklistService.disapproveChecklist(disapproveDto);
  }

  // ─── Enable / Disable ─────────────────────────────────────────────

  @Patch('toggle-status/:checklistId')
  @ApiOperation({ summary: 'Enable/Disable checklist' })
  @ApiBearerAuth()
  async toggleChecklistStatus(@Param('checklistId') checklistId: string) {
    return this.createChecklistService.toggleChecklistStatus(checklistId);
  }

  // ─── Settings / Banner Upload ──────────────────────────────────────

  @Patch('settings/:checklistId')
  @ApiOperation({ summary: 'Update checklist settings' })
  @ApiBearerAuth()
  async updateSettings(
    @Param('checklistId') checklistId: string,
    @Body() settings: any,
  ) {
    return this.createChecklistService.updateSettings(checklistId, settings);
  }

  @Post('upload-banner/:checklistId')
  @ApiOperation({ summary: 'Upload banner image for checklist' })
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBanner(
    @Param('checklistId') checklistId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.createChecklistService.uploadBanner(checklistId, file);
  }

  // ─── Shareable Link ────────────────────────────────────────────────

  @Patch('generate-link/:checklistId')
  @ApiOperation({ summary: 'Generate shareable link for checklist' })
  @ApiBearerAuth()
  async generateShareableLink(@Param('checklistId') checklistId: string) {
    return this.createChecklistService.generateShareableLink(checklistId);
  }

  // ─── Timeline & Version History ────────────────────────────────────

  @Get('timeline/:checklistId')
  @ApiOperation({ summary: 'Get status timeline for checklist' })
  @ApiBearerAuth()
  async getTimeline(@Param('checklistId') checklistId: string) {
    return this.createChecklistService.getTimeline(checklistId);
  }

  @Get('version-history/:checklistId')
  @ApiOperation({ summary: 'Get version history for checklist' })
  @ApiBearerAuth()
  async getVersionHistory(@Param('checklistId') checklistId: string) {
    return this.createChecklistService.getVersionHistory(checklistId);
  }

  // ─── Response Groups ───────────────────────────────────────────────

  @Post('response-group')
  @ApiOperation({ summary: 'Create custom response group' })
  @ApiBearerAuth()
  async createResponseGroup(@Body() dto: CreateResponseGroupDto) {
    return this.createChecklistService.createResponseGroup(dto);
  }

  @Get('response-groups/all')
  @ApiOperation({ summary: 'Get all response groups (default + custom)' })
  @ApiBearerAuth()
  async getResponseGroups() {
    return this.createChecklistService.getResponseGroups();
  }

  @Put('response-group')
  @ApiOperation({ summary: 'Update custom response group' })
  @ApiBearerAuth()
  async updateResponseGroup(@Body() dto: UpdateResponseGroupDto) {
    return this.createChecklistService.updateResponseGroup(dto);
  }

  @Delete('response-group/:id')
  @ApiBearerAuth()
  async deleteResponseGroup(@Param('id') id: string) {
    return this.createChecklistService.deleteResponseGroup(id);
  }
}
