import { Model } from 'mongoose';
import { MachineryDocument } from '../schemas/machinery.schema';

export class MachineryHooks {
  static async generateMachineCode(this: MachineryDocument) {
    if (!this.machineCode) {
      const machineryModel =
        this.model('Machinery') as Model<MachineryDocument>;

      const latestMachine = await machineryModel
        .findOne({ machineCode: { $ne: null } }, { machineCode: 1 })
        .sort({ created_at: -1 })
        .exec();

      let nextNumber = 1;

      if (latestMachine?.machineCode) {
        const numericPart = parseInt(
          latestMachine.machineCode.slice(1),
          10,
        );
        if (!isNaN(numericPart)) {
          nextNumber = numericPart + 1;
        }
      }

      this.machineCode = `M${nextNumber
        .toString()
        .padStart(3, '0')}`;
    }

    if (!this.CreationDate) {
      this.CreationDate = new Date();
    }
  }
}
