import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { ChangePasswordBodyDto } from './dtos/change-password-body.dto';
import { AssignUserRoleDto } from './dtos/assign-user-role.dto';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { SuspendUserDto } from './dtos/suspend-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('super-admin')
  @ApiOperation({
    summary: 'Bootstrap the first super-admin (public, one-time)',
  })
  async createSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.userService.createSuperAdmin(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login — returns JWT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async userLogin(@Body() loginDto: LoginUserDto) {
    return this.userService.userLogin(loginDto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create users — company is taken from the JWT actor (not from body).',
  })
  async createUser(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.userService.createUser(dto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List users (super-admin: all tenants; company-admin: own company)',
  })
  async findAll(@Req() req: any) {
    const data = await this.userService.findAll(req.user);
    return { status: true, data };
  }

  @Get('company/:companyId/department/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Users in a company and department (tenant-scoped)',
  })
  async getByCompanyAndDepartment(
    @Param('companyId') companyId: string,
    @Param('departmentId') departmentId: string,
    @Req() req: any,
  ) {
    return this.userService.getUsersByCompanyAndDepartment(
      companyId,
      departmentId,
      req.user,
    );
  }

  @Get('company/:companyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Users by company' })
  async getUserByCompany(
    @Param('companyId') companyId: string,
    @Req() req: any,
  ) {
    return this.userService.getUserByCompany(companyId, req.user);
  }

  @Get('department/:departmentId/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Users in department (includes total count)' })
  async getAllUsers(
    @Param('departmentId') departmentId: string,
    @Req() req: any,
  ) {
    return this.userService.getAllUsers(departmentId, req.user);
  }

  @Get('department/:departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Users by department' })
  async getUsersByDepartment(
    @Param('departmentId') departmentId: string,
    @Req() req: any,
  ) {
    return this.userService.getUsersByDepartment(departmentId, req.user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User by ID with access payload (company-user: own id only)',
  })
  @ApiParam({ name: 'id', description: 'User _id' })
  async getUserById(@Param('id') id: string, @Req() req: any) {
    return this.userService.getUser(id, req.user);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update user (company-user: profile fields only; admins may set role/department/suspend)',
  })
  @ApiParam({ name: 'id', description: 'User _id' })
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.userService.updateUser({ userId: id, ...body }, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (company-admin / super-admin)' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.userService.deleteUser(id, req.user);
  }

  @Patch(':id/assign-role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign role (company-admin / super-admin)' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async assignRole(
    @Param('id') id: string,
    @Body() roleData: AssignUserRoleDto,
    @Req() req: any,
  ) {
    return this.userService.assignRole(id, roleData, req.user);
  }

  @Patch(':id/suspend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend (true) or activate (false) user' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async suspendUser(
    @Param('id') id: string,
    @Body() body: SuspendUserDto,
    @Req() req: any,
  ) {
    return this.userService.suspendUser(id, body.suspended, req.user);
  }

  @Public()
  @Patch(':id/change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordBodyDto,
  ) {
    return this.userService.changePassword(id, body.password);
  }

  @Patch(':id/reassign-access')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lift suspension / re-enable access' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async reassignAccess(@Param('id') id: string, @Req() req: any) {
    return this.userService.reassignAccess(id, req.user);
  }
}
