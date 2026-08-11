import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AssignCompanyModuleDto,
  UpdateCompanyModuleAssignmentDto,
} from './dtos/company-module-assignment.dto';
import {
  CompanyModuleAssignment,
  CompanyModuleAssignmentDocument,
} from './schemas/company-module-assignment.schema';
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
import { AccessVersionService } from './access-version.service';

export type AssignmentView = {
  _id: string;
  companyId: string;
  masterModuleId: string;
  moduleKey: string;
  moduleName: string;
  displayName: string;
  customName?: string;
  resourceCustomNames?: Record<string, string>;
  selectedPermissionIds: string[];
  permissions: Array<{
    _id: string;
    key: string;
    action?: string;
    path?: string;
    resource?: string;
    resourceGroupLabel?: string;
  }>;
  resources: Array<{
    key: string;
    displayName: string;
    permissions: any[];
  }>;
  isActive: boolean;
};

@Injectable()
export class CompanyModuleAssignmentService implements OnModuleInit {
  private readonly logger = new Logger(CompanyModuleAssignmentService.name);

  constructor(
    @InjectModel(CompanyModuleAssignment.name)
    private readonly assignmentModel: Model<CompanyModuleAssignmentDocument>,
    @InjectModel(MasterModule.name)
    private readonly masterModuleModel: Model<MasterModuleDocument>,
    @InjectModel(MasterPermission.name)
    private readonly masterPermissionModel: Model<MasterPermissionDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(DerivedModule.name)
    private readonly derivedModuleModel: Model<DerivedModuleDocument>,
    private readonly accessVersionService: AccessVersionService,
  ) {}

  /**
   * Legacy DB index companyId+masterModuleKey collides when masterModuleKey is
   * unset (all null) — company create saved, then module ceiling failed with 500.
   * Schema uniqueness is companyId+masterModuleId only.
   */
  async onModuleInit() {
    try {
      const indexes = await this.assignmentModel.collection.indexes();
      const stale = indexes.find(
        (idx) =>
          idx.name === 'companyId_1_masterModuleKey_1' ||
          (idx.key &&
            Object.prototype.hasOwnProperty.call(idx.key, 'masterModuleKey')),
      );
      if (stale?.name) {
        await this.assignmentModel.collection.dropIndex(stale.name);
        this.logger.warn(
          `Dropped obsolete companymoduleassignments index "${stale.name}"`,
        );
      }
    } catch (err: any) {
      // IndexMissing / ns not found — nothing to do
      if (err?.code !== 27 && err?.codeName !== 'IndexNotFound') {
        this.logger.warn(
          `Could not inspect/drop legacy module-assignment indexes: ${err?.message || err}`,
        );
      }
    }
  }

  async listForCompany(companyId: string): Promise<AssignmentView[]> {
    this.ensureObjectId(companyId, 'companyId');
    const rows = await this.assignmentModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .populate('masterModuleId')
      .populate('selectedPermissionIds')
      .sort({ created_at: 1 })
      .lean();

    return this.dedupeAssignmentDisplayNames(
      rows.map((row) => this.toView(row)),
    );
  }

  /**
   * If Super Admin reused one sidebar label on two modules (e.g. Food Safety +
   * Admin both "test food safety"), keep the first and fall back to the master
   * name for later collisions so nav/role UI don't show duplicate headings.
   */
  private dedupeAssignmentDisplayNames(
    views: AssignmentView[],
  ): AssignmentView[] {
    const seen = new Set<string>();
    // Prefer product modules keeping the custom label over ADMIN_MANAGEMENT.
    const ordered = [
      ...views.filter((v) => v.moduleKey !== 'ADMIN_MANAGEMENT'),
      ...views.filter((v) => v.moduleKey === 'ADMIN_MANAGEMENT'),
    ];
    const fixed = new Map<string, AssignmentView>();
    for (const view of ordered) {
      const label = (view.displayName || '').trim().toLowerCase();
      if (label && seen.has(label)) {
        fixed.set(view.masterModuleId, {
          ...view,
          displayName: view.moduleName || view.moduleKey,
          customName: undefined,
        });
        continue;
      }
      if (label) seen.add(label);
      fixed.set(view.masterModuleId, view);
    }
    return views.map((v) => fixed.get(v.masterModuleId) || v);
  }

