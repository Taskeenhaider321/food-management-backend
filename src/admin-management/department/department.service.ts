import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { DepartmentItemDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  /**
   * Next codes for this company only: D01, D02, … (continues after max existing D##).
   */
  private async nextDepartmentCodes(
    companyObjectId: Types.ObjectId,
    count: number,
  ): Promise<string[]> {
    const existing = await this.departmentModel
      .find({ companyId: companyObjectId })
      .select('departmentCode')
      .lean()
      .exec();

    let max = 0;
    const re = /^D(\d+)$/i;
    for (const row of existing) {
      const code = (row as { departmentCode?: string }).departmentCode;
      if (!code || typeof code !== 'string') continue;
      const m = re.exec(String(code).trim());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      max += 1;
      codes.push(`D${String(max).padStart(2, '0')}`);
    }
    return codes;
  }

  async createBulk(
    departments: DepartmentItemDto[],
    companyId: string,
  ): Promise<DepartmentDocument[]> {
    const companyObjectId = new Types.ObjectId(companyId);
    const codes = await this.nextDepartmentCodes(
      companyObjectId,
      departments.length,
    );

    const departmentsToCreate = departments.map((dept, i) => ({
      ...dept,
      companyId: companyObjectId,
      departmentCode: codes[i],
      status: dept.status ?? 'active',
    }));

    return await this.departmentModel.insertMany(departmentsToCreate);
  }

  async findAllForUser(
    companyId: string,
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    items: DepartmentDocument[];
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const cid = new Types.ObjectId(companyId);
    const page = Math.max(1, Number(query?.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit ?? 10) || 10));
    const search = String(query?.search ?? '').trim();
    const status = String(query?.status ?? '')
      .trim()
      .toLowerCase();
    const sortBy = String(query?.sortBy ?? '').trim();
    const sortOrder = query?.sortOrder === 'desc' ? -1 : 1;

    const filter: Record<string, any> = { companyId: cid };
    if (status) {
      const allowed = new Set(['active', 'inactive', 'paused']);
      if (!allowed.has(status)) {
        throw new BadRequestException('Invalid status filter');
      }
      filter.status = status;
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { departmentName: rx },
        { shortName: rx },
        { departmentCode: rx },
        { status: rx },
      ];
    }

    const sortableFields = new Set([
      'departmentCode',
      'departmentName',
      'shortName',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const sortField = sortableFields.has(sortBy) ? sortBy : 'departmentCode';

    const [items, totalItems] = await Promise.all([
      this.departmentModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.departmentModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string, companyId: string): Promise<DepartmentDocument> {
    const department = await this.departmentModel
      .findById(id)
      .populate('companyId')
      .where('companyId')
      .equals(new Types.ObjectId(companyId))
      .exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async findByCompany(companyId: string): Promise<DepartmentDocument[]> {
    return this.departmentModel
      .find({ companyId })
      .populate('companyId')
      .exec();
  }

  async analytics(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    paused: number;
    recentlyCreated: number;
  }> {
    const cid = new Types.ObjectId(companyId);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [total, active, inactive, paused, recentlyCreated] =
      await Promise.all([
        this.departmentModel.countDocuments({ companyId: cid }).exec(),
        this.departmentModel
          .countDocuments({ companyId: cid, status: 'active' })
          .exec(),
        this.departmentModel
          .countDocuments({ companyId: cid, status: 'inactive' })
          .exec(),
        this.departmentModel
          .countDocuments({ companyId: cid, status: 'paused' })
          .exec(),
        this.departmentModel
          .countDocuments({ companyId: cid, created_at: { $gte: since } })
          .exec(),
      ]);

    return { total, active, inactive, paused, recentlyCreated };
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    actor?: any,
  ): Promise<DepartmentDocument> {
    const existing = await this.departmentModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    const department = await this.departmentModel
      .findByIdAndUpdate(id, updateDepartmentDto, { returnDocument: 'after' })
      .populate('companyId')
      .exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async delete(id: string): Promise<void> {
    const result = await this.departmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Department not found');
    }
    await this.userModel.deleteMany({ Department: id }).exec();
  }
}
