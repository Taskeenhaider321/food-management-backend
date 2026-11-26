// TEST/tech/equipment/equipment.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import {
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';
import {
  assertActorMayAccessMaintenanceRecord,
  maintenanceCompanyFilter,
  requireActorCompanyId,
} from '../common/maintenance-tenant.util';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name)
    private equipmentModel: Model<EquipmentDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
  ) {}

  async create(
    createDto: CreateEquipmentDto,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const { createdBy, equipmentName, equipmentLocation, Range, callibration } =
      createDto;

    if (!equipmentName || !equipmentLocation || !callibration || !Range) {
      throw new BadRequestException('All fields are required.');
    }

    const companyId = requireActorCompanyId(actor, createDto.companyId);

    const creationDate = new Date();
    const normalizedCalibration = initializeCalibrationConfig(
      normalizeEquipmentCalibration(callibration),
      creationDate,
    );

    const equipment = new this.equipmentModel({
      companyId,
      equipmentName,
      equipmentLocation,
      Range,
      callibration: normalizedCalibration,
      CreatedBy: createdBy || actor?.name || actor?.userName,
      CreationDate: creationDate,
    });

    const saved = await equipment.save();
    return { status: true, message: 'The Equipment is added!', data: saved };
  }

  async findAll(actor: any): Promise<{
    status: boolean;
    message: string;
    data: EquipmentDocument[];
  }> {
    const equipment = await this.equipmentModel
      .find(maintenanceCompanyFilter(actor))
      .sort({ created_at: -1 })
      .exec();
    return {
      status: true,
      message: 'Successfully retrieved all equipment!',
      data: equipment,
    };
  }

  async findByDepartment(
    departmentId: string,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument[] }> {
    const equipment = await this.equipmentModel
      .find({
        ...maintenanceCompanyFilter(actor),
        UserDepartment: departmentId,
      })
      .populate('UserDepartment')
      .sort({ created_at: -1 })
      .exec();
    return {
      status: true,
      message: 'Successfully retrieved all equipment!',
      data: equipment,
    };
  }

  async update(
    id: string,
    updateDto: UpdateEquipmentDto,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const equipment = await this.equipmentModel.findById(id).exec();
    assertActorMayAccessMaintenanceRecord(actor, equipment, 'Equipment');

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
      equipment.callibration = mergeCalibrationConfig(
        existing,
        incoming,
        creationDate,
      );
    }
    if (updateDto.CreationDate !== undefined) {
      equipment.CreationDate = new Date(updateDto.CreationDate);
    }

    const saved = await equipment.save();
    return {
      status: true,
      message: 'Equipment updated successfully',
      data: saved,
    };
  }

  async findOne(
    id: string,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: EquipmentDocument }> {
    const equipment = await this.equipmentModel.findById(id).exec();
    assertActorMayAccessMaintenanceRecord(actor, equipment, 'Equipment');
    return { status: true, message: 'Equipment found!', data: equipment };
  }

  async remove(
    id: string,
    actor: any,
  ): Promise<{ status: boolean; message: string }> {
    const equipment = await this.equipmentModel.findById(id).exec();
    assertActorMayAccessMaintenanceRecord(actor, equipment, 'Equipment');
    await this.equipmentModel.deleteOne({ _id: equipment._id }).exec();
    return { status: true, message: 'Equipment successfully deleted!' };
  }

  async removeAll(actor: any): Promise<{ status: boolean; message: string }> {
    const result = await this.equipmentModel
      .deleteMany(maintenanceCompanyFilter(actor))
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Equipment found to delete!');
    }
    return { status: true, message: 'All Equipment have been deleted!' };
  }

  private mapEquipmentPdfRow(e: EquipmentDocument) {
    return {
      equipmentCode: e.equipmentCode || '---',
      equipmentName: e.equipmentName || '---',
      equipmentLocation: e.equipmentLocation || '---',
      Range: e.Range || '---',
      CreatedBy: e.CreatedBy || '---',
      CreationDate: formatDate(e.CreationDate),
    };
  }

  async downloadEquipmentPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAll(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Equipment Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'equipmentCode', label: 'CODE', width: 1.2 },
        { key: 'equipmentName', label: 'NAME', width: 2.5 },
        { key: 'equipmentLocation', label: 'LOCATION', width: 1.8 },
        { key: 'Range', label: 'RANGE', width: 1.5 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.5 },
        { key: 'CreationDate', label: 'CREATED', width: 1.2 },
      ],
      rows: data.map((e) => this.mapEquipmentPdfRow(e)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('equipment', 'directory'),
    };
  }

  async downloadEquipmentByIdPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: equipment } = await this.findOne(id, actor);
    const row = this.mapEquipmentPdfRow(equipment);

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: equipment.equipmentName || 'Equipment',
      subtitle: equipment.equipmentCode,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Equipment Code', row.equipmentCode],
        ['Equipment Name', row.equipmentName],
        ['Location', row.equipmentLocation],
        ['Range', row.Range],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        equipment.equipmentName || equipment.equipmentCode || 'equipment',
        'equipment',
      ),
    };
  }
}
