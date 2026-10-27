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
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import {
  ApproveSupplierDto,
  DisapproveSupplierDto,
} from './dtos/update-supplier.dto';
import {
  ApproveSupplierByIdDto,
  SaveSupplierEvaluationDto,
  SupplierWorkflowActorDto,
} from './dtos/supplier-workflow.dto';
import { UpdateSupplierCertificationsDto } from './dtos/supplier-certification.dto';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('catalogue/certifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Certification catalogue for supplier onboarding' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Catalogue categories' })
  getCertificationCatalogue() {
    return this.supplierService.getCatalogue();
  }

  @Get('company/:companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List suppliers for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of suppliers' })
  findByCompany(@Param('companyId') companyId: string, @Req() req: any) {
    return this.supplierService.findByCompany(companyId, req.user);
  }

  @Get('company/:companyId/approved')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approved suppliers for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approved suppliers for company',
  })
  listApprovedByCompany(@Param('companyId') companyId: string, @Req() req: any) {
    return this.supplierService.listApproved(companyId, req.user);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all suppliers by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of suppliers' })
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.supplierService.findByDepartment(departmentId);
  }

  @Patch('approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve supplier (legacy body with id)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier approved successfully',
  })
  async approve(@Body() approveDto: ApproveSupplierDto, @Req() req: any) {
    return this.supplierService.approve(
      approveDto.id,
      approveDto.approvedBy,
      approveDto.approvedScope,
      req.user,
    );
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disapprove supplier (legacy)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier disapproved successfully',
  })
  async disapprove(@Body() disapproveDto: DisapproveSupplierDto, @Req() req: any) {
    return this.supplierService.disapprove(
      disapproveDto.id,
      disapproveDto.disapprovedBy,
      disapproveDto.Reason,
      req.user,
    );
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Supplier created successfully',
  })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all suppliers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All suppliers deleted successfully',
  })
  async removeAll() {
    return this.supplierService.removeAll();
  }

  @Delete()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete supplier by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier deleted successfully',
  })
  async remove(@Body() body: { id: string }, @Req() req: any) {
    return this.supplierService.remove(body.id, req.user);
  }

  @Patch(':id/submit-review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit supplier for review' })
  async submitForReview(
    @Param('id') id: string,
    @Body() body: SupplierWorkflowActorDto,
    @Req() req: any,
  ) {
    return this.supplierService.submitForReview(id, body.by, req.user);
  }

  @Patch(':id/return')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return supplier for correction' })
  async returnForCorrection(
    @Param('id') id: string,
    @Body() body: SupplierWorkflowActorDto,
    @Req() req: any,
  ) {
    return this.supplierService.returnForCorrection(
      id,
      body.by,
      body.note,
      req.user,
    );
  }

  @Patch(':id/hold')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place supplier on hold' })
  async hold(
    @Param('id') id: string,
    @Body() body: SupplierWorkflowActorDto,
    @Req() req: any,
  ) {
    return this.supplierService.hold(id, body.by, body.note, req.user);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject supplier during review' })
  async reject(
    @Param('id') id: string,
    @Body() body: SupplierWorkflowActorDto,
    @Req() req: any,
  ) {
    return this.supplierService.reject(id, body.by, body.note, req.user);
  }

  @Patch(':id/evaluation')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save supplier evaluation scores' })
  async saveEvaluation(
    @Param('id') id: string,
    @Body() body: SaveSupplierEvaluationDto,
    @Req() req: any,
  ) {
    return this.supplierService.saveEvaluation(id, body, req.user);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve supplier by id' })
  async approveById(
    @Param('id') id: string,
    @Body() body: ApproveSupplierByIdDto,
    @Req() req: any,
  ) {
    return this.supplierService.approve(
      id,
      body.approvedBy,
      body.approvedScope,
      req.user,
    );
  }

  @Patch(':id/certifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace supplier certifications' })
  async updateCertifications(
    @Param('id') id: string,
    @Body() body: UpdateSupplierCertificationsDto,
    @Req() req: any,
  ) {
    return this.supplierService.updateCertifications(
      id,
      body.certifications,
      req.user,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Supplier found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.supplierService.findOne(id, req.user);
  }
}
