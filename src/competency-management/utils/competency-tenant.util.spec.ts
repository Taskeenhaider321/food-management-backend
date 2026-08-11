import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  assertActorMayAccessCompanyResource,
  companyScopedFilter,
  isGlobalCompetencyActor,
  isOwnScopeCompetencyActor,
} from './competency-tenant.util';

describe('competency-tenant.util', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';

  describe('isGlobalCompetencyActor', () => {
    it('returns true for super-admin and super-staff', () => {
      expect(isGlobalCompetencyActor({ roleType: 'super-admin' })).toBe(true);
      expect(isGlobalCompetencyActor({ roleType: 'super-staff' })).toBe(true);
    });

    it('returns false for company-scoped users', () => {
      expect(isGlobalCompetencyActor({ roleType: 'company-user' })).toBe(false);
    });
  });

  describe('isOwnScopeCompetencyActor', () => {
    it('returns true for OWN-scoped roles with an actor id', () => {
      expect(
        isOwnScopeCompetencyActor({
          roleType: 'company-user',
          _id: 'u1',
        }),
      ).toBe(true);
      expect(
        isOwnScopeCompetencyActor({
          roleType: 'company-trainer',
          _id: 'u1',
        }),
      ).toBe(true);
      expect(
        isOwnScopeCompetencyActor({
          roleType: 'company-employee',
          _id: 'u1',
        }),
      ).toBe(true);
    });

    it('returns false for company-admin and global actors', () => {
      expect(
        isOwnScopeCompetencyActor({
          roleType: 'company-admin',
          _id: 'u1',
        }),
      ).toBe(false);
      expect(
        isOwnScopeCompetencyActor({ roleType: 'super-admin', _id: 'u1' }),
      ).toBe(false);
    });
  });

  describe('assertActorMayAccessCompanyResource', () => {
    it('allows global actors', () => {
      expect(() =>
        assertActorMayAccessCompanyResource(
          { roleType: 'super-admin' },
          companyB,
        ),
      ).not.toThrow();
    });

    it('allows same-company access', () => {
      expect(() =>
        assertActorMayAccessCompanyResource(
          { roleType: 'company-user', companyId: companyA },
          companyA,
        ),
      ).not.toThrow();
    });

    it('denies cross-company access', () => {
      expect(() =>
        assertActorMayAccessCompanyResource(
          { roleType: 'company-user', companyId: companyA },
          companyB,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('companyScopedFilter', () => {
    it('returns empty filter for global actors', () => {
      expect(companyScopedFilter({ roleType: 'super-admin' })).toEqual({});
    });

    it('returns companyId filter for tenant users', () => {
      const filter = companyScopedFilter({
        roleType: 'company-user',
        companyId: companyA,
      });
      expect(filter).toEqual({ companyId: new Types.ObjectId(companyA) });
    });

    it('throws when company user has no companyId', () => {
      expect(() => companyScopedFilter({ roleType: 'company-user' })).toThrow(
        ForbiddenException,
      );
    });
  });
});
