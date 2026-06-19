// TEST/hr/personal-requisition/personal-requisition.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonalRequisitionController } from './personal-requisition.controller';
import { PersonalRequisitionService } from './personal-requisition.service';
import { PersonalRequisition, PersonalRequisitionSchema } from './schemas/personal-requisition.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PersonalRequisition.name, schema: PersonalRequisitionSchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [PersonalRequisitionController],
  providers: [PersonalRequisitionService],
  exports: [PersonalRequisitionService],
})
export class PersonalRequisitionModule {}
