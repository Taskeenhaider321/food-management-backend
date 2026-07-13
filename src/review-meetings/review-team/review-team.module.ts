import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewTeamController } from './review-team.controller';
import { ReviewTeamService } from './review-team.service';
import {
  ReviewTeamMember,
  ReviewTeamMemberSchema,
} from './schemas/review-team-member.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewTeamMember.name, schema: ReviewTeamMemberSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ReviewTeamController],
  providers: [ReviewTeamService],
})
export class ReviewTeamModule {}
