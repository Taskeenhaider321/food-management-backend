import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EffectiveAccessGuard } from './effective-access.guard';
import { AuthorizationService } from '../../rbac/authorization.service';

const COMPETENCY_MODULE_ID = 'mod-competency';
const ADMIN_MODULE_ID = 'mod-admin';

function mockContext(
  user: Record<string, unknown> | null,
  method: string,
  path: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        route: { path },
        user,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('EffectiveAccessGuard — Competency routes', () => {
  let guard: EffectiveAccessGuard;
  let authorizationService: { resolvePermissionKeysForUser: jest.Mock };
  let masterPermissionModel: { find: jest.Mock };
  let masterModuleModel: { find: jest.Mock };

  const routeRows = [
    {
      key: 'EP_GET_EMPLOYEES',
      method: 'GET',
      path: '/employees/all',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_POST_EMPLOYEES_ADDEMPLOYEE',
      method: 'POST',
      path: '/employees',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID',
      method: 'DELETE',
      path: '/employees/:id',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_GET_MONTHLY_TRAINING_PLANS_READMONTHLYPLAN_DEPARTMENTID',
      method: 'GET',
      path: '/monthly-training-plans',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_PATCH_MONTHLY_TRAINING_PLANS_ID',
      method: 'PATCH',
      path: '/monthly-training-plans/:id',
      moduleId: COMPETENCY_MODULE_ID,
    },
    {
      key: 'EP_GET_USERS',
      method: 'GET',
      path: '/users',
      moduleId: ADMIN_MODULE_ID,
    },
    {
      key: 'EP_DELETE_USERS_ID',
      method: 'DELETE',
      path: '/users/:id',
      moduleId: ADMIN_MODULE_ID,
    },
  ];

  beforeEach(() => {
    authorizationService = {
      resolvePermissionKeysForUser: jest.fn(),
    };

    masterPermissionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(routeRows),
        }),
      }),
    };

    masterModuleModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { _id: COMPETENCY_MODULE_ID, key: 'COMPETENCY_MANAGEMENT' },
              { _id: ADMIN_MODULE_ID, key: 'ADMIN_MANAGEMENT' },
            ]),
        }),
      }),
    };

    guard = new EffectiveAccessGuard(
      new Reflector(),
      authorizationService as unknown as AuthorizationService,
      masterPermissionModel as any,
      masterModuleModel as any,
    );
  });

  it('denies unauthenticated requests', async () => {
    await expect(
      guard.canActivate(mockContext(null, 'GET', '/employees/all')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows super-admin without permission check', async () => {
    await expect(
      guard.canActivate(
        mockContext({ roleType: 'super-admin' }, 'POST', '/employees'),
      ),
    ).resolves.toBe(true);
  });

  it('allows GET /employees/all with view permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_EMPLOYEES',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'GET',
          '/employees/all',
        ),
      ),
    ).resolves.toBe(true);
  });

  it('denies POST /employees when user has view-only permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_EMPLOYEES',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'POST',
          '/employees',
        ),
      ),
    ).rejects.toThrow('Missing required permissions');
  });

  it('denies DELETE /employees/:id without delete permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_EMPLOYEES',
      'EP_PATCH_EMPLOYEES_ID',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'DELETE',
          '/employees/abc123',
        ),
      ),
    ).rejects.toThrow('Missing required permissions');
  });

  it('allows monthly plan GET with view permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_MONTHLY_TRAINING_PLANS_READMONTHLYPLAN_DEPARTMENTID',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'GET',
          '/monthly-training-plans',
        ),
      ),
    ).resolves.toBe(true);
  });

  it('allows monthly plan PATCH with update permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_MONTHLY_TRAINING_PLANS_READMONTHLYPLAN_DEPARTMENTID',
      'EP_PATCH_MONTHLY_TRAINING_PLANS_ID',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'PATCH',
          '/monthly-training-plans/plan1',
        ),
      ),
    ).resolves.toBe(true);
  });

  it('denies GET /employees/all when user has no competency permissions', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'company-user', companyId: 'c1' },
          'GET',
          '/employees/all',
        ),
      ),
    ).rejects.toThrow('Missing required permissions');
  });

  it('denies System Staff GET /users without user list permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'FS_VIEW_HACCP',
    ]);

    await expect(
      guard.canActivate(
        mockContext({ roleType: 'super-staff', companyId: null }, 'GET', '/users'),
      ),
    ).rejects.toThrow('Missing required permissions');
  });

  it('allows System Staff GET /users with user list permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_USERS',
    ]);

    await expect(
      guard.canActivate(
        mockContext({ roleType: 'super-staff', companyId: null }, 'GET', '/users'),
      ),
    ).resolves.toBe(true);
  });

  it('denies System Staff DELETE /users/:id without delete permission', async () => {
    authorizationService.resolvePermissionKeysForUser.mockResolvedValue([
      'EP_GET_USERS',
    ]);

    await expect(
      guard.canActivate(
        mockContext(
          { roleType: 'super-staff', companyId: null },
          'DELETE',
          '/users/abc123',
        ),
      ),
    ).rejects.toThrow('Missing required permissions');
  });
});
