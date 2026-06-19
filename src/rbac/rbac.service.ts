import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../admin-management/users/schemas/user.schema';
import { DerivedModuleService } from './company-rbac.service';
import { AssignRoleDto } from './dtos/assign-role.dto';
import { CreateRoleDto } from './dtos/create-role.dto';
import {
  MASTER_MODULE_SEED,
  MASTER_PERMISSION_SEED,
  MASTER_RESOURCE_GROUP_LABELS,
} from './constants/master-access.seed';
import { DerivedModule, DerivedModuleDocument } from './schemas/company-module.schema';
import { MasterModule, MasterModuleDocument } from './schemas/master-module.schema';
import { MasterPermission, MasterPermissionDocument } from './schemas/master-permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { resourceDefaultDisplayName } from './utils/display-name.util';

@Injectable()
export class RbacService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(MasterModule.name) private readonly masterModuleModel: Model<MasterModuleDocument>,
    @InjectModel(MasterPermission.name) private readonly masterPermissionModel: Model<MasterPermissionDocument>,
    @InjectModel(DerivedModule.name) private readonly derivedModuleModel: Model<DerivedModuleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => DerivedModuleService))
    private readonly derivedModuleService: DerivedModuleService,
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
        { name: moduleSeed.name, defaultName: moduleSeed.name, key: moduleSeed.key, isActive: true },
        { upsert: true, returnDocument: 'after' },
      );
      moduleMap.set(moduleSeed.key, module);
    }

    for (const permissionSeed of MASTER_PERMISSION_SEED) {
      const module = moduleMap.get(permissionSeed.moduleKey);
      if (!module) {
        throw new BadRequestException(`Missing module seed for ${permissionSeed.moduleKey}`);
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
        masterPermissionsCount: await this.masterPermissionModel.countDocuments(),
      },
    };
  }

  async getMasterModules() {
    return this.masterModuleModel.find().sort({ name: 1 }).exec();
  }

  async getMasterResourcesByModule() {
    const modules = await this.masterModuleModel.find().sort({ name: 1 }).lean();
    const permissions = await this.masterPermissionModel.find().lean();

    return modules.map((module) => {
      const modPerms = permissions.filter((p) => p.moduleId.toString() === module._id.toString());
      const keys = new Set(modPerms.map((p) => p.resource));
      return {
        moduleId: module._id,
        moduleKey: module.key,
        resources: [...keys].sort().map((key) => {
          const first = modPerms.find((p) => p.resource === key);
          return { key, defaultName: first?.resourceGroupLabel ?? resourceDefaultDisplayName(key) };
        }),
      };
    });
  }

  async getMasterPermissions() {
    return this.masterPermissionModel.find().populate('moduleId').sort({ key: 1 }).exec();
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
    const modules = await this.masterModuleModel.find().sort({ name: 1 }).lean();
    const permissions = await this.masterPermissionModel.find().sort({ key: 1 }).lean();

    return modules.map((module) => {
      const modPerms = permissions.filter((p) => p.moduleId.toString() === module._id.toString());
      const resourceKeys = [...new Set(modPerms.map((p) => p.resource))].sort();

      return {
        ...module,
        resources: resourceKeys.map((key) => {
          const first = modPerms.find((p) => p.resource === key);
          return {
            key,
            defaultName: first?.resourceGroupLabel ?? resourceDefaultDisplayName(key),
            permissions: modPerms.filter((p) => p.resource === key),
          };
        }),
        permissions: modPerms,
      };
    });
  }

  // ─── Roles ────────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDto, createdBy?: string) {
    if (!dto.moduleIds?.length && !dto.derivedModuleIds?.length) {
      throw new BadRequestException('At least one of moduleIds or derivedModuleIds is required');
    }

    let moduleOids: Types.ObjectId[] = [];
    if (dto.moduleIds?.length) {
      moduleOids = this.uniqueObjectIds(dto.moduleIds, 'moduleIds');
      const modules = await this.masterModuleModel.find({ _id: { $in: moduleOids }, isActive: true });
      if (modules.length !== moduleOids.length) {
        throw new NotFoundException('One or more master modules do not exist or are inactive');
      }
    }

    let derivedOids: Types.ObjectId[] = [];
    if (dto.derivedModuleIds?.length) {
      derivedOids = this.uniqueObjectIds(dto.derivedModuleIds, 'derivedModuleIds');
      const dms = await this.derivedModuleModel.find({ _id: { $in: derivedOids }, isActive: true });
      if (dms.length !== derivedOids.length) {
        throw new NotFoundException('One or more derived modules do not exist or are inactive');
      }
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

    return {
      status: true,
      message: 'Role created successfully',
      data: await this.populateRole(role._id),
    };
  }

  async createSuperAdminRole() {
    const existing = await this.roleModel.findOne({ systemRole: 'SUPER_ADMIN' });
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
      const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
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
        populate: [{ path: 'masterModuleId' }, { path: 'selectedPermissionIds' }],
      })
      .populate('createdBy')
      .sort({ created_at: -1 })
      .exec();
  }

  async assignRole(dto: AssignRoleDto) {
    this.ensureObjectId(dto.userId, 'userId');
    this.ensureObjectId(dto.roleId, 'roleId');

    const user = await this.userModel.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleModel.findById(dto.roleId);
    if (!role || !role.isActive) {
      throw new NotFoundException('Role not found or inactive');
    }

    if (role.companyId && user.companyId?.toString() !== role.companyId.toString()) {
      throw new BadRequestException('Company-scoped role does not match the user\'s company');
    }

    user.roleId = role._id as any;
    await user.save();

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
            { path: 'derivedModuleIds', populate: [{ path: 'masterModuleId' }, { path: 'selectedPermissionIds' }] },
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
      const derivedKeys = await this.derivedModuleService.resolvePermissionsForDerivedModules(role.derivedModuleIds);
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
        populate: [{ path: 'masterModuleId' }, { path: 'selectedPermissionIds' }],
      })
      .populate('createdBy')
      .lean();

    if (!populated) return null;

    const masterPerms = populated.moduleIds?.length
      ? await this.masterPermissionModel
          .find({ moduleId: { $in: (populated.moduleIds as any[]).map((m) => m._id ?? m) }, isActive: true })
          .sort({ key: 1 })
          .lean()
      : [];

    const derivedPerms = ((populated.derivedModuleIds as any[]) || []).flatMap(
      (dm) => (dm.selectedPermissionIds || []).filter((p: any) => p.isActive !== false),
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
}
