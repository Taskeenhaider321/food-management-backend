import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PersonalRequisition,
  PersonalRequisitionDocument,
} from './schemas/personal-requisition.schema';
import {
  CreatePersonalRequisitionDto,
  UpdatePersonStatusDto,
} from './dtos/create-personal-requisition.dto';
import {
  assertActorMayAccessCompanyResource,
  assertActorMayAccessDepartment,
  isGlobalCompetencyActor,
} from '../utils/competency-tenant.util';
import { actorCompanyIdString } from '../../auth/utils/request-actor.util';

@Injectable()
export class PersonalRequisitionService {
  constructor(
    @InjectModel(PersonalRequisition.name)
    private requisitionModel: Model<PersonalRequisitionDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

  private isOwnScopeActor(actor: any): boolean {
    const selfOnlyRoles = new Set([
      'company-user',
      'company-trainer',
      'company-employee',
    ]);
    return Boolean(actor?._id && selfOnlyRoles.has(actor?.roleType));
  }

  async create(
    createDto: CreatePersonalRequisitionDto,
    actor: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: PersonalRequisitionDocument;
  }> {
    if (!actor) {
      throw new BadRequestException('Authentication required');
    }
    const { departmentId, addedBy, ...requisitionData } = createDto;

    await assertActorMayAccessDepartment(
      actor,
      this.departmentModel,
      departmentId,
    );

    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const deptCompanyId = String(department.companyId);
    const companyIdFromToken = actorCompanyIdString(actor);
    const companyIdStr = companyIdFromToken ?? deptCompanyId;

    if (!isGlobalCompetencyActor(actor) && companyIdFromToken) {
      assertActorMayAccessCompanyResource(actor, deptCompanyId);
    }

    const depLabel =
      department.departmentName ||
      department.DepartmentName ||
      department.shortName ||
      '\u2014';

    const requisition = new this.requisitionModel({
      ...requisitionData,
      DepartmentText: depLabel,
      RequestBy: addedBy,
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
      departmentId: new Types.ObjectId(departmentId),
      companyId: new Types.ObjectId(companyIdStr),
      RequestDate: new Date(),
    });

    const saved = await requisition.save();
    return {
      status: true,
      message: 'The Required Person is Added!',
      data: saved,
    };
  }

  async findByDepartment(
    departmentId: string,
    actor?: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: PersonalRequisitionDocument[];
  }> {
    if (actor) {
      await assertActorMayAccessDepartment(
        actor,
        this.departmentModel,
        departmentId,
      );
    }

    const dId = Types.ObjectId.isValid(departmentId)
      ? new Types.ObjectId(departmentId)
      : departmentId;

    const selfOnly = this.isOwnScopeActor(actor);

    const requisitionFilter: Record<string, any> = { departmentId: dId };
    if (selfOnly) {
      requisitionFilter.createdByUserId = new Types.ObjectId(String(actor._id));
    }

    const requisitions = await this.requisitionModel
      .find(requisitionFilter)
      .populate('departmentId')
      .exec();

    return {
      status: true,
      message: 'The following are Required Person!',
      data: requisitions,
    };
  }

  async findByCompany(
    companyId: string,
    actor?: any,
  ): Promise<{
    status: boolean;
    message: string;
    data: PersonalRequisitionDocument[];
  }> {
    if (actor) {
      assertActorMayAccessCompanyResource(actor, companyId);
    }

    const cId = Types.ObjectId.isValid(companyId)
      ? new Types.ObjectId(companyId)
      : companyId;

    const selfOnly = this.isOwnScopeActor(actor);

    const requisitionFilter: Record<string, any> = { companyId: cId };
    if (selfOnly) {
      requisitionFilter.createdByUserId = new Types.ObjectId(String(actor._id));
    }

    const requisitions = await this.requisitionModel
      .find(requisitionFilter)
      .populate('departmentId')
      .exec();

    return {
      status: true,
      message: 'The following are Required Person!',
      data: requisitions,
    };
  }

  async updateStatus(
    updateDto: UpdatePersonStatusDto,
    actor?: any,
  ): Promise<string> {
    const { personId, status, updatedBy, Reason } = updateDto;

    const reqPerson = await this.requisitionModel.findById(personId).exec();
    if (!reqPerson) {
      throw new NotFoundException('Person requisition not found');
    }

    if (actor) {
      assertActorMayAccessCompanyResource(actor, reqPerson.companyId);
      if (this.isOwnScopeActor(actor)) {
        const createdBy = reqPerson.createdByUserId
          ? String(reqPerson.createdByUserId)
          : null;
        if (createdBy && String(actor._id) !== createdBy) {
          throw new ForbiddenException('Forbidden');
        }
      }
    }

    if (status === 'Approved') {
      reqPerson.Status = 'Approved';
      reqPerson.ApprovedBy = updatedBy;
      reqPerson.ApprovalDate = new Date();
    } else if (status === 'Disapproved') {
      reqPerson.Status = 'Disapproved';
      reqPerson.Reason = Reason;
      reqPerson.DisapprovedBy = updatedBy;
      reqPerson.DisapprovalDate = new Date();
    }

    await reqPerson.save();
    return 'Success';
  }

  async delete(
    id: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string }> {
    const target = await this.requisitionModel.findById(id).exec();
    if (!target) {
      throw new NotFoundException('Person requisition not found');
    }

    if (actor) {
      assertActorMayAccessCompanyResource(actor, target.companyId);

      if (this.isOwnScopeActor(actor)) {
        const createdBy = target.createdByUserId
          ? String(target.createdByUserId)
          : null;
        if (createdBy && String(actor._id) !== createdBy) {
          throw new ForbiddenException('Forbidden');
        }
      }
    }

    await this.requisitionModel.findByIdAndDelete(id).exec();
    return {
      status: true,
      message: 'Personal requisition deleted successfully',
    };
  }

  async deleteAll(actor?: any): Promise<{ status: boolean; message: string }> {
    if (!actor) {
      throw new ForbiddenException('Authentication required');
    }

    if (this.isOwnScopeActor(actor)) {
      throw new ForbiddenException('Forbidden');
    }

    let filter: Record<string, unknown> = {};
    if (!isGlobalCompetencyActor(actor)) {
      const companyId = actorCompanyIdString(actor);
      if (!companyId) {
        throw new ForbiddenException('Company context is required');
      }
      filter = { companyId: new Types.ObjectId(companyId) };
    }

    const result = await this.requisitionModel.deleteMany(filter).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No PersonalRequisitions Found to Delete!');
    }
    return {
      status: true,
      message: 'All PersonalRequisitions have been Deleted!',
    };
  }
}
