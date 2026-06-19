import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Training, TrainingDocument } from './schemas/training.schema';
import { CreateTrainingDto } from './dtos/create-training.dto';
import { UpdateTrainingDto } from './dtos/update-training.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function actorUploadLabel(actor: any): string {
  const n = actor?.name || actor?.userName || actor?.email;
  return typeof n === 'string' && n.trim() ? n.trim() : 'User';
}

@Injectable()
export class TrainingService {
  constructor(
    @InjectModel(Training.name) private trainingModel: Model<TrainingDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('Company') private companyModel: Model<any>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createTrainingDto: CreateTrainingDto,
    files: { TrainingMaterial?: Express.Multer.File[] } | undefined,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: TrainingDocument }> {
    const {
      departmentId,
      TrainingName,
      Description,
      EvaluationCriteria,
      TrainingMaterialUrl,
    } = createTrainingDto;

    const department = await this.departmentModel.findById(departmentId).exec();
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const deptCompanyId = String(department.companyId);
    const actorCo = actor?.companyId?._id?.toString() || actor?.companyId?.toString();

    const companyIdStr = actorCo ?? deptCompanyId;
    const company = await this.companyModel.findById(companyIdStr).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const uploadedBy = actorUploadLabel(actor);

    let materialUrl: string | undefined =
      TrainingMaterialUrl?.trim() || undefined;

    if (!materialUrl && files?.TrainingMaterial?.[0]) {
      const f = files.TrainingMaterial[0];
      const isPdf =
        f.mimetype === 'application/pdf' ||
        f.originalname?.toLowerCase?.().endsWith?.('.pdf');
      if (isPdf) {
        materialUrl = await this.processTrainingMaterial(f, company, uploadedBy);
      } else {
        materialUrl = await this.cloudinaryService.uploadFile(f);
      }
    }

    const training = new this.trainingModel({
      trainingName: TrainingName,
      description: Description,
      evaluationCriteria: EvaluationCriteria,
      companyId: new Types.ObjectId(companyIdStr),
      UserDepartment: new Types.ObjectId(departmentId),
      TrainingMaterial: materialUrl,
      creationDate: new Date(),
    });

    const saved = await training.save();
    return {
      status: true,
      message: 'The Training has been Added!',
      data: saved,
    };
  }

  async findAllForActor(
    actor: any,
  ): Promise<{ status: boolean; message: string; data: TrainingDocument[] }> {
    const trainings = await this.trainingModel
      .find({})
      .populate('UserDepartment')
      .exec();
    return {
      status: true,
      message: 'The Following are Trainings!',
      data: trainings,
    };
  }

  private async processTrainingMaterial(
    materialFile: Express.Multer.File,
    company: any,
    uploadedBy: string,
  ): Promise<string> {
    const response = await axios.get(company.CompanyLogo, {
      responseType: 'arraybuffer',
    });
    const pdfDoc = await PDFDocument.load(materialFile.buffer);
    const logoImage = Buffer.from(response.data);

    const isJpg =
      company.CompanyLogo.includes('.jpeg') ||
      company.CompanyLogo.includes('.jpg');
    const isPng = company.CompanyLogo.includes('.png');

    let pdfLogoImage;
    if (isJpg) {
      pdfLogoImage = await pdfDoc.embedJpg(logoImage);
    } else if (isPng) {
      pdfLogoImage = await pdfDoc.embedPng(logoImage);
    }

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(
      firstPage,
      pdfLogoImage,
      company,
      uploadedBy,
      pdfDoc,
    );

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc
      .getPages()
      .slice(1)
      .forEach((page) => {
        const { width, height } = page.getSize();
        const extraSpace = 24;

        page.setSize(width, height + extraSpace);
        page.translateContent(0, -extraSpace);

        const watermarkText = 'Training Document';
        const watermarkFontSize = 15;
        const watermarkTextWidth = helveticaFont.widthOfTextAtSize(
          watermarkText,
          watermarkFontSize,
        );
        const centerWatermarkX = width / 2 - watermarkTextWidth / 2;
        const centerWatermarkY = height + extraSpace - 10;

        page.drawText(watermarkText, {
          x: centerWatermarkX,
          y: centerWatermarkY,
          size: watermarkFontSize,
          color: rgb(0, 0, 0),
        });

        const companyText = `${company.CompanyName}`;
        const companyTextFontSize = 10;
        const companyTextWidth = helveticaFont.widthOfTextAtSize(
          companyText,
          companyTextFontSize,
        );
        const centerCompanyTextX = width - companyTextWidth - 20;
        const centerCompanyTextY = height + extraSpace;

        page.drawText(companyText, {
          x: centerCompanyTextX,
          y: centerCompanyTextY,
          size: companyTextFontSize,
          color: rgb(0, 0, 0),
        });
      });

    const modifiedPdfBuffer = Buffer.from(await pdfDoc.save());
    return this.cloudinaryService.uploadBuffer(modifiedPdfBuffer);
  }

