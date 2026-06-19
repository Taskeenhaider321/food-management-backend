import { Model, Types } from 'mongoose';
import {
  matchPlansByUserDepartmentScope,
} from './department-scope.util';

export function yearlyPlanYearFilter(
  year: string | number,
): Record<string, unknown> {
  const yNum = parseInt(String(year), 10);
  const clauses: Record<string, unknown>[] = [];
  if (!Number.isNaN(yNum)) {
    clauses.push({ Year: yNum });
  }
  clauses.push({ Year: String(year) });
  return { $or: clauses };
}

export async function departmentScopeForActor(
  _actor: any,
  _departmentModel: Model<any>,
): Promise<Types.ObjectId[] | null> {
  return null;
}

export async function findYearlyPlanByYear(
  yearlyPlanModel: Model<any>,
  year: string | number,
  departmentScope: Types.ObjectId[] | null,
) {
  const andClauses: Record<string, unknown>[] = [yearlyPlanYearFilter(year)];

  if (departmentScope?.length) {
    andClauses.push(matchPlansByUserDepartmentScope(departmentScope));
  }

  const query =
    andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

  return yearlyPlanModel.findOne(query).sort({ updated_at: -1 }).exec();
}

export function monthlyPlanMatchFilter(
  year: string | number,
  month: string,
  trainingId: string,
  departmentScope: Types.ObjectId[] | null,
): Record<string, unknown> {
  const andClauses: Record<string, unknown>[] = [
    yearlyPlanYearFilter(year),
    { Month: month },
    { Training: new Types.ObjectId(trainingId) },
  ];

  if (departmentScope?.length) {
    andClauses.push(matchPlansByUserDepartmentScope(departmentScope));
  }

  return { $and: andClauses };
}
