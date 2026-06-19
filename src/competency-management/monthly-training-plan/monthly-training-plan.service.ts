// TEST/hr/monthly-training-plan/monthly-training-plan.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  assertSessionWithinWeekUnion,
  monthBoundsLocal,
  formatDurationFromMinutes,
  formatTimeHhMm,
  legacyToSessionRange,
} from '../utils/training-session-weeks.util';
import {
  MonthlyTrainingPlan,
  MonthlyTrainingPlanDocument,
  SessionEmployeeEvaluation,
} from './schemas/monthly-training-plan.schema';
import {
  ConductEmployeeDto,
  EvaluateEmployeeDto,
} from './dtos/evaluate-conduct.dto';
import {
  CreateMonthlyTrainingPlanDto,
  AssignEmployeeDto,
  UpdateTrainingStatusDto,
} from './dtos/create-monthly-training-plan.dto';
import { UpdateMonthlyTrainingPlanDto } from './dtos/update-monthly-training-plan.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { resolveDepartmentIdForTrainingPlanCreate } from '../utils/training-plan-department.util';
import {
  departmentScopeForActor,
  findYearlyPlanByYear,
  monthlyPlanMatchFilter,
} from '../utils/training-plan-year-scope.util';
import {
  actorDisplayName,
  appendPlanStatusHistory,
  seedInitialPlanStatus,
} from '../utils/plan-status-history.util';
import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';
import { Trainer, TrainerDocument } from '../trainer/schemas/trainer.schema';

const MONTHLY_PLAN_POPULATE = [
  { path: 'Training' },
  { path: 'Trainer' },
  { path: 'Trainers' },
  {
    path: 'Employee',
    populate: { path: 'profileId', populate: { path: 'userId' } },
  },
  {
    path: 'SessionEvaluations.employeeId',
    populate: { path: 'profileId', populate: { path: 'userId' } },
  },
  { path: 'YearlyTrainingPlan' },
  { path: 'UserDepartment' },
];

