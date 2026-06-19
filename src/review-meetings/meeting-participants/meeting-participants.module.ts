import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingParticipantsController } from './meeting-participants.controller';
import { MeetingParticipantsService } from './meeting-participants.service';
import {
  MeetingParticipant,
  MeetingParticipantSchema,
} from './schemas/meeting-participant.schema';
import { ProfileModule } from '../../admin-management/profile/profile.module';
import { UserModule } from '../../admin-management/users/user.module';
import {
  User,
  UserSchema,
} from '../../admin-management/users/schemas/user.schema';
import {
  Profile,
  ProfileSchema,
} from '../../admin-management/profile/schemas/profile.schema';

@Module({
  imports: [
    UserModule,
    ProfileModule,
    MongooseModule.forFeature([
      { name: MeetingParticipant.name, schema: MeetingParticipantSchema },
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
  ],
  controllers: [MeetingParticipantsController],
  providers: [MeetingParticipantsService],
  exports: [MeetingParticipantsService],
})
export class MeetingParticipantsModule {}
