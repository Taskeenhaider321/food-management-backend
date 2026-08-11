import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  assertActorMayAccessDepartmentId,
  assertActorMayAccessFoodSafetyRecord,
  foodSafetyCompanyDeleteFilter,
  isGlobalFoodSafetyActor,
  isOwnScopeFoodSafetyActor,
  withOwnScopeFilter,
} from './food-safety-tenant.util';

describe('food-safety-tenant.util', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const deptA = '607f1f77bcf86cd7994390aa';
  const deptB = '607f1f77bcf86cd7994390bb';
  const userA = '707f1f77bcf86cd799439011';
  const userB = '707f1f77bcf86cd799439022';

  function mockDepartmentModel(docs: Record<string, { companyId: string }>) {
    return {
      findById: jest.fn((id: string) => ({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue(
              docs[id] ? { companyId: docs[id].companyId } : null,
            ),
        }),
      })),
    } as any;
  }

  describe('isGlobalFoodSafetyActor', () => {
    it('returns true for super-admin and super-staff', () => {
      expect(isGlobalFoodSafetyActor({ roleType: 'super-admin' })).toBe(true);
      expect(isGlobalFoodSafetyActor({ roleType: 'super-staff' })).toBe(true);
    });

    it('returns false for company-scoped users', () => {
      expect(isGlobalFoodSafetyActor({ roleType: 'company-user' })).toBe(false);
      expect(isGlobalFoodSafetyActor({ roleType: 'company-admin' })).toBe(
        false,
      );
    });
  });

  describe('isOwnScopeFoodSafetyActor / withOwnScopeFilter', () => {
    it('treats company-user as OWN scope', () => {
      expect(isOwnScopeFoodSafetyActor({ roleType: 'company-user' })).toBe(
        true,
      );
      expect(isOwnScopeFoodSafetyActor({ roleType: 'company-admin' })).toBe(
        false,
      );
    });

    it('adds createdByUserId for OWN actors', () => {
      const filter = withOwnScopeFilter(
        { roleType: 'company-user', _id: userA },
        { UserDepartment: deptA },
      );
      expect(filter).toEqual({
        UserDepartment: deptA,
        createdByUserId: new Types.ObjectId(userA),
      });
    });

    it('does not add createdByUserId for company-admin', () => {
      expect(
        withOwnScopeFilter(
          { roleType: 'company-admin', _id: userA },
          { UserDepartment: deptA },
        ),
      ).toEqual({ UserDepartment: deptA });
    });
  });

  describe('assertActorMayAccessDepartmentId', () => {
    it('allows global actors to access any department', async () => {
      const model = mockDepartmentModel({});
      await expect(
        assertActorMayAccessDepartmentId(
          { roleType: 'super-admin' },
          model,
          deptB,
        ),
      ).resolves.toBeUndefined();
      expect(model.findById).not.toHaveBeenCalled();
    });

    it('allows same-company department access', async () => {
      const model = mockDepartmentModel({
        [deptA]: { companyId: companyA },
      });
      await expect(
        assertActorMayAccessDepartmentId(
          { roleType: 'company-user', companyId: companyA },
          model,
          deptA,
        ),
      ).resolves.toBeUndefined();
    });

    it('denies Company A access to Company B department', async () => {
      const model = mockDepartmentModel({
        [deptB]: { companyId: companyB },
      });
      await expect(
        assertActorMayAccessDepartmentId(
          { roleType: 'company-user', companyId: companyA },
          model,
          deptB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when department missing', async () => {
      const model = mockDepartmentModel({});
      await expect(
        assertActorMayAccessDepartmentId(
          { roleType: 'company-user', companyId: companyA },
          model,
          deptA,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertActorMayAccessFoodSafetyRecord', () => {
    it('bypasses for global actors', async () => {
      const model = mockDepartmentModel({});
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'super-staff' },
          model,
          { UserDepartment: deptB },
        ),
      ).resolves.toBeUndefined();
    });

    it('denies cross-company via department lookup', async () => {
      const model = mockDepartmentModel({
        [deptB]: { companyId: companyB },
      });
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'company-admin', companyId: companyA },
          model,
          { UserDepartment: deptB },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies when populated department company mismatches', async () => {
      const model = mockDepartmentModel({});
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'company-user', companyId: companyA, _id: userA },
          model,
          {
            UserDepartment: { companyId: companyB },
            createdByUserId: userA,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies OWN actor when createdByUserId mismatches', async () => {
      const model = mockDepartmentModel({
        [deptA]: { companyId: companyA },
      });
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'company-user', companyId: companyA, _id: userA },
          model,
          {
            UserDepartment: deptA,
            createdByUserId: userB,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows OWN actor when createdByUserId matches', async () => {
      const model = mockDepartmentModel({
        [deptA]: { companyId: companyA },
      });
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'company-user', companyId: companyA, _id: userA },
          model,
          {
            UserDepartment: deptA,
            createdByUserId: userA,
          },
        ),
      ).resolves.toBeUndefined();
    });

    it('allows company-admin same-company record without OWN match', async () => {
      const model = mockDepartmentModel({
        [deptA]: { companyId: companyA },
      });
      await expect(
        assertActorMayAccessFoodSafetyRecord(
          { roleType: 'company-admin', companyId: companyA, _id: userA },
          model,
          {
            UserDepartment: deptA,
            createdByUserId: userB,
          },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('foodSafetyCompanyDeleteFilter', () => {
    it('returns empty filter for global actors', () => {
      expect(
        foodSafetyCompanyDeleteFilter({ roleType: 'super-admin' }, [
          new Types.ObjectId(deptA),
        ]),
      ).toEqual({});
    });

    it('scopes company-admin to UserDepartment $in only', () => {
      const ids = [new Types.ObjectId(deptA)];
      expect(
        foodSafetyCompanyDeleteFilter(
          { roleType: 'company-admin', companyId: companyA, _id: userA },
          ids,
        ),
      ).toEqual({ UserDepartment: { $in: ids } });
    });

    it('scopes company-user to UserDepartment and createdByUserId', () => {
      const ids = [new Types.ObjectId(deptA)];
      expect(
        foodSafetyCompanyDeleteFilter(
          { roleType: 'company-user', companyId: companyA, _id: userA },
          ids,
        ),
      ).toEqual({
        UserDepartment: { $in: ids },
        createdByUserId: new Types.ObjectId(userA),
      });
    });

    it('throws when company actor has no department ids', () => {
      expect(() =>
        foodSafetyCompanyDeleteFilter(
          { roleType: 'company-user', companyId: companyA },
          [],
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
