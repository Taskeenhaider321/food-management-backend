import { Model } from 'mongoose';
import { WorkRequestDocument } from '../schemas/work-request.schema';

export async function workRequestPreSave(this: WorkRequestDocument) {
  if (this.MWRId) return;

  const model = this.constructor as Model<WorkRequestDocument>;

  const latest = await model.findOne({}, { MWRId: 1 }).sort({ created_at: -1 }).lean();

  let nextNumber = 1;
  if (latest?.MWRId) {
    const numericPart = parseInt(latest.MWRId.replace('MWR', ''), 10);
    if (!isNaN(numericPart)) nextNumber = numericPart + 1;
  }

  this.MWRId = `MWR${nextNumber.toString().padStart(3, '0')}`;
}
