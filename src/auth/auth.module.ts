import { Global, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EffectiveAccessGuard } from './guards/effective-access.guard';
import {
  User,
  UserSchema,
} from '../admin-management/users/schemas/user.schema';
import { JwtStrategy } from './jwt.strategy';
import {
  MasterModule,
  MasterModuleSchema,
} from '../rbac/schemas/master-module.schema';
import {
  MasterPermission,
  MasterPermissionSchema,
} from '../rbac/schemas/master-permission.schema';
import { RbacModule } from '../rbac/rbac.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MasterModule.name, schema: MasterModuleSchema },
      { name: MasterPermission.name, schema: MasterPermissionSchema },
    ]),
    forwardRef(() => RbacModule),
  ],
  providers: [JwtAuthGuard, JwtStrategy, EffectiveAccessGuard],
  exports: [JwtAuthGuard, EffectiveAccessGuard, MongooseModule],
})
export class AuthModule {}
