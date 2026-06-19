import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Profile,
  ProfileSchema,
} from '../../admin-management/profile/schemas/profile.schema';
import {
  Employee,
  EmployeeSchema,
} from '../../competency-management/employee/schemas/employee.schema';
import {
  Trainer,
  TrainerSchema,
} from '../../competency-management/trainer/schemas/trainer.schema';
import {
  Supplier,
  SupplierSchema,
} from '../../supplier-management/supplier/schemas/supplier.schema';
import {
  InternalAuditor,
  InternalAuditorSchema,
} from '../../internal-audit/internal-auditor/schemas/internal-auditor.schema';
import {
  ProcessOwner,
  ProcessOwnerSchema,
} from '../../internal-audit/process-owner/schemas/process-owner.schema';
import {
  TeamMember,
  TeamMemberSchema,
} from '../../food-safety/haccp-team/schemas/team-member.schema';
import {
  MeetingParticipant,
  MeetingParticipantSchema,
} from '../../review-meetings/meeting-participants/schemas/meeting-participant.schema';
import { AffiliationService } from './affiliation.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Trainer.name, schema: TrainerSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: InternalAuditor.name, schema: InternalAuditorSchema },
      { name: ProcessOwner.name, schema: ProcessOwnerSchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: MeetingParticipant.name, schema: MeetingParticipantSchema },
    ]),
  ],
  providers: [AffiliationService],
  exports: [AffiliationService],
})
export class AffiliationModule {}
