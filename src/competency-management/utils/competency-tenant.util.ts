import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  actorCompanyIdString,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';

/** Super-admin and super-staff may access competency data across tenants. */
export function isGlobalCompetencyActor(actor: any): boolean {
  return isSuperAdminActor(actor) || isSuperStaffActor(actor);
}

/** Company users/trainers/employees are OWN-scoped and must not run deleteAll. */
export function isOwnScopeCompetencyActor(actor: any): boolean {
  const selfOnlyRoles = new Set([
    'company-user',
    'company-trainer',
    'company-employee',
  ]);
  return Boolean(actor?._id && selfOnlyRoles.has(actor?.roleType));
}

export function actorCompanyObjectId(actor: any): Types.ObjectId | null {
  const id = actorCompanyIdString(actor);
  if (!id || !Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

/**
 * Ensures a company-scoped actor may access a record belonging to `resourceCompanyId`.
 * Global actors bypass. Missing company context → Forbidden.
 */
export function assertActorMayAccessCompanyResource(
  actor: any,
  resourceCompanyId: string | Types.ObjectId | undefined | null,
): void {
  if (isGlobalCompetencyActor(actor)) return;

  const mine = actorCompanyIdString(actor);
  const target = resourceCompanyId != null ? String(resourceCompanyId) : null;

  if (!mine || !target || mine !== target) {
    throw new ForbiddenException(
      'You may only access resources for your company',
    );
  }
}

/** Resolve department ids belonging to a company (for plan scoping). */
export async function departmentIdsForCompany(
  departmentModel: Model<any>,
  companyId: string,
): Promise<Types.ObjectId[]> {
  const cId = Types.ObjectId.isValid(companyId)
    ? new Types.ObjectId(companyId)
    : companyId;
  const rows = await departmentModel
    .find({ companyId: cId })
    .select('_id')
    .lean();
  return rows.map((r) => r._id as Types.ObjectId);
}

/** Verify the actor may access data for the given department. */
export async function assertActorMayAccessDepartment(
  actor: any,
  departmentModel: Model<any>,
  departmentId: string,
): Promise<void> {
  if (isGlobalCompetencyActor(actor)) return;

  const dept = await departmentModel
    .findById(departmentId)
    .select('companyId')
    .lean();
  if (!dept) {
    throw new NotFoundException('Department not found');
  }
  assertActorMayAccessCompanyResource(actor, dept.companyId);
}

/** Company filter for resources that store `companyId` directly (e.g. Training). */
export function companyScopedFilter(
  actor: any,
): Record<string, Types.ObjectId> | Record<string, never> {
  if (isGlobalCompetencyActor(actor)) return {};
  const cId = actorCompanyObjectId(actor);
  if (!cId) {
    throw new ForbiddenException('Company context is required');
  }
  return { companyId: cId };
}

/** Department filter for resources scoped via `UserDepartment`. */
export async function departmentScopedFilter(
  actor: any,
  departmentModel: Model<any>,
): Promise<Record<string, unknown>> {
  if (isGlobalCompetencyActor(actor)) return {};
  const companyId = actorCompanyIdString(actor);
  if (!companyId) {
    throw new ForbiddenException('Company context is required');
  }
  const deptIds = await departmentIdsForCompany(departmentModel, companyId);
  return { UserDepartment: { $in: deptIds } };
}
