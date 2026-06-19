import { Model } from 'mongoose';
import { ProcessOwner, ProcessOwnerDocument } from '../schemas/process-owner.schema';

export class ProcessOwnerHooks {
  static async generateProcessCode(this: ProcessOwnerDocument) {
    if (!this.isNew || this.processCode) return;

    const ProcessOwnerModel = this.constructor as Model<ProcessOwnerDocument>;

    const latestProcess = await ProcessOwnerModel.findOne({}, { processCode: 1 })
      .sort({ processCode: -1 })
      .exec();

    let nextNumericPart = 1;

    if (latestProcess?.processCode) {
      const numericPart = parseInt(latestProcess.processCode.slice(1), 10);
      if (!isNaN(numericPart)) nextNumericPart = numericPart + 1;
    }

    this.processCode = 'P' + nextNumericPart.toString().padStart(3, '0');
  }
}
