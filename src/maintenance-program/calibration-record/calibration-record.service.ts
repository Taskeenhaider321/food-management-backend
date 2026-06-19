import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalibrationRecord } from './schemas/calibration-record.schema';
import { Equipment } from '../equipment/schemas/equipment.schema';
import { User } from '../../admin-management/users/schemas/user.schema';
import { Company } from '../../admin-management/company/schemas/company.schema';
import { CreateCalibrationRecordDto } from './dtos/create-calibration-record.dto';
import {
  normalizeEquipmentCalibration,
  updateCalibrationEntryAfterRecord,
} from '../utils/equipment-calibration.util';
import { v2 as cloudinary } from 'cloudinary';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';

@Injectable()
export class CalibrationRecordService {
  constructor(
    @InjectModel(CalibrationRecord.name)
    private calibrationRecordModel: Model<CalibrationRecord>,
    @InjectModel(Equipment.name) private equipmentModel: Model<Equipment>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
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

  private addFirstPage(
    page: any,
    logoImage: any,
    company: any,
    user: any,
    equipmentCode: string,
  ) {
    const { width, height } = page.getSize();
    const logoDims = { width: 300, height: 300 };
    const centerTextX = width / 2;

    page.drawImage(logoImage, {
      x: centerTextX - logoDims.width / 2,
      y: height - 400,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  private async processPDF(
    fileBuffer: Buffer,
    companyLogo: string,
    companyName: string,
    userName: string,
    equipmentCode: string,
    watermarkText: string,
  ): Promise<Buffer> {
    const response = await axios.get(companyLogo, {
      responseType: 'arraybuffer',
    });
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const logoImage = Buffer.from(response.data);

    const isJpg = companyLogo.includes('.jpeg') || companyLogo.includes('.jpg');
    const isPng = companyLogo.includes('.png');
    let pdfLogoImage;

    if (isJpg) pdfLogoImage = await pdfDoc.embedJpg(logoImage);
    else if (isPng) pdfLogoImage = await pdfDoc.embedPng(logoImage);

    const firstPage = pdfDoc.insertPage(0);
    const company = { CompanyName: companyName };
    const user = { Name: userName };
    this.addFirstPage(firstPage, pdfLogoImage, company, user, equipmentCode);

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc
      .getPages()
      .slice(1)
      .forEach((page) => {
        const { width, height } = page.getSize();
        const extraSpace = 24;
        page.setSize(width, height + extraSpace);
        page.translateContent(0, -extraSpace);

        const watermarkFontSize = 15;
        const watermarkTextWidth = helveticaFont.widthOfTextAtSize(
          watermarkText,
          watermarkFontSize,
        );
        page.drawText(watermarkText, {
          x: width / 2 - watermarkTextWidth / 2,
          y: height + extraSpace - 10,
          size: watermarkFontSize,
          color: rgb(0, 0, 0),
        });

        const companyTextFontSize = 10;
        const companyTextWidth = helveticaFont.widthOfTextAtSize(
          companyName,
          companyTextFontSize,
        );
        page.drawText(companyName, {
          x: width - companyTextWidth - 20,
          y: height + extraSpace,
          size: companyTextFontSize,
          color: rgb(0, 0, 0),
        });

        const dateText = `Device ID : ${equipmentCode}`;
        const dateTextWidth = helveticaFont.widthOfTextAtSize(
          dateText,
          companyTextFontSize,
        );
        page.drawText(dateText, {
          x: width - dateTextWidth - 20,
          y: height + extraSpace - 12,
          size: companyTextFontSize,
          color: rgb(0, 0, 0),
        });
      });

    return Buffer.from(await pdfDoc.save());
  }

  async create(
    equipmentId: string,
    dto: CreateCalibrationRecordDto,
    files?: {
      Image?: Express.Multer.File[];
      Certificate?: Express.Multer.File[];
      exCertificate?: Express.Multer.File[];
      masterCertificate?: Express.Multer.File[];
    },
  ) {
    const uploads = files ?? {};
    const equipment = await this.equipmentModel.findById(equipmentId);
    if (!equipment) throw new NotFoundException('Equipment not found');

    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const company = dto.companyId
      ? await this.companyModel.findById(dto.companyId)
      : null;

    let ImageURL = dto.imageUrl || '';
    let CertificateURL = dto.certificateUrl || '';
    let exCertificateURL = dto.exCertificateUrl || '';
    let masterCertificateURL = dto.masterCertificateUrl || '';

    if (uploads.Image?.[0]) {
      const result = await this.uploadToCloudinary(uploads.Image[0].buffer);
      ImageURL = result.secure_url;
    }

    if (uploads.Certificate?.[0]) {
      if (company) {
        const modifiedPdf = await this.processPDF(
          uploads.Certificate[0].buffer,
          company.companyLogo,
          company.companyName,
          user.name,
          equipment.equipmentCode,
          'Certificate',
        );
        const result = await this.uploadToCloudinary(modifiedPdf);
        CertificateURL = result.secure_url;
      } else {
        const result = await this.uploadToCloudinary(uploads.Certificate[0].buffer);
        CertificateURL = result.secure_url;
      }
    }

    if (uploads.exCertificate?.[0]) {
      if (company) {
        const modifiedPdf = await this.processPDF(
          uploads.exCertificate[0].buffer,
          company.companyLogo,
          company.companyName,
          user.name,
          equipment.equipmentCode,
          'External Certificate',
        );
        const result = await this.uploadToCloudinary(modifiedPdf);
        exCertificateURL = result.secure_url;
      } else {
        const result = await this.uploadToCloudinary(uploads.exCertificate[0].buffer);
        exCertificateURL = result.secure_url;
      }
    }

    if (uploads.masterCertificate?.[0]) {
      if (company) {
        const modifiedPdf = await this.processPDF(
          uploads.masterCertificate[0].buffer,
          company.companyLogo,
          company.companyName,
          user.name,
          equipment.equipmentCode,
          'Master Certificate',
        );
        const result = await this.uploadToCloudinary(modifiedPdf);
        masterCertificateURL = result.secure_url;
      } else {
        const result = await this.uploadToCloudinary(uploads.masterCertificate[0].buffer);
        masterCertificateURL = result.secure_url;
      }
    }

    const calibrationRecord = new this.calibrationRecordModel({
      Equipment: equipmentId,
      lastCallibrationDate: new Date(dto.lastDate.replace(/^"(.*)"$/, '$1')),
      nextCallibrationDate: new Date(dto.nextDate.replace(/^"(.*)"$/, '$1')),
      CaliberateBy: user.name,
      ...(equipment.UserDepartment ? { UserDepartment: equipment.UserDepartment } : {}),
      CaliberatDate: new Date(),
      dateType: dto.dateType,
      callibrationType: dto.callibrationType,
      CR: dto.CR,
      comment: dto.comment,
      measuredReading: {
        firstReading: dto.firstReading,
        secondReading: dto.secondReading,
        thirdReading: dto.thirdReading,
      },
      internal: { ImageURL, CertificateURL, masterCertificateURL },
      external: {
        companyName: dto.companyName,
        masterReference: dto.masterReference,
        exCertificateURL,
      },
    });

    await calibrationRecord.save();

    const completedAt = new Date(dto.lastDate.replace(/^"(.*)"$/, '$1'));
    const calibrationType = dto.callibrationType as 'Internal' | 'External';
    const updatedConfig = updateCalibrationEntryAfterRecord(
      normalizeEquipmentCalibration(equipment.callibration),
      calibrationType,
      dto.dateType,
      completedAt,
    );

    await this.equipmentModel.findByIdAndUpdate(equipmentId, {
      callibration: updatedConfig,
    });

    return {
      status: true,
      message: 'Callibration record added successfully',
      data: calibrationRecord,
    };
  }

  async findAll(departmentId: string) {
    const records = await this.calibrationRecordModel
      .find({ UserDepartment: departmentId })
      .populate('Equipment')
      .populate('UserDepartment');
    return {
      status: true,
      message: 'The following are Callibration!',
      data: records,
    };
  }

  async findByEquipmentId(equipmentId: string, departmentId?: string) {
    const filter: Record<string, string> = { Equipment: equipmentId };
    if (departmentId) {
      filter.UserDepartment = departmentId;
    }

    const records = await this.calibrationRecordModel
      .find(filter)
      .populate('Equipment')
      .sort({ CaliberatDate: -1, created_at: -1 });
    return {
      status: true,
      message: 'The following calibration!',
      data: records,
    };
  }
}
