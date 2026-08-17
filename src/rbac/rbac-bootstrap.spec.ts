import { Types } from 'mongoose';
import { RbacService } from './rbac.service';
import {
  MASTER_MODULE_SEED,
  MASTER_PERMISSION_SEED,
} from './constants/master-access.seed';

describe('RbacService.bootstrapRbac', () => {
  let service: RbacService;
  let masterModuleModel: any;
  let masterPermissionModel: any;
  let roleModel: any;
  let accessVersion: { bumpGlobal: jest.Mock };

  beforeEach(() => {
    masterModuleModel = {
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    masterPermissionModel = {
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    roleModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    accessVersion = { bumpGlobal: jest.fn().mockResolvedValue(2) };

    service = new RbacService(
      roleModel,
      masterModuleModel,
      masterPermissionModel,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      accessVersion as any,
    );
  });

  it('seeds master modules and permissions on fresh database', async () => {
    const moduleId = new Types.ObjectId();
    masterModuleModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length);
    masterPermissionModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length);

    masterModuleModel.findOneAndUpdate.mockImplementation(({ key }: any) =>
      Promise.resolve({ _id: moduleId, key }),
    );
    masterPermissionModel.findOneAndUpdate.mockResolvedValue({});
    masterModuleModel.find.mockResolvedValue(
      MASTER_MODULE_SEED.map((m) => ({ _id: moduleId, key: m.key, isActive: true })),
    );
    roleModel.findOne.mockResolvedValue(null);
    roleModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      systemRole: 'SUPER_ADMIN',
    });

    const result = await service.bootstrapRbac();

    expect(masterModuleModel.findOneAndUpdate).toHaveBeenCalledTimes(
      MASTER_MODULE_SEED.length,
    );
    expect(masterPermissionModel.findOneAndUpdate).toHaveBeenCalledTimes(
      MASTER_PERMISSION_SEED.length,
    );
    expect(roleModel.create).toHaveBeenCalled();
    expect(accessVersion.bumpGlobal).toHaveBeenCalled();
    expect(result.masterModulesCount).toBe(MASTER_MODULE_SEED.length);
    expect(result.superAdminRoleSynced).toBe(true);
  });

  it('is idempotent — second bootstrap does not duplicate seed upserts logic', async () => {
    const moduleId = new Types.ObjectId();
    const existingRole = {
      _id: new Types.ObjectId(),
      systemRole: 'SUPER_ADMIN',
      moduleIds: [moduleId],
      save: jest.fn(),
    };

    masterModuleModel.countDocuments
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length);
    masterPermissionModel.countDocuments
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length);
    masterModuleModel.findOneAndUpdate.mockImplementation(({ key }: any) =>
      Promise.resolve({ _id: moduleId, key }),
    );
    masterPermissionModel.findOneAndUpdate.mockResolvedValue({});
    masterModuleModel.find.mockResolvedValue([{ _id: moduleId, isActive: true }]);
    roleModel.findOne.mockResolvedValue(existingRole);

    const result = await service.bootstrapRbac();

    expect(roleModel.create).not.toHaveBeenCalled();
    expect(existingRole.save).not.toHaveBeenCalled();
    expect(accessVersion.bumpGlobal).not.toHaveBeenCalled();
    expect(result.superAdminRoleSynced).toBe(false);
  });

  it('syncs SUPER_ADMIN role when new master module is added', async () => {
    const oldModuleId = new Types.ObjectId();
    const newModuleId = new Types.ObjectId();
    const existingRole = {
      _id: new Types.ObjectId(),
      systemRole: 'SUPER_ADMIN',
      moduleIds: [oldModuleId],
      save: jest.fn().mockResolvedValue(undefined),
    };

    masterModuleModel.countDocuments
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length)
      .mockResolvedValueOnce(MASTER_MODULE_SEED.length);
    masterPermissionModel.countDocuments
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length)
      .mockResolvedValueOnce(MASTER_PERMISSION_SEED.length);
    masterModuleModel.findOneAndUpdate.mockImplementation(({ key }: any) =>
      Promise.resolve({ _id: moduleIdFor(key, oldModuleId, newModuleId), key }),
    );
    masterPermissionModel.findOneAndUpdate.mockResolvedValue({});
    masterModuleModel.find.mockResolvedValue([
      { _id: oldModuleId, isActive: true },
      { _id: newModuleId, isActive: true },
    ]);
    roleModel.findOne.mockResolvedValue(existingRole);

    const result = await service.bootstrapRbac();

    expect(existingRole.save).toHaveBeenCalled();
    expect(accessVersion.bumpGlobal).toHaveBeenCalled();
    expect(result.superAdminRoleSynced).toBe(true);
  });
});

function moduleIdFor(key: string, oldId: Types.ObjectId, newId: Types.ObjectId) {
  return key === MASTER_MODULE_SEED[0].key ? oldId : newId;
}