  async replaceForCompany(
    companyId: string,
    modules: AssignCompanyModuleDto[],
    assignedBy?: string,
  ) {
    this.ensureObjectId(companyId, 'companyId');
    const companyOid = new Types.ObjectId(companyId);
    const seen = new Set<string>();

    for (const mod of modules) {
      if (seen.has(mod.masterModuleId)) {
        throw new BadRequestException(
          'Duplicate masterModuleId in modules payload',
        );
      }
      seen.add(mod.masterModuleId);
      await this.upsertOne(companyOid, mod, assignedBy);
    }

    // Soft-deactivate assignments not in the new set
    const keepIds = [...seen].map((id) => new Types.ObjectId(id));
    await this.assignmentModel.updateMany(
      {
        companyId: companyOid,
        masterModuleId: { $nin: keepIds },
      },
      { $set: { isActive: false } },
    );

    await this.clampCompanyRolesToCeiling(companyId);
    await this.accessVersionService.bumpCompany(companyId);

    return {
      status: true,
      message: 'Company module assignments updated',
      data: await this.listForCompany(companyId),
    };
  }

  /**
   * After Super Admin shrinks a company ceiling, strip role grants that
   * exceed it (moduleIds + derived permission subsets).
   */
  async clampCompanyRolesToCeiling(companyId: string) {
    this.ensureObjectId(companyId, 'companyId');
    const assignments = await this.listForCompany(companyId);
    const allowedModuleIds = new Set(assignments.map((a) => a.masterModuleId));
    const allowedPermIds = new Set(
      assignments.flatMap((a) => a.selectedPermissionIds),
    );

    const roles = await this.roleModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .exec();

    for (const role of roles) {
      let dirty = false;

      if (role.moduleIds?.length) {
        const next = role.moduleIds.filter((id) =>
          allowedModuleIds.has(String(id)),
        );
        if (next.length !== role.moduleIds.length) {
          role.moduleIds = next as any;
          dirty = true;
        }
      }

      if (role.derivedModuleIds?.length) {
        for (const dmId of role.derivedModuleIds) {
          const dm = await this.derivedModuleModel.findById(dmId);
          if (!dm) continue;
          const nextPerms = (dm.selectedPermissionIds || []).filter((pid) =>
            allowedPermIds.has(String(pid)),
          );
          if (nextPerms.length !== (dm.selectedPermissionIds || []).length) {
            dm.selectedPermissionIds = nextPerms as any;
            await dm.save();
          }
          // Drop derived module from role if master module no longer assigned
          if (!allowedModuleIds.has(String(dm.masterModuleId))) {
            role.derivedModuleIds = role.derivedModuleIds.filter(
              (id) => String(id) !== String(dmId),
            ) as any;
            dirty = true;
          }
        }
      }

      if (dirty) await role.save();
    }
  }

  async upsertOne(
    companyOid: Types.ObjectId,
    dto: AssignCompanyModuleDto,
    assignedBy?: string,
  ) {
    this.ensureObjectId(dto.masterModuleId, 'masterModuleId');
    const master = await this.masterModuleModel.findOne({
      _id: new Types.ObjectId(dto.masterModuleId),
      isActive: true,
    });
    if (!master) {
      throw new NotFoundException('Master module not found or inactive');
    }

    const permOids = this.uniqueObjectIds(
      dto.selectedPermissionIds,
      'selectedPermissionIds',
    );
    if (permOids.length === 0) {
      throw new BadRequestException(
        `Module ${master.key} requires at least one permission`,
      );
    }

    const validPerms = await this.masterPermissionModel.find({
      _id: { $in: permOids },
      moduleId: master._id,
      isActive: true,
    });
    if (validPerms.length !== permOids.length) {
      throw new BadRequestException(
        `One or more permissions are invalid for module ${master.key}`,
      );
    }

    const existing = await this.assignmentModel.findOne({
      companyId: companyOid,
      masterModuleId: master._id,
    });

    if (existing) {
      existing.customName = dto.customName;
      existing.resourceCustomNames = dto.resourceCustomNames;
      existing.selectedPermissionIds = permOids as any;
      existing.isActive = dto.isActive ?? true;
      if (assignedBy) existing.assignedBy = new Types.ObjectId(assignedBy);
      await existing.save();
      return existing;
    }

    return this.assignmentModel.create({
      companyId: companyOid,
      masterModuleId: master._id,
      customName: dto.customName,
      resourceCustomNames: dto.resourceCustomNames,
      selectedPermissionIds: permOids,
      isActive: dto.isActive ?? true,
      assignedBy: assignedBy ? new Types.ObjectId(assignedBy) : undefined,
    });
  }

