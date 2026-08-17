import { AuthorizationService } from './authorization.service';
import { MASTER_MODULE_SEED } from './constants/master-access.seed';

describe('AuthorizationService.buildAccessForUser — Super Admin', () => {
  let service: AuthorizationService;
  let rbacService: any;
  let companyModules: any;
  let accessVersion: any;
  let masterModuleModel: any;
  let masterPermissionModel: any;

  beforeEach(() => {
    rbacService = {};
    companyModules = { listForCompany: jest.fn() };
    accessVersion = {
      versionForUser: jest.fn().mockResolvedValue('super-admin:1'),
    };
    masterModuleModel = { find: jest.fn() };
    masterPermissionModel = { find: jest.fn() };

    service = new AuthorizationService(
      rbacService,
      companyModules,
      accessVersion,
      masterModuleModel,
      masterPermissionModel,
    );
  });

  it('returns all master modules including FOOD_SAFETY for super-admin', async () => {
    const foodSafetyId = 'food-safety-mod-id';
    const adminId = 'admin-mod-id';

    masterModuleModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: foodSafetyId, key: 'FOOD_SAFETY', name: 'Food Safety', isActive: true },
          { _id: adminId, key: 'ADMIN_MANAGEMENT', name: 'Admin Management', isActive: true },
        ]),
      }),
    });

    masterPermissionModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'p1',
            moduleId: foodSafetyId,
            key: 'FS_VIEW_HACCP',
            resource: 'haccp_team',
            action: 'view',
            isActive: true,
          },
          {
            _id: 'p2',
            moduleId: adminId,
            key: 'AM_VIEW_COMPANY',
            resource: 'company',
            action: 'view',
            isActive: true,
          },
        ]),
      }),
    });

    const access = await service.buildAccessForUser({ roleType: 'super-admin' });

    const keys = access.modules.map((m) => m.key);
    expect(keys).toContain('FOOD_SAFETY');
    expect(keys).toContain('ADMIN_MANAGEMENT');

    const foodMod = access.modules.find((m) => m.key === 'FOOD_SAFETY');
    expect(foodMod?.subTabs.some((t) => t.key === 'haccp_team')).toBe(true);

    const adminMod = access.modules.find((m) => m.key === 'ADMIN_MANAGEMENT');
    expect(adminMod?.subTabs.some((t) => t.key === 'company')).toBe(true);
  });

  it('returns empty modules when master data is missing (pre-bootstrap failure)', async () => {
    masterModuleModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    masterPermissionModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const access = await service.buildAccessForUser({ roleType: 'super-admin' });
    expect(access.modules).toEqual([]);
  });

  it('does not grant super-admin modules to company users', async () => {
    rbacService.resolvePermissionsForRole = jest.fn().mockResolvedValue([]);
    companyModules.listForCompany.mockResolvedValue([]);

    const access = await service.buildAccessForUser({
      roleType: 'company-user',
      companyId: '507f1f77bcf86cd799439011',
      roleId: '607f1f77bcf86cd799439011',
    });

    expect(access.modules).toEqual([]);
    expect(
      access.modules.some((m) => m.key === 'FOOD_SAFETY'),
    ).toBe(false);
  });
});

describe('MASTER_MODULE_SEED completeness', () => {
  it('includes all modules expected by frontend route registry', () => {
    const keys = new Set(MASTER_MODULE_SEED.map((m) => m.key));
    expect(keys.has('FOOD_SAFETY')).toBe(true);
    expect(keys.has('ADMIN_MANAGEMENT')).toBe(true);
    expect(keys.has('RBAC')).toBe(true);
    expect(keys.has('COMPETENCY_MANAGEMENT')).toBe(true);
    expect(keys.has('MAINTENANCE_PROGRAM')).toBe(true);
    expect(keys.has('INTERNAL_AUDIT')).toBe(true);
    expect(keys.has('DOCUMENT_MANAGEMENT')).toBe(true);
    expect(keys.has('REVIEW_MEETINGS')).toBe(true);
  });
});
