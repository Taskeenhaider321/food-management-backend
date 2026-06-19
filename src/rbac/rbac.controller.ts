import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { CreateRoleDto } from './dtos/create-role.dto';
import { CreateDerivedModuleDto } from './dtos/create-derived-module.dto';
import { UpdateDerivedModuleDto } from './dtos/update-derived-module.dto';
import { DerivedModuleService } from './company-rbac.service';
import { RbacService } from './rbac.service';

@ApiTags('RBAC')
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly derivedModuleService: DerivedModuleService,
  ) {}

  @Public()
  @Post('seed-master-data')
  @ApiOperation({ summary: 'Seed global modules and permissions' })
  async seedMasterData() {
    return this.rbacService.seedMasterData();
  }

  @Public()
  @Post('roles/super-admin')
  @ApiOperation({
    summary: 'Bootstrap super-admin role with ALL master modules (idempotent)',
  })
  async createSuperAdminRole() {
    return this.rbacService.createSuperAdminRole();
  }

  @Get('master-modules')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all seeded modules' })
  async getMasterModules() {
    return this.rbacService.getMasterModules();
  }

  @Get('master-modules/:masterModuleId/details')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get a master module with all its resources and permissions (for cherry-picking UI)',
  })
  @ApiParam({ name: 'masterModuleId' })
  async getMasterModuleDetails(
    @Param('masterModuleId') masterModuleId: string,
  ) {
    return this.derivedModuleService.getMasterModuleDetails(masterModuleId);
  }

  @Get('master-resources')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resource keys per module' })
  async getMasterResourcesByModule() {
    return this.rbacService.getMasterResourcesByModule();
  }

  @Get('master-permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pre-seeded permissions' })
  async getMasterPermissions() {
    return this.rbacService.getMasterPermissions();
  }

  @Get('master-permissions/module/:moduleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get permissions belonging to a module' })
  async getPermissionsByModule(@Param('moduleId') moduleId: string) {
    return this.rbacService.getPermissionsByModule(moduleId);
  }

  @Get('permission-tree')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Module -> resource -> permission tree for role builders',
  })
  async getPermissionTree() {
    return this.rbacService.getPermissionTree();
  }

  @Post('derived-modules')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a derived module from a master module with selected permissions',
    description:
      'Super-admin picks a master module, cherry-picks resources/permissions, optionally renames, saves as a global derived module.',
  })
  async createDerivedModule(
    @Body() dto: CreateDerivedModuleDto,
    @Req() req: any,
  ) {
    return this.derivedModuleService.create(dto, req.user?._id?.toString());
  }

  @Get('derived-modules')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all derived modules' })
  async getDerivedModules() {
    return this.derivedModuleService.findAll();
  }

  @Get('derived-modules/:derivedModuleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a derived module by ID' })
  @ApiParam({ name: 'derivedModuleId' })
  async getDerivedModule(@Param('derivedModuleId') id: string) {
    return this.derivedModuleService.findOne(id);
  }

  @Patch('derived-modules/:derivedModuleId')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update a derived module: change names, swap permissions, toggle active',
  })
  @ApiParam({ name: 'derivedModuleId' })
  async updateDerivedModule(
    @Param('derivedModuleId') id: string,
    @Body() dto: UpdateDerivedModuleDto,
  ) {
    return this.derivedModuleService.update(id, dto);
  }

  @Delete('derived-modules/:derivedModuleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a derived module' })
  @ApiParam({ name: 'derivedModuleId' })
  async deleteDerivedModule(@Param('derivedModuleId') id: string) {
    return this.derivedModuleService.remove(id);
  }

  @Post('roles')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a role with master modules and/or derived modules',
  })
  async createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    const user = req.user;
    if (user?.isSuspended) {
      throw new ForbiddenException('Your account is suspended');
    }
    return this.rbacService.createRole(dto, user?._id?.toString());
  }

  @Get('roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({
    name: 'companyScoped',
    required: false,
    description:
      'If true, return only roles with companyId matching the signed-in user (excludes global / super-admin roles).',
  })
  async getRoles(
    @Req() req: any,
    @Query('companyScoped') companyScoped?: string,
  ) {
    const onlyCompany =
      companyScoped === 'true' ||
      companyScoped === '1' ||
      companyScoped === 'yes';
    return this.rbacService.getRoles(req.user, onlyCompany);
  }

  @Patch('assign-role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a role to a user (RBAC service)' })
  async assignRole(@Body() dto: AssignRoleDto) {
    return this.rbacService.assignRole(dto);
  }
}
