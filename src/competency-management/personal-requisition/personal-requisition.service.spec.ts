import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PersonalRequisitionService } from './personal-requisition.service';

describe('PersonalRequisitionService — tenant + OWN scope', () => {
  let service: PersonalRequisitionService;
  let requisitionModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndDelete: jest.Mock;
    deleteMany: jest.Mock;
  };
  let departmentModel: {
    findById: jest.Mock;
  };

  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const userA = '607f1f77bcf86cd799439011';
  const deptA = '707f1f77bcf86cd7994390aa';
  const deptB = '707f1f77bcf86cd7994390bb';
  const invalidDept = '707f1f77bcf86cd7994390ff';

  beforeEach(() => {
    requisitionModel = {
      find: jest.fn().mockReturnValue({
        populate: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      }),
    };

    departmentModel = {
      findById: jest.fn(),
    };

    service = new PersonalRequisitionService(
      requisitionModel as any,
      departmentModel as any,
    );
  });

  describe('findByCompany', () => {
    it('denies cross-company read for company user', async () => {
      await expect(
        service.findByCompany(companyB, {
          roleType: 'company-user',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows same-company read for company user', async () => {
      await expect(
        service.findByCompany(companyA, {
          roleType: 'company-user',
          companyId: companyA,
          _id: userA,
        }),
      ).resolves.toMatchObject({ status: true });
    });

    it('scopes OWN data for company-user via createdByUserId filter', async () => {
      const actor = {
        roleType: 'company-user',
        companyId: companyA,
        _id: userA,
      };

      await service.findByCompany(companyA, actor);

      expect(requisitionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: new Types.ObjectId(companyA),
          createdByUserId: new Types.ObjectId(userA),
        }),
      );
    });

    it('company-admin sees company records without OWN filter', async () => {
      await service.findByCompany(companyA, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: userA,
      });

      expect(requisitionModel.find).toHaveBeenCalledWith({
        companyId: new Types.ObjectId(companyA),
      });
    });

    it('global actor may read any company', async () => {
      await expect(
        service.findByCompany(companyB, {
          roleType: 'super-admin',
          _id: userA,
        }),
      ).resolves.toMatchObject({ status: true });
    });
  });

  describe('findByDepartment', () => {
    it('allows Company A → own department', async () => {
      departmentModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ companyId: companyA }),
        }),
      });

      await expect(
        service.findByDepartment(deptA, {
          roleType: 'company-admin',
          companyId: companyA,
          _id: userA,
        }),
      ).resolves.toMatchObject({ status: true });
    });

    it('denies Company A → Company B department', async () => {
      departmentModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ companyId: companyB }),
        }),
      });

      await expect(
        service.findByDepartment(deptB, {
          roleType: 'company-admin',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns NotFound for invalid department', async () => {
      departmentModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.findByDepartment(invalidDept, {
          roleType: 'company-admin',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('OWN user filters by createdByUserId', async () => {
      departmentModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ companyId: companyA }),
        }),
      });

      await service.findByDepartment(deptA, {
        roleType: 'company-user',
        companyId: companyA,
        _id: userA,
      });

      expect(requisitionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: new Types.ObjectId(deptA),
          createdByUserId: new Types.ObjectId(userA),
        }),
      );
    });

    it('COMPANY admin lists department without OWN filter', async () => {
      departmentModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ companyId: companyA }),
        }),
      });

      await service.findByDepartment(deptA, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: userA,
      });

      expect(requisitionModel.find).toHaveBeenCalledWith({
        departmentId: new Types.ObjectId(deptA),
      });
    });
  });

  describe('delete — OWN + company scope', () => {
    it('denies delete when company-user did not create the record', async () => {
      requisitionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'req1',
          companyId: companyA,
          createdByUserId: new Types.ObjectId('607f1f77bcf86cd799439099'),
        }),
      });

      await expect(
        service.delete('req1', {
          roleType: 'company-user',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies company-admin deleting another company record', async () => {
      requisitionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'req1',
          companyId: companyB,
          createdByUserId: new Types.ObjectId(userA),
        }),
      });

      await expect(
        service.delete('req1', {
          roleType: 'company-admin',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAll', () => {
    it('forbids OWN-scoped actors', async () => {
      await expect(
        service.deleteAll({
          roleType: 'company-user',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(requisitionModel.deleteMany).not.toHaveBeenCalled();
    });

    it('scopes company-admin to actor.companyId only', async () => {
      await service.deleteAll({
        roleType: 'company-admin',
        companyId: companyA,
        _id: userA,
      });

      expect(requisitionModel.deleteMany).toHaveBeenCalledWith({
        companyId: new Types.ObjectId(companyA),
      });
    });

    it('allows global actor unscoped deleteMany', async () => {
      await service.deleteAll({
        roleType: 'super-admin',
        _id: userA,
      });

      expect(requisitionModel.deleteMany).toHaveBeenCalledWith({});
    });

    it('requires authentication', async () => {
      await expect(service.deleteAll(undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
