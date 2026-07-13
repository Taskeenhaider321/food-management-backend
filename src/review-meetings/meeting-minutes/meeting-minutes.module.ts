import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingMinutesController } from './meeting-minutes.controller';
import { MeetingMinutesService } from './meeting-minutes.service';
import {
  MeetingMinutes,
  MeetingMinutesSchema,
} from './schemas/meeting-minutes.schema';
import {
  ReviewPlan,
  ReviewPlanSchema,
} from '../review-plan/schemas/review-plan.schema';
import {
  ReviewTeamMember,
  ReviewTeamMemberSchema,
} from '../review-team/schemas/review-team-member.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MeetingMinutes.name, schema: MeetingMinutesSchema },
      { name: ReviewPlan.name, schema: ReviewPlanSchema },
      { name: ReviewTeamMember.name, schema: ReviewTeamMemberSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [MeetingMinutesController],
  providers: [MeetingMinutesService],
})
export class MeetingMinutesModule {}
