// src/auth/guards/tab-permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserDocument } from '../../admin-management/users/schemas/user.schema';

@Injectable()
export class TabPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTab = this.reflector.get<string>('tab', context.getHandler());
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());

    if (!requiredTab || !requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDocument = request.user;

    return this.hasTabPermission(user, requiredTab, requiredPermission);
  }

  private hasTabPermission(user: UserDocument, tabName: string, permission: string): boolean {
    const u = user as UserDocument & { Tabs?: { Tab: string; Creation?: boolean; Approval?: boolean; Review?: boolean; Edit?: boolean; Authority?: boolean }[] };
    if (user.roleType === 'super-admin' || user.roleType === 'company-admin') {
      return true;
    }

    if (!u.Tabs || u.Tabs.length === 0) {
      throw new ForbiddenException('No tab permissions assigned');
    }

    const tab = u.Tabs.find((t) => t.Tab === tabName);
    if (!tab) {
      throw new ForbiddenException(`Access denied to ${tabName} tab`);
    }

    switch (permission.toLowerCase()) {
      case 'creation':
        return tab.Creation || false;
      case 'approval':
        return tab.Approval || false;
      case 'review':
        return tab.Review || false;
      case 'edit':
        return tab.Edit || false;
      case 'authority':
        return tab.Authority || false;
      default:
        return false;
    }
  }
}
