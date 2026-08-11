import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserService } from './user.service';

describe('UserService.createUser — company + department isolation', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const deptB = '707f1f77bcf86cd7994390bb';

  let service: UserService;
  let userModel: any;
  let departmentModel: any;
  let rbacService: { assertRoleAssignmentAllowed: jest.Mock };

  beforeEach(() => {
    userModel = jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    }));
    userModel.findOne = jest.fn().mockResolvedValue(null);

    departmentModel = {
      findById: jest.fn(),
    };

    rbacService = {
      assertRoleAssignmentAllowed: jest.fn().mockResolvedValue(undefined),
    };

    service = new UserService(
      userModel,
      {} as any,
      departmentModel,
      { sendRegistrationEmail: jest.fn() } as any,
      {} as any,
      rbacService as any,
    );

    jest.spyOn(service as any, 'encryptPassword').mockReturnValue('encrypted');
    jest
      .spyOn(service as any, 'requirePopulatedUser')
      .mockResolvedValue({ _id: 'u1' });
  });

  it('rejects Company A assigning Company B departmentId', async () => {
    departmentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(deptB),
      companyId: companyB,
    });

    await expect(
      service.createUser(
        {
          users: [
            {
              name: 'X',
              email: 'x@a.com',
              userName: 'xa',
              password: 'secret',
              companyId: companyA,
              departmentId: deptB,
              roleId: '507f1f77bcf86cd799439099',
            },
          ],
        } as any,
        {
          roleType: 'company-admin',
          companyId: companyA,
          _id: '607f1f77bcf86cd799439011',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects Company A submitting foreign companyId', async () => {
    await expect(
      service.createUser(
        {
          users: [
            {
              name: 'X',
              email: 'x@a.com',
              userName: 'xa',
              password: 'secret',
              companyId: companyB,
              roleId: '507f1f77bcf86cd799439099',
            },
          ],
        } as any,
        {
          roleType: 'company-admin',
          companyId: companyA,
          _id: '607f1f77bcf86cd799439011',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing department document', async () => {
    departmentModel.findById.mockResolvedValue(null);

    await expect(
      service.createUser(
        {
          users: [
            {
              name: 'X',
              email: 'x@a.com',
              userName: 'xa',
              password: 'secret',
              companyId: companyA,
              departmentId: deptB,
            },
          ],
        } as any,
        {
          roleType: 'company-admin',
          companyId: companyA,
          _id: '607f1f77bcf86cd799439011',
        },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows same-company department assignment', async () => {
    const deptA = '707f1f77bcf86cd7994390aa';
    departmentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(deptA),
      companyId: companyA,
    });

    await expect(
      service.createUser(
        {
          users: [
            {
              name: 'X',
              email: 'x@a.com',
              userName: 'xa',
              password: 'secret',
              companyId: companyA,
              departmentId: deptA,
              roleId: '507f1f77bcf86cd799439099',
            },
          ],
        } as any,
        {
          roleType: 'company-admin',
          companyId: companyA,
          _id: '607f1f77bcf86cd799439011',
        },
      ),
    ).resolves.toMatchObject({ status: true });
  });
});
