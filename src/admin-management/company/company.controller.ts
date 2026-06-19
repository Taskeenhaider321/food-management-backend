import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create company (optionally provision modules + admin user)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Company created successfully',
  })
  async create(@Body() dto: CreateCompanyDto, @Req() req: any) {
    return this.companyService.create(dto, req.user?._id?.toString());
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all companies (super-admin) or your company only',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of companies' })
  async findAll(@Req() req: any) {
    return this.companyService.findAll(req.user);
  }

  @Get(':companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Company found' })
  async findOne(@Param('companyId') id: string, @Req() req: any) {
    return this.companyService.findOne(id, req.user);
  }

  @Patch(':companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Company updated successfully',
  })
  async update(
    @Param('companyId') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    return this.companyService.update(id, dto, req.user);
  }

  @Delete(':companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete company and associated data' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Company deleted successfully',
  })
  async remove(@Param('companyId') id: string, @Req() req: any) {
    return this.companyService.delete(id, req.user);
  }
}
