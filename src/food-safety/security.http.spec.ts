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

const FOOD_SAFETY_MODULE_ID = 'mod-food-safety';
const companyA = '507f1f77bcf86cd799439011';
const recordB = '707f1f77bcf86cd7994390bb';
const recordA = '707f1f77bcf86cd7994390aa';

@Injectable()
class FoodSafetyTenantProbeService {
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

function resourceController(base: string) {
  @Controller(base)
  class ResourceController {
    constructor(public readonly tenant: FoodSafetyTenantProbeService) {}

    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.tenant.read(id);
    }

    @Patch(':id')
    update(@Param('id') id: string) {
      return this.tenant.write(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.tenant.write(id);
    }
  }
  return ResourceController;
}

const SecurityProductController = resourceController('product');
const SecurityHaccpController = resourceController('haccp-team');
const SecurityProcessesController = resourceController('processes');
const SecurityConductController = resourceController('conduct-haccp');
const SecurityDecisionController = resourceController('decision-tree');
const SecurityPlanController = resourceController('food-safety');

function mockUserMiddleware(user: Record<string, unknown> | null) {
  return (req: any, _res: any, next: () => void) => {
    req.user = user;
    next();
  };
}

describe('HTTP security — Food Safety cross-company denial (multi-resource)', () => {
  const resources = [
    { name: 'product', path: 'product', controller: SecurityProductController },
    {
      name: 'haccp-team',
      path: 'haccp-team',
      controller: SecurityHaccpController,
    },
    {
      name: 'processes',
      path: 'processes',
      controller: SecurityProcessesController,
    },
    {
      name: 'conduct-haccp',
      path: 'conduct-haccp',
      controller: SecurityConductController,
    },
    {
      name: 'decision-tree',
      path: 'decision-tree',
      controller: SecurityDecisionController,
    },
    {
      name: 'food-safety-plan',
      path: 'food-safety',
      controller: SecurityPlanController,
    },
  ] as const;

  const routeRows = resources.flatMap((r) => [
    {
      key: `EP_GET_${r.name.toUpperCase().replace(/-/g, '_')}_ID`,
      method: 'GET',
      path: `/${r.path}/:id`,
      moduleId: FOOD_SAFETY_MODULE_ID,
    },
    {
      key: `EP_PATCH_${r.name.toUpperCase().replace(/-/g, '_')}_ID`,
      method: 'PATCH',
      path: `/${r.path}/:id`,
      moduleId: FOOD_SAFETY_MODULE_ID,
    },
    {
      key: `EP_DELETE_${r.name.toUpperCase().replace(/-/g, '_')}_ID`,
      method: 'DELETE',
      path: `/${r.path}/:id`,
      moduleId: FOOD_SAFETY_MODULE_ID,
    },
  ]);

  async function buildApp(
    user: Record<string, unknown> | null,
    keys: string[],
    controllers: any[],
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
              { _id: FOOD_SAFETY_MODULE_ID, key: 'FOOD_SAFETY' },
            ]),
        }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers,
      providers: [
        FoodSafetyTenantProbeService,
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
    const getKey = `EP_GET_${resource.name.toUpperCase().replace(/-/g, '_')}_ID`;
    const patchKey = `EP_PATCH_${resource.name.toUpperCase().replace(/-/g, '_')}_ID`;
    const deleteKey = `EP_DELETE_${resource.name.toUpperCase().replace(/-/g, '_')}_ID`;

    it(`${resource.name}: Company A GET Company B id → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey],
        [resource.controller],
      );
      await request(app.getHttpServer())
        .get(`/${resource.path}/${recordB}`)
        .expect(403);
      await app.close();
    });

    it(`${resource.name}: Company A PATCH Company B id → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey, patchKey],
        [resource.controller],
      );
      await request(app.getHttpServer())
        .patch(`/${resource.path}/${recordB}`)
        .send({})
        .expect(403);
      await app.close();
    });

    it(`${resource.name}: Company A DELETE Company B id → 403`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey, deleteKey],
        [resource.controller],
      );
      await request(app.getHttpServer())
        .delete(`/${resource.path}/${recordB}`)
        .expect(403);
      await app.close();
    });

    it(`${resource.name}: same-company GET allowed`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey],
        [resource.controller],
      );
      await request(app.getHttpServer())
        .get(`/${resource.path}/${recordA}`)
        .expect(200);
      await app.close();
    });

    it(`${resource.name}: view-only cannot DELETE (API bypass)`, async () => {
      const app = await buildApp(
        { roleType: 'company-user', companyId: companyA },
        [getKey],
        [resource.controller],
      );
      await request(app.getHttpServer())
        .delete(`/${resource.path}/${recordA}`)
        .expect(403);
      await app.close();
    });
  }
});
