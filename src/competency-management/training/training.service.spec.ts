import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrainingService } from './training.service';

describe('TrainingService — deleteAll tenant scope', () => {
  let service: TrainingService;
  let trainingModel: { deleteMany: jest.Mock };

  const companyA = '507f1f77bcf86cd799439011';
  const userA = '607f1f77bcf86cd799439011';

  beforeEach(() => {
    trainingModel = {
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      }),
    };

    service = Object.create(TrainingService.prototype) as TrainingService;
    (service as any).trainingModel = trainingModel;
  });

  describe('deleteAll', () => {
    it('requires authentication', async () => {
      await expect(service.deleteAll(undefined)).rejects.toThrow(
        ForbiddenException,
      );
      expect(trainingModel.deleteMany).not.toHaveBeenCalled();
    });

    it('forbids OWN-scoped actors', async () => {
      await expect(
        service.deleteAll({
          roleType: 'company-user',
          companyId: companyA,
          _id: userA,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(trainingModel.deleteMany).not.toHaveBeenCalled();
    });

    it('scopes company-admin to actor.companyId only', async () => {
      await service.deleteAll({
        roleType: 'company-admin',
        companyId: companyA,
        _id: userA,
      });

      expect(trainingModel.deleteMany).toHaveBeenCalledWith({
        companyId: new Types.ObjectId(companyA),
      });
    });

    it('allows global actor unscoped deleteMany', async () => {
      await service.deleteAll({
        roleType: 'super-admin',
        _id: userA,
      });

      expect(trainingModel.deleteMany).toHaveBeenCalledWith({});
    });
  });
});
