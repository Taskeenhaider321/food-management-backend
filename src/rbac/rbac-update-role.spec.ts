import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RbacService } from './rbac.service';

describe('RbacService.updateRole — ceiling + cross-company', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const roleId = '607f1f77bcf86cd799439011';
  const derivedId = '707f1f77bcf86cd7994390aa';

  let service: RbacService;
  let roleModel: any;
  let derivedModuleModel: any;
  let masterPermissionModel: any;
  let companyModules: any;
  let derivedModuleService: any;
  let accessVersion: { bumpCompany: jest.Mock; bumpGlobal: jest.Mock };

  beforeEach(() => {
    roleModel = {
      findById: jest.fn(),
    };
    derivedModuleModel = {
      find: jest.fn(),
    };
    masterPermissionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    companyModules = {
      getCompanyPermissionCeiling: jest.fn(),
      assertPermissionsWithinCeiling: jest.fn(),
    };
    derivedModuleService = {
      resolvePermissionsForDerivedModules: jest
        .fn()
        .mockResolvedValue(['EP_VIEW']),
    };
    accessVersion = {
      bumpCompany: jest.fn().mockResolvedValue(2),
      bumpGlobal: jest.fn().mockResolvedValue(2),
    };

    service = new RbacService(
      roleModel,
      { find: jest.fn() } as any,
      masterPermissionModel,
      derivedModuleModel,
      {} as any,
      {} as any,
      derivedModuleService,
      companyModules,
      accessVersion as any,
    );

    jest
      .spyOn(service as any, 'populateRole')
      .mockResolvedValue({ _id: roleId });
    jest
      .spyOn(service as any, 'uniqueObjectIds')
      .mockImplementation((ids: string[]) =>
        ids.map((id) => new Types.ObjectId(id)),
      );
  });

  it('denies Company A updating Company B role', async () => {
    roleModel.findById.mockResolvedValue({
      _id: roleId,
      companyId: companyB,
      systemRole: null,
      save: jest.fn(),
    });

    await expect(
      service.updateRole(
        roleId,
        { roleName: 'X' },
        { roleType: 'company-admin', companyId: companyA },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects grants outside company ceiling', async () => {
    const role = {
      _id: roleId,
      companyId: companyA,
      systemRole: null,
      moduleIds: [],
      derivedModuleIds: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    roleModel.findById.mockResolvedValue(role);
    derivedModuleModel.find.mockResolvedValue([
      { _id: derivedId, isActive: true },
    ]);
    companyModules.getCompanyPermissionCeiling.mockResolvedValue(
      new Set(['EP_VIEW']),
    );
    companyModules.assertPermissionsWithinCeiling.mockImplementation(() => {
      throw new BadRequestException('Permissions exceed company ceiling');
    });
    derivedModuleService.resolvePermissionsForDerivedModules.mockResolvedValue([
      'EP_VIEW',
      'EP_DELETE',
    ]);

    await expect(
      service.updateRole(
        roleId,
        { derivedModuleIds: [derivedId] },
        { roleType: 'company-admin', companyId: companyA },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('bumps company access version on successful update', async () => {
    const role = {
      _id: roleId,
      companyId: companyA,
      systemRole: null,
      moduleIds: [],
      derivedModuleIds: [],
      roleName: 'Old',
      save: jest.fn().mockResolvedValue(undefined),
    };
    roleModel.findById.mockResolvedValue(role);

    await service.updateRole(
      roleId,
      { roleName: 'New' },
      { roleType: 'company-admin', companyId: companyA },
    );

    expect(role.roleName).toBe('New');
    expect(accessVersion.bumpCompany).toHaveBeenCalledWith(companyA);
  });

  it('allows Super Admin to update global role grants even if actor has a companyId', async () => {
    const role = {
      _id: roleId,
      companyId: null,
      systemRole: null,
      moduleIds: [],
      derivedModuleIds: [],
      roleName: 'System Staff',
      save: jest.fn().mockResolvedValue(undefined),
    };
    roleModel.findById.mockResolvedValue(role);
    derivedModuleModel.find.mockResolvedValue([
      { _id: derivedId, isActive: true },
    ]);

    await service.updateRole(
      roleId,
      { derivedModuleIds: [derivedId], moduleIds: [] },
      { roleType: 'super-admin', companyId: companyA },
    );

    expect(companyModules.getCompanyPermissionCeiling).not.toHaveBeenCalled();
    expect(accessVersion.bumpGlobal).toHaveBeenCalled();
    expect(role.save).toHaveBeenCalled();
  });
});
