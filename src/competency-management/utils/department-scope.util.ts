import { Model, Types } from 'mongoose';

/**
 * Departments often store `companyId` as ObjectId; legacy or imports may use a string.
 * Query both shapes so tenant-scoped lists don't come back empty.
 */
export async function distinctDepartmentIdsForCompany(
  departmentModel: Model<any>,
  companyIdStr: string | null | undefined,
): Promise<Types.ObjectId[]> {
  const raw = companyIdStr != null ? String(companyIdStr).trim() : '';
  if (!raw) return [];

  const orClause: Record<string, unknown>[] = [{ companyId: raw }];
  if (Types.ObjectId.isValid(raw)) {
    orClause.push({ companyId: new Types.ObjectId(raw) });
  }

  const ids = await departmentModel
    .find({ $or: orClause })
    .distinct('_id')
    .exec();

  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const id of ids) {
    const s = String(id);
    if (seen.has(s)) continue;
    seen.add(s);
    try {
      out.push(id instanceof Types.ObjectId ? id : new Types.ObjectId(s));
    } catch {
      /* skip malformed ids */
    }
  }
  return out;
}

/**
 * Match plans whose UserDepartment is one of the scoped departments (ObjectId or legacy string ref).
 */
export function matchPlansByUserDepartmentScope(
  departmentScope: Types.ObjectId[],
): Record<string, unknown> {
  if (!departmentScope.length) {
    return { _id: { $exists: false } };
  }
  const hexIds = departmentScope.map((id) => id.toHexString());
  return {
    $or: [
      { UserDepartment: { $in: departmentScope } },
      { UserDepartment: { $in: hexIds } },
    ],
  };
}
