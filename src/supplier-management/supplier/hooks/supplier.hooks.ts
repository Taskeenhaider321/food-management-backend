import { Model } from 'mongoose';
import { SupplierDocument } from '../schemas/supplier.schema';

export class SupplierHooks {
  static async generateSupplierCode(this: SupplierDocument) {
    if (!this.supplierCode) {
      const supplierModel = this.model('Supplier') as Model<SupplierDocument>;

      const latestSupplier = await supplierModel
        .findOne({}, { supplierCode: 1 })
        .sort({ created_at: -1 })
        .exec();

      let nextNumber = 1;

      if (latestSupplier?.supplierCode) {
        const numericPart = Number(latestSupplier.supplierCode.replace('S', ''));
        if (!isNaN(numericPart)) {
          nextNumber = numericPart + 1;
        }
      }

      this.supplierCode = `S${nextNumber.toString().padStart(3, '0')}`;
    }
  }
}
