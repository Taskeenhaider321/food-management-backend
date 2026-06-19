import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_ONLY_KEY } from '../decorators/authenticated-only.decorator';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';
import { allowsTrainerSelfService } from '../utils/trainer-self-service.util';

function moduleKeysFromRole(role: any): string[] {
  if (!role) return [];

  const keys: string[] = [];

  if (role.moduleIds?.length) {
    for (const m of role.moduleIds) {
      if (typeof m === 'object' && m?.key) keys.push(m.key);
    }
  }

  if (role.derivedModuleIds?.length) {
    for (const dm of role.derivedModuleIds) {
      if (!dm || dm.isActive === false) continue;
      const mm = dm.masterModuleId;
      if (typeof mm === 'object' && mm?.key) keys.push(mm.key);
    }
  }

  return keys;
}

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const authOnly = this.reflector.getAllAndOverride<boolean>(AUTH_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (authOnly) {
      return true;
    }

    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (user?.roleType === 'super-admin') {
      return true;
    }

    if (!requiredModules || requiredModules.length === 0) {
      throw new ForbiddenException('Endpoint requires explicit module access metadata');
    }

    if (allowsTrainerSelfService(user, requiredModules)) {
      return true;
    }

    const role = user?.roleId;
    if (!role) {
      throw new ForbiddenException('No role assigned');
    }

    const assignedModules = moduleKeysFromRole(role);

    const hasAllModules = requiredModules.every((moduleKey) =>
      assignedModules.includes(moduleKey),
    );

    if (!hasAllModules) {
      throw new ForbiddenException('Missing required module access');
    }

    return true;
  }
}
