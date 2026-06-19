// TEST/hr/yearly-training-plan/yearly-training-plan.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PopulateOptions } from 'mongoose';
import {
  YearlyTrainingPlan,
  YearlyTrainingPlanDocument,
} from './schemas/yearly-training-plan.schema';
import {
  CreateYearlyTrainingPlanDto,
  YearlyPlanMonthDto,
} from './dtos/create-yearly-training-plan.dto';
import { UpdateYearlyTrainingPlanDto } from './dtos/update-yearly-training-plan.dto';
import { resolveDepartmentIdForTrainingPlanCreate } from '../utils/training-plan-department.util';
import {
  departmentScopeForActor,
  findYearlyPlanByYear,
} from '../utils/training-plan-year-scope.util';
import {
  actorDisplayName,
  appendPlanStatusHistory,
  seedInitialPlanStatus,
} from '../utils/plan-status-history.util';

/** Dot-path populate is unreliable on nested subdoc arrays; use explicit nesting. */
const YEARLY_PLAN_POPULATE: PopulateOptions[] = [
  {
    path: 'Month',
    populate: {
      path: 'Trainings',
      populate: {
        path: 'Training',
        model: 'Training',
        select: 'trainingName description evaluationCriteria TrainingMaterial',
      },
    },
  },
  { path: 'UserDepartment' },
];

@Injectable()
export class YearlyTrainingPlanService {
  constructor(
    @InjectModel(YearlyTrainingPlan.name)
    private yearlyPlanModel: Model<YearlyTrainingPlanDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

  /** ObjectId, raw id string, or populated { _id }. */
  private trainingIdString(ref: unknown): string {
    if (ref == null) return '';
    if (typeof ref === 'string') return ref;
    if (ref instanceof Types.ObjectId) return ref.toHexString();
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return this.trainingIdString((ref as { _id: unknown })._id);
    }
    try {
      return new Types.ObjectId(String(ref)).toHexString();
    } catch {
      return String(ref);
    }
  }

  private trainingsMatch(a: unknown, b: unknown): boolean {
    const sa = this.trainingIdString(a);
    const sb = this.trainingIdString(b);
    return sa !== '' && sa === sb;
  }

  async create(
    createDto: CreateYearlyTrainingPlanDto,
    actor: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: YearlyTrainingPlanDocument;
  }> {
    const { Year, Month } = createDto;
    const createdBy =
      createDto.createdBy?.trim() ||
      (typeof actor?.name === 'string' && actor.name.trim()) ||
      (typeof actor?.email === 'string' && actor.email.trim()) ||
      'System';
    const departmentId = await resolveDepartmentIdForTrainingPlanCreate(
      actor,
      this.departmentModel,
      createDto.departmentId,
    );

    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const departmentScope = await departmentScopeForActor(
      actor,
      this.departmentModel,
    );
    const yearlyPlan = await findYearlyPlanByYear(
      this.yearlyPlanModel,
      Year,
      departmentScope,
    );

    if (yearlyPlan) {
      this.mergeMonthSchedule(yearlyPlan, Month);
      if (!yearlyPlan.StatusHistory?.length) {
        seedInitialPlanStatus(
          yearlyPlan,
          yearlyPlan.ScheduleStatus || 'Tentative',
          createdBy,
        );
      }
      await yearlyPlan.save();
      const data = await this.yearlyPlanModel
        .findById(yearlyPlan._id)
        .populate(YEARLY_PLAN_POPULATE)
        .exec();
      return {
        status: true,
        message: 'The YearlyPlan is updated!',
        data: data!,
      };
    }

    const newYearlyPlan = new this.yearlyPlanModel({
      UserDepartment: departmentId,
      Year,
      Month: Month.map((m) => this.normalizeMonthEntry(m)),
      CreatedBy: createdBy,
      CreationDate: new Date(),
    });
    seedInitialPlanStatus(newYearlyPlan, 'Tentative', createdBy);

    const saved = await newYearlyPlan.save();
    const data = await this.yearlyPlanModel
      .findById(saved._id)
      .populate(YEARLY_PLAN_POPULATE)
      .exec();
    return { status: true, message: 'The YearlyPlan is added!', data: data! };
  }

