import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import {
  PersonRole,
  User,
  UserDocument,
  UserRoleType,
} from '../../admin-management/users/schemas/user.schema';
import {
  normalizeOptionalEmail,
  resolvePersonName,
} from '../../admin-management/users/utils/person-name.util';
import {
  Department,
  DepartmentDocument,
} from '../../admin-management/department/schemas/department.schema';
import {
  Training,
  TrainingDocument,
} from '../training/schemas/training.schema';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { Trainer, TrainerDocument } from '../trainer/schemas/trainer.schema';
import {
  InternalAuditor,
  InternalAuditorDocument,
} from '../../internal-audit/internal-auditor/schemas/internal-auditor.schema';
import { CreatePersonDto, CreatePersonRole } from './dtos/create-person.dto';
import {
  BulkImportEmployeeRowDto,
  BulkImportEmployeesDto,
} from './dtos/bulk-import-employees.dto';
import { actorCompanyIdString } from '../../auth/utils/request-actor.util';
import { CreateEmployeeDto } from './dtos/create-employee.dto';
import { EmployeeService } from './employee.service';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Training.name) private trainingModel: Model<TrainingDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Trainer.name) private trainerModel: Model<TrainerDocument>,
    @InjectModel(InternalAuditor.name)
    private internalAuditorModel: Model<InternalAuditorDocument>,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
    private readonly employeeService: EmployeeService,
  ) {}

  async bulkImport(
    dto: BulkImportEmployeesDto,
    actor: any,
  ): Promise<{
    status: boolean;
    imported: unknown[];
    failed: { index: number; reason: string; row: BulkImportEmployeeRowDto }[];
  }> {
    const companyId = actorCompanyIdString(actor);
    if (!companyId) {
      throw new ForbiddenException('Company context is required');
    }

    const imported: unknown[] = [];
    const failed: {
      index: number;
      reason: string;
      row: BulkImportEmployeeRowDto;
    }[] = [];

    for (let index = 0; index < dto.employees.length; index++) {
      const row = dto.employees[index];
      try {
        const departmentId = await this.resolveDepartmentIdForRow(
          row,
          companyId,
        );
        if (!departmentId) {
          throw new BadRequestException(
            'departmentId or matching departmentName is required',
          );
        }

        const rowEmail = normalizeOptionalEmail(row.email);
        if (rowEmail) {
          const duplicate = await this.userModel
            .findOne({ email: rowEmail })
            .select('_id')
            .lean();
          if (duplicate) {
            failed.push({
              index,
              reason: 'User with this email already exists',
              row,
            });
            continue;
          }
        }

        const payload: CreateEmployeeDto = {
          user: {
            firstName: String(row.firstName).trim(),
            lastName: String(row.lastName).trim(),
            ...(row.email ? { email: row.email } : {}),
            departmentId,
          },
          profile: {
            ...(row.profile ?? {}),
            gender: row.gender,
            designation: row.profile?.designation ?? row.designation,
            phoneNo: row.phoneNo ?? row.profile?.phoneNo,
            address: row.address ?? row.profile?.address,
            DOB: row.dob ?? row.profile?.DOB,
            identity:
              row.nationalIdentity?.trim()
                ? {
                    type: 'National Identity',
                    number: row.nationalIdentity.trim(),
                  }
                : row.profile?.identity,
          },
          employee: {
            designation: row.designation,
            ...(row.cv ? { cv: row.cv } : {}),
          },
        };

        const result = await this.employeeService.create(payload, actor);
        imported.push(result.data);
      } catch (err: unknown) {
        const reason =
          err instanceof Error
            ? err.message
            : typeof err === 'object' &&
                err !== null &&
                'message' in err
              ? String((err as { message: unknown }).message)
              : 'Import failed';
        failed.push({ index, reason, row });
      }
    }

    return { status: true, imported, failed };
  }

  async createPerson(dto: CreatePersonDto, actor: any) {
    const companyId = actorCompanyIdString(actor);
    if (!companyId) {
      throw new ForbiddenException('Company context is required');
    }

    const roles = [...new Set(dto.roles)] as CreatePersonRole[];
    if (!roles.length) {
      throw new BadRequestException('At least one role is required');
    }

    const resolvedName = resolvePersonName(dto.user);
    const normalizedEmail = normalizeOptionalEmail(dto.user.email);
    const needsLoginAccount = roles.some(
      (r) => r === 'trainer' || r === 'auditor',
    );

    if (needsLoginAccount && !normalizedEmail) {
      throw new BadRequestException(
        'Email is required when creating a trainer or auditor',
      );
    }

    if (roles.includes('employee') && !dto.user.departmentId) {
      throw new BadRequestException(
        'user.departmentId is required when employee role is included',
      );
    }

    if (roles.includes('auditor') && !dto.auditor?.roleInTeam) {
      throw new BadRequestException(
        'auditor.roleInTeam is required when auditor role is included',
      );
    }

    let userName = dto.user.userName?.trim();
    let passwordPlain = dto.user.password;

    if (needsLoginAccount) {
      if (!userName) {
        throw new BadRequestException(
          'user.userName is required for trainer or auditor roles',
        );
      }
      if (!passwordPlain || passwordPlain.length < 7) {
        throw new BadRequestException(
          'user.password (min 7 chars) is required for trainer or auditor roles',
        );
      }
    } else {
      userName =
        userName ||
        (await this.generateUniqueUserName(resolvedName.name));
      passwordPlain = passwordPlain || this.generateRandomPassword();
    }

    if (normalizedEmail) {
      const emailTaken = await this.userModel.findOne({
        email: normalizedEmail,
      });
      if (emailTaken) {
        throw new ConflictException('User with this email already exists');
      }
    }

    await this.assertTrainingsBelongToCompany(dto, companyId);

    const roleType = this.resolveRoleType(roles);
    const personRoles = roles as PersonRole[];

    const profilePayload = {
      ...dto.profile,
      docs: [
        ...(dto.profile.docs ?? []),
        ...(dto.trainerDocumentUrl?.trim()
          ? [{ label: 'Trainer document', url: dto.trainerDocumentUrl.trim() }]
          : []),
      ],
    };

    const actorUserId =
      actor?._id != null ? String(actor._id) : undefined;

    const result = await this.profileService.withTransaction(
      async (session) => {
        const u = await this.userService.createUserRecord(
          {
            name: resolvedName.name,
            firstName: resolvedName.firstName,
            lastName: resolvedName.lastName,
            email: normalizedEmail,
            userName: userName!,
            passwordPlain: passwordPlain!,
            roleType,
            companyId,
            departmentId: dto.user.departmentId,
            ...(dto.user.roleId ? { roleId: dto.user.roleId } : {}),
            personRoles,
          },
          session,
        );

        const profile = await this.profileService.createForUser(
          u._id,
          profilePayload,
          session,
        );

        let employeeDoc: EmployeeDocument | undefined;
        let trainerDoc: TrainerDocument | undefined;
        let auditorDoc: InternalAuditorDocument | undefined;

        if (roles.includes('employee')) {
          const trainings =
            dto.employee?.trainings?.map((t) => ({
              training: t.training
                ? new Types.ObjectId(t.training)
                : undefined,
            })) ?? [];
          employeeDoc = await new this.employeeModel({
            profileId: profile._id,
            designation: dto.employee?.designation,
            cv: dto.employee?.cv,
            trainings,
          }).save({ session });
        }

        if (roles.includes('trainer')) {
          const trainings =
            dto.trainer?.trainingIds?.map((id) => ({
              training: new Types.ObjectId(id),
            })) ?? [];
          trainerDoc = await new this.trainerModel({
            profileId: profile._id,
            specialities: dto.trainer?.specialities ?? [],
            trainings,
          }).save({ session });
        }

        if (roles.includes('auditor')) {
          auditorDoc = await new this.internalAuditorModel({
            profileId: profile._id,
            departmentId: dto.user.departmentId
              ? new Types.ObjectId(dto.user.departmentId)
              : undefined,
            roleInTeam: dto.auditor!.roleInTeam,
            auditorType: dto.auditor?.auditorType ?? 'internal',
            experience: dto.auditor?.experience,
            skills: dto.auditor?.skills ?? [],
            education: dto.auditor?.education,
            isApprovedAuditor: dto.auditor?.isApprovedAuditor ?? false,
            approvedAuditorLetter: dto.auditor?.approvedAuditorLetter,
            supportingDocuments: [],
            approvalDocuments: [],
            createdBy: actorUserId,
          }).save({ session });
        }

        return {
          user: u,
          profile,
          employee: employeeDoc,
          trainer: trainerDoc,
          auditor: auditorDoc,
          credentials: needsLoginAccount
            ? undefined
            : { userName: userName!, password: passwordPlain! },
        };
      },
    );

    return {
      status: true,
      message: 'Person created successfully',
      data: result,
    };
  }

  private resolveRoleType(roles: CreatePersonRole[]): UserRoleType {
    if (roles.includes('employee')) {
      return UserRoleType.COMPANY_EMPLOYEE;
    }
    if (roles.includes('trainer')) {
      return UserRoleType.COMPANY_TRAINER;
    }
    return UserRoleType.COMPANY_USER;
  }

  private async resolveDepartmentIdForRow(
    row: BulkImportEmployeeRowDto,
    companyId: string,
  ): Promise<string | undefined> {
    if (row.departmentId) {
      if (!Types.ObjectId.isValid(row.departmentId)) {
        throw new BadRequestException('Invalid departmentId');
      }
      const dept = await this.departmentModel.findById(row.departmentId).lean();
      if (!dept || String(dept.companyId) !== companyId) {
        throw new BadRequestException(
          'Department not found in your company',
        );
      }
      return row.departmentId;
    }

    const name = String(row.departmentName ?? '').trim();
    if (!name) {
      return undefined;
    }

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dept = await this.departmentModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        departmentName: { $regex: `^${escaped}$`, $options: 'i' },
      })
      .lean();
    if (!dept) {
      throw new BadRequestException(
        `Department "${name}" was not found in your company`,
      );
    }
    return String(dept._id);
  }

  private async assertTrainingsBelongToCompany(
    dto: CreatePersonDto,
    companyId: string,
  ) {
    const ids = [
      ...(dto.employee?.trainings?.map((t) => t.training).filter(Boolean) ??
        []),
      ...(dto.trainer?.trainingIds ?? []),
    ] as string[];

    if (!ids.length) return;

    const trainingObjectIds = ids.map((id) => {
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
}
