import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkRequest } from './schemas/work-request.schema';
import { Machinery } from '../machinery/schemas/machinery.schema';
import { Equipment } from '../equipment/schemas/equipment.schema';
import { User } from '../../admin-management/users/schemas/user.schema';
import {
  CreateWorkRequestDto,
  RejectWorkRequestDto,
  AcceptWorkRequestDto,
  CompleteWorkRequestDto,
  ChangePriorityDto,
  ResubmitWorkRequestDto,
} from './dtos/create-work-request.dto';
import { UpdateWorkRequestDto } from './dtos/update-work-request.dto';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class WorkRequestService {
  constructor(
    @InjectModel(WorkRequest.name) private workRequestModel: Model<WorkRequest>,
    @InjectModel(Machinery.name) private machineryModel: Model<Machinery>,
    @InjectModel(Equipment.name) private equipmentModel: Model<Equipment>,
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
        { resource_type: 'auto' },
        (error, result) => {
          if (error) reject(new Error('Failed to upload file to Cloudinary'));
          else resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  private async resolveUserName(userId: string, fallback: string) {
    const user = await this.userModel.findById(userId);
    if (!user) return fallback;
    return (user as any).name || (user as any).email || fallback;
  }

  private async uploadMany(files: Express.Multer.File[]) {
    const urls: string[] = [];
    for (const file of files) {
      const uploaded = await this.uploadToCloudinary(file.buffer);
      if (uploaded?.secure_url) urls.push(uploaded.secure_url);
    }
    return urls;
  }

  async create(
    dto: CreateWorkRequestDto,
    imageFiles: Express.Multer.File[],
    documentFiles: Express.Multer.File[],
  ) {
    const hasMachine = Boolean(dto.MachineId);
    const hasEquipment = Boolean(dto.EquipmentId);
    if (!hasMachine && !hasEquipment) {
      throw new BadRequestException('MachineId or EquipmentId is required.');
    }
    if (hasMachine && hasEquipment) {
      throw new BadRequestException('Provide only one of MachineId or EquipmentId.');
    }

    if (dto.MachineId) {
      const machinery = await this.machineryModel.findById(dto.MachineId);
      if (!machinery) throw new NotFoundException('Machinery not found.');
    }
    if (dto.EquipmentId) {
      const equipment = await this.equipmentModel.findById(dto.EquipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');
    }

    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const inferredDepartmentId = dto.departmentId || (user as any).departmentId;

    if (!imageFiles?.length) {
      throw new BadRequestException('At least one image for the work request is required.');
    }

    const imageURLs = await this.uploadMany(imageFiles);
    const documentURLs = documentFiles?.length ? await this.uploadMany(documentFiles) : [];

    const workRequest = new this.workRequestModel({
      Area: dto.Area,
      Priority: dto.Priority,
      Discipline: JSON.parse(dto.Discipline),
      Description: dto.Description,
      SpecialInstruction: dto.SpecialInstruction,
      imageURLs,
      documentURLs,
      ...(inferredDepartmentId
        ? { UserDepartment: inferredDepartmentId, Department: inferredDepartmentId }
        : {}),
      Machinery: dto.MachineId,
      Equipment: dto.EquipmentId,
      CreatedBy: user.name,
      CreationDate: new Date(),
      Date: new Date(),
      Time: new Date(),
      History: [
        {
          type: 'Request Created',
          user: user.name,
          at: new Date(),
        },
      ],
    });

    await workRequest.save();
    return { status: true, message: 'The Maintenance Work Request (MWR) has been added successfully!', data: workRequest };
  }

  async reject(id: string, dto: RejectWorkRequestDto) {
    if (!dto.Reason || dto.Reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required.');
    }

    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');

    const rejectedByName = await this.resolveUserName(dto.rejectedBy, String(dto.rejectedBy));

    mwr.Reason = dto.Reason;
    mwr.Status = 'Rejected';
    mwr.RejectedBy = rejectedByName;
    mwr.RejectionDate = new Date();
    mwr.AcceptedBy = 'Pending';
    mwr.AcceptionDate = undefined;
    mwr.CompletedBy = 'Pending';
    mwr.CompletionDate = undefined;
    mwr.History = [
      ...(mwr.History || []),
      {
        type: 'Rejected',
        user: rejectedByName,
        at: new Date(),
        comment: dto.Reason,
      },
    ];

    await mwr.save();
    return { status: true, message: 'The Maintenance Work Request has been rejected successfully.', data: mwr };
  }

  async accept(id: string, dto: AcceptWorkRequestDto) {
    if (!dto.JobAssigned || !dto.Designation || !dto.DetailOfWork) {
      throw new BadRequestException('All fields (JobAssigned, Designation, DetailOfWork) are required.');
    }

    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');

    const acceptedByName = await this.resolveUserName(dto.acceptedBy, String(dto.acceptedBy));

    mwr.JobAssigned = dto.JobAssigned;
    mwr.Designation = dto.Designation;
    mwr.DetailOfWork = dto.DetailOfWork;
    mwr.StartTime = new Date();
    mwr.Status = 'Approved';
    mwr.AcceptedBy = acceptedByName;
    mwr.AcceptionDate = new Date();
    mwr.RejectedBy = undefined;
    mwr.RejectionDate = undefined;
    mwr.CompletedBy = 'Pending';
    mwr.CompletionDate = undefined;
    mwr.History = [
      ...(mwr.History || []),
      {
        type: 'Accepted',
        user: acceptedByName,
        at: new Date(),
      },
      {
        type: 'Started',
        user: acceptedByName,
        at: new Date(),
      },
    ];

    await mwr.save();
    return { status: true, message: 'The Maintenance Work Request has been accepted successfully.', data: mwr };
  }

  async complete(
    id: string,
    dto: CompleteWorkRequestDto,
    completionImages: Express.Multer.File[],
    completionDocuments: Express.Multer.File[],
  ) {
    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');

    if (mwr.Status === 'Completed') {
      throw new BadRequestException('Maintenance Work Request is already completed.');
    }

    const completedByName = await this.resolveUserName(dto.completedBy, String(dto.completedBy));

    const completionImageURLs = completionImages?.length
      ? await this.uploadMany(completionImages)
      : [];
    const completionDocumentURLs = completionDocuments?.length
      ? await this.uploadMany(completionDocuments)
      : [];

    mwr.EndTime = new Date();
    mwr.Status = 'Completed';
    mwr.CompletedBy = completedByName;
    mwr.CompletionDate = new Date();
    mwr.CompletionRemarks = dto.CompletionRemarks || mwr.CompletionRemarks;
    mwr.completionImageURLs = completionImageURLs;
    mwr.completionDocumentURLs = completionDocumentURLs;
    mwr.History = [
      ...(mwr.History || []),
      {
        type: 'Completed',
        user: completedByName,
        at: new Date(),
        comment: dto.CompletionRemarks,
      },
    ];

    await mwr.save();
    return { status: true, message: 'The Maintenance Work Request has been marked as completed.', data: mwr };
  }

  async changePriority(id: string, dto: ChangePriorityDto) {
    if (!dto.Reason || dto.Reason.trim() === '') {
      throw new BadRequestException('Reason is required for priority change.');
    }

    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');

    const changedByName = await this.resolveUserName(dto.changedBy, String(dto.changedBy));
    const prev = mwr.Priority;
    mwr.Priority = dto.Priority;
    mwr.History = [
      ...(mwr.History || []),
      {
        type: 'Priority Changed',
        user: changedByName,
        at: new Date(),
        comment: dto.Reason,
        from: prev,
        to: dto.Priority,
      },
    ];
    await mwr.save();
    return { status: true, message: 'Priority changed successfully.', data: mwr };
  }

  async resubmit(id: string, dto: ResubmitWorkRequestDto) {
    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');
    if (mwr.Status !== 'Rejected') {
      throw new BadRequestException('Only rejected requests can be resubmitted.');
    }

    const resubmittedByName = await this.resolveUserName(
      dto.resubmittedBy,
      String(dto.resubmittedBy),
    );

    mwr.Status = 'Pending';
    mwr.History = [
      ...(mwr.History || []),
      {
        type: 'Resubmitted',
        user: resubmittedByName,
        at: new Date(),
      },
    ];

    await mwr.save();
    return { status: true, message: 'Work request resubmitted successfully.', data: mwr };
  }

  async update(
    id: string,
    dto: UpdateWorkRequestDto,
    imageFiles: Express.Multer.File[],
    documentFiles: Express.Multer.File[],
  ) {
    const mwr = await this.workRequestModel.findById(id);
    if (!mwr) throw new NotFoundException('Maintenance Work Request not found.');

    if (mwr.Status !== 'Pending' && mwr.Status !== 'Rejected') {
      throw new BadRequestException('Only pending or rejected requests can be edited.');
    }

    if (dto.MachineId && dto.EquipmentId) {
      throw new BadRequestException('Provide only one of MachineId or EquipmentId.');
    }

    if (dto.departmentId) {
      (mwr as any).UserDepartment = dto.departmentId;
      (mwr as any).Department = dto.departmentId;
    }

    if (dto.MachineId) {
      const machinery = await this.machineryModel.findById(dto.MachineId);
      if (!machinery) throw new NotFoundException('Machinery not found.');
      (mwr as any).Machinery = dto.MachineId;
      (mwr as any).Equipment = undefined;
    }

    if (dto.EquipmentId) {
      const equipment = await this.equipmentModel.findById(dto.EquipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');
      (mwr as any).Equipment = dto.EquipmentId;
      (mwr as any).Machinery = undefined;
    }

    if (dto.Area) (mwr as any).Area = dto.Area;
    if (dto.Priority) (mwr as any).Priority = dto.Priority;
    if (dto.Description) (mwr as any).Description = dto.Description;
    if (dto.SpecialInstruction) (mwr as any).SpecialInstruction = dto.SpecialInstruction;
    if (dto.Discipline) (mwr as any).Discipline = JSON.parse(String(dto.Discipline));

    const imageURLs = imageFiles?.length ? await this.uploadMany(imageFiles) : [];
    const documentURLs = documentFiles?.length ? await this.uploadMany(documentFiles) : [];

    if (imageURLs.length) {
      (mwr as any).imageURLs = imageURLs;
    }
    if (documentURLs.length) {
      (mwr as any).documentURLs = documentURLs;
    }

    const updatedByName = dto.userId
      ? await this.resolveUserName(String(dto.userId), String(dto.userId))
      : 'System';

    (mwr as any).History = [
      ...((mwr as any).History || []),
      { type: 'Updated', user: updatedByName, at: new Date() },
    ];

    await mwr.save();
    return { status: true, message: 'Work request updated successfully.', data: mwr };
  }

  async findAll(departmentId?: string) {
    const filter = departmentId ? { UserDepartment: departmentId } : {};
    const workRequests = await this.workRequestModel
      .find(filter)
      .populate('Department')
      .populate('Machinery')
      .populate('Equipment')
      .populate('UserDepartment');
    return { status: true, message: 'All work requests retrieved successfully', data: workRequests };
  }

  async findById(id: string) {
    const workRequest = await this.workRequestModel
      .findById(id)
      .populate('Machinery Equipment Department');
    if (!workRequest) throw new NotFoundException('Work request not found.');
    return { status: true, message: `Work request with ID ${id} retrieved successfully`, data: workRequest };
  }

  async findByMachineId(machineId: string, departmentId: string) {
    const workRequest = await this.workRequestModel
      .find({ Machinery: machineId, UserDepartment: departmentId })
      .populate('Machinery');
    return { status: true, message: `Work request with ID ${machineId} retrieved successfully`, data: workRequest };
  }

  async removeAll() {
    await this.workRequestModel.deleteMany({});
    return { status: true, message: 'All work requests deleted successfully' };
  }

  async remove(id: string) {
    const result = await this.workRequestModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Work request not found.');
    return { status: true, message: `Work request with ID ${id} deleted successfully` };
  }
}
