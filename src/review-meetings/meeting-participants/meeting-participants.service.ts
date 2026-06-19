import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'crypto';
import { Document, Model, Types } from 'mongoose';
import { UserRoleType } from '../../admin-management/users/schemas/user.schema';
import { MeetingParticipant } from './schemas/meeting-participant.schema';
import { CreateMeetingParticipantsDto } from './dtos/create-meeting-participants.dto';
import { UpdateMeetingParticipantsDto } from './dtos/update-meeting-participants.dto';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import {
  User,
  UserDocument,
} from '../../admin-management/users/schemas/user.schema';

import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';

@Injectable()
export class MeetingParticipantsService {
  constructor(
    @InjectModel(MeetingParticipant.name)
    private meetingParticipantsModel: Model<MeetingParticipant & Document>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  async createMeetingParticipants(
    createDto: CreateMeetingParticipantsDto,
    actor: any,
  ) {
    const { user, profile, participant, departmentId } = createDto;

    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    if (!companyId) {
      throw new BadRequestException(
        'Company context is required (from your session)',
      );
    }

    const createdBy = actor?._id?.toString() ?? undefined;

    const emailTaken = await this.userModel.findOne({
      email: user.email.toLowerCase(),
    });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const generatedUserName = await this.generateUniqueUserName(user.name);
    const generatedPassword = this.generateRandomPassword();

    const row = await this.profileService.withTransaction(async (session) => {
      const u = await this.userService.createUserRecord(
        {
          name: user.name,
          email: user.email,
          userName: generatedUserName,
          passwordPlain: generatedPassword,
          roleType: UserRoleType.COMPANY_USER,
          companyId,
          departmentId: user.departmentId,
        },
        session,
      );

      const p = await this.profileService.createForUser(
        u._id,
        profile,
        session,
      );

      const doc = new this.meetingParticipantsModel({
        profileId: p._id,
        departmentId: departmentId
          ? new Types.ObjectId(departmentId)
          : undefined,
        designation: participant.designation,
        roleInTeam: participant.roleInTeam,
        contactNo: participant.contactNo,
        createdBy,
        creationDate: new Date(),
      });
      return doc.save({ session });
    });

    const populated = await this.meetingParticipantsModel
      .findById(row._id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .populate('departmentId')
      .exec();

    return {
      status: true,
      message: 'Meeting participant created successfully',
      data: populated,
      credentials: {
        userName: generatedUserName,
        password: generatedPassword,
      },
    };
  }

  async getAllMeetingParticipants(departmentId: string) {
    const list = await this.meetingParticipantsModel
      .find({ departmentId: departmentId as any })
      .populate('departmentId')
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();
    return { status: true, data: list };
  }

  /** All meeting participants whose user belongs to the given company. */
  async getMeetingParticipantsByCompany(companyId: string) {
    const list = await this.meetingParticipantsModel
      .find()
      .populate('departmentId')
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();

    const cid = String(companyId);
    const filtered = list.filter((doc: any) => {
      const u = doc.profileId?.userId;
      if (!u) return false;
      const c = u.companyId;
      const id =
        c && typeof c === 'object' && c._id != null
          ? String(c._id)
          : c != null
            ? String(c)
            : null;
      return id === cid;
    });

    return { status: true, data: filtered };
  }

  async getMeetingParticipant(id: string) {
    const participant = await this.meetingParticipantsModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();
    if (!participant) {
      throw new NotFoundException(
        `Meeting participant with ID: ${id} not found`,
      );
    }
    return { status: true, data: participant };
  }

  async deleteMeetingParticipants(id: string) {
    const deleted = await this.meetingParticipantsModel.findById(id);
    if (!deleted) {
      throw new NotFoundException(
        `Meeting participant with ID: ${id} not found`,
      );
    }

    await this.profileService.withTransaction(async (session) => {
      await this.meetingParticipantsModel
        .deleteOne({ _id: deleted._id })
        .session(session);
      const profile = await this.profileModel
        .findById(deleted.profileId)
        .session(session);
      if (profile) {
        await this.userModel
          .deleteOne({ _id: profile.userId })
          .session(session);
        await this.profileModel
          .deleteOne({ _id: profile._id })
          .session(session);
      }
    });

    return {
      status: true,
      message: 'Meeting participant deleted successfully',
      data: deleted,
    };
  }

  async deleteAllMeetingParticipants(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.meetingParticipantsModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No meeting participants found to delete');
    }
    return {
      status: true,
      message: 'All meeting participants have been deleted',
      data: result,
    };
  }

  async updateMeetingParticipants(updateDto: UpdateMeetingParticipantsDto) {
    const { id, ...updates } = updateDto;
    const updated = await this.meetingParticipantsModel.findByIdAndUpdate(
      id,
      { ...updates, updationDate: new Date() },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException(
        `Meeting participant with ID: ${id} not found`,
      );
    }
    return {
      status: true,
      message: 'Meeting participant updated successfully',
      data: updated,
    };
  }

  private async generateUniqueUserName(name: string): Promise<string> {
    const base = String(name || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 10);
    const root = base || 'user';

    for (let i = 0; i < 20; i++) {
      const candidate = `${root}${randomInt(1000, 9999)}`;
      const exists = await this.userModel
        .exists({ userName: candidate })
        .lean();
      if (!exists) {
        return candidate;
      }
    }

    return `${root}${Date.now().toString().slice(-6)}${randomInt(10, 99)}`;
  }

  private generateRandomPassword(length = 10): string {
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%';
    const all = `${lower}${upper}${digits}${symbols}`;

    const picks: string[] = [
      lower[randomInt(0, lower.length)],
      upper[randomInt(0, upper.length)],
      digits[randomInt(0, digits.length)],
      symbols[randomInt(0, symbols.length)],
    ];

    while (picks.length < Math.max(length, 8)) {
      picks.push(all[randomInt(0, all.length)]);
    }

    for (let i = picks.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks.join('');
  }
}
