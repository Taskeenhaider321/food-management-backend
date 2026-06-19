import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Agenda, AgendaSchema } from './schemas/agenda.schema';
import {
  MeetingParticipant,
  MeetingParticipantSchema,
} from '../meeting-participants/schemas/meeting-participant.schema';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Agenda.name, schema: AgendaSchema },
      { name: MeetingParticipant.name, schema: MeetingParticipantSchema },
    ]),
    EmailModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
