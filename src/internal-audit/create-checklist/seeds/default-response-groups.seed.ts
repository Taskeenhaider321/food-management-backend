import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResponseGroup } from '../schemas/response-group.schema';

const DEFAULT_GROUPS = [
  {
    name: 'Safe/At Risk',
    options: [
      { label: 'Safe', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'At Risk', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
  {
    name: 'Yes/No',
    options: [
      { label: 'Yes', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'No', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
  {
    name: 'Pass/Fail',
    options: [
      { label: 'Pass', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'Fail', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
  {
    name: 'Compliant/Non-Compliant',
    options: [
      { label: 'Compliant', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'Non-Compliant', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
  {
    name: 'Good/Fair/Poor',
    options: [
      { label: 'Good', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'Fair', backgroundColor: '#ff9800', textColor: '#ffffff' },
      { label: 'Poor', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
  {
    name: 'Conformity Assessment',
    options: [
      { label: 'Conform', backgroundColor: '#4caf50', textColor: '#ffffff' },
      { label: 'Minor Non-Conformity', backgroundColor: '#ff9800', textColor: '#ffffff' },
      { label: 'Major Non-Conformity', backgroundColor: '#f44336', textColor: '#ffffff' },
      { label: 'Critical Non-Conformity', backgroundColor: '#9c27b0', textColor: '#ffffff' },
      { label: 'Observation', backgroundColor: '#2196f3', textColor: '#ffffff' },
      { label: 'N/A', backgroundColor: '#e0e0e0', textColor: '#616161' },
    ],
  },
];

@Injectable()
export class DefaultResponseGroupsSeed implements OnModuleInit {
  constructor(
    @InjectModel(ResponseGroup.name) private responseGroupModel: Model<ResponseGroup>,
  ) {}

  async onModuleInit() {
    const count = await this.responseGroupModel.countDocuments({ isDefault: true });
    if (count > 0) return;

    for (const group of DEFAULT_GROUPS) {
      await this.responseGroupModel.create({
        ...group,
        isDefault: true,
      });
    }
    console.log('✅ Default response groups seeded');
  }
}
