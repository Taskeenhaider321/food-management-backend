import { ChecklistDocument } from '../schemas/checklist.schema';

export class ChecklistHooks {
  static async generateChecklistId(this: ChecklistDocument) {
    if (!this.isNew || this.ChecklistId) return;

    const DepartmentModel = this.model('Department');
    const department: any = await DepartmentModel.findById(this.Department)
      .populate('companyId')
      .lean();

    if (!department) throw new Error('Department not found');

    const company: any = department.companyId;
    if (!company?.shortName) throw new Error('Company short name not configured');
    if (!department.shortName) throw new Error('Department short name not configured');

    const documentTypeNumber: Record<string, number> = {
      Manuals: 1,
      Procedures: 2,
      SOPs: 3,
      Forms: 4,
    };

    const typeNumber = documentTypeNumber[this.DocumentType];
    if (!typeNumber) throw new Error('Invalid Document Type');

    const prefix = `${company.shortName}/${department.shortName}/${typeNumber}/`;

    // Scan existing IDs with this prefix for the highest increment.
    const existing = await (this.constructor as any)
      .find(
        { ChecklistId: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } },
        { ChecklistId: 1 },
      )
      .lean();

    let maxNumber = 0;
    for (const item of existing) {
      const parts = String(item.ChecklistId).split('/');
      const numericPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numericPart) && numericPart > maxNumber) maxNumber = numericPart;
    }

    this.ChecklistId = `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`;
  }
}
