// TEST/hr/personal-requisition/personal-requisition.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PersonalRequisitionService } from './personal-requisition.service';
import {
  CreatePersonalRequisitionDto,
  UpdatePersonStatusDto,
} from './dtos/create-personal-requisition.dto';

@ApiTags('Personal Requisitions')
@Controller('personal-requisitions')
export class PersonalRequisitionController {
  constructor(
    private readonly personalRequisitionService: PersonalRequisitionService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create personal requisition' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Requisition created successfully',
  })
  async create(
    @Body() createDto: CreatePersonalRequisitionDto,
    @CurrentUser() actor: any,
  ) {
    return this.personalRequisitionService.create(createDto, actor);
  }

  /** Register before :departmentId so /all/:companyId is not captured as a department id. */
  @Get('all/:companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all requisitions by company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Requisitions found' })
  async findByCompany(@Param('companyId') companyId: string) {
    return this.personalRequisitionService.findByCompany(companyId);
  }

  @Get(':departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get requisitions by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Requisitions found' })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.personalRequisitionService.findByDepartment(departmentId);
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update requisition status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status updated successfully',
  })
  async updateStatus(@Body() updateDto: UpdatePersonStatusDto) {
    return this.personalRequisitionService.updateStatus(updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete personal requisition by id' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return this.personalRequisitionService.delete(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all requisitions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All requisitions deleted successfully',
  })
  async deleteAll() {
    return this.personalRequisitionService.deleteAll();
  }
}
