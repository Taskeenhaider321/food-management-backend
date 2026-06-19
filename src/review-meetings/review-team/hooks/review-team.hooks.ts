import { Model } from 'mongoose';
import type { ReviewTeamMemberDocument } from '../schemas/review-team-member.schema';

/** Generates sequential member codes like RT001, RT002, ... */
export async function reviewTeamMemberPreSave(this: ReviewTeamMemberDocument) {
  if (!this.isNew || this.memberCode) return;

  const ModelCtor = this.constructor as Model<ReviewTeamMemberDocument>;
  const latest = await ModelCtor.findOne({}, { memberCode: 1 })
    .sort({ memberCode: -1 })
    .lean();

  let nextNumber = 1;
  if (latest?.memberCode) {
    const numericPart = parseInt(String(latest.memberCode).replace('RT', ''), 10);
    if (!Number.isNaN(numericPart)) nextNumber = numericPart + 1;
  }

  this.memberCode = 'RT' + nextNumber.toString().padStart(3, '0');
}
