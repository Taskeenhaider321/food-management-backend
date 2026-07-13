import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewPlanController } from './review-plan.controller';
import { ReviewPlanService } from './review-plan.service';
import { ReviewPlan, ReviewPlanSchema } from './schemas/review-plan.schema';
import {
  MeetingMinutes,
  MeetingMinutesSchema,
} from '../meeting-minutes/schemas/meeting-minutes.schema';
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
      { name: ReviewPlan.name, schema: ReviewPlanSchema },
      { name: MeetingMinutes.name, schema: MeetingMinutesSchema },
      { name: ReviewTeamMember.name, schema: ReviewTeamMemberSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ReviewPlanController],
  providers: [ReviewPlanService],
})
export class ReviewPlanModule {}
