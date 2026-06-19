import { Model } from 'mongoose';
import { PreventiveMaintenanceDocument } from '../schemas/preventive-maintenance.schema';

export async function preventiveMaintenancePreSave(
  this: PreventiveMaintenanceDocument,
) {
  if (!this.maintenanceCode) {
    const model = this.constructor as Model<PreventiveMaintenanceDocument>;

    const latest = await model
      .findOne({}, { maintenanceCode: 1 })
      .sort({ created_at: -1 })
      .lean();

    let nextNumber = 1;

    if (latest?.maintenanceCode) {
      const numericPart = parseInt(
        latest.maintenanceCode.replace('M', ''),
        10,
      );

      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    this.maintenanceCode = `M${nextNumber.toString().padStart(3, '0')}`;
  }
}
