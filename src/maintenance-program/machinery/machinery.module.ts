// TEST/tech/machinery/machinery.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MachineryController } from './machinery.controller';
import { MachineryService } from './machinery.service';
import { Machinery, MachinerySchema } from './schemas/machinery.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Machinery.name, schema: MachinerySchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [MachineryController],
  providers: [MachineryService],
  exports: [MachineryService],
})
export class MachineryModule {}
