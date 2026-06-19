import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DerivedModule, DerivedModuleDocument } from './schemas/company-module.schema';
import { MasterModule, MasterModuleDocument } from './schemas/master-module.schema';
import { MasterPermission, MasterPermissionDocument } from './schemas/master-permission.schema';
import { CreateDerivedModuleDto } from './dtos/create-derived-module.dto';
import { UpdateDerivedModuleDto } from './dtos/update-derived-module.dto';
import { resourceDefaultDisplayName } from './utils/display-name.util';

@Injectable()
export class DerivedModuleService {
  constructor(
    @InjectModel(MasterModule.name) private readonly masterModuleModel: Model<MasterModuleDocument>,
    @InjectModel(MasterPermission.name) private readonly masterPermissionModel: Model<MasterPermissionDocument>,
    @InjectModel(DerivedModule.name) private readonly derivedModuleModel: Model<DerivedModuleDocument>,
  ) {}

  async getMasterModuleDetails(masterModuleId: string) {
    this.ensureObjectId(masterModuleId, 'masterModuleId');

    const masterModule = await this.masterModuleModel.findById(masterModuleId).lean();
    if (!masterModule) throw new NotFoundException('Master module not found');

    const permissions = await this.masterPermissionModel
      .find({ moduleId: masterModule._id, isActive: true })
      .sort({ resource: 1, action: 1 })
      .lean();

    const resourceKeys = [...new Set(permissions.map((p) => p.resource))].sort();
    const resources = resourceKeys.map((rk) => {
      const first = permissions.find((p) => p.resource === rk);
      return {
        key: rk,
        defaultLabel: first?.resourceGroupLabel || resourceDefaultDisplayName(rk),
        permissions: permissions.filter((p) => p.resource === rk),
      };
    });

    return { module: masterModule, resources };
  }

  async create(dto: CreateDerivedModuleDto, createdBy?: string) {
    this.ensureObjectId(dto.masterModuleId, 'masterModuleId');

    const masterModule = await this.masterModuleModel.findOne({
      _id: new Types.ObjectId(dto.masterModuleId),
      isActive: true,
    });
    if (!masterModule) {
      throw new NotFoundException('Master module not found or inactive');
    }

    const permOids = this.uniqueObjectIds(dto.selectedPermissionIds, 'selectedPermissionIds');
    const validPerms = await this.masterPermissionModel.find({
      _id: { $in: permOids },
      moduleId: masterModule._id,
      isActive: true,
    });
    if (validPerms.length !== permOids.length) {
      throw new BadRequestException(
        'One or more selected permissions are invalid, inactive, or do not belong to this master module',
      );
    }

    const doc = new this.derivedModuleModel({
      masterModuleId: masterModule._id,
      customName: dto.customName,
      resourceCustomNames: dto.resourceCustomNames,
      selectedPermissionIds: permOids,
      isActive: true,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
    });

    const saved = await doc.save();

    return {
      status: true,
      message: 'Derived module created',
      data: await this.populateDerivedModule(saved._id),
    };
  }

  async update(derivedModuleId: string, dto: UpdateDerivedModuleDto) {
    this.ensureObjectId(derivedModuleId, 'derivedModuleId');

    const existing = await this.derivedModuleModel.findById(derivedModuleId);
    if (!existing) throw new NotFoundException('Derived module not found');

    if (dto.customName !== undefined) existing.customName = dto.customName;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    if (dto.resourceCustomNames) {
      existing.resourceCustomNames = {
        ...(existing.resourceCustomNames ?? {}),
        ...dto.resourceCustomNames,
      };
      existing.markModified('resourceCustomNames');
    }

    if (dto.selectedPermissionIds) {
      const permOids = this.uniqueObjectIds(dto.selectedPermissionIds, 'selectedPermissionIds');
      const validPerms = await this.masterPermissionModel.find({
        _id: { $in: permOids },
        moduleId: existing.masterModuleId,
        isActive: true,
      });
      if (validPerms.length !== permOids.length) {
        throw new BadRequestException(
          'One or more selected permissions are invalid, inactive, or do not belong to this module',
        );
      }
      existing.selectedPermissionIds = permOids as any;
    }

    await existing.save();

    return {
      status: true,
      message: 'Derived module updated',
      data: await this.populateDerivedModule(existing._id),
    };
  }

  async findAll() {
    const modules = await this.derivedModuleModel
      .find()
      .populate('masterModuleId')
      .populate('selectedPermissionIds')
      .populate('createdBy')
      .sort({ created_at: -1 })
      .lean();

    return modules.map((dm) => {
      const master = dm.masterModuleId as any;
      const perms = (dm.selectedPermissionIds as any[]) || [];
      const resourceKeys = [...new Set(perms.map((p: any) => p.resource))].sort();

      return {
        ...dm,
        displayName: dm.customName || master?.name || master?.key,
        resources: resourceKeys.map((rk) => {
          const customLabel = dm.resourceCustomNames?.[rk];
          const first = perms.find((p: any) => p.resource === rk);
          return {
            key: rk,
            displayName: customLabel || first?.resourceGroupLabel || resourceDefaultDisplayName(rk),
            permissions: perms.filter((p: any) => p.resource === rk),
          };
        }),
      };
    });
  }

  async findOne(derivedModuleId: string) {
    this.ensureObjectId(derivedModuleId, 'derivedModuleId');
    const dm = await this.populateDerivedModule(derivedModuleId);
    if (!dm) throw new NotFoundException('Derived module not found');
    return dm;
  }

  async remove(derivedModuleId: string) {
    this.ensureObjectId(derivedModuleId, 'derivedModuleId');
    const doc = await this.derivedModuleModel.findByIdAndDelete(derivedModuleId);
    if (!doc) throw new NotFoundException('Derived module not found');
    return { status: true, message: 'Derived module deleted' };
  }

  // ─── Runtime permission resolution (used by guards) ───────────────

  async resolvePermissionsForDerivedModules(derivedModuleIds: any[]): Promise<string[]> {
    const dms = await this.derivedModuleModel
      .find({ _id: { $in: derivedModuleIds }, isActive: true })
      .lean();

    const allPermIds = dms.flatMap((dm) => dm.selectedPermissionIds);
    if (allPermIds.length === 0) return [];

    const perms = await this.masterPermissionModel
      .find({ _id: { $in: allPermIds }, isActive: true })
      .select('key')
      .lean();

    return perms.map((p) => p.key);
  }

  // ─── Internal helpers ─────────────────────────────────────────────

  private async populateDerivedModule(id: any) {
    return this.derivedModuleModel
      .findById(id)
      .populate('masterModuleId')
      .populate('selectedPermissionIds')
      .populate('createdBy')
      .lean();
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