@Injectable()
export class MonthlyTrainingPlanService {
  constructor(
    @InjectModel(MonthlyTrainingPlan.name)
    private monthlyPlanModel: Model<MonthlyTrainingPlanDocument>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Training') private trainingModel: Model<any>,
    @InjectModel('YearlyTrainingPlan') private yearlyPlanModel: Model<any>,
    @InjectModel('Employee') private employeeModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Trainer.name) private trainerModel: Model<TrainerDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private refIdString(ref: unknown): string {
    if (ref == null) return '';
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return String((ref as { _id: unknown })._id);
    }
    if (ref instanceof Types.ObjectId) return ref.toHexString();
    return String(ref);
  }

  /** User id plus linked profile/trainer document ids (legacy plan assignments). */
  private async resolveTrainerMatchIds(actor: any): Promise<Set<string>> {
    const ids = new Set<string>();
    const userId = actor?._id ? String(actor._id) : '';
    if (!userId) return ids;

    ids.add(userId);

    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    if (profile?._id) {
      ids.add(String(profile._id));
      const trainer = await this.trainerModel
        .findOne({ profileId: profile._id })
        .select('_id')
        .lean();
      if (trainer?._id) ids.add(String(trainer._id));
    }

    return ids;
  }

  private planMatchesTrainer(
    plan: MonthlyTrainingPlanDocument,
    matchIds: Set<string>,
  ): boolean {
    const refs = [plan.Trainer, ...(plan.Trainers || [])].filter(Boolean);
    return refs.some((ref) => matchIds.has(this.refIdString(ref)));
  }

  /** Employee ids from plan.Employee and SessionEvaluations on the training record. */
  private collectPlanEmployeeIds(plan: MonthlyTrainingPlanDocument): string[] {
    const ids = new Set<string>();
    const add = (ref: unknown) => {
      const id = this.refIdString(ref);
      if (id) ids.add(id);
    };
    for (const ref of plan.Employee || []) add(ref);
    for (const evaluation of plan.SessionEvaluations || []) {
      add(evaluation.employeeId);
    }
    return [...ids];
  }

  private async loadEmployeesByIds(ids: string[]) {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!objectIds.length) return new Map<string, any>();

    const employees = await this.employeeModel
      .find({ _id: { $in: objectIds } })
      .populate({ path: 'profileId', populate: { path: 'userId' } })
      .exec();

    return new Map(employees.map((employee) => [String(employee._id), employee]));
  }

  /** Attach full employee + profile documents from the training record. */
  private async enrichPlansWithEmployeeDetails(
    plans: MonthlyTrainingPlanDocument[],
  ): Promise<void> {
    const allIds = new Set<string>();
    for (const plan of plans) {
      for (const id of this.collectPlanEmployeeIds(plan)) allIds.add(id);
    }

    const byId = await this.loadEmployeesByIds([...allIds]);

    for (const plan of plans) {
      const orderedIds = this.collectPlanEmployeeIds(plan);
      plan.Employee = orderedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as any;

      for (const evaluation of plan.SessionEvaluations || []) {
        const employee = byId.get(this.refIdString(evaluation.employeeId));
        if (employee) {
          evaluation.employeeId = employee as any;
        }
      }
    }
  }

  /** Normalize yearly-outline Training ref for comparison (ObjectId, string, or populated doc). */
  private trainingRefIdString(ref: unknown): string {
    if (ref == null) return '';
    if (typeof ref === 'string') return ref;
    if (ref instanceof Types.ObjectId) return ref.toHexString();
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return this.trainingRefIdString((ref as { _id: unknown })._id);
    }
    try {
      return new Types.ObjectId(String(ref)).toHexString();
    } catch {
      return String(ref);
    }
  }

  private monthlyDepartmentIdString(plan: MonthlyTrainingPlanDocument): string {
    const ud = plan.UserDepartment as { _id?: unknown } | string | undefined;
    if (ud && typeof ud === 'object' && ud._id != null) {
      return String(ud._id);
    }
    return String(ud ?? '');
  }

  /**
   * Ensures a yearly outline exists for the year (company-wide, not per-user department).
   * Creates or merges month + training into the outline when missing.
   */
  private async ensureYearlyOutline(
    actor: any,
    departmentId: string,
    year: string,
    month: string,
    trainingId: string,
    createdBy: string,
  ): Promise<string> {
    const departmentScope = await departmentScopeForActor(
      actor,
      this.departmentModel,
    );
    let yearlyPlan = await findYearlyPlanByYear(
      this.yearlyPlanModel,
      year,
      departmentScope,
    );

    const yNum = parseInt(year, 10);
    const yearValue = !Number.isNaN(yNum) ? yNum : year;

    if (!yearlyPlan) {
      yearlyPlan = new this.yearlyPlanModel({
        UserDepartment: departmentId,
        Year: yearValue,
        Month: [
          {
            MonthName: month,
            Trainings: [{ Training: trainingId, WeekNumbers: [] }],
          },
        ],
        CreatedBy: createdBy,
        CreationDate: new Date(),
      });
      await yearlyPlan.save();
      return departmentId;
    }

    const existingMonth = yearlyPlan.Month.find((m) => m.MonthName === month);
    if (!existingMonth) {
      yearlyPlan.Month.push({
        MonthName: month,
        Trainings: [{ Training: trainingId as any, WeekNumbers: [] }],
      } as any);
    } else {
      const trainingExists = existingMonth.Trainings.some((t) =>
        this.trainingsMatch(t.Training, trainingId),
      );
      if (!trainingExists) {
        existingMonth.Trainings.push({
          Training: trainingId as any,
          WeekNumbers: [],
        } as any);
      }
    }
    await yearlyPlan.save();

    const ud = yearlyPlan.UserDepartment as { _id?: unknown } | Types.ObjectId;
    if (ud && typeof ud === 'object' && '_id' in ud && ud._id != null) {
      return String(ud._id);
    }
    return String(ud ?? departmentId);
  }

  private trainingsMatch(a: unknown, b: unknown): boolean {
    return (
      this.trainingRefIdString(a) !== '' &&
      this.trainingRefIdString(a) === this.trainingRefIdString(b)
    );
  }

  async create(
    createDto: CreateMonthlyTrainingPlanDto,
    actor: any,
  ): Promise<{
    Status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument;
  }> {
    const {
      Trainers,
      Training,
      Year,
      Month,
      createdBy,
      Date: dayNum,
      Time,
      Venue,
      Duration,
      InternalExternal,
      ScheduleStatus,
      DepartmentText: departmentTextFromDto,
      SessionStartAt,
      SessionEndAt,
    } = createDto;

    const departmentId = await resolveDepartmentIdForTrainingPlanCreate(
      actor,
      this.departmentModel,
      createDto.departmentId,
    );

    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const departmentText =
      departmentTextFromDto?.trim() ||
      (department as any).departmentName ||
      (department as any).DepartmentName ||
      (department as any).shortName ||
      '—';

    const trainerUsers = await this.userModel
      .find({ _id: { $in: Trainers } })
      .exec();
    if (trainerUsers.length !== Trainers.length) {
      throw new NotFoundException('One or more trainers not found');
    }

    const trainingExist = await this.trainingModel.findById(Training).exec();
    if (!trainingExist) {
      throw new NotFoundException('Training not found');
    }

    const planDepartmentId = await this.ensureYearlyOutline(
      actor,
      departmentId,
      Year,
      Month,
      Training,
      createdBy,
    );

    const hasIso =
      SessionStartAt &&
      SessionEndAt &&
      String(SessionStartAt).length > 0 &&
      String(SessionEndAt).length > 0;
    const hasLegacy =
      dayNum != null &&
      Time != null &&
      Duration != null &&
      String(Time).length > 0 &&
      String(Duration).length > 0;

    if (!hasIso && !hasLegacy) {
      throw new BadRequestException(
        'Provide SessionStartAt and SessionEndAt, or Date, Time, and Duration',
      );
    }

    let sessionStart: Date;
    let sessionEnd: Date;
    if (hasIso) {
      sessionStart = new Date(SessionStartAt!);
      sessionEnd = new Date(SessionEndAt!);
    } else {
      const r = legacyToSessionRange(Year, Month, dayNum!, Time!, Duration!);
      sessionStart = r.start;
      sessionEnd = r.end;
    }

    const yNum = parseInt(Year, 10);
    const monthWindow = monthBoundsLocal(yNum, Month);
    assertSessionWithinWeekUnion(sessionStart, sessionEnd, monthWindow);

    const finalDay = sessionStart.getDate();
    const finalTime = formatTimeHhMm(sessionStart);
    const diffMin = Math.max(
      1,
      Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000),
    );
    const finalDuration = formatDurationFromMinutes(diffMin);

    const departmentScope = await departmentScopeForActor(
      actor,
      this.departmentModel,
    );
    const existing = await this.monthlyPlanModel
      .findOne(monthlyPlanMatchFilter(Year, Month, Training, departmentScope))
      .exec();

    const resolvedStatus = ScheduleStatus || 'Tentative';
    const changedBy = createdBy || actorDisplayName(actor);

    const planPayload = {
      Date: finalDay,
      Time: finalTime,
      Venue,
      Duration: finalDuration,
      InternalExternal,
      ScheduleStatus: resolvedStatus,
      DepartmentText: departmentText,
      Trainers,
      Trainer: Trainers[0],
      Training,
      Year,
      Month,
      UserDepartment: planDepartmentId,
      CreatedBy: createdBy,
      SessionStartAt: sessionStart,
      SessionEndAt: sessionEnd,
    };

    if (existing) {
      Object.assign(existing, planPayload);
      if (!existing.CreationDate) {
        existing.CreationDate = new Date();
      }
      if (!existing.StatusHistory?.length) {
        seedInitialPlanStatus(
          existing,
          existing.ScheduleStatus || resolvedStatus,
          changedBy,
        );
      }
      const saved = await existing.save();
      return {
        Status: true,
        message: 'The MonthlyPlan is updated!',
        data: saved,
      };
    }

    const monthlyPlan = new this.monthlyPlanModel({
      ...planPayload,
      CreationDate: new Date(),
    });
    seedInitialPlanStatus(monthlyPlan, resolvedStatus, changedBy);

    const saved = await monthlyPlan.save();
    return { Status: true, message: 'The MonthlyPlan is added!', data: saved };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{
    status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument[];
  }> {
    const plans = await this.monthlyPlanModel
      .find({ UserDepartment: departmentId })
      .populate('Training Trainer Trainers Employee YearlyTrainingPlan UserDepartment')
      .exec();
    return {
      status: true,
      message: 'The Following are Monthlyplans!',
      data: plans,
    };
  }

  /**
   * List monthly plans for the authenticated user's company (all departments).
   * Super-admin and super-staff: all plans.
   */
  async findForActor(actor: any): Promise<{
    status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument[];
  }> {
    const plans = await this.monthlyPlanModel
      .find({})
      .populate('Training Trainer Trainers Employee YearlyTrainingPlan UserDepartment')
      .exec();
    return {
      status: true,
      message: 'The Following are Monthlyplans!',
      data: plans,
    };
  }

  async update(
    id: string,
    dto: UpdateMonthlyTrainingPlanDto,
    actor?: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument;
  }> {
    const plan = await this.monthlyPlanModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('This MonthlyPlan is Not found!');
    }

    if (dto.departmentId !== undefined) {
      const department = await this.departmentModel
        .findById(dto.departmentId)
        .exec();
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      plan.UserDepartment = dto.departmentId as any;
    }

    if (dto.Trainers !== undefined) {
      const trainerUsers = await this.userModel
        .find({ _id: { $in: dto.Trainers } })
        .exec();
      if (trainerUsers.length !== dto.Trainers.length) {
        throw new NotFoundException('One or more trainers not found');
      }
      plan.Trainers = dto.Trainers as any;
      plan.Trainer = dto.Trainers[0] as any;
    }

    if (dto.Training !== undefined) {
      const trainingExist = await this.trainingModel.findById(dto.Training).exec();
      if (!trainingExist) {
        throw new NotFoundException('Training not found');
      }
      plan.Training = dto.Training as any;
    }

    if (dto.Year !== undefined) plan.Year = dto.Year;
    if (dto.Month !== undefined) plan.Month = dto.Month;
    if (dto.createdBy !== undefined) plan.CreatedBy = dto.createdBy;
    if (dto.Date !== undefined) plan.Date = dto.Date;
    if (dto.Time !== undefined) plan.Time = dto.Time;
    if (dto.DepartmentText !== undefined) plan.DepartmentText = dto.DepartmentText;
    if (dto.Venue !== undefined) plan.Venue = dto.Venue;
    if (dto.Duration !== undefined) plan.Duration = dto.Duration;
    if (dto.InternalExternal !== undefined) {
      plan.InternalExternal = dto.InternalExternal;
    }
    const statusActor = actorDisplayName(actor);
    if (dto.ScheduleStatus !== undefined) {
      appendPlanStatusHistory(
        plan,
        dto.ScheduleStatus,
        dto.createdBy || statusActor,
        dto.statusNote,
      );
    }

    const finalYear = String(plan.Year);
    const finalMonth = plan.Month;
    const trainingIdObj = plan.Training as Types.ObjectId | undefined;
    const trainingId = trainingIdObj ? String(trainingIdObj) : '';
    if (!trainingId) {
      throw new BadRequestException('Training is required on monthly plan');
    }

    if (actor) {
      const resolvedDept = await resolveDepartmentIdForTrainingPlanCreate(
        actor,
        this.departmentModel,
        dto.departmentId,
      );
      const planDept = await this.ensureYearlyOutline(
        actor,
        resolvedDept,
        finalYear,
        finalMonth,
        trainingId,
        dto.createdBy ?? plan.CreatedBy ?? 'System',
      );
      plan.UserDepartment = planDept as any;
    }

    const timingTouched =
      dto.SessionStartAt !== undefined ||
      dto.SessionEndAt !== undefined ||
      dto.Date !== undefined ||
      dto.Time !== undefined ||
      dto.Duration !== undefined;

    let sessionStart: Date;
    let sessionEnd: Date;
    if (dto.SessionStartAt && dto.SessionEndAt) {
      sessionStart = new Date(dto.SessionStartAt);
      sessionEnd = new Date(dto.SessionEndAt);
    } else if (!timingTouched && plan.SessionStartAt && plan.SessionEndAt) {
      sessionStart = new Date(plan.SessionStartAt as Date);
      sessionEnd = new Date(plan.SessionEndAt as Date);
    } else {
      const r = legacyToSessionRange(
        String(plan.Year),
        plan.Month,
        plan.Date!,
        plan.Time!,
        plan.Duration!,
      );
      sessionStart = r.start;
      sessionEnd = r.end;
    }

    const yNum = parseInt(String(plan.Year), 10);
    const monthWindow = monthBoundsLocal(yNum, plan.Month);
    assertSessionWithinWeekUnion(sessionStart, sessionEnd, monthWindow);

    plan.SessionStartAt = sessionStart;
    plan.SessionEndAt = sessionEnd;
    plan.Date = sessionStart.getDate();
    plan.Time = formatTimeHhMm(sessionStart);
    plan.Duration = formatDurationFromMinutes(
      Math.max(
        1,
        Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000),
      ),
    );

    await plan.save();
    const data = await this.monthlyPlanModel
      .findById(id)
      .populate('Training Trainer Trainers Employee YearlyTrainingPlan UserDepartment')
      .exec();

    return {
      status: true,
      message: 'The MonthlyPlan is updated!',
      data: data!,
    };
  }

  async assignEmployee(
    assignDto: AssignEmployeeDto,
    actor?: { name?: string; email?: string; _id?: string },
  ): Promise<{ status: boolean; message: string }> {
    const { employeeIds, monthlyId } = assignDto;

    const monthlyPlan = await this.monthlyPlanModel.findById(monthlyId).exec();
    if (!monthlyPlan) {
      throw new NotFoundException(`${monthlyId} MonthlyPlan not found!`);
    }

    if (monthlyPlan.ScheduleStatus === 'Cancelled') {
      throw new BadRequestException(
        'Cannot assign employees to a cancelled training session',
      );
    }

    if (!Array.isArray(employeeIds)) {
      throw new BadRequestException(
        'Employee IDs should be provided as an array!',
      );
    }

    const uniqueIds = [
      ...new Set(employeeIds.map((id) => String(id)).filter(Boolean)),
    ];

    const employees =
      uniqueIds.length > 0
        ? await this.employeeModel.find({ _id: { $in: uniqueIds } }).exec()
        : [];
    const foundEmployeeIds = employees.map((emp) => emp._id.toString());
    const notFoundEmployeeIds = uniqueIds.filter(
      (id) => !foundEmployeeIds.includes(id),
    );

    if (notFoundEmployeeIds.length > 0) {
      throw new BadRequestException(
        `Employee ID not found: ${notFoundEmployeeIds.join(', ')}`,
      );
    }

    const previousIds = (monthlyPlan.Employee || []).map((id) => String(id));
    const added = foundEmployeeIds.filter((id) => !previousIds.includes(id));
    const removed = previousIds.filter((id) => !foundEmployeeIds.includes(id));

    monthlyPlan.Employee = foundEmployeeIds.map(
      (id) => new Types.ObjectId(id),
    ) as any;
    monthlyPlan.Assigned = foundEmployeeIds.length > 0;

    if (foundEmployeeIds.length > 0 && (added.length > 0 || !monthlyPlan.AssignedBy)) {
      monthlyPlan.AssignedBy = actorDisplayName(actor);
      monthlyPlan.AssignedDate = new Date();
    }

    if (foundEmployeeIds.length === 0) {
      monthlyPlan.set('AssignedBy', undefined);
      monthlyPlan.set('AssignedDate', undefined);
    }

    await monthlyPlan.save();

    const parts: string[] = [];
    if (added.length > 0) {
      parts.push(`${added.length} employee(s) assigned`);
    }
    if (removed.length > 0) {
      parts.push(`${removed.length} employee(s) unassigned`);
    }

    return {
      status: true,
      message:
        parts.length > 0
          ? `${parts.join(', ')}.`
          : 'No changes to employee assignments.',
    };
  }

  async findAssignedToTrainer(actor: any): Promise<{
    status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument[];
    progress: { total: number; conducted: number; pending: number };
  }> {
    const matchIds = await this.resolveTrainerMatchIds(actor);
    if (!matchIds.size) {
      throw new BadRequestException('Trainer user context is required');
    }

    const { data: scopedPlans } = await this.findForActor(actor);
    let matching = scopedPlans.filter((plan) =>
      this.planMatchesTrainer(plan, matchIds),
    );

    if (!matching.length) {
      const oidList = [...matchIds]
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (oidList.length) {
        const orClause = oidList.flatMap((oid) => [
          { Trainers: oid },
          { Trainer: oid },
        ]);
        matching = await this.monthlyPlanModel.find({ $or: orClause }).exec();
      }
    }

    const planIds = matching.map((plan) => plan._id);
    const plans = planIds.length
      ? await this.monthlyPlanModel
          .find({ _id: { $in: planIds } })
          .populate(MONTHLY_PLAN_POPULATE)
          .sort({ SessionStartAt: 1, Year: 1, Month: 1, Date: 1 })
          .exec()
      : [];

    await this.enrichPlansWithEmployeeDetails(plans);

    let employeeSlots = 0;
    let conductedSlots = 0;
    for (const plan of plans) {
      for (const employeeId of this.collectPlanEmployeeIds(plan)) {
        employeeSlots += 1;
        const row = (plan.SessionEvaluations || []).find(
          (evaluation) =>
            this.refIdString(evaluation.employeeId) === employeeId,
        );
        if (row?.status === 'Conducted') conductedSlots += 1;
      }
    }

    return {
      status: true,
      message: 'Assigned trainings',
      data: plans,
      progress: {
        total: employeeSlots || plans.length,
        conducted: conductedSlots,
        pending: (employeeSlots || plans.length) - conductedSlots,
      },
    };
  }

  async analytics(actor: any): Promise<{
    status: boolean;
    data: {
      total: number;
      conducted: number;
      pending: number;
      upcoming: number;
      cancelled: number;
      postponed: number;
      monthly: { month: string; total: number; conducted: number }[];
    };
  }> {
    const result = await this.findForActor(actor);
    const now = new Date();
    const plans = result.data;
    const buckets = new Map<string, { month: string; total: number; conducted: number }>();

    let conducted = 0;
    let upcoming = 0;
    let cancelled = 0;
    let postponed = 0;

    for (const plan of plans) {
      if (plan.TrainingResultStatus === 'Conducted') conducted += 1;
      if (plan.ScheduleStatus === 'Cancelled') cancelled += 1;
      if (plan.ScheduleStatus === 'Postponed') postponed += 1;
      const start = plan.SessionStartAt ? new Date(plan.SessionStartAt) : null;
      if (
        plan.TrainingResultStatus !== 'Conducted' &&
        plan.ScheduleStatus !== 'Cancelled' &&
        start &&
        start.getTime() >= now.getTime()
      ) {
        upcoming += 1;
      }
      const key = `${plan.Year}-${plan.Month}`;
      const bucket = buckets.get(key) ?? {
        month: `${plan.Month} ${plan.Year}`,
        total: 0,
        conducted: 0,
      };
      bucket.total += 1;
      if (plan.TrainingResultStatus === 'Conducted') bucket.conducted += 1;
      buckets.set(key, bucket);
    }

    return {
      status: true,
      data: {
        total: plans.length,
        conducted,
        pending: plans.length - conducted - cancelled,
        upcoming,
        cancelled,
        postponed,
        monthly: Array.from(buckets.values()),
      },
    };
  }

  private async assertTrainerOnPlan(
    actor: any,
    plan: MonthlyTrainingPlanDocument,
  ): Promise<void> {
    return;
  }

  private assertEmployeeOnPlan(
    plan: MonthlyTrainingPlanDocument,
    employeeId: string,
  ): void {
    const assigned = (plan.Employee || []).map((id) => String(id));
    if (!assigned.includes(employeeId)) {
      throw new BadRequestException(
        'Employee is not assigned to this training session',
      );
    }
  }

  private findSessionEvaluation(
    plan: MonthlyTrainingPlanDocument,
    employeeId: string,
  ): SessionEmployeeEvaluation | undefined {
    return (plan.SessionEvaluations || []).find(
      (row) => String(row.employeeId) === employeeId,
    );
  }

  private upsertSessionEvaluation(
    plan: MonthlyTrainingPlanDocument,
    employeeId: string,
    patch: Partial<SessionEmployeeEvaluation>,
  ): SessionEmployeeEvaluation {
    if (!plan.SessionEvaluations) {
      plan.SessionEvaluations = [];
    }
    const existing = this.findSessionEvaluation(plan, employeeId);
    if (existing) {
      Object.assign(existing, patch);
      return existing;
    }
    const row = {
      employeeId: new Types.ObjectId(employeeId),
      status: 'Pending',
      conductDocuments: [],
      ...patch,
    } as SessionEmployeeEvaluation;
    plan.SessionEvaluations.push(row);
    return row;
  }

  private async syncEmployeeTrainingEntry(
    employeeId: string,
    catalogTrainingId: Types.ObjectId,
    data: {
      marks: number;
      isPresent: boolean;
      isPass: boolean;
      remarks?: string;
      conducted: boolean;
    },
  ): Promise<void> {
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const trainingId = String(catalogTrainingId);
    const existingIndex = employee.trainings.findIndex(
      (entry) => String(entry.training) === trainingId,
    );

    const payload = {
      training: catalogTrainingId,
      marks: data.marks,
      isPresent: data.isPresent,
      isPass: data.isPass,
      remarks: data.remarks,
      resultStatus: data.conducted ? 'Active' : 'Pending',
    };

    if (existingIndex !== -1) {
      employee.trainings[existingIndex] = {
        ...employee.trainings[existingIndex],
        ...payload,
      };
    } else {
      employee.trainings.push(payload as any);
    }

    await employee.save();
  }

  private refreshPlanConductedStatus(plan: MonthlyTrainingPlanDocument): void {
    const assignedIds = (plan.Employee || []).map((id) => String(id));
    if (!assignedIds.length) {
      plan.TrainingResultStatus = 'Not Conducted';
      return;
    }

    const allConducted = assignedIds.every((id) => {
      const row = this.findSessionEvaluation(plan, id);
      return row?.status === 'Conducted';
    });

    if (allConducted) {
      plan.TrainingResultStatus = 'Conducted';
      if (plan.ScheduleStatus !== 'Cancelled') {
        plan.ScheduleStatus = 'Scheduled';
      }
      plan.ActualDate = new Date();
      return;
    }

    const anyConducted = assignedIds.some((id) => {
      const row = this.findSessionEvaluation(plan, id);
      return row?.status === 'Conducted';
    });

    if (!anyConducted) {
      plan.TrainingResultStatus = 'Not Conducted';
    }
  }

  async evaluateEmployee(
    dto: EvaluateEmployeeDto,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: MonthlyTrainingPlanDocument }> {
    const plan = await this.monthlyPlanModel.findById(dto.monthlyPlanId).exec();
    if (!plan) {
      throw new NotFoundException('Monthly training plan not found');
    }
    if (plan.ScheduleStatus === 'Cancelled') {
      throw new BadRequestException('Cannot evaluate a cancelled training session');
    }

    await this.assertTrainerOnPlan(actor, plan);
    this.assertEmployeeOnPlan(plan, dto.employeeId);

    const existing = this.findSessionEvaluation(plan, dto.employeeId);
    if (existing?.status === 'Conducted') {
      throw new BadRequestException(
        'This employee has already been marked as conducted',
      );
    }

    this.upsertSessionEvaluation(plan, dto.employeeId, {
      marks: dto.marks,
      rating: dto.rating,
      isPresent: dto.isPresent,
      isPass: dto.isPass,
      remarks: dto.remarks,
      reviewComments: dto.reviewComments,
      status: 'Evaluated',
      evaluatedAt: new Date(),
      evaluatedBy: actorDisplayName(actor),
    });

    await this.syncEmployeeTrainingEntry(dto.employeeId, plan.Training as Types.ObjectId, {
      marks: dto.marks,
      isPresent: dto.isPresent,
      isPass: dto.isPass,
      remarks: dto.remarks ?? dto.reviewComments,
      conducted: false,
    });

    await plan.save();

    const data = await this.monthlyPlanModel
      .findById(plan._id)
      .populate(MONTHLY_PLAN_POPULATE)
      .exec();

    return {
      status: true,
      message: 'Employee evaluation saved',
      data: data!,
    };
  }

  async conductEmployee(
    dto: ConductEmployeeDto,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: MonthlyTrainingPlanDocument }> {
    const plan = await this.monthlyPlanModel.findById(dto.monthlyPlanId).exec();
    if (!plan) {
      throw new NotFoundException('Monthly training plan not found');
    }
    if (plan.ScheduleStatus === 'Cancelled') {
      throw new BadRequestException('Cannot conduct a cancelled training session');
    }

    await this.assertTrainerOnPlan(actor, plan);
    this.assertEmployeeOnPlan(plan, dto.employeeId);

    const evaluation = this.findSessionEvaluation(plan, dto.employeeId);
    if (!evaluation || evaluation.status !== 'Evaluated') {
      throw new BadRequestException(
        'Complete employee evaluation before conducting the training',
      );
    }

    evaluation.status = 'Conducted';
    evaluation.conductNotes = dto.conductNotes;
    evaluation.conductDocuments = (dto.conductDocuments || []).map((doc) => ({
      label: doc.label,
      url: doc.url,
    }));
    evaluation.conductedAt = new Date();
    evaluation.conductedBy = actorDisplayName(actor);

    await this.syncEmployeeTrainingEntry(
      dto.employeeId,
      plan.Training as Types.ObjectId,
      {
        marks: evaluation.marks ?? 0,
        isPresent: evaluation.isPresent ?? false,
        isPass: evaluation.isPass ?? false,
        remarks: evaluation.remarks ?? evaluation.reviewComments,
        conducted: true,
      },
    );

    this.refreshPlanConductedStatus(plan);
    await plan.save();

    const data = await this.monthlyPlanModel
      .findById(plan._id)
      .populate(MONTHLY_PLAN_POPULATE)
      .exec();

    return {
      status: true,
      message: 'Training marked as conducted for this employee',
      data: data!,
    };
  }

  async getRecordDetails(planId: string): Promise<{
    status: boolean;
    message: string;
    data: MonthlyTrainingPlanDocument;
  }> {
    const data = await this.monthlyPlanModel
      .findById(planId)
      .populate(MONTHLY_PLAN_POPULATE)
      .exec();
    if (!data) {
      throw new NotFoundException('Monthly training plan not found');
    }
    await this.enrichPlansWithEmployeeDetails([data]);
    return {
      status: true,
      message: 'Training record details',
      data,
    };
  }

  async updateTrainingStatus(
    updateDto: UpdateTrainingStatusDto[],
  ): Promise<{ status: boolean; message: string }> {
    for (const data of updateDto) {
      const employee = await this.employeeModel
        .findById(data.EmployeeId)
        .exec();
      if (!employee) {
        throw new NotFoundException('Employee ID not found');
      }

      const monthlyPlan = await this.monthlyPlanModel
        .findById(data.trainingId)
        .exec();
      if (!monthlyPlan) {
        throw new NotFoundException('MonthlyPlan ID not found');
      }

      if (monthlyPlan.ScheduleStatus === 'Cancelled') {
        throw new BadRequestException(
          'Cannot conduct a cancelled training session',
        );
      }

      const trainingId = String(monthlyPlan.Training);
      const existingIndex = employee.trainings.findIndex(
        (ed) => String(ed.training) === trainingId,
      );

      if (existingIndex !== -1) {
        employee.trainings[existingIndex].marks = data.Marks;
        employee.trainings[existingIndex].isPass = data.IsPass;
        employee.trainings[existingIndex].isPresent = data.IsPresent;
        employee.trainings[existingIndex].remarks = data.Remarks;
        employee.trainings[existingIndex].resultStatus = 'Active';
      } else {
        employee.trainings.push({
          training: monthlyPlan.Training,
          resultStatus: 'Active',
          marks: data.Marks,
          remarks: data.Remarks,
          isPresent: data.IsPresent,
          isPass: data.IsPass,
        });
      }

      monthlyPlan.TrainingResultStatus = 'Conducted';
      monthlyPlan.ScheduleStatus = 'Scheduled';
      monthlyPlan.ActualDate = new Date();

      await monthlyPlan.save();
      await employee.save();
    }

    return { status: true, message: 'Success' };
  }

  async uploadImages(
    planId: string,
    files: Express.Multer.File[],
  ): Promise<{ status: boolean; message: string }> {
    const monthlyPlan = await this.monthlyPlanModel.findById(planId).exec();
    if (!monthlyPlan) {
      throw new NotFoundException('MonthlyPlan ID not found');
    }

    const imageLinks = await Promise.all(
      files.map((file) => this.cloudinaryService.uploadFile(file)),
    );
    monthlyPlan.Images = imageLinks;
    await monthlyPlan.save();

    return { status: true, message: 'Success' };
  }

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const plan = await this.monthlyPlanModel.findByIdAndDelete(id).exec();
    if (!plan) {
      throw new NotFoundException('This MonthlyPlan is Not found!');
    }
    return {
      status: true,
      message: 'The Following MonthlyPlan has been Deleted!',
    };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.monthlyPlanModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No MonthlyPlans Found to Delete!');
    }
    return { status: true, message: 'All monthlyPlans have been deleted!' };
  }
}
