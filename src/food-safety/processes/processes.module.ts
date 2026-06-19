import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { ProcessesSchema } from './schemas/processes.schema';
import { ProcessDetailSchema } from './schemas/process-detail.schema';
import { DepartmentSchema } from '../../admin-management/department/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Processes', schema: ProcessesSchema },
      { name: 'ProcessDetail', schema: ProcessDetailSchema },
      { name: 'Department', schema: DepartmentSchema },
    ]),
  ],
  controllers: [ProcessesController],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class ProcessesModule {}
