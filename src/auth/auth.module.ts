import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User, UserSchema } from '../admin-management/users/schemas/user.schema';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [JwtAuthGuard, JwtStrategy],
  exports: [JwtAuthGuard, MongooseModule],
})
export class AuthModule {}
