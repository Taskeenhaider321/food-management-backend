import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_ONLY_KEY } from '../decorators/authenticated-only.decorator';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { allowsTrainerSelfService } from '../utils/trainer-self-service.util';

@Injectable()
export class PermissionGuard implements CanActivate {
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

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (user?.roleType === 'super-admin') {
      return true;
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException('Endpoint requires explicit permission metadata');
    }

    if (allowsTrainerSelfService(user, undefined, requiredPermissions)) {
      return true;
    }

    const resolved: string[] = user?.resolvedPermissions ?? [];

    if (resolved.includes('*')) {
      return true;
    }

    if (resolved.length === 0) {
      throw new ForbiddenException('No role assigned');
    }

    const hasPermission = requiredPermissions.some((p) => resolved.includes(p));

    if (!hasPermission) {
      throw new ForbiddenException('Missing required permissions');
    }

    return true;
  }
}
