import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Machinery, MachineryDocument } from './schemas/machinery.schema';
import { CreateMachineryDto } from './dtos/create-machinery.dto';
import { UpdateMachineryDto } from './dtos/update-machinery.dto';
import {
  calculateNextMaintenanceDueDate,
  getFrequencyType,
} from '../utils/maintenance-dates.util';

@Injectable()
export class MachineryService {
  constructor(
    @InjectModel(Machinery.name) private machineryModel: Model<MachineryDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

  async create(
    createDto: CreateMachineryDto,
  ): Promise<{ status: boolean; message: string; data: MachineryDocument }> {
    const {
      departmentId,
      createdBy,
      machineName,
      machinaryLocation,
      maintenanceFrequency,
    } = createDto;

    if (departmentId) {
      const department = await this.departmentModel.findById(departmentId).exec();
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    const creationDate = new Date();
    const nextMaintenanceDueDate = calculateNextMaintenanceDueDate(
      getFrequencyType(maintenanceFrequency),
      creationDate,
    );

    const machinery = new this.machineryModel({
      machineName,
      ...(departmentId ? { UserDepartment: departmentId } : {}),
      machinaryLocation,
      maintenanceFrequency,
      CreatedBy: createdBy,
      CreationDate: creationDate,
      nextMaintenanceDueDate,
    });

    const saved = await machinery.save();
    return { status: true, message: 'The Machinery is added!', data: saved };
  }

  async update(
    id: string,
    updateDto: UpdateMachineryDto,
  ): Promise<{ status: boolean; message: string; data: MachineryDocument }> {
    const machinery = await this.machineryModel.findById(id).exec();
    if (!machinery) {
      throw new NotFoundException('Machinery not found');
    }

    if (updateDto.machineName !== undefined) {
      machinery.machineName = updateDto.machineName;
    }
    if (updateDto.machinaryLocation !== undefined) {
      machinery.machinaryLocation = updateDto.machinaryLocation;
    }
    if (updateDto.maintenanceFrequency !== undefined) {
      machinery.maintenanceFrequency = updateDto.maintenanceFrequency;
      const referenceDate =
        machinery.lastMaintenanceDate || machinery.CreationDate || new Date();
      machinery.nextMaintenanceDueDate = calculateNextMaintenanceDueDate(
        getFrequencyType(updateDto.maintenanceFrequency),
        referenceDate,
      );
    }
    if (updateDto.CreationDate !== undefined) {
      machinery.CreationDate = new Date(updateDto.CreationDate);
    }
    if (updateDto.lastMaintenanceDate !== undefined) {
      machinery.lastMaintenanceDate = new Date(updateDto.lastMaintenanceDate);
    }
    if (updateDto.nextMaintenanceDueDate !== undefined) {
      machinery.nextMaintenanceDueDate = new Date(updateDto.nextMaintenanceDueDate);
    }

    const saved = await machinery.save();
    return { status: true, message: 'Machinery updated successfully', data: saved };
  }

  async findAll(): Promise<{ status: boolean; message: string; data: MachineryDocument[] }> {
    const machinery = await this.machineryModel
      .find()
      .sort({ created_at: -1 })
      .exec();
    return { status: true, message: 'All machinery fetched successfully', data: machinery };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{ status: boolean; message: string; data: MachineryDocument[] }> {
    const machinery = await this.machineryModel
      .find({ UserDepartment: departmentId })
      .populate('UserDepartment')
      .sort({ created_at: -1 })
      .exec();
    return { status: true, message: 'The following are Machinery!', data: machinery };
  }

  async findOne(
    id: string,
  ): Promise<{ status: boolean; message: string; data: MachineryDocument }> {
    const machinery = await this.machineryModel.findById(id).exec();
    if (!machinery) {
      throw new NotFoundException('Machinery not found');
    }
    return { status: true, message: 'Machinery found', data: machinery };
  }

  async remove(id: string): Promise<{ status: boolean; message: string }> {
    const machinery = await this.machineryModel.findByIdAndDelete(id).exec();
    if (!machinery) {
      throw new NotFoundException('Machinery not found');
    }
    return { status: true, message: 'Machinery deleted successfully' };
  }

  async removeAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.machineryModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No machinery found to delete!');
    }
    return { status: true, message: 'All machinery have been deleted!' };
  }
}
