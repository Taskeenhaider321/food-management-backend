import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FormRecords } from './schemas/form-records.schema';
import { ListOfForms } from '../list-of-forms/schemas/list-of-forms.schema';
import { CreateFormRecordsDto } from './dtos/create-form-records.dto';
import { AddCommentDto } from './dtos/add-comment.dto';
import { VerifyResponseDto } from './dtos/verify-response.dto';

@Injectable()
export class FormRecordsService {
  constructor(
    @InjectModel(FormRecords.name) private formRecordsModel: Model<FormRecords>,
    @InjectModel(ListOfForms.name) private listOfFormsModel: Model<ListOfForms>,
  ) {}

  async submitResponse(createDto: CreateFormRecordsDto) {
    const form = await this.listOfFormsModel.findById(createDto.Form);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.status !== 'Approved') {
      throw new BadRequestException('Form is not in an Approved status');
    }

    const formRecords = new this.formRecordsModel({
      UserDepartment: createDto.departmentId,
      Form: createDto.Form,
      FillBy: createDto.filledBy,
      answers: createDto.answers,
    });

    await formRecords.save();
    return { status: true, message: 'User responses submitted successfully', Data: formRecords };
  }

  async addComment(addCommentDto: AddCommentDto) {
    const response = await this.formRecordsModel.findById(addCommentDto.resultId);
    if (!response) {
      throw new NotFoundException('Form record not found');
    }

    response.Comment = addCommentDto.comment;
    const updated = await this.formRecordsModel.findByIdAndUpdate(response._id, response, { returnDocument: 'after' });
    return { status: true, message: 'Comment added successfully', data: updated };
  }

  async verifyResponse(verifyDto: VerifyResponseDto) {
    const response = await this.formRecordsModel.findById(verifyDto.resultId);
    if (!response) {
      throw new NotFoundException('Form record not found');
    }

    response.Status = 'Verified';
    response.VerifiedBy = verifyDto.verifiedBy;
    response.VerificationDate = new Date();
    const updated = await this.formRecordsModel.findByIdAndUpdate(response._id, response, { returnDocument: 'after' });
    return { status: true, message: 'Response Verified successfully', data: updated };
  }

  async getResponsesByFormId(formId: string, departmentId: string) {
    const responseForm = await this.formRecordsModel
      .find({ Form: formId as any, UserDepartment: departmentId as any })
      .populate('UserDepartment')
      .populate({
        path: 'Form',
        populate: { path: 'departments', model: 'Department' },
      })
      .populate({
        path: 'answers.question',
        model: 'Question',
      });

    if (!responseForm || responseForm.length === 0) {
      throw new NotFoundException('Form not found for responses');
    }

    return { status: true, message: 'User Responses Retrieved Successfully', data: responseForm };
  }

  async getRecordByRecordId(recordId: string) {
    const responseForm = await this.formRecordsModel
      .findById(recordId)
      .populate('UserDepartment')
      .populate({
        path: 'Form',
        populate: { path: 'departments', model: 'Department' },
      })
      .populate({
        path: 'answers.question',
        model: 'Question',
      });

    if (!responseForm) {
      throw new NotFoundException('Form record not found');
    }

    return { status: true, message: 'Form record retrieved successfully', data: responseForm };
  }
}
