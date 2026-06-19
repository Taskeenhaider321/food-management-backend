import { ForbiddenException } from '@nestjs/common';

export function isSuperAdminActor(user: any): boolean {
  return user?.roleType === 'super-admin';
}

export function isCompanyAdminActor(user: any): boolean {
  return user?.roleType === 'company-admin';
}

export function isSuperStaffActor(user: any): boolean {
  return user?.roleType === 'super-staff';
}

const COMPANY_SCOPED_USER_ROLE_TYPES = new Set([
  'company-user',
  'company-trainer',
  'company-employee',
]);

export function isCompanyUserActor(user: any): boolean {
  return COMPANY_SCOPED_USER_ROLE_TYPES.has(user?.roleType);
}

export function isCompanyTrainerActor(user: any): boolean {
  return user?.roleType === 'company-trainer';
}

export function isCompanyEmployeeActor(user: any): boolean {
  return user?.roleType === 'company-employee';
}

/** Super-admin, super-staff, or company-admin (tenant managers). Company-user is excluded. */
export function assertActorIsCompanyAdminOrSuper(actor: any): void {
  if (
    isSuperAdminActor(actor) ||
    isSuperStaffActor(actor) ||
    isCompanyAdminActor(actor)
  ) {
    return;
  }
  throw new ForbiddenException('Insufficient privileges for this action');
}

export function actorIdString(actor: any): string | null {
  if (!actor?._id) return null;
  return String(actor._id);
}

/** Resolved Mongo id string for the actor's company, or null (e.g. super-admin with no company). */
export function actorCompanyIdString(user: any): string | null {
  if (!user?.companyId) return null;
  const c = user.companyId;
  if (typeof c === 'object' && c?._id != null) return String(c._id);
  return String(c);
}

/** Department id from populated or raw user.departmentId */
export function actorDepartmentIdString(user: any): string | null {
  const d = user?.departmentId;
  if (!d) return null;
  if (typeof d === 'object' && d?._id != null) return String(d._id);
  return String(d);
}

export function assertActorMayAccessCompany(user: any, targetCompanyId: string): void {
  if (isSuperAdminActor(user)) return;
  const mine = actorCompanyIdString(user);
  if (!mine || mine !== String(targetCompanyId)) {
    throw new ForbiddenException('You may only access resources for your company');
  }
}

/**
 * Tenant isolation for user records:
 * - Super-admin: any user
 * - Company-admin: any user in the same company
 * - Company-user: only their own document
 */
export function assertActorMayAccessUserRecord(actor: any, targetUser: any | null): void {
  if (!targetUser) return;
  if (isSuperAdminActor(actor)) return;

  if (isCompanyUserActor(actor)) {
    const aid = actorIdString(actor);
    const tid =
      targetUser._id != null
        ? String((targetUser as any)._id)
        : null;
    if (aid && tid && aid === tid) return;
    throw new ForbiddenException('You may only access your own user record');
  }

  if (isCompanyAdminActor(actor)) {
    const tid =
      targetUser.companyId == null
        ? null
        : typeof targetUser.companyId === 'object' &&
            (targetUser.companyId as any)._id != null
          ? String((targetUser.companyId as any)._id)
          : String(targetUser.companyId);
    const mine = actorCompanyIdString(actor);
    if (!mine || !tid || mine !== tid) {
      throw new ForbiddenException('You may only access users in your company');
    }
    return;
  }

  throw new ForbiddenException('You may not access this user record');
}
