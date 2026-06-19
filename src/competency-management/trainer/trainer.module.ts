import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Company, CompanySchema } from '../../admin-management/company/schemas/company.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { EmailModule } from '../../email/email.module';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';
import { Trainer, TrainerSchema } from './schemas/trainer.schema';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';
import { Training, TrainingSchema } from '../training/schemas/training.schema';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: Trainer.name, schema: TrainerSchema },
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Training.name, schema: TrainingSchema },
    ]),
    CloudinaryModule,
    EmailModule,
  ],
  controllers: [TrainerController],
  providers: [TrainerService],
  exports: [TrainerService],
})
export class TrainerModule {}
