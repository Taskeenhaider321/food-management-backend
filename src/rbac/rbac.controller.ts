import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { CreateDerivedModuleDto } from './dtos/create-derived-module.dto';
import { UpdateDerivedModuleDto } from './dtos/update-derived-module.dto';
import {
  AssignCompanyModulesBulkDto,
  UpdateCompanyModuleAssignmentDto,
} from './dtos/company-module-assignment.dto';
import { DerivedModuleService } from './company-rbac.service';
import { CompanyModuleAssignmentService } from './company-module-assignment.service';
import { AuthorizationService } from './authorization.service';
import { AccessVersionService } from './access-version.service';
import { RbacService } from './rbac.service';
import {
  isSuperAdminActor,
  isCompanyAdminActor,
  actorCompanyIdString,
} from '../auth/utils/request-actor.util';
import { assertActorMayCreateRolePayload } from './utils/role-assignment.util';

@ApiTags('RBAC')
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly derivedModuleService: DerivedModuleService,
    private readonly companyModuleAssignmentService: CompanyModuleAssignmentService,
    private readonly authorizationService: AuthorizationService,
    private readonly accessVersionService: AccessVersionService,
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
    const user = req.user;
    if (isCompanyAdminActor(user)) {
      const companyId = actorCompanyIdString(user);
      if (!companyId) {
        throw new ForbiddenException('Company admin has no company scope');
      }
      await this.companyModuleAssignmentService.assertPermissionIdsWithinCompanyCeiling(
        companyId,
        dto.selectedPermissionIds,
      );
    }
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
    @CurrentUser() actor: any,
  ) {
    if (isCompanyAdminActor(actor) && dto.selectedPermissionIds?.length) {
      const companyId = actorCompanyIdString(actor);
      if (!companyId) {
        throw new ForbiddenException('Company admin has no company scope');
      }

      await this.companyModuleAssignmentService.assertPermissionIdsWithinCompanyCeiling(
        companyId,
        dto.selectedPermissionIds,
      );
    }
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
    assertActorMayCreateRolePayload(user, dto);
    return this.rbacService.createRole(dto, user?._id?.toString(), user);
  }

  @Patch('roles/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a role (name, active flag, and/or permission grants)',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
  ) {
    const user = req.user;
    if (user?.isSuspended) {
      throw new ForbiddenException('Your account is suspended');
    }
    return this.rbacService.updateRole(id, dto, user);
  }

  /** Must be registered before any `roles/:id` routes. */
  @Get('roles/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download company-scoped RBAC roles directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadRolesPdf(@CurrentUser() actor: any): Promise<StreamableFile> {
    const { buffer, fileName } = await this.rbacService.downloadRolesPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before any broader `roles/:id` route. */
  @Get('roles/:id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single RBAC role PDF' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadRolePdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.rbacService.downloadRolePdf(
      id,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
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
  async assignRole(@Body() dto: AssignRoleDto, @Req() req: any) {
    return this.rbacService.assignRole(dto, req.user);
  }

  // ─── Company module assignments (Super Admin → Company ceiling) ───

  @Get('companies/:companyId/modules')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List modules/permissions assigned to a company',
  })
  @ApiParam({ name: 'companyId' })
  async listCompanyModules(@Param('companyId') companyId: string) {
    return this.companyModuleAssignmentService.listForCompany(companyId);
  }

  @Put('companies/:companyId/modules')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Replace company module assignments (custom names + permission subsets)',
  })
  @ApiParam({ name: 'companyId' })
  async replaceCompanyModules(
    @Param('companyId') companyId: string,
    @Body() dto: AssignCompanyModulesBulkDto,
    @CurrentUser() actor: any,
  ) {
    if (!isSuperAdminActor(actor)) {
      throw new ForbiddenException(
        'Only Super Admin can assign company modules',
      );
    }
    return this.companyModuleAssignmentService.replaceForCompany(
      companyId,
      dto.modules ?? [],
      actor?._id?.toString(),
    );
  }

  @Patch('companies/:companyId/modules/:masterModuleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update one company module assignment' })
  @ApiParam({ name: 'companyId' })
  @ApiParam({ name: 'masterModuleId' })
  async updateCompanyModule(
    @Param('companyId') companyId: string,
    @Param('masterModuleId') masterModuleId: string,
    @Body() dto: UpdateCompanyModuleAssignmentDto,
    @CurrentUser() actor: any,
  ) {
    if (!isSuperAdminActor(actor)) {
      throw new ForbiddenException(
        'Only Super Admin can update company modules',
      );
    }
    return this.companyModuleAssignmentService.updateOne(
      companyId,
      masterModuleId,
      dto,
    );
  }

  @Delete('companies/:companyId/modules/:masterModuleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a module from a company' })
  @ApiParam({ name: 'companyId' })
  @ApiParam({ name: 'masterModuleId' })
  async removeCompanyModule(
    @Param('companyId') companyId: string,
    @Param('masterModuleId') masterModuleId: string,
    @CurrentUser() actor: any,
  ) {
    if (!isSuperAdminActor(actor)) {
      throw new ForbiddenException(
        'Only Super Admin can remove company modules',
      );
    }
    return this.companyModuleAssignmentService.removeOne(
      companyId,
      masterModuleId,
    );
  }

  @Get('me/access')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Effective access tree for the signed-in user' })
  async myAccess(@CurrentUser() actor: any) {
    return this.authorizationService.buildAccessForUser(actor);
  }

  @Get('me/access-version')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lightweight access version for polling — FE refreshes me/access when this changes',
  })
  async myAccessVersion(@CurrentUser() actor: any) {
    const accessVersion = await this.accessVersionService.versionForUser(actor);
    return { accessVersion };
  }
}
