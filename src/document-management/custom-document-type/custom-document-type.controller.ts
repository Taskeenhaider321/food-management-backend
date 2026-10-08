import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomDocumentTypeService } from './custom-document-type.service';
import {
  CreateCustomDocumentTypeDto,
  ListCustomDocumentTypesQueryDto,
} from './dtos/custom-document-type.dto';

@ApiTags('Custom Document Types')
@ApiBearerAuth()
@Controller('custom-document-types')
export class CustomDocumentTypeController {
  constructor(private readonly service: CustomDocumentTypeService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a custom document type for a specific form/tab scope',
  })
  create(@Body() dto: CreateCustomDocumentTypeDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'List custom document types for a company + form/tab scope',
  })
  list(@Query() query: ListCustomDocumentTypesQueryDto, @Req() req: any) {
    return this.service.listByScope(query.scopeKey, query.companyId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one custom document type' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a custom document type' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.softDelete(id, req.user);
  }
}
