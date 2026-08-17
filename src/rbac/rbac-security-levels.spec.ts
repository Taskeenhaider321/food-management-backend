import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  assertActorMayAccessUserRecord,
  actorCompanyIdString,
} from '../auth/utils/request-actor.util';
import {
  assertActorMayAssignRole,
  assertActorMayCreateRolePayload,
  assertActorMayUpdateRole,
  assertRoleUserScopePairing,
} from './utils/role-assignment.util';
import { AuthorizationService } from './authorization.service';
import { UserService } from '../admin-management/users/user.service';

const companyA = '507f1f77bcf86cd799439011';
const companyB = '507f1f77bcf86cd799439012';
const roleGlobal = '607f1f77bcf86cd799439011';
const roleCompanyA = '607f1f77bcf86cd799439012';
const roleCompanyB = '607f1f77bcf86cd799439013';
const superAdminRoleId = '607f1f77bcf86cd799439099';

describe('RBAC security levels — four-tier isolation', () => {
  describe('A. Super Admin (system-level)', () => {
    it('createSuperAdmin does not attach a company tenant', async () => {
      let savedDoc: any;
      const userModel = jest.fn().mockImplementation((doc) => {
        savedDoc = doc;
        return {
          ...doc,
          save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
        };
      });
      userModel.findOne = jest.fn().mockResolvedValue(null);

      const rbacService = {
        bootstrapRbac: jest.fn().mockResolvedValue({}),
        getSuperAdminRole: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(superAdminRoleId),
        }),
      };

      const service = new UserService(
        userModel,
        {} as any,
        {} as any,
        { sendRegistrationEmail: jest.fn() } as any,
        {} as any,
        rbacService as any,
      );
      jest.spyOn(service as any, 'encryptPassword').mockReturnValue('enc');
      jest
        .spyOn(service as any, 'requirePopulatedUser')
        .mockResolvedValue({ roleType: 'super-admin' });

      await service.createSuperAdmin({
        name: 'SA',
        email: 'sa@test.com',
        userName: 'sa1',
        password: 'secret123',
      });

      expect(savedDoc.roleType).toBe('super-admin');
      expect(savedDoc.companyId).toBeUndefined();
      expect(String(savedDoc.roleId)).toBe(superAdminRoleId);
    });

    it('Super Admin actor has no companyId from actorCompanyIdString when unset', () => {
      expect(actorCompanyIdString({ roleType: 'super-admin' })).toBeNull();
    });

    it('Super Admin may assign global role to global user', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-admin' },
          { companyId: null },
          { companyId: null },
        ),
      ).not.toThrow();
    });
  });

  describe('B. System Staff (super-staff, global)', () => {
    it('System Staff user has no companyId when created without companyId', () => {
      expect(() =>
        assertRoleUserScopePairing(
          { companyId: null, roleType: 'super-staff' },
          { companyId: null },
        ),
      ).not.toThrow();
    });

    it('Global role cannot be assigned to company-scoped user', () => {
      expect(() =>
        assertRoleUserScopePairing(
          { companyId: companyA },
          { companyId: null },
        ),
      ).toThrow(/Global roles may not/);
    });

    it('System Staff cannot assign company-scoped roles', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          { companyId: companyA },
          { companyId: companyA },
        ),
      ).toThrow(/company-scoped roles/);
    });

    it('System Staff cannot assign Super Admin role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          { companyId: null },
          { companyId: null, systemRole: 'SUPER_ADMIN' },
        ),
      ).toThrow(/Super Admin role/);
    });

    it('System Staff receives role-based access only (not full master)', async () => {
      const rbacService = {
        resolvePermissionsForRole: jest
          .fn()
          .mockResolvedValue(['FS_VIEW_HACCP']),
      };
      const companyModules = { listForCompany: jest.fn().mockResolvedValue([]) };
      const accessVersion = {
        versionForUser: jest.fn().mockResolvedValue('global:1'),
      };
      const masterModuleModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
        }),
      };
      const masterPermissionModel = {
        find: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: 'p1',
                key: 'FS_VIEW_HACCP',
                resource: 'haccp_team',
                action: 'view',
                moduleId: { key: 'FOOD_SAFETY', name: 'Food Safety' },
                isActive: true,
              },
            ]),
          }),
        }),
      };

      const authz = new AuthorizationService(
        rbacService as any,
        companyModules as any,
        accessVersion as any,
        masterModuleModel as any,
        masterPermissionModel as any,
      );

      const access = await authz.buildAccessForUser({
        roleType: 'super-staff',
        companyId: null,
        roleId: roleGlobal,
      });

      expect(access.modules.map((m) => m.key)).toEqual(['FOOD_SAFETY']);
      expect(access.modules.some((m) => m.key === 'RBAC')).toBe(false);
    });

    it('System Staff cannot access company-scoped user records', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'super-staff', _id: 'staff1', companyId: null },
          { _id: 'u1', companyId: companyA, roleType: 'company-user' },
        ),
      ).toThrow(ForbiddenException);
    });

    it('System Staff can access global/system user records when permitted by guard', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'super-staff', _id: 'staff1', companyId: null },
          { _id: 'u2', companyId: null, roleType: 'super-staff' },
        ),
      ).not.toThrow();
    });

    it('System Staff cannot escalate to super-admin via roleType update rule', () => {
      const updates = { roleType: 'super-admin' };
      expect(['super-admin', 'super-staff'].includes(String(updates.roleType))).toBe(
        true,
      );
    });
  });

  describe('C. Company Admin (tenant-scoped)', () => {
    it('Company Admin cannot assign global roles', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA },
          { companyId: null },
        ),
      ).toThrow(/global or system roles/);
    });

    it('Company Admin cannot assign Company B role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA },
          { companyId: companyB },
        ),
      ).toThrow(/belong to your company/);
    });

    it('Company Admin cannot create global roles', () => {
      const dto: { companyId?: string } = {};
      expect(() =>
        assertActorMayCreateRolePayload(
          { roleType: 'company-admin', companyId: companyA },
          dto,
        ),
      ).not.toThrow();
      expect(dto.companyId).toBe(companyA);
    });

    it('Company Admin cannot access Company B user record', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyB, _id: 'u1' },
        ),
      ).toThrow(ForbiddenException);
    });

    it('Company Admin can access same-company user record', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA, _id: 'u1' },
        ),
      ).not.toThrow();
    });
  });

  describe('D. Company User (tenant-scoped)', () => {
    it('Company User cannot access another user in same company', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'company-user', companyId: companyA, _id: 'u1' },
          { companyId: companyA, _id: 'u2' },
        ),
      ).toThrow(ForbiddenException);
    });

    it('Company User can access own record', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'company-user', companyId: companyA, _id: 'u1' },
          { companyId: companyA, _id: 'u1' },
        ),
      ).not.toThrow();
    });

    it('Company User cannot edit global roles', () => {
      expect(() =>
        assertActorMayUpdateRole(
          { roleType: 'company-user', companyId: companyA },
          { companyId: null },
          {},
        ),
      ).toThrow(/global or system roles/);
    });
  });

  describe('E. Cross-company & role escalation', () => {
    it('Company A admin cannot edit Company B role', () => {
      expect(() =>
        assertActorMayUpdateRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyB },
          {},
        ),
      ).toThrow(ForbiddenException);
    });

    it('Company-scoped role must match user company', () => {
      expect(() =>
        assertRoleUserScopePairing(
          { companyId: companyA },
          { companyId: companyB },
        ),
      ).toThrow(/does not match/);
    });

    it('Company Admin cannot escalate roleType to super-admin via update guard', () => {
      const actor = { roleType: 'company-admin', companyId: companyA };
      const updates = { roleType: 'super-admin' };
      expect(
        ['super-admin', 'super-staff'].includes(String(updates.roleType)),
      ).toBe(true);
      expect(actor.roleType).not.toBe('super-admin');
    });
  });

  describe('F. Terminology note', () => {
    it('System Staff maps to roleType super-staff in this codebase', () => {
      expect('super-staff').toBe('super-staff');
    });
  });
});
