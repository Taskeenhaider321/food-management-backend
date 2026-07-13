import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CorrectiveAction } from './schemas/corrective-action.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateCorrectiveActionDto } from './dtos/create-corrective-action.dto';
import { UpdateCorrectiveActionDto } from './dtos/update-corrective-action.dto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

@Injectable()
export class CorrectiveActionService {
  constructor(
    @InjectModel(CorrectiveAction.name)
    private correctiveActionModel: Model<CorrectiveAction>,
    @InjectModel('Reports') private reportsModel: Model<any>,
    @InjectModel('ConductAudits') private conductAuditsModel: Model<any>,
    @InjectModel('Checklist') private checklistModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Company') private readonly companyModel: Model<any>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async addCorrectiveAction(createDto: CreateCorrectiveActionDto) {
    const existing = await this.correctiveActionModel.findOne({
      Report: createDto.Report as any,
    });
    if (existing) {
      throw new BadRequestException(
        'A corrective action already exists for this NCR.',
      );
    }

    const requestUser = await this.userModel
      .findById(createDto.userId)
      .populate('companyId departmentId');
    const reportData = await this.reportsModel.findById(createDto.Report);
    const conductAuditData = await this.conductAuditsModel.findById(
      reportData.ConductAudit,
    );
    const checklist = await this.checklistModel.findById(
      conductAuditData.Checklist,
    );
    const answers = createDto.Answers;

    if (createDto.files && createDto.files.length > 0) {
      for (const fileData of createDto.files) {
        const index = parseInt(fileData.fieldname.split('-')[1]);
        const modifiedPdfBuffer = await this.processPdfWithWatermark(
          fileData.buffer,
          requestUser,
          checklist,
        );
        const uploadResult =
          await this.cloudinaryService.uploadBuffer(modifiedPdfBuffer);
        answers[index].CorrectiveDoc = uploadResult;
      }
    }

    const correctiveAction = new this.correctiveActionModel({
      Report: createDto.Report,
      CorrectionBy: requestUser.name,
      CorrectionDate: new Date(),
      UserDepartment: requestUser.departmentId?._id ?? requestUser.departmentId,
      Answers: answers,
    });

    await correctiveAction.save();
    return {
      status: true,
      message: 'The CorrectiveAction is added!',
      data: correctiveAction,
    };
  }

  async updateCorrectiveAction(updateDto: UpdateCorrectiveActionDto) {
    const requestUser = await this.userModel
      .findById(updateDto.userId)
      .populate('companyId departmentId');
    const action = await this.correctiveActionModel.findById(
      updateDto.actionId,
    );
    if (!action) throw new NotFoundException('CorrectiveAction not found!');

    const reportData = await this.reportsModel.findById(action.Report);
    const conductAuditData = await this.conductAuditsModel.findById(
      reportData?.ConductAudit,
    );
    const checklist = conductAuditData
      ? await this.checklistModel.findById(conductAuditData.Checklist)
      : null;

    const answers = updateDto.Answers;
    if (updateDto.files && updateDto.files.length > 0 && checklist) {
      for (const fileData of updateDto.files) {
        const index = parseInt(fileData.fieldname.split('-')[1]);
        const modifiedPdfBuffer = await this.processPdfWithWatermark(
          fileData.buffer,
          requestUser,
          checklist,
        );
        const uploadResult =
          await this.cloudinaryService.uploadBuffer(modifiedPdfBuffer);
        answers[index].CorrectiveDoc = uploadResult;
      }
    }

    action.Answers = answers;
    action.CorrectionBy = updateDto.updatedBy || requestUser.name;
    action.CorrectionDate = new Date();
    await action.save();

    return {
      status: true,
      message: 'Corrective action updated successfully!',
      data: action,
    };
  }

