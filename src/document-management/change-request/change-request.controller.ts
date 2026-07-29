import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ChangeRequestService } from './change-request.service';
import {
  CreateChangeRequestDto,
  DisapproveChangeRequestDto,
  UpdateChangeRequestDto,
} from './dtos/create-change-request.dto';

@ApiTags('Change Requests')
@Controller('change-requests')
export class ChangeRequestController {
  constructor(private readonly changeRequestService: ChangeRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a change request for a controlled document',
  })
  @ApiBearerAuth()
  async create(@Body() dto: CreateChangeRequestDto, @CurrentUser() actor: any) {
    return this.changeRequestService.create(dto, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all change requests for the company' })
  @ApiBearerAuth()
  async findAll(@CurrentUser() actor: any) {
    return this.changeRequestService.findAll(actor);
  }

  @Get('controlled-documents')
  @ApiOperation({
    summary:
      'List approved controlled documents with generated IDs (documents, forms, HACCP, flow diagrams, etc.)',
  })
  @ApiBearerAuth()
  async getControlledDocuments(@CurrentUser() actor: any) {
    return this.changeRequestService.getControlledDocuments(actor);
  }

  /** Must be registered before `GET :id`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download change requests directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadChangeRequestsPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.changeRequestService.downloadChangeRequestsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :id`. */
  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download a single change request PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadChangeRequestPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.changeRequestService.downloadChangeRequestPdf(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a change request by id (with timeline)' })
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.changeRequestService.findById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update / resubmit a pending or disapproved request',
  })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeRequestDto,
    @CurrentUser() actor: any,
  ) {
    return this.changeRequestService.update(id, dto, actor);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending change request' })
  @ApiBearerAuth()
  async approve(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.changeRequestService.approve(id, actor);
  }

  @Patch(':id/disapprove')
  @ApiOperation({
    summary: 'Disapprove a pending change request (reason required)',
  })
  @ApiBearerAuth()
  async disapprove(
    @Param('id') id: string,
    @Body() dto: DisapproveChangeRequestDto,
    @CurrentUser() actor: any,
  ) {
    return this.changeRequestService.disapprove(id, dto, actor);
  }
}
