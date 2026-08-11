import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
} from '../admin-management/users/schemas/user.schema';
import {
  Company,
  CompanyDocument,
} from '../admin-management/company/schemas/company.schema';
import {
  actorCompanyIdString,
  isCompanyAdminActor,
  isCompanyUserActor,
  isSuperAdminActor,
} from '../auth/utils/request-actor.util';
import { DerivedModuleService } from './company-rbac.service';
import { CompanyModuleAssignmentService } from './company-module-assignment.service';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { AccessVersionService } from './access-version.service';
import {
  MASTER_MODULE_SEED,
  MASTER_PERMISSION_SEED,
  MASTER_RESOURCE_GROUP_LABELS,
} from './constants/master-access.seed';
import {
  DerivedModule,
  DerivedModuleDocument,
} from './schemas/company-module.schema';
import {
  MasterModule,
  MasterModuleDocument,
} from './schemas/master-module.schema';
import {
  MasterPermission,
  MasterPermissionDocument,
} from './schemas/master-permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { resourceDefaultDisplayName } from './utils/display-name.util';
import {
  assertActorMayAssignRole,
  assertActorMayUpdateRole,
  assertRoleUserScopePairing,
  roleCompanyId,
} from './utils/role-assignment.util';
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../common/branded-pdf.util';