  private async processPdfWithWatermark(
    buffer: Buffer,
    user: any,
    checklist: any,
  ): Promise<Buffer> {
    const company = user.companyId;
    const response = await axios.get(company.CompanyLogo, {
      responseType: 'arraybuffer',
    });
    const pdfDoc = await PDFDocument.load(buffer);
    const logoImage = Buffer.from(response.data);
    const isJpg =
      company.CompanyLogo.includes('.jpeg') ||
      company.CompanyLogo.includes('.jpg');
    const pdfLogoImage = isJpg
      ? await pdfDoc.embedJpg(logoImage)
      : await pdfDoc.embedPng(logoImage);

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(
      firstPage,
      pdfLogoImage,
      company,
      user,
      checklist.ChecklistId,
    );

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc
      .getPages()
      .slice(1)
      .forEach((page) => {
        const { width, height } = page.getSize();
        const extraSpace = 38;
        page.setSize(width, height + extraSpace);
        page.translateContent(0, -extraSpace);

        page.drawText('Corrective Action Document', {
          x:
            width / 2 -
            helveticaFont.widthOfTextAtSize('Corrective Action Document', 15) /
              2,
          y: height + extraSpace - 10,
          size: 15,
          color: rgb(0, 0, 0),
        });

        page.drawText(company.CompanyName, {
          x:
            width -
            helveticaFont.widthOfTextAtSize(company.CompanyName, 10) -
            20,
          y: height + extraSpace,
          size: 10,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Document ID : ${checklist.ChecklistId}`, {
          x:
            width -
            helveticaFont.widthOfTextAtSize(
              `Document ID : ${checklist.ChecklistId}`,
              10,
            ) -
            20,
          y: height + extraSpace - 12,
          size: 10,
          color: rgb(0, 0, 0),
        });
      });

    return Buffer.from(await pdfDoc.save());
  }

  private async addFirstPage(
    page: any,
    logoImage: any,
    company: any,
    user: any,
    documentId: string,
  ) {
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

    page.drawText(company.CompanyName, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(company.CompanyName, 25) / 2,
      y: height - 420,
      color: rgb(0, 0, 0),
      size: 25,
    });

    page.drawText(company.Address, {
      x: centerTextX - helveticaFont.widthOfTextAtSize(company.Address, 25) / 2,
      y: height - 450,
      color: rgb(0, 0, 0),
      size: 25,
    });

    page.drawText(`Created By : ${user.name}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(`Created By : ${user.name}`, 20) / 2,
      y: height - 530,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Creation Date : ${new Date().toLocaleDateString('en-GB')}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(
          `Creation Date : ${new Date().toLocaleDateString('en-GB')}`,
          20,
        ) /
          2,
      y: height - 560,
      color: rgb(0, 0, 0),
      size: 20,
    });

    page.drawText(`Document ID : ${documentId}`, {
      x:
        centerTextX -
        helveticaFont.widthOfTextAtSize(`Document ID : ${documentId}`, 20) / 2,
      y: height - 590,
      color: rgb(0, 0, 0),
      size: 20,
    });
  }

  async readAllCorrectiveActions(departmentId: string) {
    const actions = await this.correctiveActionModel
      .find({ UserDepartment: departmentId as any })
      .populate('UserDepartment')
      .populate({
        path: 'Report',
        populate: {
          path: 'ConductAudit',
          populate: { path: 'Checklist' },
        },
      })
      .populate({
        path: 'Answers.question',
        populate: { path: 'question' },
      })
      .sort({ CorrectionDate: -1 });
    return {
      status: true,
      message: 'The following are CorrectiveActions!',
      data: actions,
    };
  }

  async readCorrectiveActionByReportId(reportId: string, departmentId: string) {
    const actions = await this.correctiveActionModel
      .find({ Report: reportId as any, UserDepartment: departmentId as any })
      .populate('UserDepartment')
      .populate({
        path: 'Report',
        populate: {
          path: 'ConductAudit',
          populate: { path: 'Checklist' },
        },
      })
      .populate({
        path: 'Answers.question',
        populate: { path: 'question' },
      });
    return {
      status: true,
      message: 'The following are CorrectiveActions!',
      data: actions,
    };
  }

  async readCorrectiveActionById(actionId: string) {
    const action = await this.correctiveActionModel
      .findById(actionId)
      .populate('UserDepartment')
      .populate({
        path: 'Report',
        populate: {
          path: 'ConductAudit',
          populate: { path: 'Checklist' },
        },
      })
      .populate({
        path: 'Answers.question',
        populate: { path: 'question' },
      });
    if (!action) throw new NotFoundException('CorrectiveAction not found!');
    return {
      status: true,
      message: 'The following are CorrectiveActions!',
      data: action,
    };
  }

  async deleteCorrectiveAction(id: string) {
    const deleted = await this.correctiveActionModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('CorrectiveAction not found!');
    return {
      status: true,
      message: 'CorrectiveAction has been deleted!',
      data: deleted,
    };
  }

  async deleteAllCorrectiveActions(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.correctiveActionModel.deleteMany({});
    if (result.deletedCount === 0)
      throw new NotFoundException('No CorrectiveActions Found to Delete!');
    return {
      status: true,
      message: 'All CorrectiveActions have been deleted!',
      data: result,
    };
  }

  private mapCorrectiveActionPdfRow(action: any) {
    const answers = Array.isArray(action?.Answers) ? action.Answers : [];
    return {
      CorrectionBy: asText(action?.CorrectionBy),
      CorrectionDate: formatDate(
        action?.CorrectionDate || action?.created_at,
      ),
      findingsCount: String(answers.length),
    };
  }

  private answerSummaryRows(action: any): Array<[string, string]> {
    const answers = Array.isArray(action?.Answers) ? action.Answers : [];
    return answers.flatMap((item: any, index: number) => {
      const q =
        item?.question?.question?.questionText ||
        item?.question?.questionText ||
        `Finding ${index + 1}`;
      return [
        [`${index + 1}. Question`, asText(q)],
        [`${index + 1}. Correction`, asText(item?.Correction)],
        [`${index + 1}. Corrective Action`, asText(item?.CorrectiveAction)],
        [`${index + 1}. Root Cause`, asText(item?.RootCause)],
      ];
    });
  }

  async downloadCorrectiveActionsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const data = await this.correctiveActionModel
      .find()
      .populate('UserDepartment')
      .populate({
        path: 'Report',
        populate: {
          path: 'ConductAudit',
          populate: { path: 'Checklist' },
        },
      })
      .populate({
        path: 'Answers.question',
        populate: { path: 'question' },
      })
      .sort({ CorrectionDate: -1 })
      .exec();

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Corrective Actions Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'CorrectionBy', label: 'CORRECTION BY', width: 2.2 },
        { key: 'CorrectionDate', label: 'CORRECTION DATE', width: 1.8 },
        { key: 'findingsCount', label: 'FINDINGS', width: 1.5 },
      ],
      rows: (data || []).map((r) => this.mapCorrectiveActionPdfRow(r)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('corrective-actions', 'directory'),
    };
  }

  async downloadCorrectiveActionPdf(id: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const action = await this.correctiveActionModel
      .findById(id)
      .populate('UserDepartment')
      .populate({
        path: 'Report',
        populate: {
          path: 'ConductAudit',
          populate: { path: 'Checklist' },
        },
      })
      .populate({
        path: 'Answers.question',
        populate: { path: 'question' },
      })
      .exec();
    if (!action) throw new NotFoundException('CorrectiveAction not found!');

    const row = this.mapCorrectiveActionPdfRow(action);
    const answerRows = this.answerSummaryRows(action);

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title:
        row.CorrectionBy !== '---'
          ? row.CorrectionBy
          : 'Corrective Action',
      subtitle:
        row.CorrectionDate !== '---' ? row.CorrectionDate : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Correction By', row.CorrectionBy],
        ['Correction Date', row.CorrectionDate],
        ['Findings Count', row.findingsCount],
      ],
      sections: answerRows.length
        ? [
            {
              heading: 'Correction / Corrective Action / Root Cause',
              rows: answerRows,
            },
          ]
        : [],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.CorrectionBy || 'corrective-action',
        'action',
      ),
    };
  }
}
