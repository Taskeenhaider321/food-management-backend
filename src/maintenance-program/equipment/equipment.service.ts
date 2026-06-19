// TEST/tech/equipment/equipment.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';
import { CreateEquipmentDto } from './dtos/create-equipment.dto';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import {
  initializeCalibrationConfig,
  mergeCalibrationConfig,
  normalizeEquipmentCalibration,
} from '../utils/equipment-calibration.util';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name) private equipmentModel: Model<EquipmentDocument>,
  ) {}

  async create(createDto: CreateEquipmentDto): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const { createdBy, equipmentName, equipmentLocation, Range, callibration } = createDto;

    if (!equipmentName || !equipmentLocation || !callibration || !Range) {
      throw new BadRequestException('All fields are required.');
    }

    const creationDate = new Date();
    const normalizedCalibration = initializeCalibrationConfig(
      normalizeEquipmentCalibration(callibration),
      creationDate,
    );

    const equipment = new this.equipmentModel({
      equipmentName,
      equipmentLocation,
      Range,
      callibration: normalizedCalibration,
      CreatedBy: createdBy,
      CreationDate: creationDate,
    });

    const saved = await equipment.save();
    return { status: true, message: 'The Equipment is added!', data: saved };
  }

  async findAll(): Promise<{ status: boolean; message: string; data: EquipmentDocument[] }> {
    const equipment = await this.equipmentModel
      .find()
      .sort({ created_at: -1 })
      .exec();
    return { status: true, message: 'Successfully retrieved all equipment!', data: equipment };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument[] }> {
    const equipment = await this.equipmentModel
      .find({ UserDepartment: departmentId })
      .populate('UserDepartment')
      .sort({ created_at: -1 })
      .exec();
    return { status: true, message: 'Successfully retrieved all equipment!', data: equipment };
  }

  async update(
    id: string,
    updateDto: UpdateEquipmentDto,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    if (updateDto.equipmentName !== undefined) {
      equipment.equipmentName = updateDto.equipmentName;
    }
    if (updateDto.equipmentLocation !== undefined) {
      equipment.equipmentLocation = updateDto.equipmentLocation;
    }
    if (updateDto.Range !== undefined) {
      equipment.Range = updateDto.Range;
    }
    if (updateDto.callibration !== undefined) {
      const creationDate = equipment.CreationDate || new Date();
      const existing = normalizeEquipmentCalibration(equipment.callibration);
      const incoming = normalizeEquipmentCalibration(updateDto.callibration);
      equipment.callibration = mergeCalibrationConfig(existing, incoming, creationDate);
    }
    if (updateDto.CreationDate !== undefined) {
      equipment.CreationDate = new Date(updateDto.CreationDate);
    }

    const saved = await equipment.save();
    return { status: true, message: 'Equipment updated successfully', data: saved };
  }

  async findOne(id: string): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    return { status: true, message: 'Equipment found!', data: equipment };
  }

  async remove(id: string): Promise<{ status: boolean; message: string }> {
    const equipment = await this.equipmentModel.findByIdAndDelete(id).exec();
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    return { status: true, message: 'Equipment successfully deleted!' };
  }

  async removeAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.equipmentModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Equipment found to delete!');
    }
    return { status: true, message: 'All Equipment have been deleted!' };
  }
}
