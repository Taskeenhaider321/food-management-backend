import { ForbiddenException } from '@nestjs/common';
import { assertActorMayUpdateRole } from './role-assignment.util';

describe('assertActorMayUpdateRole', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';

  it('allows Super Admin to edit any role', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'super-admin' },
        { companyId: companyA },
        {},
      ),
    ).not.toThrow();
  });

  it('denies Super Staff editing company roles', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'super-staff' },
        { companyId: companyA },
        {},
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows Super Staff to edit global roles', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'super-staff' },
        { companyId: null },
        {},
      ),
    ).not.toThrow();
  });

  it('denies Company A editing Company B role', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'company-admin', companyId: companyA },
        { companyId: companyB },
        {},
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows Company A editing own company role', () => {
    const dto: { companyId?: string } = {};
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'company-admin', companyId: companyA },
        { companyId: companyA },
        dto,
      ),
    ).not.toThrow();
    expect(dto.companyId).toBe(companyA);
  });

  it('denies company actors editing global roles', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'company-admin', companyId: companyA },
        { companyId: null },
        {},
      ),
    ).toThrow(ForbiddenException);
  });

  it('denies non–Super Admin editing SUPER_ADMIN role', () => {
    expect(() =>
      assertActorMayUpdateRole(
        { roleType: 'super-staff' },
        { systemRole: 'SUPER_ADMIN' },
        {},
      ),
    ).toThrow(ForbiddenException);
  });
});
