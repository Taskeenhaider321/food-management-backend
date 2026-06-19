import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InternalAuditorController } from './internal-auditor.controller';
import { InternalAuditorService } from './internal-auditor.service';
import {
  InternalAuditor,
  InternalAuditorSchema,
} from './schemas/internal-auditor.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { EmailModule } from '../../email/email.module';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: InternalAuditor.name, schema: InternalAuditorSchema },
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    CloudinaryModule,
    EmailModule,
  ],
  controllers: [InternalAuditorController],
  providers: [InternalAuditorService],
  exports: [InternalAuditorService],
})
export class InternalAuditorModule {}
