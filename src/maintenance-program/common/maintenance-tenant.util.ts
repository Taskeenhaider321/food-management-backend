import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  actorCompanyIdString,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';

/**
 * Company-level data isolation for Maintenance Program assets
 * (Machinery, Equipment).
 *
 * - Super-admin / super-staff: global scope (all companies).
 * - Every other actor: only records whose `companyId` matches their own.
 *   Actors without a company see nothing and cannot create records.
 */
export function isGlobalMaintenanceActor(actor: any): boolean {
  return isSuperAdminActor(actor) || isSuperStaffActor(actor);
}

/** Id string of a populated or raw ObjectId ref. */
export function refIdString(ref: any): string | null {
  if (ref == null) return null;
  if (typeof ref === 'object' && ref._id != null) return String(ref._id);
  return String(ref);
}

/** Mongo filter restricting a query to the actor's company. */
export function maintenanceCompanyFilter(actor: any): Record<string, unknown> {
  if (isGlobalMaintenanceActor(actor)) return {};
  const companyId = actorCompanyIdString(actor);
  if (!companyId || !Types.ObjectId.isValid(companyId)) {
    // Match nothing: a tenant actor with no company has no assets.
    return { _id: { $exists: false } };
  }
  return { companyId: new Types.ObjectId(companyId) };
}

/** Company id to stamp on a newly created asset. */
export function requireActorCompanyId(
  actor: any,
  explicitCompanyId?: string | null,
): Types.ObjectId {
  // Global actors may create on behalf of a company if they pass one.
  const companyId =
    isGlobalMaintenanceActor(actor) && explicitCompanyId
      ? explicitCompanyId
      : actorCompanyIdString(actor);
  if (!companyId || !Types.ObjectId.isValid(companyId)) {
    throw new ForbiddenException(
      'A company context is required to create this record',
    );
  }
  return new Types.ObjectId(companyId);
}

/** Throws 404 when the record is missing or belongs to another company. */
export function assertActorMayAccessMaintenanceRecord<T>(
  actor: any,
  record: T | null | undefined,
  label: string,
): asserts record is T {
  if (!record) throw new NotFoundException(`${label} not found`);
  if (isGlobalMaintenanceActor(actor)) return;
  const mine = actorCompanyIdString(actor);
  const target = refIdString((record as any).companyId);
  // 404 rather than 403 so other companies' ids are not discoverable.
  if (!mine || !target || mine !== target) {
    throw new NotFoundException(`${label} not found`);
  }
}

/** Ensure a department belongs to the given company. */
export async function assertDepartmentInCompany(
  departmentModel: Model<any>,
  departmentId: string,
  companyId: Types.ObjectId,
): Promise<void> {
  const dept = await departmentModel
    .findById(departmentId)
    .select('companyId')
    .lean<{ companyId?: any }>();
  if (!dept) throw new NotFoundException('Department not found');
  if (refIdString(dept.companyId) !== String(companyId)) {
    throw new ForbiddenException(
      'You may only use departments from your company',
    );
  }
}

/**
 * Used by dependent modules (preventive maintenance, work requests,
 * calibration records) that reference a machine/equipment on behalf of a
 * user: the asset must belong to that user's company.
 */
export function assertAssetBelongsToUserCompany(
  asset: any,
  user: any,
  label: string,
): void {
  if (!asset || !user) return;
  if (isGlobalMaintenanceActor(user)) return;
  const assetCompany = refIdString(asset.companyId);
  const userCompany = refIdString(user.companyId);
  if (!assetCompany || !userCompany || assetCompany !== userCompany) {
    throw new NotFoundException(`${label} not found`);
  }
}
