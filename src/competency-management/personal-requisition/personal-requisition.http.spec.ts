import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EffectiveAccessGuard } from '../../auth/guards/effective-access.guard';
import { AuthorizationService } from '../../rbac/authorization.service';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { MasterPermission } from '../../rbac/schemas/master-permission.schema';
import { MasterModule } from '../../rbac/schemas/master-module.schema';

const COMPETENCY_MODULE_ID = 'mod-competency';
const companyA = '507f1f77bcf86cd799439011';
const deptA = '707f1f77bcf86cd7994390aa';
const deptB = '707f1f77bcf86cd7994390bb';

@Injectable()
class PersonalRequisitionProbeService {
  findByDepartment(departmentId: string, actor: any) {
    if (
      actor?.roleType === 'company-admin' ||
      actor?.roleType === 'company-user'
    ) {
      if (departmentId === deptB) {
        throw new ForbiddenException(
          'You may only access resources for your company',
        );
      }
      if (departmentId !== deptA) {
        throw new NotFoundException('Department not found');
      }
    }
    return { status: true, data: [] };
  }

  deleteAll(actor: any) {
    if (!actor) throw new ForbiddenException('Authentication required');
    if (actor.roleType === 'company-user') {
      throw new ForbiddenException('Forbidden');
    }
    return { status: true, message: 'scoped' };
  }

  createUser(actor: any, body: { departmentId?: string }) {
    if (
      actor?.roleType === 'company-admin' &&
      body?.departmentId === deptB &&
      String(actor.companyId) === companyA
    ) {
      throw new ForbiddenException(
        'You may only assign departments from your company',
      );
    }
    return { status: true };
  }
}

@Controller('personal-requisitions')
class PersonalRequisitionProbeController {
  constructor(private readonly svc: PersonalRequisitionProbeService) {}

  @Delete('all')
  deleteAll(@Req() req: any) {
    return this.svc.deleteAll(req.user);
  }

  @Get(':departmentId')
  findByDepartment(
    @Param('departmentId') departmentId: string,
    @Req() req: any,
  ) {
    return this.svc.findByDepartment(departmentId, req.user);
  }

  @Post('users-probe')
  createUserCrossDept(@Req() req: any) {
    return this.svc.createUser(req.user, req.body || {});
  }
}

function mockUserMiddleware(user: Record<string, unknown> | null) {
  return (req: any, _res: any, next: () => void) => {
    req.user = user;
    next();
  };
}

describe('HTTP security — Personal Requisition + user create tenant', () => {
  const routeRows = [
    {
      key: 'EP_GET_PERSONAL_REQUISITIONS_DEPARTMENT',
      method: 'GET',
      path: '/personal-requisitions/:departmentId',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_DELETE_PERSONAL_REQUISITIONS_ALL',
      method: 'DELETE',
      path: '/personal-requisitions/all',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_POST_USERS_PROBE',
      method: 'POST',
      path: '/personal-requisitions/users-probe',
      moduleId: COMPETENCY_MODULE_ID,
    },
  ];

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
      controllers: [PersonalRequisitionProbeController],
      providers: [
        PersonalRequisitionProbeService,
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

  const allKeys = routeRows.map((r) => r.key);

  it('Company A → Company B departmentId returns 403', async () => {
    const app = await buildApp(
      { roleType: 'company-admin', companyId: companyA, _id: 'u1' },
      allKeys,
    );
    await request(app.getHttpServer())
      .get(`/personal-requisitions/${deptB}`)
      .expect(403);
    await app.close();
  });

  it('Company A → own department allowed', async () => {
    const app = await buildApp(
      { roleType: 'company-admin', companyId: companyA, _id: 'u1' },
      allKeys,
    );
    await request(app.getHttpServer())
      .get(`/personal-requisitions/${deptA}`)
      .expect(200);
    await app.close();
  });

  it('OWN user deleteAll returns 403', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA, _id: 'u1' },
      allKeys,
    );
    await request(app.getHttpServer())
      .delete('/personal-requisitions/all')
      .expect(403);
    await app.close();
  });

  it('view-only user without delete permission gets 403 on deleteAll', async () => {
    const app = await buildApp(
      { roleType: 'company-admin', companyId: companyA, _id: 'u1' },
      ['EP_GET_PERSONAL_REQUISITIONS_DEPARTMENT'],
    );
    await request(app.getHttpServer())
      .delete('/personal-requisitions/all')
      .expect(403);
    await app.close();
  });

  it('Company A create-user with Company B departmentId returns 403', async () => {
    const app = await buildApp(
      { roleType: 'company-admin', companyId: companyA, _id: 'u1' },
      allKeys,
    );
    await request(app.getHttpServer())
      .post('/personal-requisitions/users-probe')
      .send({ departmentId: deptB })
      .expect(403);
    await app.close();
  });
});
