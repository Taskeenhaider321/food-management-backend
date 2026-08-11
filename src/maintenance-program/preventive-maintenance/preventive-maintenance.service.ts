import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreventiveMaintenance } from './schemas/preventive-maintenance.schema';
import { Machinery } from '../machinery/schemas/machinery.schema';
import { User } from '../../admin-management/users/schemas/user.schema';
import { CreatePreventiveMaintenanceDto } from './dtos/create-preventive-maintenance.dto';
import {
  UpdatePreventiveMaintenanceDto,
  VerifyMaintenanceDto,
} from './dtos/verify-preventive-maintenance.dto';
import { calculateNextMaintenanceDueDate } from '../utils/maintenance-dates.util';
import {
  buildVerificationChecklist,
  validateVerificationChecklist,
} from '../common/maintenance-verification.util';
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

  private async getEditableRecord(id: string) {
    const record = await this.maintenanceModel.findById(id);
    if (!record) {
      throw new NotFoundException(
        'No maintenance record found for the given Maintenance ID',
      );
    }
    if (record.Status === 'Verified') {
      throw new BadRequestException(
        'Verified maintenance records cannot be modified.',
      );
    }
    return record;
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

    const submittedAt = new Date();
    const nextDate = calculateNextMaintenanceDueDate(dto.dateType, submittedAt);
    const departmentId =
      dto.departmentId ||
      (machine.UserDepartment ? String(machine.UserDepartment) : undefined);

    const maintenance = new this.maintenanceModel({
      Machinery: dto.machineId,
      ...(departmentId ? { UserDepartment: departmentId } : {}),
      lastMaintainanceDate: submittedAt,
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
      SubmitDate: submittedAt,
      Status: 'In Review',
    });

    await maintenance.save();

    return {
      status: true,
      message: 'Maintenance record submitted and is now In Review.',
      data: maintenance,
    };
  }

  async update(
    id: string,
    dto: UpdatePreventiveMaintenanceDto,
    imageFile?: Express.Multer.File,
  ) {
    const record = await this.getEditableRecord(id);

    if (dto.dateType) record.dateType = dto.dateType;
    if (dto.natureOfFault !== undefined)
      record.natureOfFault = dto.natureOfFault;
    if (dto.rootCause !== undefined) record.rootCause = dto.rootCause;
    if (dto.detailOfWork !== undefined) record.detailOfWork = dto.detailOfWork;
    if (dto.replacement !== undefined) record.replacement = dto.replacement;

    const imageUrls = this.parseUrlList(dto.imageUrls);
    if (imageFile) {
      const result = await this.uploadToCloudinary(imageFile.buffer);
      imageUrls.push(result.secure_url);
    }
    if (imageUrls.length) {
      record.uploadImages = imageUrls;
      record.uploadImage = imageUrls[0] || '';
    }

    const certificateUrls = this.parseUrlList(dto.certificateUrls);
    if (certificateUrls.length) {
      record.certificates = certificateUrls;
      record.generateCertificate = certificateUrls[0] || '';
    }

    if (dto.dateType) {
      record.nextMaintainanceDate = calculateNextMaintenanceDueDate(
        dto.dateType,
        record.lastMaintainanceDate || new Date(),
      );
    }

    await record.save();

    return {
      status: true,
      message: 'Maintenance record updated successfully.',
      data: record,
    };
  }

  async verify(id: string, dto: VerifyMaintenanceDto) {
    const record = await this.getEditableRecord(id);
    validateVerificationChecklist(dto.checklist);

    const user = await this.userModel.findById(dto.verifiedBy);
    const verifiedByName = user?.name || String(dto.verifiedBy);
    const verifiedAt = new Date();

    record.Status = 'Verified';
    record.verificationChecklist = buildVerificationChecklist(dto.checklist);
    record.VerifiedBy = verifiedByName;
    record.VerificationDate = verifiedAt;

    await record.save();

    if (record.Machinery) {
      await this.machineryModel.findByIdAndUpdate(record.Machinery, {
        lastMaintenanceDate: record.lastMaintainanceDate || verifiedAt,
        nextMaintenanceDueDate: record.nextMaintainanceDate,
      });
    }

    return {
      status: true,
      message: 'Maintenance record verified successfully.',
      data: record,
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
    return {
      status: true,
      message: 'Successfully deleted the maintenance record.',
    };
  }
}
