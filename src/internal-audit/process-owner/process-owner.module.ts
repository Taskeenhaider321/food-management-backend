import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcessOwnerController } from './process-owner.controller';
import { ProcessOwnerService } from './process-owner.service';
import { ProcessOwner, ProcessOwnerSchema } from './schemas/process-owner.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';
import { EmailModule } from '../../email/email.module';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: ProcessOwner.name, schema: ProcessOwnerSchema },
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    EmailModule,
  ],
  controllers: [ProcessOwnerController],
  providers: [ProcessOwnerService],
  exports: [ProcessOwnerService],
})
export class ProcessOwnerModule {}
