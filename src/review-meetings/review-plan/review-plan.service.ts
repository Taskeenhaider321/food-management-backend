import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewPlan, ReviewPlanDocument } from './schemas/review-plan.schema';
import {
  MeetingMinutes,
  MeetingMinutesDocument,
} from '../meeting-minutes/schemas/meeting-minutes.schema';
import { CreateReviewPlanDto } from './dtos/create-review-plan.dto';
import { UpdateReviewPlanDto } from './dtos/update-review-plan.dto';
function actorDisplayName(actor: any): string | undefined {
  return actor?.name || actor?.userName || actor?._id?.toString() || undefined;
}

const PARTICIPANT_POPULATE = {
  path: 'participants',
  select: 'memberCode fullName designation email phoneNo roleInTeam',
};

@Injectable()
export class ReviewPlanService {
  constructor(
    @InjectModel(ReviewPlan.name)
    private readonly reviewPlanModel: Model<ReviewPlanDocument>,
    @InjectModel(MeetingMinutes.name)
    private readonly meetingMinutesModel: Model<MeetingMinutesDocument>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  private async assertMrmNumberAvailable(
    mrmNumber: string,
    excludeId?: string,
  ) {
    const filter: Record<string, unknown> = { mrmNumber };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.reviewPlanModel.findOne(filter).lean();
    if (existing) {
      throw new ConflictException(
        `MRM number "${mrmNumber}" is already in use`,
      );
    }
  }

  async createPlan(dto: CreateReviewPlanDto, actor: any) {
    const mrmNumber = dto.mrmNumber?.trim();
    if (mrmNumber) {
      await this.assertMrmNumberAvailable(mrmNumber);
    }

    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    const plan = new this.reviewPlanModel({
      ...dto,
      mrmNumber: mrmNumber || undefined,
      agendas: dto.agendas.map((agenda, index) => ({
        title: agenda.title,
        description: agenda.description,
        participant: agenda.participant
          ? new Types.ObjectId(agenda.participant)
          : undefined,
        order: agenda.order ?? index,
      })),
      companyId: companyId ? new Types.ObjectId(companyId) : undefined,
      createdBy: actorDisplayName(actor),
    });

    const saved = await plan.save();
    const populated = await saved.populate(PARTICIPANT_POPULATE);
    return {
      status: true,
      message: 'Review plan created successfully',
      data: populated,
    };
  }

  async getAllPlans(actor: any) {
    const plans = await this.reviewPlanModel
      .find(this.companyScopedFilter(actor))
      .populate(PARTICIPANT_POPULATE)
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: plans };
  }

  async getPlanById(id: string) {
    const plan = await this.reviewPlanModel
      .findById(id)
      .populate(PARTICIPANT_POPULATE)
      .exec();
    if (!plan) {
      throw new NotFoundException('Review plan not found');
    }
    return { status: true, data: plan };
  }

  async updatePlan(id: string, dto: UpdateReviewPlanDto) {
    const plan = await this.reviewPlanModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('Review plan not found');
    }

    const mrmNumber = dto.mrmNumber?.trim();
    if (mrmNumber && mrmNumber !== plan.mrmNumber) {
      await this.assertMrmNumberAvailable(mrmNumber, id);
      plan.mrmNumber = mrmNumber;
    }

    if (dto.venue !== undefined) plan.venue = dto.venue;
    if (dto.meetingDate !== undefined) {
      plan.meetingDate = new Date(dto.meetingDate);
    }
    if (dto.meetingTime !== undefined) plan.meetingTime = dto.meetingTime;
    if (dto.objective !== undefined) plan.objective = dto.objective;
    if (dto.remarks !== undefined) plan.remarks = dto.remarks;
    if (dto.participants !== undefined) {
      plan.participants = dto.participants.map(
        (participantId) => new Types.ObjectId(participantId),
      );
    }
    if (dto.agendas !== undefined) {
      // Keep existing agenda subdocument ids when provided so recorded
      // minutes stay linked to their agenda items.
      plan.set(
        'agendas',
        dto.agendas.map((agenda, index) => ({
          ...(agenda._id ? { _id: new Types.ObjectId(agenda._id) } : {}),
          title: agenda.title,
          description: agenda.description,
          participant: agenda.participant
            ? new Types.ObjectId(agenda.participant)
            : undefined,
          order: agenda.order ?? index,
        })),
      );
    }

    const saved = await plan.save();
    const populated = await saved.populate(PARTICIPANT_POPULATE);
    return {
      status: true,
      message: 'Review plan updated successfully',
      data: populated,
    };
  }

  async deletePlan(id: string) {
    const plan = await this.reviewPlanModel.findByIdAndDelete(id).exec();
    if (!plan) {
      throw new NotFoundException('Review plan not found');
    }
    await this.meetingMinutesModel.deleteMany({ reviewPlan: plan._id }).exec();
    return {
      status: true,
      message: 'Review plan deleted successfully',
      data: plan,
    };
  }
}
