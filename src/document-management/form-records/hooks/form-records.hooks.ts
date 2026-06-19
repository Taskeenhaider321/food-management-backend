import { HydratedDocument } from 'mongoose';
import { FormRecords } from '../schemas/form-records.schema';

export function FormRecordsHooks(schema: any) {
  schema.pre('save', async function () {
    const doc = this as HydratedDocument<FormRecords>;

    if (!doc.isNew || doc.FormRecordId) return;

    const latestRecord = await (doc.constructor as any)
      .findOne({}, { FormRecordId: 1 })
      .sort({ FormRecordId: -1 })
      .exec();

    let nextNumericPart = 1;

    if (latestRecord?.FormRecordId) {
      const numericPart = parseInt(
        latestRecord.FormRecordId.slice(2),
        10,
      );
      if (!isNaN(numericPart)) {
        nextNumericPart = numericPart + 1;
      }
    }

    doc.FormRecordId = `FR${nextNumericPart
      .toString()
      .padStart(3, '0')}`;
  });
}
