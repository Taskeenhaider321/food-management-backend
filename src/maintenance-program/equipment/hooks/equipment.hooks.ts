import { EquipmentDocument } from '../schemas/equipment.schema';

export class EquipmentHooks {
  static async generateEquipmentCode(this: EquipmentDocument) {
    // Generate equipmentCode like MD001, MD002...
    if (!this.equipmentCode) {
      const latestEquipment = (await this.model('Equipment')
        .findOne({ equipmentCode: { $ne: null } }, { equipmentCode: 1 })
        .sort({ created_at: -1 })
        .exec()) as { equipmentCode?: string } | null;

      let nextNumber = 1;

      if (latestEquipment?.equipmentCode) {
        const numericPart = parseInt(
          latestEquipment.equipmentCode.replace('MD', ''),
          10,
        );
        if (!isNaN(numericPart)) {
          nextNumber = numericPart + 1;
        }
      }

      this.equipmentCode = `MD${nextNumber.toString().padStart(3, '0')}`;
    }

    // Set CreationDate automatically
    if (!this.CreationDate) {
      this.CreationDate = new Date();
    }
  }
}
