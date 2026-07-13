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
import {
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

function actorDisplayName(actor: any): string | undefined {
  return actor?.name || actor?.userName || actor?._id?.toString() || undefined;
}

function stripHtml(value?: string): string {
  if (!value) return '---';
  const text = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text || '---';
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
    @InjectModel('Company') private companyModel: Model<any>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId =
      actor?.companyId?._id?.toString() || actor?.companyId?.toString();
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

    const companyId =
      actor?.companyId?._id?.toString() || actor?.companyId?.toString();
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
    const minutes = await this.meetingMinutesModel.findByIdAndDelete(id).exec();
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

  async downloadMeetingMinutesPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.getAllMinutes(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Meeting Minutes Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'mrmNumber', label: 'MRM NO', width: 1.5 },
        { key: 'createdBy', label: 'CREATED BY', width: 2 },
        { key: 'created_at', label: 'CREATED', width: 1.5 },
        { key: 'recordsCount', label: 'RECORDS', width: 1.2 },
      ],
      rows: data.map((m: any) => ({
        mrmNumber: m.reviewPlan?.mrmNumber || '---',
        createdBy: m.createdBy || '---',
        created_at: formatDate(m.created_at),
        recordsCount: Array.isArray(m.records) ? String(m.records.length) : '0',
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('meeting_minutes', 'directory'),
    };
  }

  async downloadMeetingMinutesByIdPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: minutes } = await this.getMinutesById(id);
    const plan = (minutes as any).reviewPlan;
    const mrmNumber = plan?.mrmNumber || '---';

    const recordSections =
      Array.isArray(minutes.records) && minutes.records.length
        ? minutes.records.map((record: any, index: number) => {
            const participantName =
              record.participant?.fullName ||
              record.participant?.memberCode ||
              '---';
            return {
              heading: `Record ${index + 1} — ${participantName}`,
              rows: [
                ['Discussion', stripHtml(record.discussion)],
                ['Responsibility', stripHtml(record.responsibility)],
                ['Target Date', formatDate(record.targetDate)],
              ] as Array<[string, string]>,
            };
          })
        : [];

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: `Meeting Minutes — ${mrmNumber}`,
      subtitle: minutes.createdBy || undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['MRM Number', mrmNumber],
        ['Created By', minutes.createdBy || '---'],
        ['Created At', formatDate((minutes as any).created_at)],
        [
          'Records',
          Array.isArray(minutes.records) ? String(minutes.records.length) : '0',
        ],
      ],
      sections: [
        {
          heading: 'Summary',
          rows: [
            ['MRM Number', mrmNumber],
            ['Created By', minutes.createdBy || '---'],
            ['Created At', formatDate((minutes as any).created_at)],
            [
              'Records',
              Array.isArray(minutes.records)
                ? String(minutes.records.length)
                : '0',
            ],
          ],
        },
        ...recordSections,
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        mrmNumber !== '---' ? mrmNumber : 'meeting_minutes',
        'minutes',
      ),
    };
  }
}
