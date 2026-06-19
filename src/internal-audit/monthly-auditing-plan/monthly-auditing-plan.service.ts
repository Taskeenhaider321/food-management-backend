import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MonthlyAuditingPlan } from './schemas/monthly-auditing-plan.schema';
import { CreateMonthlyPlanDto } from './dtos/create-monthly-plan.dto';
import { YearlyAuditingPlan } from '../yearly-auditing-plan/schemas/yearly-auditing-plan.schema';
import { ProcessOwner } from '../process-owner/schemas/process-owner.schema';
import { User, UserDocument } from '../../admin-management/users/schemas/user.schema';

@Injectable()
export class MonthlyAuditingPlanService {
  constructor(
    @InjectModel(MonthlyAuditingPlan.name) private monthlyPlanModel: Model<MonthlyAuditingPlan>,
    @InjectModel(YearlyAuditingPlan.name) private yearlyPlanModel: Model<YearlyAuditingPlan>,
    @InjectModel(ProcessOwner.name) private processOwnerModel: Model<ProcessOwner>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async addMonthlyAuditingPlan(createDto: CreateMonthlyPlanDto) {
    const yearlyPlan = await this.yearlyPlanModel.findOne({
      Year: Number(createDto.Year),
      UserDepartment: createDto.departmentId as any,
    });
    if (!yearlyPlan) {
      throw new NotFoundException(`YearlyAuditPlan for the year ${createDto.Year} does not exist.`);
    }

    const monthExists = yearlyPlan.Selected.filter((s) =>
      s.monthNames.some((m) => m === createDto.Month),
    );
    if (!monthExists || monthExists.length === 0) {
      throw new NotFoundException(
        `The selected month "${createDto.Month}" does not exist in the yearly plan for ${createDto.Year}.`,
      );
    }

    for (const processOwnerId of createDto.Process) {
      const processOwner = await this.processOwnerModel.findById(processOwnerId);
      if (!processOwner) {
        throw new NotFoundException(`Process Owner with ID "${processOwnerId}" not found.`);
      }
      if (processOwner.departmentId?.toString() === createDto.Department) {
        throw new BadRequestException(
          `Process Owner with ID "${processOwnerId}" belongs to the selected department.`,
        );
      }
    }

    for (const auditorId of createDto.Auditor) {
      const auditor = await this.userModel.findById(auditorId);
      if (!auditor) {
        throw new NotFoundException(`Auditor with ID "${auditorId}" not found.`);
      }
      if (auditor.departmentId?.toString() === createDto.Department) {
        throw new BadRequestException(
          `Auditor with ID "${auditorId}" belongs to the selected department.`,
        );
      }
    }

    const plan = new this.monthlyPlanModel({
      ...createDto,
      UserDepartment: createDto.departmentId,
      CreationDate: new Date(),
    });

    await plan.save();
    return { Status: true, message: 'The MonthlyAuditPlan is added!', data: plan };
  }

  async readMonthlyAuditPlan(departmentId: string) {
    const plans = await this.monthlyPlanModel
      .find({ UserDepartment: departmentId as any })
      .populate('LeadAuditor')
      .populate('TeamAuditor')
      .populate({
        path: 'ProcessOwner',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate('YearlyAuditingPlan')
      .populate('Department')
      .populate('UserDepartment');
    return { status: true, message: 'The Following are MonthlyAuditingPlans!', data: plans };
  }

  async readMonthlyAuditPlanById(planId: string) {
    const plan = await this.monthlyPlanModel
      .findById(planId)
      .populate('LeadAuditor')
      .populate('TeamAuditor')
      .populate({
        path: 'ProcessOwner',
        populate: {
          path: 'profileId',
          populate: { path: 'userId' },
        },
      })
      .populate('YearlyAuditingPlan')
      .populate('Department');
    if (!plan) throw new NotFoundException('MonthlyAuditPlan not found');
    const totalCollections = await this.monthlyPlanModel.countDocuments();
    return {
      status: true,
      message: 'The Following are MonthlyAuditingPlans!',
      totaldocuments: totalCollections,
      data: plan,
    };
  }

  async deleteMonthlyPlan(id: string) {
    const deleted = await this.monthlyPlanModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('This MonthlyPlan is Not found!');
    return { status: true, message: 'The Following MonthlyPlan has been Deleted!', data: deleted };
  }
}
