import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthenticatedOnly } from '../../auth/decorators/authenticated-only.decorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { ChangePasswordBodyDto } from './dtos/change-password-body.dto';
import { AssignUserRoleDto } from './dtos/assign-user-role.dto';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { SuspendUserDto } from './dtos/suspend-user.dto';
import {
  ChangeMyPasswordDto,
  UpdateMyProfileDto,
} from './dtos/update-my-profile.dto';
import { CompletePasswordSetupDto } from './dtos/password-setup.dto';

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

  @Public()
  @Get('password-setup/verify')
  @ApiOperation({
    summary: 'Validate a password setup (invitation) token — public',
  })
  @ApiQuery({ name: 'token', required: true, type: String })
  async verifyPasswordSetup(@Query('token') token: string) {
    return this.userService.verifyPasswordSetupToken(token);
  }

  @Public()
  @Post('password-setup')
  @ApiOperation({
    summary: 'Set password using a single-use invitation token — public',
  })
  async completePasswordSetup(@Body() dto: CompletePasswordSetupDto) {
    return this.userService.completePasswordSetup(dto.token, dto.password);
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

  @Get('check-email')
  @AuthenticatedOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check whether an email is already registered (create forms)',
  })
  @ApiQuery({ name: 'email', required: true, type: String })
  async checkEmail(@Query('email') email: string) {
    return this.userService.checkEmailAvailable(email);
  }

  @Get('check-username')
  @AuthenticatedOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check whether a username is already taken (create forms)',
  })
  @ApiQuery({ name: 'userName', required: true, type: String })
  async checkUsername(@Query('userName') userName: string) {
    return this.userService.checkUsernameAvailable(userName);
  }

  @Get('me/profile')
  @AuthenticatedOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Logged-in user's own profile (always resolved from the JWT)",
  })
  async getMyProfile(@Req() req: any) {
    return this.userService.getMyProfile(req.user);
  }

  @Patch('me/profile')
  @AuthenticatedOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update the logged-in user's own profile (name, email, phone, bio, location only)",
  })
  async updateMyProfile(@Body() body: UpdateMyProfileDto, @Req() req: any) {
    return this.userService.updateMyProfile(req.user, body);
  }

  @Post('me/change-password')
  @AuthenticatedOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change your own password (requires the current password)',
  })
  async changeMyPassword(@Body() body: ChangeMyPasswordDto, @Req() req: any) {
    return this.userService.changeMyPassword(
      req.user,
      body.currentPassword,
      body.newPassword,
    );
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

  // Was @Public(), which let anyone reset any user's password by id.
  @Patch(':id/change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: set a user's password (tenant-scoped)" })
  @ApiParam({ name: 'id', description: 'User _id' })
  async changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordBodyDto,
    @Req() req: any,
  ) {
    return this.userService.changePassword(id, body.password, req.user);
  }

  @Patch(':id/reassign-access')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lift suspension / re-enable access' })
  @ApiParam({ name: 'id', description: 'User _id' })
  async reassignAccess(@Param('id') id: string, @Req() req: any) {
    return this.userService.reassignAccess(id, req.user);
  }
}