  async updateOne(
    companyId: string,
    masterModuleId: string,
    dto: UpdateCompanyModuleAssignmentDto,
  ) {
    this.ensureObjectId(companyId, 'companyId');
    this.ensureObjectId(masterModuleId, 'masterModuleId');

    const existing = await this.assignmentModel.findOne({
      companyId: new Types.ObjectId(companyId),
      masterModuleId: new Types.ObjectId(masterModuleId),
    });
    if (!existing) {
      throw new NotFoundException('Company module assignment not found');
    }

    if (dto.customName !== undefined) existing.customName = dto.customName;
    if (dto.resourceCustomNames !== undefined) {
      existing.resourceCustomNames = {
        ...(existing.resourceCustomNames ?? {}),
        ...dto.resourceCustomNames,
      };
      existing.markModified('resourceCustomNames');
    }
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    if (dto.selectedPermissionIds) {
      const permOids = this.uniqueObjectIds(
        dto.selectedPermissionIds,
        'selectedPermissionIds',
      );
      const validPerms = await this.masterPermissionModel.find({
        _id: { $in: permOids },
        moduleId: existing.masterModuleId,
        isActive: true,
      });
      if (validPerms.length !== permOids.length) {
        throw new BadRequestException(
          'One or more permissions are invalid for this module',
        );
      }
      existing.selectedPermissionIds = permOids as any;
    }

    await existing.save();
    await this.clampCompanyRolesToCeiling(companyId);
    await this.accessVersionService.bumpCompany(companyId);
    return {
      status: true,
      message: 'Assignment updated',
      data: (await this.listForCompany(companyId)).find(
        (a) => a.masterModuleId === masterModuleId,
      ),
    };
  }

  async removeOne(companyId: string, masterModuleId: string) {
    this.ensureObjectId(companyId, 'companyId');
    this.ensureObjectId(masterModuleId, 'masterModuleId');
    const updated = await this.assignmentModel.findOneAndUpdate(
      {
        companyId: new Types.ObjectId(companyId),
        masterModuleId: new Types.ObjectId(masterModuleId),
      },
      { $set: { isActive: false } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException('Company module assignment not found');
    }
    await this.clampCompanyRolesToCeiling(companyId);
    await this.accessVersionService.bumpCompany(companyId);
    return { status: true, message: 'Assignment removed' };
  }

  /** Permission keys the company is allowed to grant (ceiling). */
  async getCompanyPermissionCeiling(companyId: string): Promise<Set<string>> {
    const assignments = await this.listForCompany(companyId);
    const keys = new Set<string>();
    for (const a of assignments) {
      for (const p of a.permissions) {
        if (p.key) keys.add(p.key);
      }
    }
    return keys;
  }

  /** Module keys the company may use. */
  async getCompanyModuleKeys(companyId: string): Promise<Set<string>> {
    const assignments = await this.listForCompany(companyId);
    return new Set(assignments.map((a) => a.moduleKey).filter(Boolean));
  }

  assertPermissionsWithinCeiling(
    requestedKeys: string[],
    ceiling: Set<string>,
  ) {
    const extras = requestedKeys.filter((k) => !ceiling.has(k));
    if (extras.length) {
      throw new BadRequestException(
        `Permissions exceed company ceiling: ${extras.slice(0, 5).join(', ')}${
          extras.length > 5 ? '…' : ''
        }`,
      );
    }
  }

  async assertPermissionIdsWithinCompanyCeiling(
    companyId: string,
    permissionIds: string[],
  ) {
    if (!permissionIds.length) return;
    const ceiling = await this.getCompanyPermissionCeiling(companyId);
    const perms = await this.masterPermissionModel
      .find({ _id: { $in: permissionIds.map((id) => new Types.ObjectId(id)) } })
      .select('key')
      .lean();
    this.assertPermissionsWithinCeiling(
      perms.map((p) => p.key).filter(Boolean),
      ceiling,
    );
  }

  private toView(row: any): AssignmentView {
    const master = row.masterModuleId;
    const perms = ((row.selectedPermissionIds as any[]) || []).filter(
      (p) => p && p.isActive !== false,
    );
    const resourceKeys = [...new Set(perms.map((p) => p.resource))].sort();

    return {
      _id: String(row._id),
      companyId: String(row.companyId),
      masterModuleId: String(master?._id ?? master),
      moduleKey: master?.key ?? '',
      moduleName: master?.name ?? '',
      displayName: row.customName || master?.name || master?.key || '',
      customName: row.customName,
      resourceCustomNames: row.resourceCustomNames,
      selectedPermissionIds: perms.map((p) => String(p._id)),
      permissions: perms.map((p) => ({
        _id: String(p._id),
        key: p.key,
        action: p.action,
        path: p.path,
        resource: p.resource,
        resourceGroupLabel: p.resourceGroupLabel,
      })),
      resources: resourceKeys.map((rk) => {
        const first = perms.find((p) => p.resource === rk);
        const custom = row.resourceCustomNames?.[rk];
        return {
          key: rk,
          displayName:
            custom ||
            first?.resourceGroupLabel ||
            resourceDefaultDisplayName(rk),
          permissions: perms.filter((p) => p.resource === rk),
        };
      }),
      isActive: row.isActive !== false,
    };
  }

  private ensureObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
  }

  private uniqueObjectIds(values: string[], fieldName: string) {
    const unique = [...new Set(values)];
    unique.forEach((v) => this.ensureObjectId(v, fieldName));
    return unique.map((v) => new Types.ObjectId(v));
  }
}
