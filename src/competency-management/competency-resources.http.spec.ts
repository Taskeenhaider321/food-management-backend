import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  Patch,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EffectiveAccessGuard } from '../auth/guards/effective-access.guard';
import { AuthorizationService } from '../rbac/authorization.service';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { MasterPermission } from '../rbac/schemas/master-permission.schema';
import { MasterModule } from '../rbac/schemas/master-module.schema';

const COMPETENCY_MODULE_ID = 'mod-competency';
const companyA = '507f1f77bcf86cd799439011';
const recordB = '707f1f77bcf86cd7994390bb';
const recordA = '707f1f77bcf86cd7994390aa';

@Injectable()
class CompetencyTenantProbeService {
  read(id: string) {
    if (id === recordB) {
      throw new ForbiddenException(
        'You may only access resources for your company',
      );
    }
    return { status: true, id };
  }

  write(id: string) {
    if (id === recordB) {
      throw new ForbiddenException(
        'You may only access resources for your company',
      );
    }
    return { status: true, id };
  }
}

@Controller('trainers')
class SecurityTrainersController {
  constructor(private readonly tenant: CompetencyTenantProbeService) {}
  @Get(':id') findOne(@Param('id') id: string) {
    return this.tenant.read(id);
  }
  @Patch(':id') update(@Param('id') id: string) {
    return this.tenant.write(id);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.tenant.write(id);
  }
}

@Controller('trainings')
class SecurityTrainingsController {
  constructor(private readonly tenant: CompetencyTenantProbeService) {}
  @Get(':id') findOne(@Param('id') id: string) {
    return this.tenant.read(id);
  }
  @Patch(':id') update(@Param('id') id: string) {
    return this.tenant.write(id);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.tenant.write(id);
  }
}

@Controller('yearly-training-plans')
class SecurityYearlyPlansController {
  constructor(private readonly tenant: CompetencyTenantProbeService) {}
  @Get(':id') findOne(@Param('id') id: string) {
    return this.tenant.read(id);
  }
  @Patch(':id') update(@Param('id') id: string) {
    return this.tenant.write(id);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.tenant.write(id);
  }
}

@Controller('monthly-training-plans')
class SecurityMonthlyPlansController {
  constructor(private readonly tenant: CompetencyTenantProbeService) {}
  @Get(':id') findOne(@Param('id') id: string) {
    return this.tenant.read(id);
  }
  @Patch(':id') update(@Param('id') id: string) {
    return this.tenant.write(id);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.tenant.write(id);
  }
}

function mockUserMiddleware(user: Record<string, unknown> | null) {
  return (req: any, _res: any, next: () => void) => {
    req.user = user;
    next();
  };
}

describe('HTTP security — Competency trainers/trainings/plans cross-company', () => {
  const resources = [
    { path: 'trainers', prefix: 'TRAINERS' },
    { path: 'trainings', prefix: 'TRAININGS' },
    { path: 'yearly-training-plans', prefix: 'YEARLY_TRAINING_PLANS' },
    { path: 'monthly-training-plans', prefix: 'MONTHLY_TRAINING_PLANS' },
  ] as const;

  const controllers = [
    SecurityTrainersController,
    SecurityTrainingsController,
    SecurityYearlyPlansController,
    SecurityMonthlyPlansController,
  ];

  const routeRows = resources.flatMap((r) => [
    {
      key: `EP_GET_${r.prefix}_ID`,
      method: 'GET',
      path: `/${r.path}/:id`,
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: `EP_PATCH_${r.prefix}_ID`,
      method: 'PATCH',
      path: `/${r.path}/:id`,
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: `EP_DELETE_${r.prefix}_ID`,
      method: 'DELETE',
      path: `/${r.path}/:id`,
      moduleId: COMPETENCY_MODULE_ID,
    },
  ]);

  async function buildApp(
    user: Record<string, unknown> | null,
    keys: string[],
  ) {
    const authorizationService = {
      resolvePermissionKeysForUser: jest.fn().mockResolvedValue(keys),
      buildAccessForUser: jest.fn().mockResolvedValue({ modules: [] }),
    };

    const masterPermissionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(routeRows),
        }),
      }),
    };

    const masterModuleModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { _id: COMPETENCY_MODULE_ID, key: 'COMPETENCY_MANAGEMENT' },
            ]),
        }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers,
      providers: [
        CompetencyTenantProbeService,
        EffectiveAccessGuard,
        Reflector,
        { provide: AuthorizationService, useValue: authorizationService },
        {
          provide: getModelToken(MasterPermission.name),
          useValue: masterPermissionModel,
        },
        {
          provide: getModelToken(MasterModule.name),
          useValue: masterModuleModel,
        },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalGuards(app.get(EffectiveAccessGuard));
    app.use(mockUserMiddleware(user));
    await app.init();
    return app;
  }

  for (const resource of resources) {
    const getKey = `EP_GET_${resource.prefix}_ID`;
    const patchKey = `EP_PATCH_${resource.prefix}_ID`;
    const deleteKey = `EP_DELETE_${resource.prefix}_ID`;

    it(`${resource.path}: GET Company B → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey],
      );
      await request(app.getHttpServer())
        .get(`/${resource.path}/${recordB}`)
        .expect(403);
      await app.close();
    });

    it(`${resource.path}: PATCH Company B → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey, patchKey],
      );
      await request(app.getHttpServer())
        .patch(`/${resource.path}/${recordB}`)
        .send({})
        .expect(403);
      await app.close();
    });

    it(`${resource.path}: DELETE Company B → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey, deleteKey],
      );
      await request(app.getHttpServer())
        .delete(`/${resource.path}/${recordB}`)
        .expect(403);
      await app.close();
    });

    it(`${resource.path}: view-only DELETE → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey],
      );
      await request(app.getHttpServer())
        .delete(`/${resource.path}/${recordA}`)
        .expect(403);
      await app.close();
    });
  }
});
