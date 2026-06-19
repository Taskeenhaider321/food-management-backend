import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UploadDocuments } from './schemas/upload-documents.schema';
import { User } from '../../admin-management/users/schemas/user.schema';
import { Company } from '../../admin-management/company/schemas/company.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateUploadDocumentsDto, ReviewUploadedDocumentDto, RejectUploadedDocumentDto, ApproveUploadedDocumentDto, DisapproveUploadedDocumentDto, CommentDocumentDto, ReplaceDocumentDto } from './dtos/create-upload-documents.dto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import axios from 'axios';

@Injectable()
export class UploadDocumentsService {
  constructor(
    @InjectModel(UploadDocuments.name) private uploadDocumentsModel: Model<UploadDocuments>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private async addFirstPage(page: any, logoImage: any, company: any, user: any, documentId: string, revisionNo: string) {
    const { width, height } = page.getSize();
    const helveticaFont = await page.doc.embedFont(StandardFonts.Helvetica);
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
      fontSize,
    });

    let yPosition = height - 450;
    page.drawText('Created By : ', { x: 80, y: yPosition - 50, color: rgb(0, 0, 0), size: 15 });
    page.drawText(user.name, { x: 330, y: yPosition - 50, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Creation Date : ', { x: 80, y: yPosition - 80, color: rgb(0, 0, 0), size: 15 });
    page.drawText(this.formatDate(new Date()), { x: 330, y: yPosition - 80, color: rgb(0, 0, 0), size: 15 });

    if (documentId) {
      page.drawText('Document ID : ', { x: 80, y: yPosition - 110, color: rgb(0, 0, 0), size: 15 });
      page.drawText(documentId, { x: 330, y: yPosition - 110, color: rgb(0, 0, 0), size: 15 });
      if (revisionNo) {
        page.drawText('Revision No : ', { x: 80, y: yPosition - 140, color: rgb(0, 0, 0), size: 15 });
        page.drawText(revisionNo, { x: 330, y: yPosition - 140, color: rgb(0, 0, 0), size: 15 });
      }
    }
  }

  private async addFirstPageWithApproval(page: any, logoImage: any, company: any, creatorName: string, createdDate: Date, documentId: string, revisionNo: number, reviewedBy: string, reviewDate: any, approvedBy: string, approvalDate: any) {
    const { width, height } = page.getSize();
    const helveticaFont = await page.doc.embedFont(StandardFonts.Helvetica);
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
      fontSize,
    });

