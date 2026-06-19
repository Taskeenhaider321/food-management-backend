import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConductAudits } from './schemas/conduct-audits.schema';
import { ChecklistAnswer } from './schemas/checklist-answer.schema';
import { Checklist } from '../create-checklist/schemas/checklist.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateConductAuditDto } from './dtos/create-conduct-audit.dto';
import { UpdateConductAuditDto } from './dtos/update-conduct-audit.dto';
import {
  AuditFrequency,
  canSubmitNewAudit,
  canEditAuditRecord,
  isCycleElapsed,
  normalizeAuditFrequency,
} from '../common/audit-frequency.util';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';

const CONDUCT_AUDIT_QUERY = [
  {
    path: 'Checklist',
    populate: [
      { path: 'Department' },
      {
        path: 'ChecklistQuestions',
        model: 'ChecklistQuestion',
        options: { sort: { order: 1 } },
      },
    ],
  },
  {
    path: 'Answers',
    model: 'ChecklistAnswer',
    populate: {
      path: 'question',
      model: 'ChecklistQuestion',
    },
  },
  { path: 'UserDepartment' },
];

@Injectable()
export class ConductAuditsService {
  constructor(
    @InjectModel(ConductAudits.name) private conductAuditsModel: Model<ConductAudits>,
    @InjectModel(ChecklistAnswer.name) private checklistAnswerModel: Model<ChecklistAnswer>,
    @InjectModel(Checklist.name) private checklistModel: Model<Checklist>,
    @InjectModel('User') private userModel: Model<any>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async addConductAudit(createDto: CreateConductAuditDto) {
    const requestUser = await this.userModel.findById(createDto.userId).populate('companyId departmentId');
    const checklist = await this.checklistModel.findById(createDto.Checklist);
    if (!checklist) throw new NotFoundException('Checklist not found');

    const frequency = this.getChecklistFrequency(checklist);
    await this.applyFrequencyLocks(String(createDto.Checklist), frequency);

    const latest = await this.conductAuditsModel
      .findOne({ Checklist: createDto.Checklist as any })
      .sort({ AuditDate: -1 });

    if (
      latest &&
      !canSubmitNewAudit(latest.AuditDate, frequency)
    ) {
      throw new BadRequestException(
        `This checklist cannot be submitted again until the ${frequency.toLowerCase()} audit cycle completes.`,
      );
    }

    const answersIds = await this.persistAnswers(
      createDto.Answers,
      createDto.files,
      requestUser,
      checklist,
    );

    if (latest) {
      await this.conductAuditsModel.updateMany(
        { Checklist: createDto.Checklist as any },
        { $set: { isLocked: true } },
      );
    }

    const conductAudit = new this.conductAuditsModel({
      Checklist: createDto.Checklist,
      AuditBy: requestUser.name,
      AuditDate: new Date(),
      Answers: answersIds,
      isLocked: false,
      UserDepartment:
        createDto.departmentId ??
        (checklist as any)?.UserDepartment ??
        (requestUser.departmentId as any)?._id ??
        requestUser.departmentId,
    });

    await conductAudit.save();
    const populated = await this.conductAuditsModel
      .findById(conductAudit._id)
      .populate(CONDUCT_AUDIT_QUERY);
    return { status: true, message: 'ConductAudits added successfully!', data: populated };
  }

  async updateConductAudit(updateDto: UpdateConductAuditDto) {
    const requestUser = await this.userModel.findById(updateDto.userId).populate('companyId departmentId');
    const conductAudit = await this.conductAuditsModel.findById(updateDto.conductAuditId);
    if (!conductAudit) throw new NotFoundException('Conduct audit not found');

    const checklist = await this.checklistModel.findById(conductAudit.Checklist);
    if (!checklist) throw new NotFoundException('Checklist not found');

    const frequency = this.getChecklistFrequency(checklist);
    await this.applyFrequencyLocks(String(conductAudit.Checklist), frequency);

    const latest = await this.conductAuditsModel
      .findOne({ Checklist: conductAudit.Checklist })
      .sort({ AuditDate: -1 });

    if (
      !latest ||
      !canEditAuditRecord(
        conductAudit,
        String(latest._id),
        String(conductAudit._id),
        frequency,
      )
    ) {
      throw new BadRequestException('This audit record is locked and cannot be edited.');
    }

    if (conductAudit.Answers?.length) {
      const answerIds = conductAudit.Answers.map((id) => String(id));
      await this.checklistAnswerModel.deleteMany({ _id: { $in: answerIds } });
    }

    const answersIds = await this.persistAnswers(
      updateDto.Answers,
      updateDto.files,
      requestUser,
      checklist,
    );

    conductAudit.Answers = answersIds as any;
    conductAudit.UpdatedBy = requestUser.name;
    conductAudit.UpdatedAt = new Date();
    await conductAudit.save();

    const populated = await this.conductAuditsModel
      .findById(conductAudit._id)
      .populate(CONDUCT_AUDIT_QUERY);
    return { status: true, message: 'Conduct audit updated successfully!', data: populated };
  }

  private getChecklistFrequency(checklist: Checklist): AuditFrequency {
    return normalizeAuditFrequency((checklist as any)?.settings?.auditFrequency);
  }

  private async applyFrequencyLocks(checklistId: string, frequency: AuditFrequency) {
    if (frequency === 'None') return;
    const audits = await this.conductAuditsModel
      .find({ Checklist: checklistId as any })
      .sort({ AuditDate: -1 });
    const now = new Date();
    for (const audit of audits) {
      const locked = isCycleElapsed(audit.AuditDate, frequency, now);
      if (Boolean(audit.isLocked) !== locked) {
        audit.isLocked = locked;
        await audit.save();
      }
    }
  }

  private async persistAnswers(
    rawAnswers: any[],
    files: Express.Multer.File[] | undefined,
    requestUser: any,
    checklist: any,
  ) {
    let answers = rawAnswers || [];
    if (files && files.length > 0) {
      for (const fileData of files) {
        const index = parseInt(fileData.fieldname.split('-')[1]);
        const modifiedPdfBuffer = await this.processPdfWithWatermark(
          fileData.buffer,
          requestUser,
          checklist,
        );
        const uploadResult = await this.cloudinaryService.uploadBuffer(modifiedPdfBuffer);
        answers[index].EvidenceDoc = uploadResult;
      }
    }
    answers = answers.filter((ans) => ans !== null);
    const createdAnswers = await this.checklistAnswerModel.create(answers);
    return createdAnswers.map((a) => a._id);
  }

  private async processPdfWithWatermark(buffer: Buffer, user: any, checklist: any): Promise<Buffer> {
    const company = user.companyId as any;
    const response = await axios.get(company.CompanyLogo, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(buffer);
    const logoImage = Buffer.from(response.data);
    const isJpg = company.CompanyLogo.includes('.jpeg') || company.CompanyLogo.includes('.jpg');
    const pdfLogoImage = isJpg ? await pdfDoc.embedJpg(logoImage) : await pdfDoc.embedPng(logoImage);

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(firstPage, pdfLogoImage, company, user, checklist.ChecklistId);

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc.getPages().slice(1).forEach(page => {
      const { width, height } = page.getSize();
      const extraSpace = 38;
      page.setSize(width, height + extraSpace);
      page.translateContent(0, -extraSpace);

      page.drawText('Evidence Document', {
        x: width / 2 - helveticaFont.widthOfTextAtSize('Evidence Document', 15) / 2,
        y: height + extraSpace - 10,
        size: 15,
        color: rgb(0, 0, 0),
      });

      page.drawText(company.CompanyName, {
        x: width - helveticaFont.widthOfTextAtSize(company.CompanyName, 10) - 20,
        y: height + extraSpace,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Document ID : ${checklist.ChecklistId}`, {
        x: width - helveticaFont.widthOfTextAtSize(`Document ID : ${checklist.ChecklistId}`, 10) - 20,
        y: height + extraSpace - 12,
        size: 10,
        color: rgb(0, 0, 0),
      });
    });

    return Buffer.from(await pdfDoc.save());
  }

  private async addFirstPage(page: any, logoImage: any, company: any, user: any, documentId: string) {
    const { width, height } = page.getSize();
    const pdfDoc = await PDFDocument.create();
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
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.CompanyName, fontSize) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    page.drawText(company.Address, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.Address, fontSize) / 2,
      y: height - 450,
      color: rgb(0, 0, 0),
      size: fontSize,
    });

    page.drawText(`Created By : ${user.name}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Created By : ${user.name}`, 20) / 2,
      y: height - 530,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Creation Date : ${new Date().toLocaleDateString('en-GB')}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Creation Date : ${new Date().toLocaleDateString('en-GB')}`, 20) / 2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Document ID : ${documentId}`, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(`Document ID : ${documentId}`, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  async readConductAudits(departmentId: string) {
    const checklistIds = await this.checklistModel
      .find({
        $or: [
          { UserDepartment: departmentId as any },
          { Department: departmentId as any },
          { Departments: departmentId as any },
        ],
      })
      .distinct('_id');

    const checklistIdStrings = checklistIds.map((id) => String(id));
    const auditFilter =
      checklistIdStrings.length > 0
        ? {
            $or: [
              { UserDepartment: departmentId },
              { Checklist: { $in: checklistIdStrings } },
            ],
          }
        : { UserDepartment: departmentId };

    const audits = await this.conductAuditsModel
      .find(auditFilter as any)
      .populate(CONDUCT_AUDIT_QUERY)
      .sort({ AuditDate: -1 });

    return { status: true, message: 'The following are ConductAudits!', data: audits };
  }

  async getConductAuditsByChecklistId(checklistId: string, departmentId: string) {
    const checklist = await this.checklistModel.findById(checklistId);
    if (checklist) {
      await this.applyFrequencyLocks(checklistId, this.getChecklistFrequency(checklist));
    }

    let audits = await this.conductAuditsModel
      .find({ Checklist: checklistId as any, UserDepartment: departmentId as any })
      .populate(CONDUCT_AUDIT_QUERY);

    if (!audits.length) {
      audits = await this.conductAuditsModel
        .find({ Checklist: checklistId as any })
        .populate(CONDUCT_AUDIT_QUERY);
    }

    return {
      status: true,
      message: audits.length
        ? 'The following are ConductAudits!'
        : 'No conduct audits found for this checklist.',
      data: audits,
    };
  }

  async getConductAuditByAuditId(auditId: string) {
    const audit = await this.conductAuditsModel
      .findById(auditId)
      .populate(CONDUCT_AUDIT_QUERY);
    if (!audit) throw new NotFoundException('Conduct audit not found');
    return { status: true, message: 'The following are ConductAudits!', data: audit };
  }

  async deleteConductAudit(id: string) {
    const deleted = await this.conductAuditsModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('ConductAudit not found!');
    return { status: true, message: 'ConductAudit has been deleted!', data: deleted };
  }

  async deleteAllConductAudits(): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.conductAuditsModel.deleteMany({});
    if (result.deletedCount === 0) throw new NotFoundException('No ConductAudits Found to Delete!');
    return { status: true, message: 'All ConductAudits have been deleted!', data: result };
  }
}
