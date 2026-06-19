import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcessOwner } from './schemas/process-owner.schema';
import { CreateProcessOwnerDto } from './dtos/create-process-owner.dto';
import { UpdateProcessOwnerDto } from './dtos/update-process-owner.dto';
import {
  AddProcessOwnerCredentialsDto,
  ResetProcessOwnerCredentialsDto,
} from './dtos/account-credentials.dto';
import { EmailService } from '../../email/email.service';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import { User, UserDocument } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileDocument } from '../../admin-management/profile/schemas/profile.schema';

@Injectable()
export class ProcessOwnerService {
  constructor(
    @InjectModel(ProcessOwner.name) private processOwnerModel: Model<ProcessOwner>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private emailService: EmailService,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  async addProcess(createDto: CreateProcessOwnerDto) {
    const { user, profile, processOwner, createdBy, hasDeputy, deputyOwner } = createDto;

    if (!user.companyId) {
      throw new BadRequestException('user.companyId is required');
    }

    const emailTaken = await this.userModel.findOne({ email: user.email.toLowerCase() });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const existingName = await this.userModel.findOne({ userName: user.userName });
    if (existingName) {
      throw new BadRequestException('Username already exists!');
    }

    const row = await this.profileService.withTransaction(async (session) => {
      const u = await this.userService.createUserRecord(
        {
          name: user.name,
          email: user.email,
          userName: user.userName,
          passwordPlain: user.password,
          roleType: 'super-admin',
          companyId: user.companyId!,
          departmentId: user.departmentId,
        },
        session,
      );

      const p = await this.profileService.createForUser(u._id, profile, session);

      const proc = new this.processOwnerModel({
        profileId: p._id,
        departmentId: user.departmentId ? new Types.ObjectId(user.departmentId) : undefined,
        processName: processOwner.processName,
        riskAssessment: processOwner.riskAssessment,
        activities: processOwner.activities ?? [],
        specialInstructions: processOwner.specialInstructions ?? [],
        shiftBreaks: processOwner.shiftBreaks ?? [],
        criticalAreas: processOwner.criticalAreas ?? [],
        reason: processOwner.reason,
        hasDeputy: !!hasDeputy,
        deputyOwner: hasDeputy ? deputyOwner : undefined,
        createdBy,
      });
      return proc.save({ session });
    });

    const populated = await this.processOwnerModel
      .findById(row._id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId')
      .exec();

    const udoc = populated?.profileId && (populated.profileId as any).userId;
    if (udoc) {
      const emailBody = `Dear ${udoc.name},

Your account has been created successfully.

Username: ${udoc.userName}
Password: ${user.password}

Please login and change your password.

Best regards`;

      try {
        await this.emailService.sendEmail(udoc.email, 'Registration Confirmation', emailBody);
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }

    return { status: true, message: 'The Process Owner is added!', data: populated };
  }

  async updateProcess(updateDto: UpdateProcessOwnerDto) {
    const process = await this.processOwnerModel.findById(updateDto._id);
    if (!process) throw new NotFoundException('Process not found');

    const { _id, owner, ...updateData } = updateDto;

    // ── Process owner personal info lives on the linked Profile / User ──
    if (owner) {
      const profile = await this.profileModel.findById(process.profileId);
      if (profile) {
        const profileUpdate: any = {};
        if (owner.designation !== undefined) profileUpdate.designation = owner.designation;
        if (owner.phoneNo !== undefined) profileUpdate.phoneNo = owner.phoneNo;
        if (Object.keys(profileUpdate).length > 0) {
          await this.profileModel.findByIdAndUpdate(profile._id, profileUpdate);
        }

        const userUpdate: any = {};
        if (owner.name) userUpdate.name = owner.name;
        if (owner.email) {
          const emailTaken = await this.userModel.findOne({
            email: owner.email.toLowerCase(),
            _id: { $ne: profile.userId },
          });
          if (emailTaken) throw new ConflictException('Email already in use');
          userUpdate.email = owner.email.toLowerCase();
        }
        if (Object.keys(userUpdate).length > 0) {
          await this.userModel.findByIdAndUpdate(profile.userId, userUpdate);
        }
      }
    }

    const updated = await this.processOwnerModel
      .findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId');

    return { status: true, message: 'Process updated successfully!', data: updated };
  }

  async getProcessById(processId: string) {
    const process = await this.processOwnerModel
      .findById(processId)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .populate('departmentId')
      .exec();
    if (!process) throw new NotFoundException('Process not found');
    return { status: true, message: 'Process retrieved!', data: process };
  }

  async toggleStatus(processId: string) {
    const process = await this.processOwnerModel.findById(processId);
    if (!process) throw new NotFoundException('Process not found');

    process.isEnabled = !process.isEnabled;
    await process.save();

    return {
      status: true,
      message: `Process has been ${process.isEnabled ? 'enabled' : 'disabled'}!`,
      data: process,
    };
  }

  async addAccountCredentials(dto: AddProcessOwnerCredentialsDto) {
    const process = await this.processOwnerModel.findById(dto.processId).populate('profileId');
    if (!process) throw new NotFoundException('Process not found');

    const profile = process.profileId as any;
    if (!profile) throw new NotFoundException('Process owner profile not found');

    const existingUser = await this.userModel.findOne({ userName: dto.userName });
    if (existingUser) throw new ConflictException('Username already taken');

    await this.userModel.findByIdAndUpdate(profile.userId, {
      userName: dto.userName,
      password: dto.password,
    });

    return { status: true, message: 'Account credentials added successfully!' };
  }

  async resetAccountCredentials(dto: ResetProcessOwnerCredentialsDto) {
    const process = await this.processOwnerModel.findById(dto.processId).populate('profileId');
    if (!process) throw new NotFoundException('Process not found');

    const profile = process.profileId as any;
    if (!profile) throw new NotFoundException('Process owner profile not found');

    const existingUser = await this.userModel.findOne({
      userName: dto.newUserName,
      _id: { $ne: profile.userId },
    });
    if (existingUser) throw new ConflictException('Username already taken');

    await this.userService.resetCredentials(profile.userId, dto.newUserName, dto.newPassword);

    return { status: true, message: 'Account credentials reset successfully!' };
  }

  async readProcess(departmentId: string) {
    const processOwners = await this.processOwnerModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate('departmentId')
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();
    return { status: true, message: 'The Following are ProcessOwner!', data: processOwners };
  }

  async deleteProcess(processId: string) {
    const processOwner = await this.processOwnerModel.findById(processId);
    if (!processOwner) throw new NotFoundException('This ProcessOwner is Not found!');

    await this.profileService.withTransaction(async (session) => {
      await this.processOwnerModel.deleteOne({ _id: processOwner._id }).session(session);
      const profile = await this.profileModel.findById(processOwner.profileId).session(session);
      if (profile) {
        await this.userModel.deleteOne({ _id: profile.userId }).session(session);
        await this.profileModel.deleteOne({ _id: profile._id }).session(session);
      }
    });

    return { status: true, message: 'The Following ProcessOwner has been Deleted!', data: processOwner };
  }

  async deleteAllProcesses(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.processOwnerModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No processOwner Found to Delete!');
    return { status: true, message: 'All processOwner have been Deleted!', data: result };
  }
}
