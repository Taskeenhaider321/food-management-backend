import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_ONLY_KEY } from '../decorators/authenticated-only.decorator';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';
import { allowsTrainerSelfService } from '../utils/trainer-self-service.util';
import {
  isCompanyAdminActor,
  isCompanyAdminTenantRoute,
} from '../utils/request-actor.util';
import { AuthorizationService } from '../../rbac/authorization.service';
import {
  MasterPermission,
  MasterPermissionDocument,
} from '../../rbac/schemas/master-permission.schema';
import {
  MasterModule,
  MasterModuleDocument,
} from '../../rbac/schemas/master-module.schema';

type RoutePermissionRow = {
  key: string;
  method: string;
  path: string;
  moduleKey: string;
};

/**
 * Global RBAC enforcement.
 * 1. Honors @RequirePermissions / @RequireModuleAccess when present.
 * 2. Otherwise matches request method+path to MasterPermission seed rows
 *    (dynamic — new seeded routes enforce automatically).
 * 3. Unmapped routes stay auth-only (JWT) so uploads/misc keep working.
 */
@Injectable()
export class EffectiveAccessGuard implements CanActivate {
  private routeCache: { expiresAt: number; rows: RoutePermissionRow[] } | null =
    null;

  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
    @InjectModel(MasterPermission.name)
    private readonly masterPermissionModel: Model<MasterPermissionDocument>,
    @InjectModel(MasterModule.name)
    private readonly masterModuleModel: Model<MasterModuleDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const authOnly = this.reflector.getAllAndOverride<boolean>(AUTH_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (authOnly) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (user.roleType === 'super-admin') {
      return true;
    }

    const method = String(request.method || 'GET').toUpperCase();
    const path = this.normalizePath(request.route?.path || request.path || '');

    if (isCompanyAdminActor(user) && isCompanyAdminTenantRoute(method, path)) {
      return true;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const requiredModules =
      this.reflector.getAllAndOverride<string[]>(MODULE_ACCESS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const resolved = await this.ensureResolvedPermissions(user);
    request.user = { ...user, resolvedPermissions: resolved };

    if (allowsTrainerSelfService(user, requiredModules, requiredPermissions)) {
      return true;
    }

    if (requiredPermissions.length > 0) {
      this.assertAnyPermission(resolved, requiredPermissions);
    }

    if (requiredModules.length > 0) {
      const moduleKeys = await this.moduleKeysForUser(user, resolved);
      const ok = requiredModules.every((m) => moduleKeys.has(m));
      if (!ok) {
        throw new ForbiddenException('Missing required module access');
      }
    }

    // Dynamic path-based check when no explicit decorator metadata
    if (requiredPermissions.length === 0 && requiredModules.length === 0) {
      const matched = await this.matchRoutePermission(method, path);

      if (matched) {
        if (
          allowsTrainerSelfService(user, [matched.moduleKey], [matched.key])
        ) {
          return true;
        }
        this.assertAnyPermission(resolved, [matched.key]);
      }
      // No master permission for this route → JWT-only (backward compatible)
    }

    return true;
  }

  private async ensureResolvedPermissions(user: any): Promise<string[]> {
    if (
      Array.isArray(user.resolvedPermissions) &&
      user.resolvedPermissions.length
    ) {
      return user.resolvedPermissions;
    }
    return this.authorizationService.resolvePermissionKeysForUser(user);
  }

  private async moduleKeysForUser(
    user: any,
    resolved: string[],
  ): Promise<Set<string>> {
    if (resolved.includes('*')) {
      const all = await this.masterModuleModel
        .find({ isActive: true })
        .select('key')
        .lean();
      return new Set(all.map((m) => m.key));
    }
    const access = await this.authorizationService.buildAccessForUser(user);
    return new Set(access.modules.map((m) => m.key));
  }

  private assertAnyPermission(resolved: string[], required: string[]) {
    if (resolved.includes('*')) return;
    const ok = required.some((p) => resolved.includes(p));
    if (!ok) {
      throw new ForbiddenException('Missing required permissions');
    }
  }

  private normalizePath(path: string): string {
    let p = path.split('?')[0] || '/';
    if (!p.startsWith('/')) p = `/${p}`;
    // Nest global prefix is usually none; strip trailing slash except root
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  private async matchRoutePermission(
    method: string,
    requestPath: string,
  ): Promise<RoutePermissionRow | null> {
    const rows = await this.getRouteRows();
    const candidates = rows.filter((r) => r.method === method);
    // Prefer longest/most specific path match
    let best: RoutePermissionRow | null = null;
    let bestScore = -1;
    for (const row of candidates) {
      const score = this.pathMatchScore(row.path, requestPath);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    return bestScore >= 0 ? best : null;
  }

  /** Returns specificity score, or -1 if no match. */
  private pathMatchScore(pattern: string, actual: string): number {
    const pParts = pattern.split('/').filter(Boolean);
    const aParts = actual.split('/').filter(Boolean);
    if (pParts.length !== aParts.length) return -1;
    let score = 0;
    for (let i = 0; i < pParts.length; i += 1) {
      const pp = pParts[i];
      const ap = aParts[i];
      if (pp.startsWith(':')) {
        score += 1; // param match
        continue;
      }
      if (pp !== ap) return -1;
      score += 10; // exact segment
    }
    return score;
  }

  private async getRouteRows(): Promise<RoutePermissionRow[]> {
    if (this.routeCache && this.routeCache.expiresAt > Date.now()) {
      return this.routeCache.rows;
    }

    const modules = await this.masterModuleModel
      .find()
      .select('_id key')
      .lean();
    const moduleById = new Map(modules.map((m) => [String(m._id), m.key]));

    const perms = await this.masterPermissionModel
      .find({
        isActive: true,
        path: { $exists: true, $ne: '' },
        method: { $exists: true },
      })
      .select('key method path moduleId')
      .lean();

    const rows: RoutePermissionRow[] = perms
      .map((p) => ({
        key: p.key,
        method: String(p.method || '').toUpperCase(),
        path: this.normalizePath(String(p.path || '')),
        moduleKey: moduleById.get(String(p.moduleId)) || '',
      }))
      .filter((r) => r.key && r.method && r.path && r.moduleKey);

    this.routeCache = {
      rows,
      expiresAt: Date.now() + 60_000,
    };
    return rows;
  }
}
