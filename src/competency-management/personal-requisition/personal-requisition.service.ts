// TEST/hr/personal-requisition/personal-requisition.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class PersonalRequisitionService {
  constructor(
    @InjectModel(PersonalRequisition.name)
    private requisitionModel: Model<PersonalRequisitionDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

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

    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const deptCompanyId = String(department.companyId);
    const companyIdFromToken = actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const companyIdStr = companyIdFromToken ?? deptCompanyId;

    const depLabel =
      department.departmentName ||
      (department as any).DepartmentName ||
      department.shortName ||
      '\u2014';

    const requisition = new this.requisitionModel({
      ...requisitionData,
      DepartmentText: depLabel,
      RequestBy: addedBy,
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

  async findByDepartment(departmentId: string): Promise<{
    status: boolean;
    message: string;
    data: PersonalRequisitionDocument[];
  }> {
    const dId = Types.ObjectId.isValid(departmentId)
      ? new Types.ObjectId(departmentId)
      : departmentId;
    const requisitions = await this.requisitionModel
      .find({ departmentId: dId })
      .populate('departmentId')
      .exec();
    return {
      status: true,
      message: 'The following are Required Person!',
      data: requisitions,
    };
  }

  async findByCompany(companyId: string): Promise<{
    status: boolean;
    message: string;
    data: PersonalRequisitionDocument[];
  }> {
    const cId = Types.ObjectId.isValid(companyId)
      ? new Types.ObjectId(companyId)
      : companyId;
    const requisitions = await this.requisitionModel
      .find({ companyId: cId })
      .populate('departmentId')
      .exec();
    return {
      status: true,
      message: 'The following are Required Person!',
      data: requisitions,
    };
  }

  async updateStatus(updateDto: UpdatePersonStatusDto): Promise<string> {
    const { personId, status, updatedBy, Reason } = updateDto;

    const reqPerson = await this.requisitionModel.findById(personId).exec();
    if (!reqPerson) {
      throw new NotFoundException('Person requisition not found');
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

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const deleted = await this.requisitionModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Person requisition not found');
    }
    return {
      status: true,
      message: 'Personal requisition deleted successfully',
    };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.requisitionModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No PersonalRequisitions Found to Delete!');
    }
    return {
      status: true,
      message: 'All PersonalRequisitions have been Deleted!',
    };
  }
}
