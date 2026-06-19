import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MeetingMinutes,
  MeetingMinutesDocument,
} from './schemas/meeting-minutes.schema';
import {
  ReviewPlan,
  ReviewPlanDocument,
} from '../review-plan/schemas/review-plan.schema';
import { CreateMeetingMinutesDto } from './dtos/create-meeting-minutes.dto';
import { UpdateMeetingMinutesDto } from './dtos/update-meeting-minutes.dto';
function actorDisplayName(actor: any): string | undefined {
  return actor?.name || actor?.userName || actor?._id?.toString() || undefined;
}

const MINUTES_POPULATE = [
  {
    path: 'reviewPlan',
    populate: {
      path: 'participants',
      select: 'memberCode fullName designation email phoneNo roleInTeam',
    },
  },
  {
    path: 'records.participant',
    select: 'memberCode fullName designation email phoneNo roleInTeam',
  },
];

@Injectable()
export class MeetingMinutesService {
  constructor(
    @InjectModel(MeetingMinutes.name)
    private readonly meetingMinutesModel: Model<MeetingMinutesDocument>,
    @InjectModel(ReviewPlan.name)
    private readonly reviewPlanModel: Model<ReviewPlanDocument>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  async createMinutes(dto: CreateMeetingMinutesDto, actor: any) {
    const plan = await this.reviewPlanModel.findById(dto.reviewPlan).exec();
    if (!plan) {
      throw new NotFoundException('Review plan not found');
    }

    const existing = await this.meetingMinutesModel
      .findOne({ reviewPlan: plan._id })
      .lean();
    if (existing) {
      throw new ConflictException(
        `Minutes for ${plan.mrmNumber} are already recorded`,
      );
    }

    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    const minutes = new this.meetingMinutesModel({
      reviewPlan: plan._id,
      records: dto.records,
      companyId: companyId ? new Types.ObjectId(companyId) : plan.companyId,
      createdBy: actorDisplayName(actor),
    });
    const saved = await minutes.save();

    plan.status = 'Minutes Recorded';
    await plan.save();

    const populated = await saved.populate(MINUTES_POPULATE);
    return {
      status: true,
      message: 'Meeting minutes recorded successfully',
      data: populated,
    };
  }

  async getAllMinutes(actor: any) {
    const minutes = await this.meetingMinutesModel
      .find(this.companyScopedFilter(actor))
      .populate(MINUTES_POPULATE)
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: minutes };
  }

  async getMinutesByPlan(planId: string) {
    const minutes = await this.meetingMinutesModel
      .findOne({ reviewPlan: new Types.ObjectId(planId) })
      .populate(MINUTES_POPULATE)
      .exec();
    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found for this plan');
    }
    return { status: true, data: minutes };
  }

  async getMinutesById(id: string) {
    const minutes = await this.meetingMinutesModel
      .findById(id)
      .populate(MINUTES_POPULATE)
      .exec();
    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found');
    }
    return { status: true, data: minutes };
  }

  async updateMinutes(id: string, dto: UpdateMeetingMinutesDto) {
    const minutes = await this.meetingMinutesModel.findById(id).exec();
    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found');
    }

    if (dto.records !== undefined) {
      minutes.set('records', dto.records);
    }

    const saved = await minutes.save();
    const populated = await saved.populate(MINUTES_POPULATE);
    return {
      status: true,
      message: 'Meeting minutes updated successfully',
      data: populated,
    };
  }

  async deleteMinutes(id: string) {
    const minutes = await this.meetingMinutesModel
      .findByIdAndDelete(id)
      .exec();
    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found');
    }

    await this.reviewPlanModel
      .findByIdAndUpdate(minutes.reviewPlan, {
        $set: { status: 'Scheduled' },
      })
      .exec();

    return {
      status: true,
      message: 'Meeting minutes deleted successfully',
      data: minutes,
    };
  }
}
