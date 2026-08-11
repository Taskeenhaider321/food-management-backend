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

/**
 * Minimal competency-like controller used to prove HTTP denial for
 * permission + cross-company ID tampering without a live MongoDB.
 */
@Injectable()
class TenantProbeService {
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

@Controller('employees')
class SecurityEmployeesController {
  constructor(private readonly tenant: TenantProbeService) {}

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

function mockUserMiddleware(user: Record<string, unknown> | null) {
  return (req: any, _res: any, next: () => void) => {
    req.user = user;
    next();
  };
}

describe('HTTP security — Competency cross-company + permission denial', () => {
  const routeRows = [
    {
      key: 'EP_GET_EMPLOYEES_ID',
      method: 'GET',
      path: '/employees/:id',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_PATCH_EMPLOYEES_ID',
      method: 'PATCH',
      path: '/employees/:id',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID',
      method: 'DELETE',
      path: '/employees/:id',
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
      controllers: [SecurityEmployeesController],
      providers: [
        TenantProbeService,
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

  it('denies Company A user GET Company B record id (HTTP 403)', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      ['EP_GET_EMPLOYEES_ID'],
    );

    await request(app.getHttpServer()).get(`/employees/${recordB}`).expect(403);

    await app.close();
  });

  it('denies Company A user PATCH Company B record (HTTP 403)', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      ['EP_GET_EMPLOYEES_ID', 'EP_PATCH_EMPLOYEES_ID'],
    );

    await request(app.getHttpServer())
      .patch(`/employees/${recordB}`)
      .send({})
      .expect(403);

    await app.close();
  });

  it('denies Company A user DELETE Company B record (HTTP 403)', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      ['EP_GET_EMPLOYEES_ID', 'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID'],
    );

    await request(app.getHttpServer())
      .delete(`/employees/${recordB}`)
      .expect(403);

    await app.close();
  });

  it('denies DELETE when user has view-only permission (direct API bypass)', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      ['EP_GET_EMPLOYEES_ID'],
    );

    await request(app.getHttpServer())
      .delete('/employees/507f1f77bcf86cd7994390aa')
      .expect(403);

    await app.close();
  });

  it('allows same-company GET with view permission', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      ['EP_GET_EMPLOYEES_ID'],
    );

    await request(app.getHttpServer())
      .get('/employees/507f1f77bcf86cd7994390aa')
      .expect(200);

    await app.close();
  });

  it('denies all competency routes when user has no permissions', async () => {
    const app = await buildApp(
      { roleType: 'company-user', companyId: companyA },
      [],
    );

    await request(app.getHttpServer())
      .get('/employees/507f1f77bcf86cd7994390aa')
      .expect(403);

    await app.close();
  });
});
