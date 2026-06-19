import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreventiveMaintenance } from './schemas/preventive-maintenance.schema';
import { Machinery } from '../machinery/schemas/machinery.schema';
import { User } from '../../admin-management/users/schemas/user.schema';
import { CreatePreventiveMaintenanceDto } from './dtos/create-preventive-maintenance.dto';
import { calculateNextMaintenanceDueDate } from '../utils/maintenance-dates.util';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class PreventiveMaintenanceService {
  constructor(
    @InjectModel(PreventiveMaintenance.name)
    private maintenanceModel: Model<PreventiveMaintenance>,
    @InjectModel(Machinery.name) private machineryModel: Model<Machinery>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    cloudinary.config({
      cloud_name: process.env.cloud_name,
      api_key: process.env.api_key,
      api_secret: process.env.api_secret,
    });
  }

  private uploadToCloudinary(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', timeout: 60000 },
        (error, result) => {
          if (error) reject(new Error('Failed to upload file to Cloudinary'));
          else resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  private parseUrlList(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value ? [value] : [];
    }
  }

  async create(
    dto: CreatePreventiveMaintenanceDto,
    imageFile?: Express.Multer.File,
  ) {
    const machine = await this.machineryModel.findById(dto.machineId);
    if (!machine) throw new NotFoundException('Machine not found');

    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const imageUrls = this.parseUrlList(dto.imageUrls);
    if (imageFile) {
      const result = await this.uploadToCloudinary(imageFile.buffer);
      imageUrls.push(result.secure_url);
    }

    const certificateUrls = this.parseUrlList(dto.certificateUrls);
    if (dto.generateCertificate && !certificateUrls.length) {
      certificateUrls.push(dto.generateCertificate);
    }

    const completedAt = new Date();
    const nextDate = calculateNextMaintenanceDueDate(dto.dateType, completedAt);
    const departmentId =
      dto.departmentId ||
      (machine.UserDepartment ? String(machine.UserDepartment) : undefined);

    const maintenance = new this.maintenanceModel({
      Machinery: dto.machineId,
      ...(departmentId ? { UserDepartment: departmentId } : {}),
      lastMaintainanceDate: completedAt,
      nextMaintainanceDate: nextDate,
      dateType: dto.dateType,
      natureOfFault: dto.natureOfFault,
      rootCause: dto.rootCause,
      detailOfWork: dto.detailOfWork,
      replacement: dto.replacement,
      uploadImage: imageUrls[0] || '',
      uploadImages: imageUrls,
      generateCertificate: certificateUrls[0] || '',
      certificates: certificateUrls,
      SubmitBy: user.name,
      SubmitDate: completedAt,
    });

    await maintenance.save();

    await this.machineryModel.findByIdAndUpdate(dto.machineId, {
      lastMaintenanceDate: completedAt,
      nextMaintenanceDueDate: nextDate,
    });

    return {
      status: true,
      message: 'Maintainance record added successfully',
      data: maintenance,
    };
  }

  async findAll(departmentId: string) {
    const records = await this.maintenanceModel
      .find({ UserDepartment: departmentId })
      .populate('Machinery')
      .populate('UserDepartment')
      .sort({ SubmitDate: -1 });
    return {
      status: true,
      message: 'Fetched all maintenance records successfully',
      data: records,
    };
  }

  async findByMachineId(machineId: string, departmentId?: string) {
    const query: Record<string, unknown> = { Machinery: machineId };
    if (departmentId) {
      query.UserDepartment = departmentId;
    }

    const records = await this.maintenanceModel
      .find(query)
      .populate('Machinery')
      .sort({ SubmitDate: -1 });
    return {
      status: true,
      message: 'Fetched maintenance records successfully',
      data: records,
    };
  }

  async findById(id: string) {
    const record = await this.maintenanceModel
      .findById(id)
      .populate('Machinery');
    if (!record)
      throw new NotFoundException(
        'No maintenance record found for the given Maintenance ID',
      );
    return {
      status: true,
      message: 'Fetched maintenance record successfully',
      data: record,
    };
  }

  async removeAll() {
    const result = await this.maintenanceModel.deleteMany();
    if (result.deletedCount === 0)
      throw new NotFoundException('No maintenance records found to delete.');
    return {
      status: true,
      message: `Successfully deleted ${result.deletedCount} maintenance records.`,
    };
  }

  async remove(id: string) {
    const result = await this.maintenanceModel.findByIdAndDelete(id);
    if (!result)
      throw new NotFoundException(
        'No maintenance record found for the given Maintenance ID to delete.',
      );
    return { status: true, message: 'Successfully deleted the maintenance record.' };
  }
}
