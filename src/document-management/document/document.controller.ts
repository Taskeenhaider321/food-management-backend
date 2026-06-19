import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DocumentService } from './document.service';
import {
  ActionReasonDto,
  CreateDocumentDto,
  UpdateDocumentDto,
} from './dtos/create-document.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a document (upload or rich text editor)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: any,
  ) {
    return this.documentService.create(dto, file, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all documents for the company' })
  @ApiBearerAuth()
  async findAll(@CurrentUser() actor: any) {
    return this.documentService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id (with timeline and versions)' })
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.documentService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document (resubmits rejected/disapproved)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: any,
  ) {
    return this.documentService.update(id, dto, file, actor);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Mark a document as reviewed' })
  @ApiBearerAuth()
  async review(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.documentService.review(id, actor);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a reviewed document' })
  @ApiBearerAuth()
  async approve(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.documentService.approve(id, actor);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a document (reason required)' })
  @ApiBearerAuth()
  async reject(
    @Param('id') id: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser() actor: any,
  ) {
    return this.documentService.reject(id, dto, actor);
  }

  @Patch(':id/disapprove')
  @ApiOperation({ summary: 'Disapprove an approved document (reason required)' })
  @ApiBearerAuth()
  async disapprove(
    @Param('id') id: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser() actor: any,
  ) {
    return this.documentService.disapprove(id, dto, actor);
  }

  @Patch(':id/toggle-enabled')
  @ApiOperation({ summary: 'Enable / disable a reviewed or approved document' })
  @ApiBearerAuth()
  async toggleEnabled(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.documentService.toggleEnabled(id, actor);
  }
}
