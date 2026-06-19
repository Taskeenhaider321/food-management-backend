import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';

export async function resolveDepartmentIdForTrainingPlanCreate(
  actor: any,
  departmentModel: Model<any>,
  bodyDepartmentId?: string | null,
): Promise<string> {
  const trimmed =
    bodyDepartmentId != null && String(bodyDepartmentId).trim() !== ''
      ? String(bodyDepartmentId).trim()
      : '';

  if (trimmed) {
    const dept = await departmentModel.findById(trimmed).exec();
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return trimmed;
  }

  const fromUser = actor?.departmentId;
  const fromUserId = fromUser && typeof fromUser === 'object' ? fromUser._id?.toString() : fromUser?.toString();
  if (fromUserId) {
    const dept = await departmentModel.findById(fromUserId).exec();
    if (dept) {
      return fromUserId;
    }
  }

  const anyDept = await departmentModel
    .findOne()
    .sort({ departmentName: 1 })
    .select('_id')
    .lean()
    .exec();
  if (anyDept?._id) {
    return String(anyDept._id);
  }
  throw new BadRequestException(
    'No departments exist. Create a department before adding training plans.',
  );
}
