import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dtos/create-employee.dto';
import { UpdateEmployeeDto } from './dtos/update-employee.dto';
import { UpdateUserDto } from '../../admin-management/users/dtos/update-user.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import {
  User,
  UserDocument,
  UserRoleType,
} from '../../admin-management/users/schemas/user.schema';
import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';
import {
  Training,
  TrainingDocument,
} from '../training/schemas/training.schema';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Training.name) private trainingModel: Model<TrainingDocument>,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createEmployeeDto: CreateEmployeeDto,
    actor: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: EmployeeDocument;
    credentials: { userName: string; password: string };
  }> {
    const { user, profile, employee } = createEmployeeDto;
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const emailTaken = await this.userModel.findOne({
      email: user.email.toLowerCase(),
    });
    if (emailTaken) {
      throw new ConflictException('User with this email already exists');
    }

    const requestedTrainingIds = (employee.trainings || [])
      .map((t) => t.training)
      .filter((id): id is string => Boolean(id));
    if (requestedTrainingIds.length > 0) {
      const trainingObjectIds = requestedTrainingIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException('One or more trainings are invalid');
        }
        return new Types.ObjectId(id);
      });
      const validTrainings = await this.trainingModel
        .find({
          _id: { $in: trainingObjectIds },
          companyId: new Types.ObjectId(companyId),
        })
        .select('_id')
        .lean();
      if (validTrainings.length !== trainingObjectIds.length) {
        throw new BadRequestException(
          'One or more selected trainings do not belong to your company',
        );
      }
    }

    const generatedUserName = await this.generateUniqueUserName(user.name);
    const generatedPassword = this.generateRandomPassword();

    const data = await this.profileService.withTransaction(async (session) => {
      const u = await this.userService.createUserRecord(
        {
          name: user.name,
          email: user.email,
          userName: generatedUserName,
          passwordPlain: generatedPassword,
          ...(user.roleId ? { roleId: user.roleId } : {}),
          roleType: UserRoleType.COMPANY_EMPLOYEE,
          companyId,
          departmentId: user.departmentId,
        },
        session,
      );

      const p = await this.profileService.createForUser(
        u._id,
        profile,
        session,
      );

      const trainings =
        employee.trainings?.map((t) => ({
          training: t.training ? new Types.ObjectId(t.training) : undefined,
        })) ?? [];

      const emp = new this.employeeModel({
        profileId: p._id,
        designation: employee.designation,
        cv: employee.cv,
        trainings,
      });
      return emp.save({ session });
    });

    const populated = await this.employeeModel
      .findById(data._id)
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId', 'roleId'],
        },
      })
      .exec();

    return {
      status: true,
      message: 'The employee is added!',
      data: populated!,
      credentials: {
        userName: generatedUserName,
        password: generatedPassword,
      },
    };
  }

  private async generateUniqueUserName(name: string): Promise<string> {
    const base = String(name || 'employee')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 10);
    const root = base || 'employee';

    for (let i = 0; i < 20; i++) {
      const candidate = `${root}${randomInt(1000, 9999)}`;
      const exists = await this.userModel
        .exists({ userName: candidate })
        .lean();
      if (!exists) {
        return candidate;
      }
    }

    return `${root}${Date.now().toString().slice(-6)}${randomInt(10, 99)}`;
  }

  private generateRandomPassword(length = 10): string {
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%';
    const all = `${lower}${upper}${digits}${symbols}`;

    const picks: string[] = [
      lower[randomInt(0, lower.length)],
      upper[randomInt(0, upper.length)],
      digits[randomInt(0, digits.length)],
      symbols[randomInt(0, symbols.length)],
    ];

    while (picks.length < Math.max(length, 8)) {
      picks.push(all[randomInt(0, all.length)]);
    }

    for (let i = picks.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks.join('');
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{ status: boolean; message: string; data: EmployeeDocument[] }> {
    const users = await this.userModel
      .find({ departmentId })
      .select('_id')
      .lean();
    const userIds = users.map((u) => u._id);
    const profiles = await this.profileModel
      .find({ userId: { $in: userIds } })
      .select('_id')
      .lean();
    const profileIds = profiles.map((p) => p._id);

    const employees = await this.employeeModel
      .find({ profileId: { $in: profileIds } })
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId'] },
      })
      .exec();

    return {
      status: true,
      message: 'The Following Are Employees!',
      data: employees,
    };
  }

  /**
   * Employees whose user belongs to the actor's company (or all employees for super-admin).
   */
  async findAllForCompany(actor: any): Promise<{
    status: boolean;
    message: string;
    data: EmployeeDocument[];
  }> {
    const employees = await this.employeeModel
      .find()
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId'],
        },
      })
      .sort({ created_at: -1 })
      .exec();
    return {
      status: true,
      message: 'Employees',
      data: employees,
    };
  }

  async findOne(id: string, actor?: any): Promise<EmployeeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid employee id');
    }
    const employee = await this.employeeModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          populate: ['companyId', 'departmentId', 'roleId'],
        },
      })
      .populate({
        path: 'trainings.training',
        select: 'trainingName',
      })
      .exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    actor?: unknown,
  ): Promise<{ status: boolean; message: string; data: EmployeeDocument }> {
    const existing = await this.employeeModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const populated = await this.employeeModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId', 'roleId'] },
      })
      .exec();

    const profileDoc = populated?.profileId as ProfileDocument | undefined;
    const userDoc = profileDoc?.userId as UserDocument | undefined;

    if (updateEmployeeDto.user && userDoc) {
      const u = updateEmployeeDto.user;
      const updatePayload: UpdateUserDto = {};
      if (u.name !== undefined) updatePayload.name = u.name;
      if (u.email !== undefined) updatePayload.email = u.email;
      if (u.userName !== undefined) updatePayload.userName = u.userName;
      if (u.departmentId !== undefined) updatePayload.departmentId = u.departmentId;
      if (Object.keys(updatePayload).length > 0) {
        await this.userService.update(String(userDoc._id), updatePayload, actor);
      }
    }

    if (updateEmployeeDto.profile && profileDoc) {
      const p = updateEmployeeDto.profile;
      const $set: Record<string, unknown> = {};
      if (p.avatar !== undefined) $set.avatar = p.avatar;
      if (p.DOB !== undefined) $set.DOB = new Date(p.DOB);
      if (p.phoneNo !== undefined) $set.phoneNo = p.phoneNo;
      if (p.address !== undefined) $set.address = p.address;
      if (p.identity !== undefined) $set.identity = p.identity;
      if (p.qualification !== undefined) $set.qualification = p.qualification;
      if (p.experience !== undefined) $set.experience = p.experience;
      if (p.skills !== undefined) $set.skills = p.skills;
      if (p.docs !== undefined) {
        $set.docs = p.docs;
      }
      if (Object.keys($set).length > 0) {
        await this.profileModel.findByIdAndUpdate(profileDoc._id, $set).exec();
      }
    }

    if (updateEmployeeDto.employee) {
      const e = updateEmployeeDto.employee;
      const employeeUpdate: Record<string, unknown> = {};
      if (e.designation !== undefined) employeeUpdate.designation = e.designation;
      if (e.cv !== undefined) employeeUpdate.cv = e.cv;
      if (e.trainings !== undefined) {
        employeeUpdate.trainings = e.trainings.map((t) => ({
          training: t.training ? new Types.ObjectId(t.training) : undefined,
        }));
      }
      if (Object.keys(employeeUpdate).length > 0) {
        await this.employeeModel.findByIdAndUpdate(id, employeeUpdate).exec();
      }
    }

    const data = await this.employeeModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId', populate: ['companyId', 'departmentId', 'roleId'] },
      })
      .populate({
        path: 'trainings.training',
        select: 'trainingName',
      })
      .exec();

    return { status: true, message: 'Employee updated', data: data! };
  }

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const employee = await this.employeeModel.findById(id);
    if (!employee) {
      throw new NotFoundException('This Employee is Not found!');
    }

    await this.profileService.withTransaction(async (session) => {
      await this.employeeModel
        .deleteOne({ _id: employee._id })
        .session(session);
      const profile = await this.profileModel
        .findById(employee.profileId)
        .session(session);
      if (profile) {
        await this.userModel
          .deleteOne({ _id: profile.userId })
          .session(session);
        await this.profileModel
          .deleteOne({ _id: profile._id })
          .session(session);
      }
    });

    return {
      status: true,
      message: 'The Following Employee has been Deleted!',
    };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.employeeModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Employees Found to Delete!');
    }
    return { status: true, message: 'All employees have been deleted!' };
  }
}