@Injectable()
export class RbacService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(MasterModule.name)
    private readonly masterModuleModel: Model<MasterModuleDocument>,
    @InjectModel(MasterPermission.name)
    private readonly masterPermissionModel: Model<MasterPermissionDocument>,
    @InjectModel(DerivedModule.name)
    private readonly derivedModuleModel: Model<DerivedModuleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @Inject(forwardRef(() => DerivedModuleService))
    private readonly derivedModuleService: DerivedModuleService,
    @Inject(forwardRef(() => CompanyModuleAssignmentService))
    private readonly companyModuleAssignmentService: CompanyModuleAssignmentService,
    private readonly accessVersionService: AccessVersionService,
  ) {}

  private buildResourceGroupLabelMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const p of MASTER_PERMISSION_SEED) {
      const k = `${p.moduleKey}:${p.resource}`;
      if (!map.has(k)) {
        const explicit = MASTER_RESOURCE_GROUP_LABELS[k];
        map.set(k, explicit ?? resourceDefaultDisplayName(p.resource));
      }
    }
    return map;
  }

  async seedMasterData() {
    const resourceGroupLabels = this.buildResourceGroupLabelMap();
    const moduleMap = new Map<string, MasterModuleDocument>();

    for (const moduleSeed of MASTER_MODULE_SEED) {
      const module = await this.masterModuleModel.findOneAndUpdate(
        { key: moduleSeed.key },
        {
          name: moduleSeed.name,
          defaultName: moduleSeed.name,
          key: moduleSeed.key,
          isActive: true,
        },
        { upsert: true, returnDocument: 'after' },
      );
      moduleMap.set(moduleSeed.key, module);
    }

    for (const permissionSeed of MASTER_PERMISSION_SEED) {
      const module = moduleMap.get(permissionSeed.moduleKey);
      if (!module) {
        throw new BadRequestException(
          `Missing module seed for ${permissionSeed.moduleKey}`,
        );
      }

      const groupKey = `${permissionSeed.moduleKey}:${permissionSeed.resource}`;
      const resourceGroupLabel = resourceGroupLabels.get(groupKey)!;

      await this.masterPermissionModel.findOneAndUpdate(
        { key: permissionSeed.key },
        {
          moduleId: module._id,
          resource: permissionSeed.resource,
          resourceGroupLabel,
          action: permissionSeed.action,
          key: permissionSeed.key,
          description: permissionSeed.description,
          defaultName: resourceGroupLabel,
          method: permissionSeed.method,
          path: permissionSeed.path,
          isActive: true,
        },
        { upsert: true, returnDocument: 'after' },
      );
    }

    return {
      status: true,
      message: 'Global modules and permissions seeded successfully',
      data: {
        masterModulesCount: await this.masterModuleModel.countDocuments(),
        masterPermissionsCount:
          await this.masterPermissionModel.countDocuments(),
      },
    };
  }

  async getMasterModules() {
    return this.masterModuleModel.find().sort({ name: 1 }).exec();
  }

  async getMasterResourcesByModule() {
    const modules = await this.masterModuleModel
      .find()
      .sort({ name: 1 })
      .lean();
    const permissions = await this.masterPermissionModel.find().lean();

    return modules.map((module) => {
      const modPerms = permissions.filter(
        (p) => p.moduleId.toString() === module._id.toString(),
      );
      const keys = new Set(modPerms.map((p) => p.resource));
      return {
        moduleId: module._id,
        moduleKey: module.key,
        resources: [...keys].sort().map((key) => {
          const first = modPerms.find((p) => p.resource === key);
          return {
            key,
            defaultName:
              first?.resourceGroupLabel ?? resourceDefaultDisplayName(key),
          };
        }),
      };
    });
  }

  async getMasterPermissions() {
    return this.masterPermissionModel
      .find()
      .populate('moduleId')
      .sort({ key: 1 })
      .exec();
  }

  async getPermissionsByModule(moduleId: string) {
    this.ensureObjectId(moduleId, 'moduleId');
    return this.masterPermissionModel
      .find({ moduleId: new Types.ObjectId(moduleId) })
      .populate('moduleId')
      .sort({ key: 1 })
      .exec();
  }

  async getPermissionTree() {
    const modules = await this.masterModuleModel
      .find()
      .sort({ name: 1 })
      .lean();
    const permissions = await this.masterPermissionModel
      .find()
      .sort({ key: 1 })
      .lean();

    return modules.map((module) => {
      const modPerms = permissions.filter(
        (p) => p.moduleId.toString() === module._id.toString(),
      );
      const resourceKeys = [...new Set(modPerms.map((p) => p.resource))].sort();

      return {
        ...module,
        resources: resourceKeys.map((key) => {
          const first = modPerms.find((p) => p.resource === key);
          return {
            key,
            defaultName:
              first?.resourceGroupLabel ?? resourceDefaultDisplayName(key),
            permissions: modPerms.filter((p) => p.resource === key),
          };
        }),
        permissions: modPerms,
      };
    });
  }

  // ─── Roles ────────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDto, createdBy?: string, actor?: any) {
    if (!dto.moduleIds?.length && !dto.derivedModuleIds?.length) {
      throw new BadRequestException(
        'At least one of moduleIds or derivedModuleIds is required',
      );
    }

    let moduleOids: Types.ObjectId[] = [];
    if (dto.moduleIds?.length) {
      moduleOids = this.uniqueObjectIds(dto.moduleIds, 'moduleIds');
      const modules = await this.masterModuleModel.find({
        _id: { $in: moduleOids },
        isActive: true,
      });
      if (modules.length !== moduleOids.length) {
        throw new NotFoundException(
          'One or more master modules do not exist or are inactive',
        );
      }
    }

    let derivedOids: Types.ObjectId[] = [];
    if (dto.derivedModuleIds?.length) {
      derivedOids = this.uniqueObjectIds(
        dto.derivedModuleIds,
        'derivedModuleIds',
      );
      const dms = await this.derivedModuleModel.find({
        _id: { $in: derivedOids },
        isActive: true,
      });
      if (dms.length !== derivedOids.length) {
        throw new NotFoundException(
          'One or more derived modules do not exist or are inactive',
        );
      }
    }

    const provisionalKeys: string[] = [];
    if (moduleOids.length) {
      const perms = await this.masterPermissionModel
        .find({ moduleId: { $in: moduleOids }, isActive: true })
        .select('key')
        .lean();
      provisionalKeys.push(...perms.map((p) => p.key));
    }
    if (derivedOids.length) {
      provisionalKeys.push(
        ...(await this.derivedModuleService.resolvePermissionsForDerivedModules(
          derivedOids,
        )),
      );
    }
    const uniqueProvisional = [...new Set(provisionalKeys)];

    // Company-scoped roles must stay within the company's module ceiling
    if (dto.companyId) {
      const ceiling =
        await this.companyModuleAssignmentService.getCompanyPermissionCeiling(
          dto.companyId,
        );
      if (ceiling.size === 0) {
        throw new BadRequestException(
          'Company has no modules assigned yet. Super Admin must assign modules first.',
        );
      }

      this.companyModuleAssignmentService.assertPermissionsWithinCeiling(
        uniqueProvisional,
        ceiling,
      );
    }

    if (actor) {
      await this.assertCreateRoleWithinActorDelegation(
        actor,
        uniqueProvisional,
      );
    }

    const role = new this.roleModel({
      roleName: dto.roleName,
      description: dto.description,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : undefined,
      moduleIds: moduleOids,
      derivedModuleIds: derivedOids,
      isActive: dto.isActive ?? true,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
    });

    await role.save();

    if (dto.companyId) {
      await this.accessVersionService.bumpCompany(dto.companyId);
    } else {
      await this.accessVersionService.bumpGlobal();
    }

    return {
      status: true,
      message: 'Role created successfully',
      data: await this.populateRole(role._id),
    };
  }

  async updateRole(roleId: string, dto: UpdateRoleDto, actor?: any) {
    this.ensureObjectId(roleId, 'roleId');
    const role = await this.roleModel.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (actor) {
      assertActorMayUpdateRole(actor, role, dto);
    }

    const grantsTouched =
      dto.moduleIds !== undefined || dto.derivedModuleIds !== undefined;

    let moduleOids: Types.ObjectId[] | undefined;
    let derivedOids: Types.ObjectId[] | undefined;
    let uniqueProvisional: string[] = [];

    if (grantsTouched) {
      if (!dto.moduleIds?.length && !dto.derivedModuleIds?.length) {
        throw new BadRequestException(
          'At least one of moduleIds or derivedModuleIds is required when updating grants',
        );
      }

      moduleOids = [];
      if (dto.moduleIds?.length) {
        moduleOids = this.uniqueObjectIds(dto.moduleIds, 'moduleIds');
        const modules = await this.masterModuleModel.find({
          _id: { $in: moduleOids },
          isActive: true,
        });
        if (modules.length !== moduleOids.length) {
          throw new NotFoundException(
            'One or more master modules do not exist or are inactive',
          );
        }
      }

      derivedOids = [];
      if (dto.derivedModuleIds?.length) {
        derivedOids = this.uniqueObjectIds(
          dto.derivedModuleIds,
          'derivedModuleIds',
        );
        const dms = await this.derivedModuleModel.find({
          _id: { $in: derivedOids },
          isActive: true,
        });
        if (dms.length !== derivedOids.length) {
          throw new NotFoundException(
            'One or more derived modules do not exist or are inactive',
          );
        }
      }

      const provisionalKeys: string[] = [];
      if (moduleOids.length) {
        const perms = await this.masterPermissionModel
          .find({ moduleId: { $in: moduleOids }, isActive: true })
          .select('key')
          .lean();
        provisionalKeys.push(...perms.map((p) => p.key));
      }
      if (derivedOids.length) {
        provisionalKeys.push(
          ...(await this.derivedModuleService.resolvePermissionsForDerivedModules(
            derivedOids,
          )),
        );
      }
      uniqueProvisional = [...new Set(provisionalKeys)];

      // Ceiling applies only to company-scoped roles. Do NOT fall back to the
      // actor's companyId — Super Admin editing a global System Staff role must
      // not be blocked by an unrelated company with no modules assigned.
      // Company actors already have dto.companyId forced in assertActorMayUpdateRole.
      const scopeCompanyId = roleCompanyId(role) || dto.companyId || null;

      if (scopeCompanyId) {
        const ceiling =
          await this.companyModuleAssignmentService.getCompanyPermissionCeiling(
            scopeCompanyId,
          );
        if (ceiling.size === 0) {
          throw new BadRequestException(
            'Company has no modules assigned yet. Super Admin must assign modules first.',
          );
        }
        this.companyModuleAssignmentService.assertPermissionsWithinCeiling(
          uniqueProvisional,
          ceiling,
        );
      }

      if (actor) {
        await this.assertCreateRoleWithinActorDelegation(
          actor,
          uniqueProvisional,
        );
      }
    }

    if (dto.roleName !== undefined) role.roleName = dto.roleName;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;

    // Never allow tenants to change company scope; Super Admin may leave as-is.
    // CompanyId on existing roles is immutable after create for safety.
    if (grantsTouched) {
      role.moduleIds = moduleOids as any;
      role.derivedModuleIds = derivedOids as any;
    }

    await role.save();

    const cid = roleCompanyId(role);
    if (cid) {
      await this.accessVersionService.bumpCompany(cid);
    } else {
      await this.accessVersionService.bumpGlobal();
    }

    return {
      status: true,
      message: 'Role updated successfully',
      data: await this.populateRole(role._id),
    };
  }

  async createSuperAdminRole() {
    const existing = await this.roleModel.findOne({
      systemRole: 'SUPER_ADMIN',
    });
    if (existing) {
      return {
        status: true,
        message: 'Super admin role already exists',
        data: await this.populateRole(existing._id),
      };
    }

    const modulesCount = await this.masterModuleModel.countDocuments();
    if (modulesCount === 0) {
      await this.seedMasterData();
    }

    const allModules = await this.masterModuleModel.find({ isActive: true });

    const role = new this.roleModel({
      roleName: 'Super Admin',
      description: 'Full global access to all modules',
      systemRole: 'SUPER_ADMIN',
      moduleIds: allModules.map((m) => m._id),
      isActive: true,
    });

    await role.save();

    return {
      status: true,
      message: 'Super admin role created successfully',
      data: await this.populateRole(role._id),
    };
  }

  async getRoles(actor?: any, companyScopedOnly = false) {
    if (companyScopedOnly) {
      const companyId =
        actor?.companyId?._id?.toString() || actor?.companyId?.toString();
      if (!companyId) {
        return [];
      }
      return this.roleModel
        .find({
          companyId: new Types.ObjectId(companyId),
          isActive: true,
        })
        .populate('moduleIds')
        .populate({
          path: 'derivedModuleIds',
          populate: [
            { path: 'masterModuleId' },
            { path: 'selectedPermissionIds' },
          ],
        })
        .populate('createdBy')
        .sort({ created_at: -1 })
        .exec();
    }

    return this.roleModel
      .find({})
      .populate('moduleIds')
      .populate({
        path: 'derivedModuleIds',
        populate: [
          { path: 'masterModuleId' },
          { path: 'selectedPermissionIds' },
        ],
      })
      .populate('createdBy')
      .sort({ created_at: -1 })
      .exec();
  }

  /**
   * Validate that `actor` may assign `roleId` to `targetUser`.
   * Used by RBAC assign-role and UserService create/update/assign paths.
   */
  async assertRoleAssignmentAllowed(
    actor: any,
    targetUser: any,
    roleId: string,
  ): Promise<RoleDocument> {
    this.ensureObjectId(roleId, 'roleId');
    const role = await this.roleModel.findById(roleId);
    if (!role || !role.isActive) {
      throw new NotFoundException('Role not found or inactive');
    }

    // Internal/system callers (e.g. company bootstrap) omit actor — enforce
    // role↔user scope pairing only.
    if (!actor) {
      assertRoleUserScopePairing(targetUser, role);
      return role;
    }

    assertActorMayAssignRole(actor, targetUser, role);

    // Company-user delegation ceiling: role grants ⊆ actor effective permissions
    if (isCompanyUserActor(actor) && !isCompanyAdminActor(actor)) {
      const roleKeys = await this.resolvePermissionsForRole(role._id);
      const actorKeys = await this.resolveActorDelegationKeys(actor);
      const extras = roleKeys.filter((k) => !actorKeys.has(k));
      if (extras.length) {
        throw new ForbiddenException(
          `Cannot assign a role that exceeds your own access: ${extras
            .slice(0, 5)
            .join(', ')}${extras.length > 5 ? '…' : ''}`,
        );
      }
    }

    return role;
  }

  /** Effective permission keys the actor may delegate. */
  async resolveActorDelegationKeys(actor: any): Promise<Set<string>> {
    if (isSuperAdminActor(actor)) {
      return new Set(['*']);
    }
    if (isCompanyAdminActor(actor)) {
      const companyId = actorCompanyIdString(actor);
      if (!companyId) return new Set();
      return this.companyModuleAssignmentService.getCompanyPermissionCeiling(
        companyId,
      );
    }
    const roleId = actor?.roleId?._id ?? actor?.roleId;
    if (!roleId) return new Set();
    const keys = await this.resolvePermissionsForRole(roleId);
    const companyId = actorCompanyIdString(actor);
    if (!companyId) return new Set(keys);
    const ceiling =
      await this.companyModuleAssignmentService.getCompanyPermissionCeiling(
        companyId,
      );
    if (ceiling.size === 0) return new Set(keys);
    return new Set(keys.filter((k) => ceiling.has(k)));
  }

  /**
   * Company-user role create: provisional grants must be ⊆ actor delegation keys.
   * Company-admin is bounded by company ceiling (already checked in createRole).
   */
  async assertCreateRoleWithinActorDelegation(
    actor: any,
    provisionalKeys: string[],
  ): Promise<void> {
    if (!actor || isSuperAdminActor(actor) || isCompanyAdminActor(actor)) {
      return;
    }
    if (!isCompanyUserActor(actor)) return;

    const actorKeys = await this.resolveActorDelegationKeys(actor);
    if (actorKeys.has('*')) return;
    const extras = provisionalKeys.filter((k) => !actorKeys.has(k));
    if (extras.length) {
      throw new ForbiddenException(
        `Cannot create a role that exceeds your own access: ${extras
          .slice(0, 5)
          .join(', ')}${extras.length > 5 ? '…' : ''}`,
      );
    }
  }

  async assignRole(dto: AssignRoleDto, actor?: any) {
    this.ensureObjectId(dto.userId, 'userId');
    this.ensureObjectId(dto.roleId, 'roleId');

    const user = await this.userModel.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.assertRoleAssignmentAllowed(
      actor,
      user,
      dto.roleId,
    );

    user.roleId = role._id as any;
    await user.save();

    const targetCid = actorCompanyIdString(user) || roleCompanyId(role);
    if (targetCid) {
      await this.accessVersionService.bumpCompany(targetCid);
    } else {
      await this.accessVersionService.bumpGlobal();
    }

    return {
      status: true,
      message: 'Role assigned successfully',
      data: await this.userModel
        .findById(user._id)
        .populate('companyId')
        .populate('departmentId')
        .populate({
          path: 'roleId',
          populate: [
            { path: 'moduleIds' },
            {
              path: 'derivedModuleIds',
              populate: [
                { path: 'masterModuleId' },
                { path: 'selectedPermissionIds' },
              ],
            },
          ],
        }),
    };
  }

  async resolvePermissionsForRole(roleId: string | Types.ObjectId) {
    const role = await this.roleModel.findById(roleId).lean();
    if (!role) return [];

    const keys: string[] = [];

    if (role.moduleIds?.length) {
      const perms = await this.masterPermissionModel
        .find({ moduleId: { $in: role.moduleIds }, isActive: true })
        .select('key')
        .lean();
      keys.push(...perms.map((p) => p.key));
    }

    if (role.derivedModuleIds?.length) {
      const derivedKeys =
        await this.derivedModuleService.resolvePermissionsForDerivedModules(
          role.derivedModuleIds,
        );
      keys.push(...derivedKeys);
    }

    return [...new Set(keys)];
  }

  private async populateRole(roleId: any) {
    const populated = await this.roleModel
      .findById(roleId)
      .populate('moduleIds')
      .populate({
        path: 'derivedModuleIds',
        populate: [
          { path: 'masterModuleId' },
          { path: 'selectedPermissionIds' },
        ],
      })
      .populate('createdBy')
      .lean();

    if (!populated) return null;

    const masterPerms = populated.moduleIds?.length
      ? await this.masterPermissionModel
          .find({
            moduleId: {
              $in: (populated.moduleIds as any[]).map((m) => m._id ?? m),
            },
            isActive: true,
          })
          .sort({ key: 1 })
          .lean()
      : [];

    const derivedPerms = ((populated.derivedModuleIds as any[]) || []).flatMap(
      (dm) =>
        (dm.selectedPermissionIds || []).filter(
          (p: any) => p.isActive !== false,
        ),
    );

    return { ...populated, permissions: [...masterPerms, ...derivedPerms] };
  }

  private ensureObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
  }

  private uniqueObjectIds(values: string[], fieldName: string) {
    const uniqueValues = [...new Set(values)];
    uniqueValues.forEach((value) => this.ensureObjectId(value, fieldName));
    return uniqueValues.map((value) => new Types.ObjectId(value));
  }

  private moduleNamesFromRole(role: any): string[] {
    const master = ((role?.moduleIds as any[]) || [])
      .map((m) => m?.name || m?.defaultName || m?.key)
      .filter(Boolean);
    const derived = ((role?.derivedModuleIds as any[]) || [])
      .map((m) => m?.name || m?.displayName || m?.masterModuleId?.name)
      .filter(Boolean);
    return [...master, ...derived];
  }

  private mapRolePdfRow(role: any) {
    const modules = this.moduleNamesFromRole(role);
    const createdBy =
      role?.createdBy?.name ||
      role?.createdBy?.userName ||
      role?.createdBy?.email ||
      '---';
    return {
      roleName: asText(role?.roleName),
      description: asText(role?.description),
      systemRole: asText(role?.systemRole),
      isActive: role?.isActive === false ? 'No' : 'Yes',
      modules: modules.length ? modules.join(', ') : '---',
      moduleCount: String(modules.length),
      createdBy: asText(createdBy),
      created: formatDate(role?.created_at),
    };
  }

  async downloadRolesPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const roles = await this.getRoles(actor, true);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'RBAC Roles Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'roleName', label: 'ROLE', width: 1.8 },
        { key: 'systemRole', label: 'SYSTEM', width: 1.3 },
        { key: 'isActive', label: 'ACTIVE', width: 0.9 },
        { key: 'moduleCount', label: 'MODULES', width: 1 },
        { key: 'modules', label: 'MODULE NAMES', width: 2.5 },
        { key: 'createdBy', label: 'CREATED BY', width: 1.4 },
      ],
      rows: (roles || []).map((r) => this.mapRolePdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('rbac_roles', 'directory'),
    };
  }

  async downloadRolePdf(id: string, actor: any) {
    this.ensureObjectId(id, 'roleId');
    const company = await resolveActorCompany(this.companyModel, actor);
    const role = await this.populateRole(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const row = this.mapRolePdfRow(role);
    const permissions = ((role as any).permissions || [])
      .map((p: any) => p?.key || p?.name)
      .filter(Boolean);
    const permissionSummary =
      permissions.length > 0
        ? permissions.slice(0, 40).join(', ') +
          (permissions.length > 40 ? ` (+${permissions.length - 40} more)` : '')
        : '---';

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.roleName !== '---' ? row.roleName : 'Role',
      subtitle: row.systemRole !== '---' ? row.systemRole : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Role Name', row.roleName],
        ['Description', row.description],
        ['System Role', row.systemRole],
        ['Active', row.isActive],
        ['Modules', row.modules],
        ['Module Count', row.moduleCount],
        ['Created By', row.createdBy],
        ['Created', row.created],
      ],
      sections: [
        {
          heading: 'Permissions Summary',
          rows: [
            ['Permission Count', String(permissions.length)],
            ['Permissions', permissionSummary],
          ],
        },
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(row.roleName || 'role', 'role'),
    };
  }
}
