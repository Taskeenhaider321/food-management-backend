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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

type RequestCompanyRef = {
  _id: { toString(): string } | string;
};

type DepartmentRequestUser = {
  companyId: RequestCompanyRef;
  [key: string]: unknown;
};

type DepartmentRequest = {
  user: DepartmentRequestUser;
};

function requestCompanyId(req: DepartmentRequest): string {
  return req.user.companyId._id.toString();
}

@ApiTags('Departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create departments in bulk' })
  async createBulk(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @Req() req: DepartmentRequest,
  ) {
    const companyId = requestCompanyId(req);

    return this.departmentService.createBulk(
      createDepartmentDto.departments,
      companyId,
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all departments',
  })
  async findAll(
    @Req() req: DepartmentRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const companyId = requestCompanyId(req);

    const result = await this.departmentService.findAllForUser(companyId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      sortBy,
      sortOrder,
    });

    return { status: true, data: result.items, meta: result.meta };
  }

  @Get('analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get department analytics for your company' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department analytics' })
  async analytics(@Req() req: DepartmentRequest) {
    const companyId = requestCompanyId(req);
    const data = await this.departmentService.analytics(companyId);
    return { status: true, data };
  }

  @Get('company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get departments by company ID' })
  // @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Departments found' })
  async findByCompany(@Req() req: DepartmentRequest) {
    const companyId = requestCompanyId(req);
    // assertActorMayAccessCompany(req.user, companyId);
    const departments = await this.departmentService.findByCompany(companyId);
    return { status: true, data: departments };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async findOne(@Param('id') id: string, @Req() req: DepartmentRequest) {
    const companyId = requestCompanyId(req);
    return this.departmentService.findOne(id, companyId);
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update department' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async update(
    @Body() body: { id: string } & UpdateDepartmentDto,
    @Req() req: DepartmentRequest,
  ) {
    const { id, ...updateData } = body;
    const department = await this.departmentService.update(
      id,
      updateData,
      req.user,
    );
    return {
      status: true,
      message: 'Department updated successfully',
      data: department,
    };
  }

  @Delete(':departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async delete(@Param('departmentId') id: string) {
    await this.departmentService.delete(id);
    return { status: true, message: 'Department deleted successfully' };
  }
}
