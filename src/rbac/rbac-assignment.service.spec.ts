import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RbacService } from './rbac.service';

describe('RbacService — assignment + delegation ceiling', () => {
  let service: RbacService;
  let roleModel: { findById: jest.Mock };
  let companyModuleAssignmentService: {
    getCompanyPermissionCeiling: jest.Mock;
  };

  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const roleAId = '607f1f77bcf86cd799439011';

  beforeEach(() => {
    roleModel = {
      findById: jest.fn(),
    };
    companyModuleAssignmentService = {
      getCompanyPermissionCeiling: jest
        .fn()
        .mockResolvedValue(
          new Set(['EP_GET_EMPLOYEES', 'EP_POST_EMPLOYEES_ADDEMPLOYEE']),
        ),
    };

    service = Object.create(RbacService.prototype) as RbacService;
    (service as any).roleModel = roleModel;
    (service as any).companyModuleAssignmentService =
      companyModuleAssignmentService;
    (service as any).ensureObjectId = (id: string) => {
      if (!Types.ObjectId.isValid(id)) throw new Error('invalid id');
    };
    (service as any).resolvePermissionsForRole = jest
      .fn()
      .mockResolvedValue([
        'EP_GET_EMPLOYEES',
        'EP_POST_EMPLOYEES_ADDEMPLOYEE',
        'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID',
      ]);
    (service as any).resolveActorDelegationKeys = jest
      .fn()
      .mockResolvedValue(
        new Set(['EP_GET_EMPLOYEES', 'EP_POST_EMPLOYEES_ADDEMPLOYEE']),
      );
  });

  it('denies company-user assigning a role that exceeds their own access', async () => {
    roleModel.findById.mockResolvedValue({
      _id: roleAId,
      isActive: true,
      companyId: new Types.ObjectId(companyA),
    });

    await expect(
      service.assertRoleAssignmentAllowed(
        {
          roleType: 'company-user',
          companyId: companyA,
          roleId: 'actor-role',
        },
        { companyId: companyA },
        roleAId,
      ),
    ).rejects.toThrow(/exceeds your own access/);
  });

  it('allows company-admin assigning company role within company', async () => {
    roleModel.findById.mockResolvedValue({
      _id: roleAId,
      isActive: true,
      companyId: new Types.ObjectId(companyA),
    });

    await expect(
      service.assertRoleAssignmentAllowed(
        { roleType: 'company-admin', companyId: companyA },
        { companyId: companyA },
        roleAId,
      ),
    ).resolves.toBeTruthy();
  });

  it('denies company-admin assigning Company B role', async () => {
    roleModel.findById.mockResolvedValue({
      _id: roleAId,
      isActive: true,
      companyId: new Types.ObjectId(companyB),
    });

    await expect(
      service.assertRoleAssignmentAllowed(
        { roleType: 'company-admin', companyId: companyA },
        { companyId: companyA },
        roleAId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies super-staff assigning company-scoped role', async () => {
    roleModel.findById.mockResolvedValue({
      _id: roleAId,
      isActive: true,
      companyId: new Types.ObjectId(companyA),
    });

    await expect(
      service.assertRoleAssignmentAllowed(
        { roleType: 'super-staff' },
        {},
        roleAId,
      ),
    ).rejects.toThrow(/company-scoped roles/);
  });
});
