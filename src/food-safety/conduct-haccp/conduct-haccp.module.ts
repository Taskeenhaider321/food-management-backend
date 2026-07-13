import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConductHaccpController } from './conduct-haccp.controller';
import { ConductHaccpService } from './conduct-haccp.service';
import { ConductHaccpSchema } from './schemas/conduct-haccp.schema';
import { HazardSchema } from './schemas/hazard.schema';
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
      { name: 'ConductHaccp', schema: ConductHaccpSchema },
      { name: 'Hazard', schema: HazardSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [ConductHaccpController],
  providers: [ConductHaccpService],
  exports: [ConductHaccpService],
})
export class ConductHaccpModule {}
