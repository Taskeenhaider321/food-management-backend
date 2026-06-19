import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { Department, DepartmentSchema } from '../department/schemas/department.schema';
import { EmailService } from '../../email/email.service';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    ProfileModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, EmailService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