  private normalizeMonthEntry(month: YearlyPlanMonthDto) {
    return {
      MonthName: month.MonthName,
      Trainings: month.Trainings.map((training) => ({
        Training: training.Training,
        WeekNumbers: [],
      })),
    };
  }

  private mergeMonthSchedule(
    yearlyPlan: YearlyTrainingPlanDocument,
    months: YearlyPlanMonthDto[],
  ): void {
    for (const month of months) {
      const existingMonth = yearlyPlan.Month.find(
        (m) => m.MonthName === month.MonthName,
      );

      if (!existingMonth) {
        yearlyPlan.Month.push(this.normalizeMonthEntry(month) as any);
      } else {
        month.Trainings.forEach((trainingObj) => {
          const trainingExist = existingMonth.Trainings.find((t) =>
            this.trainingsMatch(t.Training, trainingObj.Training),
          );
          if (!trainingExist) {
            existingMonth.Trainings.push({
              Training: trainingObj.Training,
              WeekNumbers: [],
            } as any);
          }
        });
      }
    }
  }

  async update(
    id: string,
    dto: UpdateYearlyTrainingPlanDto,
    actor?: { name?: string; email?: string },
  ): Promise<{
    status: boolean;
    message: string;
    data: YearlyTrainingPlanDocument;
  }> {
    const yearlyPlan = await this.yearlyPlanModel.findById(id).exec();
    if (!yearlyPlan) {
      throw new NotFoundException('This YearlyPlan is Not found!');
    }

    if (dto.departmentId !== undefined) {
      const department = await this.departmentModel.findById(dto.departmentId).exec();
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      yearlyPlan.UserDepartment = dto.departmentId as any;
    }
    if (dto.Year !== undefined) {
      yearlyPlan.Year = dto.Year;
    }
    if (dto.createdBy !== undefined) {
      yearlyPlan.CreatedBy = dto.createdBy;
    }
    if (dto.Month?.length) {
      this.mergeMonthSchedule(yearlyPlan, dto.Month);
    }

    if (!yearlyPlan.StatusHistory?.length) {
      seedInitialPlanStatus(
        yearlyPlan,
        yearlyPlan.ScheduleStatus || 'Tentative',
        dto.createdBy || actorDisplayName(actor),
      );
    }

    if (dto.ScheduleStatus !== undefined) {
      appendPlanStatusHistory(
        yearlyPlan,
        dto.ScheduleStatus,
        dto.createdBy || actorDisplayName(actor),
        dto.statusNote,
      );
    }

    await yearlyPlan.save();
    const data = await this.yearlyPlanModel
      .findById(id)
      .populate(YEARLY_PLAN_POPULATE)
      .exec();

    return {
      status: true,
      message: 'The YearlyPlan is updated!',
      data: data!,
    };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{
    status: boolean;
    message: string;
    data: YearlyTrainingPlanDocument[];
  }> {
    const plans = await this.yearlyPlanModel
      .find({ UserDepartment: departmentId })
      .populate(YEARLY_PLAN_POPULATE)
      .exec();
    return {
      status: true,
      message: 'The following are yearlyPlans!',
      data: plans,
    };
  }

  /**
   * List yearly plans for the authenticated user's company (all departments in that company).
   * Super-admin and super-staff: all plans.
   */
  async findForActor(actor: any): Promise<{
    status: boolean;
    message: string;
    data: YearlyTrainingPlanDocument[];
  }> {
    const plans = await this.yearlyPlanModel
      .find({})
      .populate(YEARLY_PLAN_POPULATE)
      .exec();
    return {
      status: true,
      message: 'The following are yearlyPlans!',
      data: plans,
    };
  }

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const plan = await this.yearlyPlanModel.findByIdAndDelete(id).exec();
    if (!plan) {
      throw new NotFoundException('This YearlyPlan is Not found!');
    }
    return {
      status: true,
      message: 'The Following YearlyPlan has been Deleted!',
    };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.yearlyPlanModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No YearlyPlans Found to Delete!');
    }
    return { status: true, message: 'All YearlyPlans have been deleted!' };
  }
}
