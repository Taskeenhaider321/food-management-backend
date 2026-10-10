import { HydratedDocument, Model } from 'mongoose';
import { FormRecords } from '../schemas/form-records.schema';

export function FormRecordsHooks(schema: any) {
  schema.pre('save', async function () {
    const doc = this as HydratedDocument<FormRecords>;

    if (!doc.isNew || doc.FormRecordId) return;

    const model = doc.constructor as Model<FormRecords>;
    const latestRecord = await model
      .findOne(
        { FormRecordId: { $exists: true, $nin: [null, ''] } },
        { FormRecordId: 1 },
      )
      .sort({ FormRecordId: -1 })
      .lean();

    let nextNumericPart = 1;

    if (latestRecord?.FormRecordId) {
      const numericPart = parseInt(
        String(latestRecord.FormRecordId).replace(/^FR/i, ''),
        10,
      );
      if (!Number.isNaN(numericPart)) {
        nextNumericPart = numericPart + 1;
      }
    }

    doc.FormRecordId = `FR${nextNumericPart.toString().padStart(3, '0')}`;
  });
}
