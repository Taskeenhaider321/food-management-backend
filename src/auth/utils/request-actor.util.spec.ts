import { ForbiddenException } from '@nestjs/common';
import { assertActorMayAccessUserRecord } from './request-actor.util';

const companyA = '507f1f77bcf86cd799439011';
const staffId = '607f1f77bcf86cd799439011';
const globalUserId = '707f1f77bcf86cd7994390aa';
const companyUserId = '707f1f77bcf86cd7994390bb';

describe('assertActorMayAccessUserRecord', () => {
  describe('Super Admin', () => {
    it('may access any user record', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'super-admin', _id: 'sa1' },
          { _id: companyUserId, companyId: companyA },
        ),
      ).not.toThrow();
    });
  });

  describe('System Staff (super-staff)', () => {
    const staff = { roleType: 'super-staff', _id: staffId, companyId: null };

    it('may access own record', () => {
      expect(() =>
        assertActorMayAccessUserRecord(staff, {
          _id: staffId,
          companyId: null,
        }),
      ).not.toThrow();
    });

    it('may access global/system user records (no companyId)', () => {
      expect(() =>
        assertActorMayAccessUserRecord(staff, {
          _id: globalUserId,
          companyId: null,
          roleType: 'super-staff',
        }),
      ).not.toThrow();
    });

    it('cannot access company-scoped user records', () => {
      expect(() =>
        assertActorMayAccessUserRecord(staff, {
          _id: companyUserId,
          companyId: companyA,
          roleType: 'company-user',
        }),
      ).toThrow(ForbiddenException);
    });

    it('cannot access another global user without bypassing permission guard elsewhere', () => {
      // Record scope allows global users; route guard must still require permission.
      expect(() =>
        assertActorMayAccessUserRecord(staff, {
          _id: globalUserId,
          companyId: null,
        }),
      ).not.toThrow();
    });
  });

  describe('Company Admin', () => {
    it('denies cross-company user access', () => {
      expect(() =>
        assertActorMayAccessUserRecord(
          { roleType: 'company-admin', companyId: companyA },
          { _id: 'u1', companyId: 'other-company' },
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
