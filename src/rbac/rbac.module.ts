import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../admin-management/users/schemas/user.schema';
import { DerivedModuleService } from './company-rbac.service';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { DerivedModule, DerivedModuleSchema } from './schemas/company-module.schema';
import { MasterModule, MasterModuleSchema } from './schemas/master-module.schema';
import { MasterPermission, MasterPermissionSchema } from './schemas/master-permission.schema';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: MasterModule.name, schema: MasterModuleSchema },
      { name: MasterPermission.name, schema: MasterPermissionSchema },
      { name: DerivedModule.name, schema: DerivedModuleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RbacController],
  providers: [RbacService, DerivedModuleService],
  exports: [RbacService, DerivedModuleService],
})
export class RbacModule {}
