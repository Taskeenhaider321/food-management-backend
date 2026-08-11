import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  User,
  UserSchema,
} from '../admin-management/users/schemas/user.schema';
import {
  Company,
  CompanySchema,
} from '../admin-management/company/schemas/company.schema';
import { DerivedModuleService } from './company-rbac.service';
import { CompanyModuleAssignmentService } from './company-module-assignment.service';
import { AuthorizationService } from './authorization.service';
import { AccessVersionService } from './access-version.service';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import {
  DerivedModule,
  DerivedModuleSchema,
} from './schemas/company-module.schema';
import {
  CompanyModuleAssignment,
  CompanyModuleAssignmentSchema,
} from './schemas/company-module-assignment.schema';
import {
  MasterModule,
  MasterModuleSchema,
} from './schemas/master-module.schema';
import {
  MasterPermission,
  MasterPermissionSchema,
} from './schemas/master-permission.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import {
  RbacAccessVersion,
  RbacAccessVersionSchema,
} from './schemas/rbac-access-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: MasterModule.name, schema: MasterModuleSchema },
      { name: MasterPermission.name, schema: MasterPermissionSchema },
      { name: DerivedModule.name, schema: DerivedModuleSchema },
      {
        name: CompanyModuleAssignment.name,
        schema: CompanyModuleAssignmentSchema,
      },
      { name: RbacAccessVersion.name, schema: RbacAccessVersionSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [RbacController],
  providers: [
    RbacService,
    DerivedModuleService,
    CompanyModuleAssignmentService,
    AuthorizationService,
    AccessVersionService,
  ],
  exports: [
    RbacService,
    DerivedModuleService,
    CompanyModuleAssignmentService,
    AuthorizationService,
    AccessVersionService,
    MongooseModule,
  ],
})
export class RbacModule {}
