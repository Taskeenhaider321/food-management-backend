import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  actorCompanyIdString,
  isCompanyUserActor,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';

export function isGlobalFoodSafetyActor(actor: any): boolean {
  return isSuperAdminActor(actor) || isSuperStaffActor(actor);
}

/** company-user / trainer / employee — OWN data scope within company. */
export function isOwnScopeFoodSafetyActor(actor: any): boolean {
  return isCompanyUserActor(actor);
}

/**
 * For OWN-scope actors, narrow a list/delete filter to records they created.
 * Company-admin and global actors are unchanged (COMPANY / GLOBAL scope).
 */
export function withOwnScopeFilter(
  actor: any,
  filter: Record<string, unknown>,
): Record<string, unknown> {
  if (!isOwnScopeFoodSafetyActor(actor) || !actor?._id) return filter;
  return {
    ...filter,
    createdByUserId: new Types.ObjectId(String(actor._id)),
  };
}

/**
 * Resolve companyId from a Food Safety record that stores Department /
 * UserDepartment refs (ObjectId or populated docs).
 */
export function departmentRefId(
  record: Record<string, any> | null | undefined,
): string | null {
  if (!record) return null;
  const ref = record.UserDepartment ?? record.Department ?? record.departmentId;
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (ref instanceof Types.ObjectId) return ref.toString();
  if (typeof ref === 'object' && ref._id) return String(ref._id);
  return null;
}

export async function assertActorMayAccessDepartmentId(
  actor: any,
  departmentModel: Model<any>,
  departmentId: string | null | undefined,
): Promise<void> {
  if (!actor || isGlobalFoodSafetyActor(actor)) return;
  if (!departmentId) {
    throw new ForbiddenException(
      'You may only access resources for your company',
    );
  }
  const dept = await departmentModel
    .findById(departmentId)
    .select('companyId')
    .lean();
  if (!dept) {
    throw new NotFoundException('Department not found');
  }
  const mine = actorCompanyIdString(actor);
  const target = dept.companyId != null ? String(dept.companyId) : null;
  if (!mine || !target || mine !== target) {
    throw new ForbiddenException(
      'You may only access resources for your company',
    );
  }
}

/** Assert a loaded Food Safety document belongs to the actor's company (and OWN row if applicable). */
export async function assertActorMayAccessFoodSafetyRecord(
  actor: any,
  departmentModel: Model<any>,
  record: Record<string, any> | null | undefined,
): Promise<void> {
  if (!actor || isGlobalFoodSafetyActor(actor)) return;
  if (!record) {
    throw new NotFoundException('Record not found');
  }
  // Prefer populated department.companyId when available
  const populated =
    record.UserDepartment?.companyId ?? record.Department?.companyId;
  if (populated != null) {
    const mine = actorCompanyIdString(actor);
    const target = String(populated?._id ?? populated);
    if (!mine || mine !== target) {
      throw new ForbiddenException(
        'You may only access resources for your company',
      );
    }
  } else {
    await assertActorMayAccessDepartmentId(
      actor,
      departmentModel,
      departmentRefId(record),
    );
  }

  if (isOwnScopeFoodSafetyActor(actor)) {
    const ownerId =
      record.createdByUserId != null ? String(record.createdByUserId) : null;
    const actorId = actor._id != null ? String(actor._id) : null;
    if (!actorId || !ownerId || ownerId !== actorId) {
      throw new ForbiddenException('You may only access records you created');
    }
  }
}

/** Company-scoped deleteMany filter; OWN actors also filter by createdByUserId. */
export function foodSafetyCompanyDeleteFilter(
  actor: any,
  departmentIds: Types.ObjectId[],
): Record<string, unknown> {
  if (isGlobalFoodSafetyActor(actor)) return {};
  if (!departmentIds.length) {
    throw new ForbiddenException('Company context is required');
  }
  return withOwnScopeFilter(actor, {
    UserDepartment: { $in: departmentIds },
  });
}
