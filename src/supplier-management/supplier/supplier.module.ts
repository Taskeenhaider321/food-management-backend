import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { Supplier, SupplierSchema } from './schemas/supplier.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
  ],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
