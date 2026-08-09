import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
} from '../../admin-management/users/schemas/user.schema';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

type CachedAuthUser = {
  user: Record<string, unknown>;
  expiresAt: number;
};

/** Avoid 2–3 Atlas round-trips on every authenticated request. */
const AUTH_USER_CACHE_TTL_MS = 60_000;
const authUserCache = new Map<string, CachedAuthUser>();

function asIdRef(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return value;
  }
  return { _id: value };
}

function normalizeAuthUser(user: Record<string, unknown>) {
  return {
    ...user,
    companyId: asIdRef(user.companyId),
    departmentId: asIdRef(user.departmentId),
    roleId: asIdRef(user.roleId),
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_CODE) as any;
      const userId = String(payload.userId || payload.id || '');
      if (!userId) {
        throw new UnauthorizedException('Invalid token');
      }

      const cached = authUserCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.user.isSuspended) {
          throw new UnauthorizedException('Invalid user or suspended');
        }
        request.user = cached.user;
        return true;
      }

      // Single Atlas round-trip: skip populate (controllers only need ids;
      // PDF helpers re-fetch company details when needed).
      const user = await this.userModel.findById(userId).lean().exec();

      if (!user || user.isSuspended) {
        authUserCache.delete(userId);
        throw new UnauthorizedException('Invalid user or suspended');
      }

      const normalized = normalizeAuthUser(
        user as unknown as Record<string, unknown>,
      );
      authUserCache.set(userId, {
        user: normalized,
        expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
      });

      request.user = normalized;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
