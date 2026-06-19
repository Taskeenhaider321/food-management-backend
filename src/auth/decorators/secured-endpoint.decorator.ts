import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequireModuleAccess } from './module-access.decorator';
import { RequirePermissions } from './permission.decorator';

/** JWT (global) + module + permission + Swagger bearer for this operation. */
export function SecuredEndpoint(moduleKey: string, ...permissionKeys: string[]) {
  return applyDecorators(
    RequireModuleAccess(moduleKey),
    RequirePermissions(...permissionKeys),
    ApiBearerAuth(),
  );
}
