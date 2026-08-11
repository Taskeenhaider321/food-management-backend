import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MonthlyTrainingPlanService } from './monthly-training-plan.service';

describe('MonthlyTrainingPlanService — assertTrainerOnPlan', () => {
  let service: MonthlyTrainingPlanService;

  beforeEach(() => {
    service = Object.create(
      MonthlyTrainingPlanService.prototype,
    ) as MonthlyTrainingPlanService;
    (service as any).resolveTrainerMatchIds = jest
      .fn()
      .mockResolvedValue(new Set(['trainer-user-1']));
    (service as any).planMatchesTrainer = jest
      .fn()
      .mockImplementation((_plan, ids: Set<string>) =>
        ids.has('trainer-user-1'),
      );
  });

  it('allows assigned trainer', async () => {
    await expect(
      (service as any).assertTrainerOnPlan(
        { roleType: 'company-trainer', _id: 'trainer-user-1' },
        { Trainer: 'trainer-user-1' },
      ),
    ).resolves.toBeUndefined();
  });

  it('denies trainer not on plan', async () => {
    (service as any).planMatchesTrainer = jest.fn().mockReturnValue(false);

    await expect(
      (service as any).assertTrainerOnPlan(
        { roleType: 'company-trainer', _id: 'other-trainer' },
        { Trainer: 'trainer-user-1' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows company-admin without trainer assignment', async () => {
    (service as any).planMatchesTrainer = jest.fn().mockReturnValue(false);

    await expect(
      (service as any).assertTrainerOnPlan(
        { roleType: 'company-admin', companyId: new Types.ObjectId() },
        { Trainer: 'trainer-user-1' },
      ),
    ).resolves.toBeUndefined();
  });
});
