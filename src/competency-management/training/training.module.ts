// TEST/hr/training/training.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { Training, TrainingSchema } from './schemas/training.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import { Company, CompanySchema } from '../../admin-management/company/schemas/company.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Training.name, schema: TrainingSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
