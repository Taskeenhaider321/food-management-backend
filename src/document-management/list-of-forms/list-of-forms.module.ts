import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ListOfFormsController } from './list-of-forms.controller';
import { ListOfFormsService } from './list-of-forms.service';
import {
  ListOfForms,
  ListOfFormsSchema,
  Question,
  QuestionSchema,
} from './schemas/list-of-forms.schema';
import {
  Department,
  DepartmentSchema,
} from '../../admin-management/department/schemas/department.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ListOfForms.name, schema: ListOfFormsSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ListOfFormsController],
  providers: [ListOfFormsService],
  exports: [MongooseModule],
})
export class ListOfFormsModule {}
