import { UploadDocumentsSchema, UploadDocumentsDocument } from '../schemas/upload-documents.schema';
import { Model } from 'mongoose';
UploadDocumentsSchema.pre<UploadDocumentsDocument>('save', async function () {
  if (!this.DocumentId) {
    const DepartmentModel = this.db.model('Department');
    const department = await DepartmentModel.findById(this.Department).populate('Company');

    if (!department) throw new Error('Department not found');

    const documentTypeNumberMap: Record<string, number> = {
      Manuals: 1,
      Procedures: 2,
      SOPs: 3,
      Forms: 4,
    };

    const documentTypeNumber = documentTypeNumberMap[this.DocumentType];
    if (!documentTypeNumber) throw new Error('Invalid Document Type');

    const latestDocument = await (this.constructor as any)
      .findOne({ Department: this.Department, DocumentType: this.DocumentType })
      .sort({ DocumentId: -1 })
      .exec();

    let nextNumericPart = 1;
    if (latestDocument?.DocumentId) {
      const parts = latestDocument.DocumentId.split('/');
      nextNumericPart = parseInt(parts[3], 10) + 1;
    }

    this.DocumentId = `${(department as any).Company.ShortName}/${(department as any).ShortName}/${documentTypeNumber}/${nextNumericPart.toString().padStart(3, '0')}`;
  }
});
