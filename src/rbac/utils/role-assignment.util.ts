import { ForbiddenException } from '@nestjs/common';
import {
  actorCompanyIdString,
  isCompanyAdminActor,
  isCompanyUserActor,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';

/**
 * Shared role-assignment / role-scope security rules.
 * Hierarchy: Super Admin → Company ceiling → Company Admin → Company User.
 *
 * Global roles (no companyId) may only be assigned to global/system users.
 * Company roles may only be assigned to users of that same company.
 */

export function isGlobalSystemRole(role: {
  companyId?: unknown;
  systemRole?: string | null;
}): boolean {
  return !role.companyId;
}

export function isSuperAdminSystemRole(role: {
  systemRole?: string | null;
}): boolean {
  return role.systemRole === 'SUPER_ADMIN';
}

export function targetUserCompanyId(user: any): string | null {
  return (
    user?.companyId?._id?.toString?.() || user?.companyId?.toString?.() || null
  );
}

export function roleCompanyId(role: any): string | null {
  return (
    role?.companyId?._id?.toString?.() || role?.companyId?.toString?.() || null
  );
}

/**
 * Enforce actor + target + role pairing for assignment.
 * Does NOT check permission ceilings (caller does that when needed).
 */
export function assertActorMayAssignRole(
  actor: any,
  targetUser: any,
  role: { companyId?: unknown; systemRole?: string | null },
): void {
  if (!actor) {
    throw new ForbiddenException('Not authenticated');
  }

  if (isSuperAdminActor(actor)) {
    // Super Admin may assign any role, but still keep scope pairing coherent:
    // company roles only to matching company users; global roles to global users.
    assertRoleUserScopePairing(targetUser, role);
    return;
  }

  const roleCid = roleCompanyId(role);
  const userCid = targetUserCompanyId(targetUser);

  if (isSuperStaffActor(actor)) {
    if (roleCid) {
      throw new ForbiddenException(
        'System users may not assign company-scoped roles',
      );
    }
    if (isSuperAdminSystemRole(role)) {
      throw new ForbiddenException(
        'System users may not assign the Super Admin role',
      );
    }
    if (userCid) {
      throw new ForbiddenException(
        'System users may not assign roles to company-scoped users',
      );
    }
    return;
  }

  // Company admin / company user (tenant actors)
  const actorCid = actorCompanyIdString(actor);
  if (!actorCid) {
    throw new ForbiddenException('Company context is required');
  }

  if (!userCid || userCid !== actorCid) {
    throw new ForbiddenException(
      'You may only assign roles to users in your company',
    );
  }

  if (!roleCid) {
    throw new ForbiddenException(
      'Company actors may not assign global or system roles',
    );
  }

  if (roleCid !== actorCid) {
    throw new ForbiddenException(
      'You may only assign roles that belong to your company',
    );
  }

  if (isSuperAdminSystemRole(role)) {
    throw new ForbiddenException(
      'Company actors may not assign the Super Admin role',
    );
  }

  // Company users may manage roles only when the guard already granted the
  // assign endpoint; scope pairing above still applies.
  if (
    !isCompanyAdminActor(actor) &&
    !isCompanyUserActor(actor) &&
    actor?.roleType !== 'company-admin'
  ) {
    // Trainers/employees should not assign roles.
    if (
      actor?.roleType === 'company-trainer' ||
      actor?.roleType === 'company-employee'
    ) {
      throw new ForbiddenException('Insufficient privileges to assign roles');
    }
  }
}

/** Global ↔ global users; company role ↔ same-company users. */
export function assertRoleUserScopePairing(
  targetUser: any,
  role: { companyId?: unknown; systemRole?: string | null },
): void {
  const roleCid = roleCompanyId(role);
  const userCid = targetUserCompanyId(targetUser);

  if (roleCid) {
    if (!userCid || userCid !== roleCid) {
      throw new ForbiddenException(
        "Company-scoped role does not match the user's company",
      );
    }
    return;
  }

  // Global role
  if (userCid) {
    throw new ForbiddenException(
      'Global roles may not be assigned to company-scoped users',
    );
  }
}

/**
 * Company-scoped actors creating roles: force own company, never global.
 */
export function assertActorMayCreateRolePayload(
  actor: any,
  dto: { companyId?: string },
): void {
  if (isSuperAdminActor(actor)) return;

  if (isSuperStaffActor(actor)) {
    if (dto.companyId) {
      throw new ForbiddenException('System users may only create global roles');
    }
    return;
  }

  const actorCid = actorCompanyIdString(actor);
  if (!actorCid) {
    throw new ForbiddenException('Company context is required to create roles');
  }

  if (dto.companyId && dto.companyId !== actorCid) {
    throw new ForbiddenException(
      'You may only create roles for your own company',
    );
  }

  // Force company scope — company actors cannot create global roles
  dto.companyId = actorCid;
}

/**
 * Actor may edit this role document (scope only — ceiling checked separately).
 */
export function assertActorMayUpdateRole(
  actor: any,
  role: { companyId?: unknown; systemRole?: string | null },
  dto?: { companyId?: string },
): void {
  if (!actor) {
    throw new ForbiddenException('Not authenticated');
  }

  if (isSuperAdminSystemRole(role) && !isSuperAdminActor(actor)) {
    throw new ForbiddenException(
      'Only Super Admin may edit the Super Admin role',
    );
  }

  if (isSuperAdminActor(actor)) {
    return;
  }

  const roleCid = roleCompanyId(role);

  if (isSuperStaffActor(actor)) {
    if (roleCid) {
      throw new ForbiddenException(
        'System users may not edit company-scoped roles',
      );
    }
    if (dto?.companyId) {
      throw new ForbiddenException(
        'System users may not convert roles to company scope',
      );
    }
    return;
  }

  const actorCid = actorCompanyIdString(actor);
  if (!actorCid) {
    throw new ForbiddenException('Company context is required');
  }

  if (!roleCid) {
    throw new ForbiddenException(
      'Company actors may not edit global or system roles',
    );
  }

  if (roleCid !== actorCid) {
    throw new ForbiddenException(
      'You may only edit roles that belong to your company',
    );
  }

  if (dto?.companyId && dto.companyId !== actorCid) {
    throw new ForbiddenException('You may not move a role to another company');
  }

  if (dto) {
    dto.companyId = actorCid;
  }
}
