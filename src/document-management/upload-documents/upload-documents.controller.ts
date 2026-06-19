import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadDocumentsService } from './upload-documents.service';
import {
  CreateUploadDocumentsDto,
  ReviewUploadedDocumentDto,
  RejectUploadedDocumentDto,
  ApproveUploadedDocumentDto,
  DisapproveUploadedDocumentDto,
  CommentDocumentDto,
  ReplaceDocumentDto,
} from './dtos/create-upload-documents.dto';

@ApiTags('Upload Documents')
@Controller('upload-documents')
export class UploadDocumentsController {
  constructor(
    private readonly uploadDocumentsService: UploadDocumentsService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateUploadDocumentsDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadDocumentsService.create(dto, file);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all documents by department' })
  async findAll(@Param('departmentId') departmentId: string) {
    return this.uploadDocumentsService.findAll(departmentId);
  }

  @Get(':documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document by ID' })
  async findById(@Param('documentId') documentId: string) {
    return this.uploadDocumentsService.findById(documentId);
  }

  @Patch('review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review uploaded document' })
  async review(@Body() dto: ReviewUploadedDocumentDto) {
    return this.uploadDocumentsService.review(dto);
  }

  @Patch('reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject uploaded document' })
  async reject(@Body() dto: RejectUploadedDocumentDto) {
    return this.uploadDocumentsService.reject(dto);
  }

  @Patch('approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve uploaded document' })
  async approve(@Body() dto: ApproveUploadedDocumentDto) {
    return this.uploadDocumentsService.approve(dto);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disapprove uploaded document' })
  async disapprove(@Body() dto: DisapproveUploadedDocumentDto) {
    return this.uploadDocumentsService.disapprove(dto);
  }

  @Patch('comment/:documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to document' })
  async addComment(
    @Param('documentId') documentId: string,
    @Body() dto: CommentDocumentDto,
  ) {
    return this.uploadDocumentsService.addComment(documentId, dto);
  }

  @Put('replace/:documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async replace(
    @Param('documentId') documentId: string,
    @Body() dto: ReplaceDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadDocumentsService.replace(documentId, dto, file);
  }
}
