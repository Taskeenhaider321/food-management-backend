import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { ProcessesSchema } from './schemas/processes.schema';
import { ProcessDetailSchema } from './schemas/process-detail.schema';
import { DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Processes', schema: ProcessesSchema },
      { name: 'ProcessDetail', schema: ProcessDetailSchema },
      { name: 'Department', schema: DepartmentSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ProcessesController],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class ProcessesModule {}
