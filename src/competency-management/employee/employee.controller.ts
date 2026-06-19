// TEST/hr/employee/employee.controller.ts
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
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dtos/create-employee.dto';
import { UpdateEmployeeDto } from './dtos/update-employee.dto';

@ApiTags('Employees')
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new employee' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Employee created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Employee email already exists',
  })
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() actor: any,
  ) {
    return this.employeeService.create(createEmployeeDto, actor);
  }

  /** Must be registered before `:id` and legacy single-segment routes. */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List employees for the signed-in user’s company (all for super-admin)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of employees' })
  async listByCompany(@CurrentUser() actor: any) {
    return this.employeeService.findAllForCompany(actor);
  }

  @Get('department/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employees by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Employees found' })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.employeeService.findByDepartment(departmentId);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all employees' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All employees deleted successfully',
  })
  async deleteAll() {
    return this.employeeService.deleteAll();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() actor: any,
  ) {
    return this.employeeService.update(id, updateEmployeeDto, actor);
  }

  /** Legacy path; must be before `Get(':id')` so `all` is not parsed as an ObjectId. */
  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List employees (alias of GET /employees)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of employees' })
  async listAllAlias(@CurrentUser() actor: any) {
    return this.employeeService.findAllForCompany(actor);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Employee found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Employee not found',
  })
  async findOne(@Param('id') id: string, @CurrentUser() actor: any) {
    const data = await this.employeeService.findOne(id, actor);
    return { status: true, data };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return this.employeeService.delete(id);
  }
}
