import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  actorCompanyIdString,
  isSuperAdminActor,
} from '../auth/utils/request-actor.util';
import { CompanyModuleAssignmentService } from './company-module-assignment.service';
import { AccessVersionService } from './access-version.service';
import { RbacService } from './rbac.service';
import {
  MasterModule,
  MasterModuleDocument,
} from './schemas/master-module.schema';
import {
  MasterPermission,
  MasterPermissionDocument,
} from './schemas/master-permission.schema';
import { resourceDefaultDisplayName } from './utils/display-name.util';

export type AccessPermissionDto = {
  _id?: string;
  key: string;
  action?: string;
  path?: string;
  resource?: string;
  isActive?: boolean;
};

export type AccessSubTabDto = {
  key: string;
  name: string;
  resource?: string;
  permissions: AccessPermissionDto[];
};

export type AccessModuleDto = {
  key: string;
  name: string;
  isActive?: boolean;
  subTabs: AccessSubTabDto[];
  permissions: AccessPermissionDto[];
};

export type AuthAccessDto = {
  modules: AccessModuleDto[];
  /** Opaque version — changes when RBAC grants for this actor's scope change */
  accessVersion?: string;
};

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly rbacService: RbacService,
    private readonly companyModules: CompanyModuleAssignmentService,
    private readonly accessVersionService: AccessVersionService,
    @InjectModel(MasterModule.name)
    private readonly masterModuleModel: Model<MasterModuleDocument>,
    @InjectModel(MasterPermission.name)
    private readonly masterPermissionModel: Model<MasterPermissionDocument>,
  ) {}

  /**
   * Build the login/session access tree for a user.
   * Hierarchy: Super Admin (all) → Company ceiling ∩ Role grants.
   * Company admins without a role receive the full company ceiling.
   */
  async buildAccessForUser(user: any): Promise<AuthAccessDto> {
    const accessVersion = await this.accessVersionService.versionForUser(user);

    if (isSuperAdminActor(user)) {
      const full = await this.buildFullMasterAccess();
      return { ...full, accessVersion };
    }

    const companyId = actorCompanyIdString(user);
    const companyAssignments = companyId
      ? await this.companyModules.listForCompany(companyId)
      : [];

    const isCompanyAdmin = user?.roleType === 'company-admin';

    // Company admin: full company ceiling (display names from assignments)
    if (isCompanyAdmin && companyAssignments.length > 0) {
      return {
        ...this.assignmentsToAccess(companyAssignments),
        accessVersion,
      };
    }

    const roleId = user?.roleId?._id ?? user?.roleId;
    if (!roleId) {
      // No role and no company-admin ceiling → empty
      return { modules: [], accessVersion };
    }

    const rolePermKeys =
      await this.rbacService.resolvePermissionsForRole(roleId);

    if (companyAssignments.length === 0) {
      // Global / no company assignment yet — build from role permissions alone
      const access = await this.permissionKeysToAccess(rolePermKeys);
      return { ...access, accessVersion };
    }

    const ceilingKeys = new Set<string>();
    for (const a of companyAssignments) {
      for (const p of a.permissions) ceilingKeys.add(p.key);
    }

    const effectiveKeys = rolePermKeys.filter((k) => ceilingKeys.has(k));
    return {
      ...this.assignmentsToAccess(companyAssignments, new Set(effectiveKeys)),
      accessVersion,
    };
  }

  /** Flat permission keys for guards (JWT request.user.resolvedPermissions). */
  async resolvePermissionKeysForUser(user: any): Promise<string[]> {
    if (isSuperAdminActor(user)) {
      return ['*'];
    }

    const access = await this.buildAccessForUser(user);
    const keys = new Set<string>();
    for (const mod of access.modules) {
      for (const p of mod.permissions) {
        if (p.key) keys.add(p.key);
      }
    }
    return [...keys];
  }

  async buildFullMasterAccess(): Promise<AuthAccessDto> {
    const modules = await this.masterModuleModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    const perms = await this.masterPermissionModel
      .find({ isActive: true })
      .sort({ resource: 1, action: 1 })
      .lean();

    return {
      modules: modules.map((m) => {
        const modPerms = perms.filter(
          (p) => String(p.moduleId) === String(m._id),
        );
        return this.groupModule(
          m.key,
          m.name,
          modPerms.map((p) => ({
            _id: String(p._id),
            key: p.key,
            action: p.action,
            path: p.path,
            resource: p.resource,
            isActive: p.isActive,
          })),
        );
      }),
    };
  }

  private assignmentsToAccess(
    assignments: Awaited<
      ReturnType<CompanyModuleAssignmentService['listForCompany']>
    >,
    filterKeys?: Set<string>,
  ): AuthAccessDto {
    const modules: AccessModuleDto[] = [];

    for (const a of assignments) {
      let perms = a.permissions.map((p) => ({
        _id: p._id,
        key: p.key,
        action: p.action,
        path: p.path,
        resource: p.resource,
        isActive: true,
      }));
      if (filterKeys) {
        perms = perms.filter((p) => filterKeys.has(p.key));
      }
      if (perms.length === 0) continue;

      const resourceNameOverrides = a.resourceCustomNames ?? {};
      modules.push(
        this.groupModule(
          a.moduleKey,
          a.displayName,
          perms,
          resourceNameOverrides,
        ),
      );
    }

    return { modules };
  }

  private async permissionKeysToAccess(keys: string[]): Promise<AuthAccessDto> {
    if (!keys.length) return { modules: [] };

    const perms = await this.masterPermissionModel
      .find({ key: { $in: keys }, isActive: true })
      .populate('moduleId')
      .lean();

    const byModule = new Map<
      string,
      { name: string; key: string; perms: any[] }
    >();
    for (const p of perms) {
      const mod = p.moduleId as any;
      const mk = mod?.key || 'UNKNOWN';
      if (!byModule.has(mk)) {
        byModule.set(mk, {
          key: mk,
          name: mod?.name || mk,
          perms: [],
        });
      }
      byModule.get(mk)!.perms.push({
        _id: String(p._id),
        key: p.key,
        action: p.action,
        path: p.path,
        resource: p.resource,
        isActive: p.isActive,
      });
    }

    return {
      modules: [...byModule.values()].map((m) =>
        this.groupModule(m.key, m.name, m.perms),
      ),
    };
  }

  private groupModule(
    key: string,
    name: string,
    permissions: AccessPermissionDto[],
    resourceNameOverrides: Record<string, string> = {},
  ): AccessModuleDto {
    const resourceKeys = [
      ...new Set(
        permissions.map((p) => p.resource).filter(Boolean) as string[],
      ),
    ].sort();

    const subTabs: AccessSubTabDto[] = resourceKeys.map((rk) => ({
      key: rk,
      name: resourceNameOverrides[rk] || resourceDefaultDisplayName(rk),
      resource: rk,
      permissions: permissions.filter((p) => p.resource === rk),
    }));

    return {
      key,
      name,
      isActive: true,
      subTabs,
      permissions,
    };
  }
}