  private async addFirstPage(
    page: any,
    logoImage: any,
    company: any,
    uploadedBy: string,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    const { width, height } = page.getSize();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const logoDims = { width: 300, height: 300 };
    const centerTextX = width / 2;

    page.drawImage(logoImage, {
      x: centerTextX - logoDims.width / 2,
      y: height - 400,
      width: logoDims.width,
      height: logoDims.height,
    });

    const fontSize = 25;
    page.drawText(company.CompanyName, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(company.CompanyName, fontSize) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    const contactText = `Contact # ${company.PhoneNo}`;
    page.drawText(contactText, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(contactText, fontSize) / 2,
      y: height - 450,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    page.drawText(company.Email, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(company.Email, fontSize) / 2,
      y: height - 480,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    const uploadByText = `Uploaded By : ${uploadedBy}`;
    page.drawText(uploadByText, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(uploadByText, 20) / 2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });

    const uploadDateText = `Uploaded Date : ${new Date().toLocaleDateString('en-GB')}`;
    page.drawText(uploadDateText, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(uploadDateText, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  async findByDepartment(
    departmentId: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: TrainingDocument[] }> {
    const department = await this.departmentModel.findById(departmentId).lean();
    if (!department) {
      throw new NotFoundException('Department not found');
    }


    const trainings = await this.trainingModel
      .find({
        UserDepartment: departmentId,
        companyId: department.companyId,
      })
      .populate('UserDepartment')
      .exec();
    return {
      status: true,
      message: 'The Following are Trainings!',
      data: trainings,
    };
  }

  async update(
    id: string,
    updateDto: UpdateTrainingDto,
    files: { TrainingMaterial?: Express.Multer.File[] } | undefined,
    actor: any,
  ): Promise<{ status: boolean; message: string; data: TrainingDocument }> {
    const existing = await this.trainingModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('This Training is Not found!');
    }

    const companyIdStr = (existing as any).companyId?.toString?.();
    if (files?.TrainingMaterial?.[0] && !companyIdStr) {
      throw new BadRequestException(
        'Training has no company context for material processing',
      );
    }

    const $set: Record<string, unknown> = {};
    if (updateDto.TrainingName !== undefined) {
      $set.trainingName = updateDto.TrainingName;
    }
    if (updateDto.Description !== undefined) {
      $set.description = updateDto.Description;
    }
    if (updateDto.EvaluationCriteria !== undefined) {
      $set.evaluationCriteria = updateDto.EvaluationCriteria;
    }
    if (updateDto.departmentId !== undefined) {
      const department = await this.departmentModel
        .findById(updateDto.departmentId)
        .exec();
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      $set.UserDepartment = new Types.ObjectId(updateDto.departmentId);
      $set.companyId = department.companyId;
    }

    if (files?.TrainingMaterial?.[0] && companyIdStr) {
      const company = await this.companyModel.findById(companyIdStr).exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      const uploadedBy = actorUploadLabel(actor);
      $set.TrainingMaterial = await this.processTrainingMaterial(
        files.TrainingMaterial[0],
        company,
        uploadedBy,
      );
    }

    if (Object.keys($set).length === 0) {
      const unchanged = await this.trainingModel
        .findById(id)
        .populate('UserDepartment')
        .exec();
      if (!unchanged) {
        throw new NotFoundException('This Training is Not found!');
      }
      return {
        status: true,
        message: 'The Training has been updated!',
        data: unchanged,
      };
    }

    const data = await this.trainingModel
      .findByIdAndUpdate(id, { $set }, { returnDocument: 'after' })
      .populate('UserDepartment')
      .exec();

    if (!data) {
      throw new NotFoundException('This Training is Not found!');
    }

    return {
      status: true,
      message: 'The Training has been updated!',
      data,
    };
  }

  async delete(id: string): Promise<{ status: boolean; message: string }> {
    const training = await this.trainingModel.findByIdAndDelete(id).exec();
    if (!training) {
      throw new NotFoundException('This Training is Not found!');
    }
    return {
      status: true,
      message: 'The Following Training has been Deleted!',
    };
  }

  async deleteAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.trainingModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Trainings Found to Delete!');
    }
    return { status: true, message: 'All Trainings have been Deleted!' };
  }
}
