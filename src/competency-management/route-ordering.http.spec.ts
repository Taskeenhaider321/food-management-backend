import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PersonalRequisitionController } from './personal-requisition/personal-requisition.controller';
import { PersonalRequisitionService } from './personal-requisition/personal-requisition.service';
import { YearlyTrainingPlanController } from './yearly-training-plan/yearly-training-plan.controller';
import { YearlyTrainingPlanService } from './yearly-training-plan/yearly-training-plan.service';

/**
 * HTTP regression: Nest must register DELETE /all before DELETE /:id.
 */
describe('Competency DELETE route ordering (HTTP)', () => {
  describe('personal-requisitions', () => {
    let app: INestApplication;
    const service = {
      delete: jest.fn().mockResolvedValue({ status: true, via: 'delete-id' }),
      deleteAll: jest
        .fn()
        .mockResolvedValue({ status: true, via: 'delete-all' }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PersonalRequisitionController],
        providers: [{ provide: PersonalRequisitionService, useValue: service }],
      }).compile();

      app = module.createNestApplication();
      // Bypass auth — this suite only validates route matching.
      app.use((req: any, _res: any, next: () => void) => {
        req.user = { roleType: 'company-admin', companyId: 'c1' };
        next();
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('DELETE /personal-requisitions/all hits deleteAll, not delete(:id)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/personal-requisitions/all')
        .expect(200);

      expect(service.deleteAll).toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
      expect(res.body.via).toBe('delete-all');
    });

    it('DELETE /personal-requisitions/:id still works', async () => {
      await request(app.getHttpServer())
        .delete('/personal-requisitions/507f1f77bcf86cd799439011')
        .expect(200);

      expect(service.delete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.any(Object),
      );
      expect(service.deleteAll).not.toHaveBeenCalled();
    });
  });

  describe('yearly-training-plans', () => {
    let app: INestApplication;
    const service = {
      delete: jest.fn().mockResolvedValue({ status: true, via: 'delete-id' }),
      deleteAll: jest
        .fn()
        .mockResolvedValue({ status: true, via: 'delete-all' }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        controllers: [YearlyTrainingPlanController],
        providers: [{ provide: YearlyTrainingPlanService, useValue: service }],
      }).compile();

      app = module.createNestApplication();
      app.use((req: any, _res: any, next: () => void) => {
        req.user = { roleType: 'company-admin', companyId: 'c1' };
        next();
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('DELETE /yearly-training-plans/all hits deleteAll', async () => {
      await request(app.getHttpServer())
        .delete('/yearly-training-plans/all')
        .expect(200);

      expect(service.deleteAll).toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
    });

    it('DELETE /yearly-training-plans/:id still works', async () => {
      await request(app.getHttpServer())
        .delete('/yearly-training-plans/507f1f77bcf86cd799439011')
        .expect(200);

      expect(service.delete).toHaveBeenCalled();
      expect(service.deleteAll).not.toHaveBeenCalled();
    });
  });
});
