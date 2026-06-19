import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import { User, UserDocument } from '../../admin-management/users/schemas/user.schema';
import { Profile, ProfileDocument } from '../../admin-management/profile/schemas/profile.schema';

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const { user, profile, supplier, departmentId, createdBy } = createSupplierDto;

    if (!user.companyId) {
      throw new BadRequestException('user.companyId is required');
    }

    if (departmentId) {
      const department = await this.departmentModel.findById(departmentId);
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    const emailTaken = await this.userModel.findOne({ email: user.email.toLowerCase() });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const saved = await this.profileService.withTransaction(async (session) => {
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

      const row = new this.supplierModel({
        profileId: p._id,
        departmentId: departmentId ? new Types.ObjectId(departmentId) : undefined,
        contactNo: supplier.contactNo ?? [],
        contactPerson: supplier.contactPerson,
        productServiceOffered: supplier.productServiceOffered ?? [],
        riskCategory: supplier.riskCategory,
        dueAt: supplier.dueAt ? new Date(supplier.dueAt) : undefined,
        currentApprovalAt: supplier.currentApprovalAt
          ? new Date(supplier.currentApprovalAt)
          : undefined,
        nextApprovalAt: supplier.nextApprovalAt ? new Date(supplier.nextApprovalAt) : undefined,
        createdBy,
      });
      return row.save({ session });
    });

    const populated = await this.supplierModel
      .findById(saved._id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .populate('departmentId')
      .exec();

    return { status: true, message: 'Supplier document created successfully', data: populated! };
  }

  async findByDepartment(departmentId: string): Promise<{ status: boolean; data: SupplierDocument[] }> {
    const suppliers = await this.supplierModel
      .find({ departmentId: departmentId as any })
      .populate('departmentId')
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();
    return { status: true, data: suppliers };
  }

  async findOne(id: string): Promise<{ status: boolean; data: SupplierDocument }> {
    const supplier = await this.supplierModel
      .findById(id)
      .populate({
        path: 'profileId',
        populate: { path: 'userId' },
      })
      .exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier document with ID: ${id} not found`);
    }
    return { status: true, data: supplier };
  }

  async remove(id: string): Promise<{ status: boolean; message: string }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier document with ID: ${id} not found`);
    }

    await this.profileService.withTransaction(async (session) => {
      await this.supplierModel.deleteOne({ _id: supplier._id }).session(session);
      const profile = await this.profileModel.findById(supplier.profileId).session(session);
      if (profile) {
        await this.userModel.deleteOne({ _id: profile.userId }).session(session);
        await this.profileModel.deleteOne({ _id: profile._id }).session(session);
      }
    });

    return { status: true, message: 'Supplier document deleted successfully' };
  }

  async removeAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.supplierModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Supplier documents found to delete!');
    }
    return { status: true, message: 'All Supplier documents have been deleted!' };
  }

  async approve(id: string, approvedBy: string): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    if (supplier.approvalStatus === 'approved') {
      throw new BadRequestException('Supplier is already approved.');
    }

    const updated = await this.supplierModel
      .findByIdAndUpdate(
        id,
        {
          approvalDate: new Date(),
          approvalStatus: 'approved',
          approvedBy,
          disapprovalDate: undefined,
          disapprovedBy: undefined,
          disapprovalReason: undefined,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Supplier not found.');
    }

    return { status: true, message: 'The Supplier has been marked as approved.', data: updated };
  }

  async disapprove(
    id: string,
    disapprovedBy: string,
    reason: string,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    if (supplier.approvalStatus === 'approved') {
      throw new BadRequestException('Supplier is already approved.');
    }

    const updated = await this.supplierModel
      .findByIdAndUpdate(
        id,
        {
          disapprovalDate: new Date(),
          approvalStatus: 'disapproved',
          disapprovalReason: reason,
          disapprovedBy,
          approvalDate: undefined,
          approvedBy: undefined,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Supplier not found.');
    }

    return { status: true, message: 'The Supplier has been disapproved.', data: updated };
  }
}
