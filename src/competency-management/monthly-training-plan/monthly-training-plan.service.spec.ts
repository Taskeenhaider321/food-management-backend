import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MonthlyTrainingPlanService } from './monthly-training-plan.service';

describe('MonthlyTrainingPlanService — tenant isolation', () => {
  let service: MonthlyTrainingPlanService;
  let monthlyPlanModel: { findById: jest.Mock };

  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const deptB = '607f1f77bcf86cd799439012';
  const planId = '707f1f77bcf86cd799439011';

  beforeEach(() => {
    monthlyPlanModel = {
      findById: jest.fn(),
    };

    service = Object.create(
      MonthlyTrainingPlanService.prototype,
    ) as MonthlyTrainingPlanService;
    (service as any).monthlyPlanModel = monthlyPlanModel;
    (service as any).departmentModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ companyId: companyB }),
        }),
      }),
    };
    (service as any).cloudinaryService = {
      uploadFile: jest.fn(),
    };
  });

  describe('uploadImages', () => {
    it('denies cross-company upload when actor belongs to another company', async () => {
      monthlyPlanModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: planId,
          UserDepartment: deptB,
          save: jest.fn(),
        }),
      });

      await expect(
        service.uploadImages(planId, [], {
          roleType: 'company-user',
          companyId: companyA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTrainingStatus', () => {
    it('denies cross-company status update', async () => {
      (service as any).employeeModel = {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            trainings: [],
            save: jest.fn(),
          }),
        }),
      };
      monthlyPlanModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: planId,
          UserDepartment: deptB,
          Training: new Types.ObjectId(),
          ScheduleStatus: 'Scheduled',
          save: jest.fn(),
        }),
      });

      await expect(
        service.updateTrainingStatus(
          [
            {
              EmployeeId: 'emp1',
              trainingId: planId,
              Marks: 80,
              IsPass: true,
              IsPresent: true,
              Remarks: 'ok',
            },
          ],
          { roleType: 'company-user', companyId: companyA },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
