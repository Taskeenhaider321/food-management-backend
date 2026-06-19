import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MRMController } from './mrm.controller';
import { MRMService } from './mrm.service';
import { MRM, MRMSchema } from './schemas/mrm.schema';
import { EmailModule } from '../../email/email.module';
import { Notification, NotificationSchema } from '../notification/schemas/notification.schema';
import { Agenda, AgendaSchema } from '../notification/schemas/agenda.schema';
import {
  MeetingParticipant,
  MeetingParticipantSchema,
} from '../meeting-participants/schemas/meeting-participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MRM.name, schema: MRMSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Agenda.name, schema: AgendaSchema },
      { name: MeetingParticipant.name, schema: MeetingParticipantSchema },
    ]),
    EmailModule,
  ],
  controllers: [MRMController],
  providers: [MRMService],
})
export class MRMModule {}
