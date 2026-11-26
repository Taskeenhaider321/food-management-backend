import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  assertActorMayAccessMaintenanceRecord,
  assertAssetBelongsToUserCompany,
  maintenanceCompanyFilter,
  requireActorCompanyId,
} from './maintenance-tenant.util';

const companyA = new Types.ObjectId();
const companyB = new Types.ObjectId();

const superAdmin = { _id: new Types.ObjectId(), roleType: 'super-admin' };
const adminA = {
  _id: new Types.ObjectId(),
  roleType: 'company-admin',
  companyId: { _id: companyA, companyName: 'A' }, // populated, as from JWT strategy
};
const userB = {
  _id: new Types.ObjectId(),
  roleType: 'company-user',
  companyId: companyB,
};
const orphan = { _id: new Types.ObjectId(), roleType: 'company-user' };

describe('maintenance tenant isolation', () => {
  describe('maintenanceCompanyFilter', () => {
    it('is unrestricted for super-admin', () => {
      expect(maintenanceCompanyFilter(superAdmin)).toEqual({});
    });

    it("restricts company actors to their own company's id", () => {
      const f = maintenanceCompanyFilter(adminA) as any;
      expect(String(f.companyId)).toBe(String(companyA));
      expect(String((maintenanceCompanyFilter(userB) as any).companyId)).toBe(
        String(companyB),
      );
    });

    it('matches nothing for an actor without a company', () => {
      expect(maintenanceCompanyFilter(orphan)).toEqual({
        _id: { $exists: false },
      });
    });
  });

  describe('requireActorCompanyId', () => {
    it("stamps the actor's company and ignores a body companyId", () => {
      expect(String(requireActorCompanyId(adminA, String(companyB)))).toBe(
        String(companyA),
      );
    });

    it('lets super-admin create on behalf of a given company', () => {
      expect(String(requireActorCompanyId(superAdmin, String(companyB)))).toBe(
        String(companyB),
      );
    });

    it('refuses creation without a company context', () => {
      expect(() => requireActorCompanyId(orphan)).toThrow(ForbiddenException);
      expect(() => requireActorCompanyId(superAdmin)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertActorMayAccessMaintenanceRecord', () => {
    const recordA = { _id: new Types.ObjectId(), companyId: companyA };
    const legacy = { _id: new Types.ObjectId() };

    it('allows same-company access', () => {
      expect(() =>
        assertActorMayAccessMaintenanceRecord(adminA, recordA, 'Machinery'),
      ).not.toThrow();
    });

    it('hides other companies records as 404', () => {
      expect(() =>
        assertActorMayAccessMaintenanceRecord(userB, recordA, 'Machinery'),
      ).toThrow(NotFoundException);
    });

    it('hides un-backfilled legacy records from company actors', () => {
      expect(() =>
        assertActorMayAccessMaintenanceRecord(adminA, legacy, 'Equipment'),
      ).toThrow(NotFoundException);
      expect(() =>
        assertActorMayAccessMaintenanceRecord(superAdmin, legacy, 'Equipment'),
      ).not.toThrow();
    });

    it('404s on a missing record', () => {
      expect(() =>
        assertActorMayAccessMaintenanceRecord(superAdmin, null, 'Equipment'),
      ).toThrow(NotFoundException);
    });
  });

  describe('assertAssetBelongsToUserCompany', () => {
    it('rejects linking another company asset', () => {
      expect(() =>
        assertAssetBelongsToUserCompany(
          { companyId: companyA },
          { companyId: companyB, roleType: 'company-user' },
          'Machine',
        ),
      ).toThrow(NotFoundException);
    });

    it('accepts same-company assets', () => {
      expect(() =>
        assertAssetBelongsToUserCompany(
          { companyId: companyA },
          { companyId: String(companyA), roleType: 'company-user' },
          'Machine',
        ),
      ).not.toThrow();
    });
  });
});
