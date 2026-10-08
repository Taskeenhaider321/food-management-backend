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
  Header,
  StreamableFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

type RequestCompanyRef = {
  _id: { toString(): string } | string;
};

type DepartmentRequestUser = {
  companyId?: RequestCompanyRef | string | null;
  [key: string]: unknown;
};

type DepartmentRequest = {
  user: DepartmentRequestUser;
};

function actorCompanyId(user: DepartmentRequestUser | undefined): string | null {
  const company = user?.companyId as
    | string
    | { _id?: { toString(): string } | string }
    | null
    | undefined;
  if (!company) return null;
  if (typeof company === 'string') return company;
  const id = company._id;
  if (!id) return null;
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Prefer the actor's own company. Super Admin / Super Staff may pass
 * `companyId` (query or body) to manage any tenant.
 */
function requestCompanyId(
  req: DepartmentRequest,
  overrideCompanyId?: string,
): string {
  const mine = actorCompanyId(req.user);
  if (mine) return mine;

  const override = String(overrideCompanyId || '').trim();
  if (override) {
    if (!isSuperAdminActor(req.user) && !isSuperStaffActor(req.user)) {
      throw new ForbiddenException(
        'Only Super Admin can select another company',
      );
    }
    return override;
  }

  throw new BadRequestException(
    'Company context is required. Select a company first.',
  );
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
    const companyId = requestCompanyId(req, createDepartmentDto.companyId);

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
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Required for Super Admin (no company on user)',
  })
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
    @Query('companyId') companyIdQuery?: string,
  ) {
    const companyId = requestCompanyId(req, companyIdQuery);

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
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Required for Super Admin (no company on user)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department analytics' })
  async analytics(
    @Req() req: DepartmentRequest,
    @Query('companyId') companyIdQuery?: string,
  ) {
    const companyId = requestCompanyId(req, companyIdQuery);
    const data = await this.departmentService.analytics(companyId);
    return { status: true, data };
  }

  @Get('company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get departments by company ID' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Required for Super Admin (no company on user)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Departments found' })
  async findByCompany(
    @Req() req: DepartmentRequest,
    @Query('companyId') companyIdQuery?: string,
  ) {
    const companyId = requestCompanyId(req, companyIdQuery);
    const departments = await this.departmentService.findByCompany(companyId);
    return { status: true, data: departments };
  }

  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download departments directory PDF' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Required for Super Admin (no company on user)',
  })
  @Header('Content-Type', 'application/pdf')
  async downloadDepartmentsPdf(
    @Req() req: DepartmentRequest,
    @Query('companyId') companyIdQuery?: string,
  ): Promise<StreamableFile> {
    const companyId = requestCompanyId(req, companyIdQuery);
    const { buffer, fileName } =
      await this.departmentService.downloadDepartmentsPdf(req.user, companyId);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single department PDF' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadDepartmentByIdPdf(
    @Param('id') id: string,
    @Req() req: DepartmentRequest,
    @Query('companyId') companyIdQuery?: string,
  ): Promise<StreamableFile> {
    const companyId = requestCompanyId(req, companyIdQuery);
    const { buffer, fileName } =
      await this.departmentService.downloadDepartmentByIdPdf(
        id,
        req.user,
        companyId,
      );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Required for Super Admin (no company on user)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: DepartmentRequest,
    @Query('companyId') companyIdQuery?: string,
  ) {
    const companyId = requestCompanyId(req, companyIdQuery);
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
