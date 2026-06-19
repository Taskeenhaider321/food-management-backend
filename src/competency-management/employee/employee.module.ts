import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Company, CompanySchema } from '../../admin-management/company/schemas/company.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Training, TrainingSchema } from '../training/schemas/training.schema';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Training.name, schema: TrainingSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
