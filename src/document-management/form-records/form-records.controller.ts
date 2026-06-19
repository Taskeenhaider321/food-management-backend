import { Controller, Post, Patch, Get, Body, Param } from '@nestjs/common';
import { FormRecordsService } from './form-records.service';
import { CreateFormRecordsDto } from './dtos/create-form-records.dto';
import { AddCommentDto } from './dtos/add-comment.dto';
import { VerifyResponseDto } from './dtos/verify-response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Form Records')
@Controller('form-records')
export class FormRecordsController {
  constructor(private readonly formRecordsService: FormRecordsService) {}

  @Post('submit-response')
  @ApiBearerAuth()
  async submitResponse(@Body() createDto: CreateFormRecordsDto) {
    return this.formRecordsService.submitResponse(createDto);
  }

  @Patch('addComment')
  @ApiBearerAuth()
  async addComment(@Body() addCommentDto: AddCommentDto) {
    return this.formRecordsService.addComment(addCommentDto);
  }

  @Patch('verify-response')
  @ApiBearerAuth()
  async verifyResponse(@Body() verifyDto: VerifyResponseDto) {
    return this.formRecordsService.verifyResponse(verifyDto);
  }

  @Get('get-responses-by-formId/:formId/:departmentId')
  @ApiBearerAuth()
  async getResponsesByFormId(
    @Param('formId') formId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.formRecordsService.getResponsesByFormId(formId, departmentId);
  }

  @Get('get-record-by-recordId/:recordId')
  @ApiBearerAuth()
  async getRecordByRecordId(@Param('recordId') recordId: string) {
    return this.formRecordsService.getRecordByRecordId(recordId);
  }
}