    let yPosition = height - 450;
    page.drawText('Created By : ', { x: 80, y: yPosition - 50, color: rgb(0, 0, 0), size: 15 });
    page.drawText(creatorName, { x: 330, y: yPosition - 50, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Creation Date : ', { x: 80, y: yPosition - 80, color: rgb(0, 0, 0), size: 15 });
    page.drawText(this.formatDate(createdDate), { x: 330, y: yPosition - 80, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Document ID : ', { x: 80, y: yPosition - 110, color: rgb(0, 0, 0), size: 15 });
    page.drawText(documentId, { x: 330, y: yPosition - 110, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Reviewed By : ', { x: 80, y: yPosition - 140, color: rgb(0, 0, 0), size: 15 });
    page.drawText(reviewedBy, { x: 330, y: yPosition - 140, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Review Date : ', { x: 80, y: yPosition - 170, color: rgb(0, 0, 0), size: 15 });
    page.drawText(reviewDate !== '---' ? this.formatDate(reviewDate) : reviewDate, { x: 330, y: yPosition - 170, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Approved By : ', { x: 80, y: yPosition - 200, color: rgb(0, 0, 0), size: 15 });
    page.drawText(approvedBy, { x: 330, y: yPosition - 200, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Approval Date : ', { x: 80, y: yPosition - 230, color: rgb(0, 0, 0), size: 15 });
    page.drawText(approvalDate !== '---' ? this.formatDate(approvalDate) : approvalDate, { x: 330, y: yPosition - 230, color: rgb(0, 0, 0), size: 15 });
    page.drawText('Revision No : ', { x: 80, y: yPosition - 260, color: rgb(0, 0, 0), size: 15 });
    page.drawText(`${revisionNo}`, { x: 330, y: yPosition - 260, color: rgb(0, 0, 0), size: 15 });
  }

  async create(dto: CreateUploadDocumentsDto, file: Express.Multer.File) {
    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const company = await this.companyModel.findById(dto.companyId);
    if (!company) throw new NotFoundException('Company not found');

    const newDocument = new this.uploadDocumentsModel({
      DocumentName: dto.DocumentName,
      Department: dto.departmentId,
      DocumentType: dto.DocumentType,
      CreatedBy: user.name,
      CreationDate: new Date(),
      UserDepartment: dto.userDepartmentId,
    });
    await newDocument.save();

    const response = await axios.get(company.companyLogo, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(file.buffer);
    const logoImage = Buffer.from(response.data);

    const isJpg = company.companyLogo.includes('.jpeg') || company.companyLogo.includes('.jpg');
    const isPng = company.companyLogo.includes('.png');
    let pdfLogoImage;

    if (isJpg) pdfLogoImage = await pdfDoc.embedJpg(logoImage);
    else if (isPng) pdfLogoImage = await pdfDoc.embedPng(logoImage);

    const firstPage = pdfDoc.insertPage(0);
    await this.addFirstPage(firstPage, pdfLogoImage, company, user, newDocument.DocumentId, '0');

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    pdfDoc.getPages().slice(1).forEach((page) => {
      const { width, height } = page.getSize();
      const extraSpace = 34;
      page.setSize(width, height + extraSpace);
      page.translateContent(0, -extraSpace);

      page.drawText(newDocument.DocumentName, {
        x: width / 2 - helveticaFont.widthOfTextAtSize(newDocument.DocumentName, 10) / 2,
        y: height + extraSpace - 10,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText(company.companyName, {
        x: width - helveticaFont.widthOfTextAtSize(company.companyName, 10) - 20,
        y: height + extraSpace,
        size: 10,
        color: rgb(0, 0, 0),
      });

      const docIdText = `Doc ID : ${newDocument.DocumentId}`;
      page.drawText(docIdText, {
        x: width - helveticaFont.widthOfTextAtSize(docIdText, 10) - 20,
        y: height + extraSpace - 12,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText('Revision No : 0', {
        x: width - helveticaFont.widthOfTextAtSize('Revision No : 0', 10) - 20,
        y: height + extraSpace - 24,
        size: 10,
        color: rgb(0, 0, 0),
      });
    });

    const modifiedPdfBuffer = await pdfDoc.save();
    const result = await this.cloudinaryService.uploadBuffer(Buffer.from(modifiedPdfBuffer));

    await this.uploadDocumentsModel.findByIdAndUpdate(newDocument._id, {
      UploadedDocuments: [{
        RevisionNo: 0,
        DocumentUrl: result,
        CreationDate: new Date(),
        CreatedBy: user.name,
        ReviewDate: undefined,
        ReviewedBy: 'Pending',
        ApprovalDate: undefined,
        ApprovedBy: 'Pending',
        Comment: undefined,
      }],
    });

    return { status: true, message: 'Document uploaded successfully', data: newDocument };
  }

  async findAll(departmentId: string) {
    const documents = await this.uploadDocumentsModel
      .find({ UserDepartment: departmentId })
      .populate('Department UserDepartment');
    return { status: true, message: 'The following are Documents!', data: documents };
  }

  async findById(documentId: string) {
    const document = await this.uploadDocumentsModel
      .findById(documentId)
      .populate('Department UserDepartment');
    return { status: true, message: 'The following are Documents!', data: document };
  }

  async review(dto: ReviewUploadedDocumentDto) {
    const document = await this.uploadDocumentsModel.findById(dto.documentId);
    if (!document) throw new NotFoundException('Document not found.');
    if (document.Status !== 'Pending') throw new BadRequestException('Document status is not eligible for review.');

    const user = await this.userModel.findById(dto.userId);
    const company = await this.companyModel.findById(dto.companyId);
    const latestDocIndex = document.UploadedDocuments.length - 1;

    document.ReviewDate = new Date();
    document.Status = 'Reviewed';
    document.RejectionDate = undefined;
    document.RejectedBy = undefined;
    document.ReviewedBy = dto.reviewBy;
    document.UploadedDocuments[latestDocIndex].ReviewDate = new Date();
    document.UploadedDocuments[latestDocIndex].ReviewedBy = dto.reviewBy;

    await document.save();
    return { status: true, message: 'Document reviewed successfully', data: document };
  }

  async reject(dto: RejectUploadedDocumentDto) {
    const document = await this.uploadDocumentsModel.findById(dto.documentId);
    if (!document) throw new NotFoundException('Document not found.');
    if (document.Status !== 'Pending' && document.Status !== 'Reviewed') {
      throw new BadRequestException('Document status is not eligible for rejection.');
    }

    document.Reason = dto.reason;
    document.RejectionDate = new Date();
    document.ReviewDate = undefined;
    document.ReviewedBy = undefined;
    document.Status = 'Rejected';
    document.RejectedBy = dto.rejectBy;
    document.UploadedDocuments[document.UploadedDocuments.length - 1].ReviewDate = undefined;
    document.UploadedDocuments[document.UploadedDocuments.length - 1].ReviewedBy = undefined;

    await document.save();
    return { status: true, message: 'Document rejected successfully', data: document };
  }

  async approve(dto: ApproveUploadedDocumentDto) {
    const document = await this.uploadDocumentsModel.findById(dto.documentId);
    if (!document) throw new NotFoundException('Document not found.');
    if (document.Status === 'Approved' || document.Status === 'Disapproved' || document.Status === 'Rejected' || document.Status === 'Pending') {
      throw new BadRequestException('Document status is not eligible for approval.');
    }

    const latestDocIndex = document.UploadedDocuments.length - 1;
    document.ApprovalDate = new Date();
    document.ApprovedBy = dto.approvedBy;
    document.Status = 'Approved';
    document.DisapprovalDate = undefined;
    document.DisapprovedBy = undefined;
    document.UploadedDocuments[latestDocIndex].ApprovalDate = new Date();
    document.UploadedDocuments[latestDocIndex].ApprovedBy = dto.approvedBy;

    await document.save();
    return { status: true, message: 'Document approved successfully', data: document };
  }

  async disapprove(dto: DisapproveUploadedDocumentDto) {
    const document = await this.uploadDocumentsModel.findById(dto.documentId);
    if (!document) throw new NotFoundException('Document not found.');
    if (document.Status === 'Approved' || document.Status === 'Disapproved' || document.Status === 'Rejected' || document.Status === 'Pending') {
      throw new BadRequestException('Document status is not eligible for disapproval.');
    }

    const latestDocIndex = document.UploadedDocuments.length - 1;
    document.DisapprovalDate = new Date();
    document.Status = 'Disapproved';
    document.Reason = dto.reason;
    document.ApprovalDate = undefined;
    document.ApprovedBy = undefined;
    document.DisapprovedBy = dto.disapprovedBy;
    document.UploadedDocuments[latestDocIndex].ApprovalDate = undefined;
    document.UploadedDocuments[latestDocIndex].ApprovedBy = undefined;

    await document.save();
    return { status: true, message: 'Document disapproved successfully', data: document };
  }

  async addComment(documentId: string, dto: CommentDocumentDto) {
    const document = await this.uploadDocumentsModel.findById(documentId);
    if (!document) throw new NotFoundException('Document not found.');

    document.UploadedDocuments[dto.objIndex].Comment = dto.comment;
    await document.save();
    return { status: true, message: 'Document reviewed successfully', data: document };
  }

  async replace(documentId: string, dto: ReplaceDocumentDto, file: Express.Multer.File) {
  const document = await this.uploadDocumentsModel.findById(documentId);
  if (!document) throw new NotFoundException('Document not found');
  if (document.Status !== 'Pending' && document.Status !== 'Rejected' && document.Status !== 'Disapproved') {
    throw new BadRequestException('Document status does not allow replacement');
  }

  const user = await this.userModel.findById(dto.userId);
  if (!user) throw new NotFoundException('User not found');

  const company = await this.companyModel.findById(dto.companyId);
  if (!company) throw new NotFoundException('Company not found');

  const response = await axios.get(company.companyLogo, { responseType: 'arraybuffer' });
  const pdfDoc = await PDFDocument.load(file.buffer);
  const logoImage = Buffer.from(response.data);
  const isJpg = company.companyLogo.includes('.jpeg') || company.companyLogo.includes('.jpg');
  const isPng = company.companyLogo.includes('.png');
  let pdfLogoImage;

  if (isJpg) pdfLogoImage = await pdfDoc.embedJpg(logoImage);
  else if (isPng) pdfLogoImage = await pdfDoc.embedPng(logoImage);

  const firstPage = pdfDoc.insertPage(0);
  await this.addFirstPage(firstPage, pdfLogoImage, company, user, document.DocumentId, `${document.RevisionNo + 1}`);

  const modifiedPdfBuffer = await pdfDoc.save();
  const result = await this.cloudinaryService.uploadBuffer(Buffer.from(modifiedPdfBuffer));

  document.Status = 'Pending';
  document.RevisionNo += 1;
  document.UploadedDocuments.push({
    RevisionNo: document.RevisionNo,
    DocumentUrl: result,
    CreatedBy: user.name,
    CreationDate: new Date(),
  });

  await document.save();
  return { status: true, message: 'Document replaced successfully', data: document };
}

}
