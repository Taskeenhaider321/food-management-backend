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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewPlan.name, schema: ReviewPlanSchema },
      { name: MeetingMinutes.name, schema: MeetingMinutesSchema },
      { name: ReviewTeamMember.name, schema: ReviewTeamMemberSchema },
    ]),
  ],
  controllers: [ReviewPlanController],
  providers: [ReviewPlanService],
})
export class ReviewPlanModule {}
