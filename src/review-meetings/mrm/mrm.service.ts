import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MRM } from './schemas/mrm.schema';
import { MeetingParticipant } from '../meeting-participants/schemas/meeting-participant.schema';
import { CreateMRMDto } from './dtos/create-mrm.dto';
import { EmailService } from '../../email/email.service';

@Injectable()
export class MRMService {
  constructor(
    @InjectModel(MRM.name) private mrmModel: Model<MRM>,
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('Agenda') private agendaModel: Model<any>,
    @InjectModel(MeetingParticipant.name) private participantsModel: Model<MeetingParticipant>,
    private emailService: EmailService,
  ) {}

  async createMRM(createDto: CreateMRMDto) {
    const notification = await this.notificationModel.findById(createDto.Notification);
    if (!notification) throw new NotFoundException('Notification not found');

    const mrm = new this.mrmModel({
      Notification: createDto.Notification,
      UserDepartment: createDto.departmentId,
      AgendaDetails: createDto.AgendaDetails,
      CreationDate: new Date(),
    });

    // Send emails to participants for each agenda
    for (const agendaDetail of createDto.AgendaDetails) {
      const agenda = await this.agendaModel.findById(agendaDetail.Agenda);
      const participants = await this.participantsModel
        .find({ _id: { $in: agendaDetail.Participants } })
        .populate({ path: 'profileId', populate: { path: 'userId', select: 'email' } })
        .exec();
      const participantEmails = participants
        .map((p) => (p.profileId as any)?.userId?.email)
        .filter(Boolean) as string[];

      if (participantEmails.length > 0) {
        const emailBody = `MRM Discussion

Agenda: ${agenda?.Name || 'No agenda name'}
Target Date: ${agendaDetail.TargetDate || 'No target date'}
Discussion: ${agendaDetail.Discussion || 'No discussion'}
Responsibilities: ${agendaDetail.Responsibilities || 'No responsibilities'}`;

        for (const email of participantEmails) {
          try {
            await this.emailService.sendEmail(email, 'MRM Discussion Update', emailBody);
          } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
          }
        }
      }
    }

    await mrm.save();
    return { status: true, message: 'MRM document created successfully', data: mrm };
  }

  async getAllMRMs(departmentId: string) {
    const mrms = await this.mrmModel
      .find({ UserDepartment: departmentId as any })
      .populate('Notification')
      .populate('UserDepartment')
      .populate({ path: 'AgendaDetails.Agenda' })
      .populate({
        path: 'AgendaDetails.Participants',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    return { status: true, data: mrms };
  }

  async getMRMById(mrmId: string) {
    const mrm = await this.mrmModel
      .findById(mrmId)
      .populate('Notification')
      .populate('UserDepartment')
      .populate({ path: 'AgendaDetails.Agenda' })
      .populate({
        path: 'AgendaDetails.Participants',
        populate: { path: 'profileId', populate: { path: 'userId' } },
      });
    if (!mrm) throw new NotFoundException(`MRM document with ID: ${mrmId} not found`);
    return { status: true, data: mrm };
  }

  async deleteMRM(id: string) {
    const deleted = await this.mrmModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException(`MRM document with ID: ${id} not found`);
    return { status: true, message: 'MRM document deleted successfully', data: deleted };
  }

  async deleteAllMRMs(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.mrmModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No MRM documents found to delete!');
    return { status: true, message: 'All MRM documents have been deleted!', data: result };
  }
}
