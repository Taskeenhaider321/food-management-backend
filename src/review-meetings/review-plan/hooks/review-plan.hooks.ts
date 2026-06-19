import { Model } from 'mongoose';
import type { ReviewPlanDocument } from '../schemas/review-plan.schema';

/** Generates sequential MRM numbers like MRM-001 when none is provided. */
export async function reviewPlanPreSave(this: ReviewPlanDocument) {
  if (!this.isNew || this.mrmNumber) return;

  const ModelCtor = this.constructor as Model<ReviewPlanDocument>;
  const latest = await ModelCtor.findOne({}, { mrmNumber: 1 })
    .sort({ created_at: -1 })
    .lean();

  let nextNumber = 1;
  if (latest?.mrmNumber) {
    const match = String(latest.mrmNumber).match(/(\d+)\s*$/);
    if (match) {
      const numericPart = parseInt(match[1], 10);
      if (!Number.isNaN(numericPart)) nextNumber = numericPart + 1;
    }
  }

  this.mrmNumber = 'MRM-' + nextNumber.toString().padStart(3, '0');
}
