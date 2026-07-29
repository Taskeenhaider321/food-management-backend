import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangeRequestController } from './change-request.controller';
import { ChangeRequestService } from './change-request.service';
import {
  ChangeRequest,
  ChangeRequestSchema,
} from './schemas/change-request.schema';
import { Document, DocumentSchema } from '../document/schemas/document.schema';
import {
  ListOfForms,
  ListOfFormsSchema,
} from '../list-of-forms/schemas/list-of-forms.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';
import {
  Department,
  DepartmentSchema,
} from '../../admin-management/department/schemas/department.schema';
import { HaccpTeam, HaccpTeamSchema } from '../../food-safety/haccp-team/schemas/haccp-team.schema';
import { ProcessesSchema } from '../../food-safety/processes/schemas/processes.schema';
import { ProductSchema } from '../../food-safety/product/schemas/product.schema';
import { ConductHaccpSchema } from '../../food-safety/conduct-haccp/schemas/conduct-haccp.schema';
import { DecisionTreeSchema } from '../../food-safety/decision-tree/schemas/decision-tree.schema';
import { FoodSafetySchema } from '../../food-safety/food-safety-plan/schemas/food-safety-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChangeRequest.name, schema: ChangeRequestSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: ListOfForms.name, schema: ListOfFormsSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: HaccpTeam.name, schema: HaccpTeamSchema },
      { name: 'Processes', schema: ProcessesSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'ConductHaccp', schema: ConductHaccpSchema },
      { name: 'DecisionTree', schema: DecisionTreeSchema },
      { name: 'FoodSafety', schema: FoodSafetySchema },
    ]),
  ],
  controllers: [ChangeRequestController],
  providers: [ChangeRequestService],
})
export class ChangeRequestModule {}
