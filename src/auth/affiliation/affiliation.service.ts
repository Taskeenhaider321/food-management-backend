import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';
import {
  Employee,
  EmployeeDocument,
} from '../../competency-management/employee/schemas/employee.schema';
import {
  Trainer,
  TrainerDocument,
} from '../../competency-management/trainer/schemas/trainer.schema';
import {
  Supplier,
  SupplierDocument,
} from '../../supplier-management/supplier/schemas/supplier.schema';
import {
  InternalAuditor,
  InternalAuditorDocument,
} from '../../internal-audit/internal-auditor/schemas/internal-auditor.schema';
import {
  ProcessOwner,
  ProcessOwnerDocument,
} from '../../internal-audit/process-owner/schemas/process-owner.schema';
import {
  TeamMember,
  TeamMemberDocument,
} from '../../food-safety/haccp-team/schemas/team-member.schema';
import {
  MeetingParticipant,
  MeetingParticipantDocument,
} from '../../review-meetings/meeting-participants/schemas/meeting-participant.schema';

/**
 * Resolves functional roles (employee, trainer, …) from profile-linked collections.
 */
@Injectable()
export class AffiliationService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Trainer.name)
    private readonly trainerModel: Model<TrainerDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(InternalAuditor.name)
    private readonly internalAuditorModel: Model<InternalAuditorDocument>,
    @InjectModel(ProcessOwner.name)
    private readonly processOwnerModel: Model<ProcessOwnerDocument>,
    @InjectModel(TeamMember.name)
    private readonly teamMemberModel: Model<TeamMemberDocument>,
    @InjectModel(MeetingParticipant.name)
    private readonly meetingParticipantModel: Model<MeetingParticipantDocument>,
  ) {}

  async getFunctionalRoleKeys(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const uid = new Types.ObjectId(userId);
    const profile = await this.profileModel
      .findOne({ userId: uid })
      .select('_id')
      .lean()
      .exec();
    if (!profile?._id) {
      return [];
    }

    const pid = profile._id as Types.ObjectId;

    const [
      employee,
      trainer,
      supplier,
      auditor,
      processOwner,
      teamMember,
      meetingParticipant,
    ] = await Promise.all([
      this.employeeModel.exists({ profileId: pid }),
      this.trainerModel.exists({ profileId: pid }),
      this.supplierModel.exists({ profileId: pid }),
      this.internalAuditorModel.exists({ profileId: pid }),
      this.processOwnerModel.exists({ profileId: pid }),
      this.teamMemberModel.exists({ profileId: pid }),
      this.meetingParticipantModel.exists({ profileId: pid }),
    ]);

    const keys: string[] = [];
    if (employee) keys.push('employee');
    if (trainer) keys.push('trainer');
    if (supplier) keys.push('supplier');
    if (auditor) keys.push('auditor');
    if (processOwner) keys.push('process-owner');
    if (teamMember) keys.push('member');
    if (meetingParticipant) keys.push('meeting-participant');

    return keys;
  }
}
