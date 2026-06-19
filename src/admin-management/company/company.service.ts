import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../users/user.service';
import { Company, CompanyDocument } from './schemas/company.schema';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { Types } from 'mongoose';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(
    dto: CreateCompanyDto,
    userId?: string,
  ): Promise<{ status: boolean; message: string; data: any }> {
    try {
      const { admin, ...companyFields } = dto;
      const createdByObjectId = userId ? new Types.ObjectId(userId) : undefined;
      const company = new this.companyModel({
        companyName: companyFields.companyName,
        shortName: companyFields.shortName,
        address: companyFields.address ?? '',
        contactNo: companyFields.contactNo ?? '',
        email: companyFields.email,
        companyLogo: companyFields.companyLogo ?? '',
        status: companyFields.status,
        createdBy: createdByObjectId,
      });
      const saved = await company.save();
      const companyId = saved._id.toString();

      let adminUser: any;
      if (admin) {
        adminUser = await this.userService.createUserRecord({
          name: admin.name,
          email: admin.email,
          userName: admin.userName,
          passwordPlain: admin.password,
          roleType: 'super-admin',
          companyId,
        });
      }

      return {
        status: true,
        message: 'Company created successfully',
        data: {
          company: saved,
          ...(adminUser
            ? {
                admin: {
                  _id: adminUser._id,
                  userName: adminUser.userName,
                  email: adminUser.email,
                },
              }
            : {}),
        },
      };
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Company name or short name already exists',
        );
      }
      throw error;
    }
  }

  async findAll(
    userId?: string,
  ): Promise<{ status: boolean; data: CompanyDocument[] }> {
    const companies = await this.companyModel.find().exec();
    return { status: true, data: companies };
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<{ status: boolean; data: CompanyDocument }> {
    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return { status: true, data: company };
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId?: string,
  ): Promise<{ status: boolean; message: string; data: CompanyDocument }> {
    const company = await this.companyModel
      .findByIdAndUpdate(id, updateCompanyDto, { returnDocument: 'after' })
      .exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return {
      status: true,
      message: 'Company updated successfully',
      data: company,
    };
  }

  async delete(
    id: string,
    userId?: string,
  ): Promise<{ status: boolean; message: string }> {
    const company = await this.companyModel.findByIdAndDelete(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    await this.departmentModel.deleteMany({ companyId: id }).exec();
    await this.userModel.deleteMany({ companyId: id }).exec();
    return { status: true, message: 'Company deleted successfully' };
  }

  async deleteAll(
    userId?: string,
  ): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.companyModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No companies found to delete');
    }
    return { status: true, message: 'All companies deleted', data: result };
  }
}
