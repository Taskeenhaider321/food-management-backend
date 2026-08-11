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

export function assertActorMayAccessCompany(
  user: any,
  targetCompanyId: string,
): void {
  if (isSuperAdminActor(user)) return;
  const mine = actorCompanyIdString(user);
  if (!mine || mine !== String(targetCompanyId)) {
    throw new ForbiddenException(
      'You may only access resources for your company',
    );
  }
}

/**
 * Company admins manage users and company-scoped roles without ADMIN_MANAGEMENT /
 * RBAC module keys — tenant isolation is enforced in services/controllers.
 */
export function isCompanyAdminTenantRoute(
  method: string,
  path: string,
): boolean {
  const m = String(method || 'GET').toUpperCase();
  const p = path.split('?')[0] || '/';
  const normalized =
    p.length > 1 && p.endsWith('/')
      ? p.slice(0, -1)
      : p.startsWith('/')
        ? p
        : `/${p}`;

  if (m === 'POST' && normalized === '/users') return true;
  if (m === 'GET' && normalized === '/users') return true;
  if (
    m === 'PATCH' &&
    /^\/users\/[^/]+\/(assign-role|reassign-access|suspend|change-password)$/.test(
      normalized,
    )
  ) {
    return true;
  }
  if ((m === 'PUT' || m === 'DELETE') && /^\/users\/[^/]+$/.test(normalized)) {
    return true;
  }

  if (m === 'POST' && normalized === '/rbac/derived-modules') return true;
  if (m === 'POST' && normalized === '/rbac/roles') return true;
  if (m === 'GET' && normalized === '/rbac/roles') return true;
  if (m === 'PATCH' && /^\/rbac\/roles\/[^/]+$/.test(normalized)) return true;
  if (m === 'PATCH' && normalized === '/rbac/assign-role') return true;
  if (m === 'GET' && normalized === '/rbac/me/access') return true;
  if (m === 'GET' && normalized === '/rbac/me/access-version') return true;
  if (
    /^\/rbac\/companies\/[^/]+\/modules$/.test(normalized) &&
    (m === 'GET' || m === 'PUT')
  ) {
    return true;
  }

  if (m === 'GET' && normalized === '/companies/all') return true;
  if (
    m === 'GET' &&
    /^\/companies\/[^/]+$/.test(normalized) &&
    !normalized.endsWith('/download-pdf')
  ) {
    return true;
  }

  return false;
}

/**
 * Tenant isolation for user records:
 * - Super-admin: any user
 * - Company-admin: any user in the same company
 * - Company-user: only their own document
 */
export function assertActorMayAccessUserRecord(
  actor: any,
  targetUser: any,
): void {
  if (!targetUser) return;
  if (isSuperAdminActor(actor) || isSuperStaffActor(actor)) return;

  // Company-scoped users (company-user / company-trainer / company-employee)
  // may access only their own user record.
  if (COMPANY_SCOPED_USER_ROLE_TYPES.has(actor?.roleType)) {
    const aid = actorIdString(actor);
    const tid = targetUser._id != null ? String(targetUser._id) : null;
    if (aid && tid && aid === tid) return;
    throw new ForbiddenException('You may only access your own user record');
  }

  if (isCompanyAdminActor(actor)) {
    const tid =
      targetUser.companyId == null
        ? null
        : typeof targetUser.companyId === 'object' &&
            targetUser.companyId._id != null
          ? String(targetUser.companyId._id)
          : String(targetUser.companyId);
    const mine = actorCompanyIdString(actor);
    if (!mine || !tid || mine !== tid) {
      throw new ForbiddenException('You may only access users in your company');
    }
    return;
  }

  throw new ForbiddenException('You may not access this user record');
}
