// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserDocument } from '../../admin-management/users/schemas/user.schema';
import { AffiliationService } from '../affiliation/affiliation.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly affiliationService: AffiliationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDocument = request.user;

    const userRoles = await this.collectUserRoles(user);
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  private async collectUserRoles(user: UserDocument): Promise<string[]> {
    const roles: string[] = [];

    if (user.roleType === 'super-admin') {
      roles.push('SUPER_ADMIN');
    }
    if (user.roleType === 'company-admin') {
      roles.push('COMPANY_ADMIN');
    }
    if (
      user.roleType === 'company-user' ||
      user.roleType === 'company-trainer' ||
      user.roleType === 'company-employee'
    ) {
      roles.push('USER');
    }
    if (user.roleType === 'company-trainer') {
      roles.push('COMPANY_TRAINER');
    }
    if (user.roleType === 'company-employee') {
      roles.push('COMPANY_EMPLOYEE');
    }

    const functional = await this.affiliationService.getFunctionalRoleKeys(
      user._id.toString(),
    );
    roles.push(...functional);

    return roles;
  }
}
