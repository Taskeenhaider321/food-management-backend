import { ForbiddenException } from '@nestjs/common';
import {
  assertActorMayAssignRole,
  assertActorMayCreateRolePayload,
  assertRoleUserScopePairing,
} from './role-assignment.util';

const companyA = '507f1f77bcf86cd799439011';
const companyB = '507f1f77bcf86cd799439012';

describe('role-assignment.util — delegation security', () => {
  describe('assertActorMayCreateRolePayload', () => {
    it('allows Super Admin to create global or company roles', () => {
      const dto: { companyId?: string } = {};
      expect(() =>
        assertActorMayCreateRolePayload({ roleType: 'super-admin' }, dto),
      ).not.toThrow();
      expect(dto.companyId).toBeUndefined();

      const companyDto = { companyId: companyA };
      expect(() =>
        assertActorMayCreateRolePayload(
          { roleType: 'super-admin' },
          companyDto,
        ),
      ).not.toThrow();
      expect(companyDto.companyId).toBe(companyA);
    });

    it('blocks Super Staff from creating company-scoped roles', () => {
      expect(() =>
        assertActorMayCreateRolePayload(
          { roleType: 'super-staff' },
          { companyId: companyA },
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows Super Staff to create global roles', () => {
      const dto: { companyId?: string } = {};
      expect(() =>
        assertActorMayCreateRolePayload({ roleType: 'super-staff' }, dto),
      ).not.toThrow();
    });

    it('forces Company Admin to own company and blocks other company', () => {
      const dto: { companyId?: string } = {};
      assertActorMayCreateRolePayload(
        { roleType: 'company-admin', companyId: companyA },
        dto,
      );
      expect(dto.companyId).toBe(companyA);

      expect(() =>
        assertActorMayCreateRolePayload(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyB },
        ),
      ).toThrow(/own company/);
    });

    it('forces Company User to own company (no global roles)', () => {
      const dto: { companyId?: string } = {};
      assertActorMayCreateRolePayload(
        { roleType: 'company-user', companyId: companyA },
        dto,
      );
      expect(dto.companyId).toBe(companyA);
    });
  });

  describe('assertActorMayAssignRole', () => {
    it('allows Company A admin to assign Company A role to Company A user', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA },
          { companyId: companyA },
        ),
      ).not.toThrow();
    });

    it('denies Company A admin assigning Company B role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA },
          { companyId: companyB },
        ),
      ).toThrow(/belong to your company/);
    });

    it('denies Company A admin assigning global role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyA },
          {},
        ),
      ).toThrow(/global or system roles/);
    });

    it('denies Company A admin assigning role to Company B user', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'company-admin', companyId: companyA },
          { companyId: companyB },
          { companyId: companyA },
        ),
      ).toThrow(/users in your company/);
    });

    it('denies Super Staff assigning company-scoped role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          { companyId: null },
          { companyId: companyA },
        ),
      ).toThrow(/company-scoped roles/);
    });

    it('denies Super Staff assigning role to company user', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          { companyId: companyA },
          {},
        ),
      ).toThrow(/company-scoped users/);
    });

    it('denies Super Staff assigning SUPER_ADMIN system role', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          {},
          { systemRole: 'SUPER_ADMIN' },
        ),
      ).toThrow(/Super Admin role/);
    });

    it('allows Super Staff assigning global role to global user', () => {
      expect(() =>
        assertActorMayAssignRole(
          { roleType: 'super-staff' },
          {},
          { roleName: 'System Viewer' },
        ),
      ).not.toThrow();
    });
  });

  describe('assertRoleUserScopePairing', () => {
    it('denies global role → company user', () => {
      expect(() =>
        assertRoleUserScopePairing({ companyId: companyA }, {}),
      ).toThrow(/Global roles may not/);
    });

    it('denies company role → mismatched company user', () => {
      expect(() =>
        assertRoleUserScopePairing(
          { companyId: companyA },
          { companyId: companyB },
        ),
      ).toThrow(/does not match/);
    });
  });
});
