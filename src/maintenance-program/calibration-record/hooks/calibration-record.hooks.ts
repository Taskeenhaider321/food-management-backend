import { Model } from 'mongoose';
import { CalibrationRecordDocument } from '../schemas/calibration-record.schema';

export async function calibrationPreSave(this: CalibrationRecordDocument) {
  if (!this.callibrationCode) {
    const calibrationModel =
      this.model('CalibrationRecord') as Model<CalibrationRecordDocument>;

    const latest = await calibrationModel
      .findOne({ callibrationCode: { $ne: null } }, { callibrationCode: 1 })
      .sort({ created_at: -1 })
      .lean();

    let nextNumber = 1;

    if (latest?.callibrationCode) {
      const numericPart = parseInt(latest.callibrationCode.replace('C', ''), 10);

      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    this.callibrationCode = `C${nextNumber.toString().padStart(3, '0')}`;
  }
}
