import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HaccpTeamController } from './haccp-team.controller';
import { HaccpTeamService } from './haccp-team.service';
import { HaccpTeam, HaccpTeamSchema } from './schemas/haccp-team.schema';
import { TeamMember, TeamMemberSchema } from './schemas/team-member.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HaccpTeam.name, schema: HaccpTeamSchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [HaccpTeamController],
  providers: [HaccpTeamService],
})
export class HaccpTeamModule {}
