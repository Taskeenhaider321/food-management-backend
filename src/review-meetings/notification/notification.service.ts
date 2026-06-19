import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { Agenda } from './schemas/agenda.schema';
import { MeetingParticipant } from '../meeting-participants/schemas/meeting-participant.schema';
import { CreateNotificationDto } from './dtos/create-notification.dto';  
import { EmailService } from '../../email/email.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(Agenda.name) private agendaModel: Model<Agenda>,
    @InjectModel(MeetingParticipant.name) private participantsModel: Model<MeetingParticipant>,
    private emailService: EmailService,
  ) {}

  async createNotification(createDto: CreateNotificationDto) {
    const participants = await this.participantsModel
      .find({ _id: { $in: createDto.Participants } })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', select: 'email name' },
      })
      .exec();
    const participantEmails = participants
      .map((p) => (p.profileId as any)?.userId?.email)
      .filter(Boolean) as string[];

    const participantIdSet = new Set(
      createDto.Participants.map((id) => String(id)),
    );
    const blocks = createDto.memberAgendaBlocks;
    const useBlocks = blocks && blocks.length > 0;
    if (useBlocks) {
      for (const b of blocks) {
        if (!participantIdSet.has(String(b.participantId))) {
          throw new BadRequestException(
            `Agenda block references a participant that is not in Participants: ${b.participantId}`,
          );
        }
      }
    } else if (!createDto.Agendas?.length) {
      throw new BadRequestException(
        'Provide either memberAgendaBlocks (per member) or Agendas (legacy).',
      );
    }

    const agendaIdList: Types.ObjectId[] = [];
    let emailAgendaSection = '';

    if (useBlocks) {
      for (const block of blocks) {
        const rows = (block.agendas || []).map((a) => ({
          Name: a.Name,
          Description: a.Description,
          meetingParticipantId: new Types.ObjectId(block.participantId),
        }));
        if (!rows.length) {
          throw new BadRequestException(
            `Each member must have at least one agenda (participant: ${block.participantId})`,
          );
        }
        const created = await this.agendaModel.insertMany(rows);
        for (const c of created) {
          agendaIdList.push(c._id);
        }
        const pDoc = participants.find(
          (x) => String(x._id) === String(block.participantId),
        );
        const label = this.participantLabel(pDoc ?? null);
        emailAgendaSection += `\n** ${label} **\n${rows
          .map(
            (a) =>
              `- ${a.Name}${a.Description ? ` — ${a.Description}` : ''}`,
          )
          .join('\n')}\n`;
      }
    } else {
      const createdAgendas = await this.agendaModel.create(createDto.Agendas!);
      for (const a of createdAgendas) {
        agendaIdList.push(a._id);
      }
      emailAgendaSection = (createDto.Agendas || [])
        .map(
          (agenda) =>
            `- ${agenda.Name}: ${agenda.Description || ''}`,
        )
        .join('\n');
    }

    const notification = new this.notificationModel({
      Venue: createDto.Venue,
      MRMNo: createDto.MRMNo,
      Date: createDto.Date,
      Time: createDto.Time,
      Participants: createDto.Participants,
      Agendas: agendaIdList,
      UserDepartment: new Types.ObjectId(createDto.departmentId),
      CreationDate: new Date(),
    });

    await notification.save();

    // Send email notification
    const emailBody = `Meeting Notification

Venue: ${createDto.Venue}
MRM No: ${createDto.MRMNo}
Date: ${createDto.Date}
Time: ${createDto.Time}

Agendas:
${emailAgendaSection || '(none)'}`;

    for (const email of participantEmails) {
      try {
        await this.emailService.sendEmail(email, 'New Meeting Notification', emailBody);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    return { status: true, message: 'Notification created and emails sent successfully', data: notification };
  }

  private participantLabel(p: (MeetingParticipant & { profileId?: any }) | null): string {
    if (!p) return 'Member';
    const u = p.profileId?.userId;
    if (u && typeof u === 'object') {
      return (u as any).name || (u as any).Name || 'Member';
    }
    return (p as any).Name || 'Member';
  }

  async getAllNotifications(departmentId: string) {
    const notifications = await this.notificationModel
      .find({ UserDepartment: departmentId as any })
      .populate('Agendas')
      .populate('Participants')
      .populate('UserDepartment')
      .sort({ createdAt: -1 });
    return { status: true, data: notifications };
  }

  async getNotification(id: string) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException(`Notification document with ID: ${id} not found`);
    return { status: true, data: notification };
  }

  async deleteNotification(id: string) {
    const deleted = await this.notificationModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException(`Notification document with ID: ${id} not found`);
    return { status: true, message: 'Notification document deleted successfully', data: deleted };
  }

  async deleteAllNotifications(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.notificationModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No Notification documents found to delete!');
    return { status: true, message: 'All Notification documents have been deleted!', data: result };
  }
}
