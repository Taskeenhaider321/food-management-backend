import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DecisionTreeController } from './decision-tree.controller';
import { DecisionTreeService } from './decision-tree.service';
import { DecisionTreeSchema } from './schemas/decision-tree.schema';
import { DecisionSchema } from './schemas/decision.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';
import {
  Department,
  DepartmentSchema,
} from '../../admin-management/department/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DecisionTree', schema: DecisionTreeSchema },
      { name: 'Decision', schema: DecisionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [DecisionTreeController],
  providers: [DecisionTreeService],
  exports: [DecisionTreeService],
})
export class DecisionTreeModule {}
