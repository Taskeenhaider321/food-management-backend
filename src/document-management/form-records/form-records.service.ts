import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FormRecords } from './schemas/form-records.schema';
import { ListOfForms } from '../list-of-forms/schemas/list-of-forms.schema';
import { CreateFormRecordsDto } from './dtos/create-form-records.dto';
import { AddCommentDto } from './dtos/add-comment.dto';
import { VerifyResponseDto } from './dtos/verify-response.dto';

@Injectable()
export class FormRecordsService {
  private readonly logger = new Logger(FormRecordsService.name);

  constructor(
    @InjectModel(FormRecords.name) private formRecordsModel: Model<FormRecords>,
    @InjectModel(ListOfForms.name) private listOfFormsModel: Model<ListOfForms>,
  ) {}

  private async nextFormRecordId(): Promise<string> {
    const latest = await this.formRecordsModel
      .findOne(
        { FormRecordId: { $exists: true, $nin: [null, ''] } },
        { FormRecordId: 1 },
      )
      .sort({ FormRecordId: -1 })
      .lean();

    let next = 1;
    if (latest?.FormRecordId) {
      const numeric = parseInt(String(latest.FormRecordId).replace(/^FR/i, ''), 10);
      if (!Number.isNaN(numeric)) next = numeric + 1;
    }
    return `FR${next.toString().padStart(3, '0')}`;
  }

  async submitResponse(createDto: CreateFormRecordsDto) {
    const form = await this.listOfFormsModel.findById(createDto.Form);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.status !== 'Approved') {
      throw new BadRequestException('Form is not in an Approved status');
    }

    const questionIds = new Set(
      (form.questions || []).map((q) => String((q as any)._id)),
    );
    const answers = (createDto.answers || []).filter((answer) =>
      questionIds.has(String(answer.question)),
    );

    // Assign FormRecordId in the service so submit never depends only on a
    // pre-save hook being registered (production previously skipped the hook,
    // which left FormRecordId null and triggered E11000 on the unique index).
    const buildRecord = async () =>
      new this.formRecordsModel({
        FormRecordId: await this.nextFormRecordId(),
        UserDepartment: createDto.departmentId,
        Form: createDto.Form,
        FillBy: createDto.filledBy,
        answers,
        Status: 'Pending',
        FillDate: new Date(),
      });

    let formRecords = await buildRecord();
    try {
      await formRecords.save();
    } catch (err: unknown) {
      const mongoErr = err as { code?: number; message?: string; name?: string };
      this.logger.error(
        `submitResponse failed: ${mongoErr?.message || err}`,
        err instanceof Error ? err.stack : undefined,
      );

      if (mongoErr?.code === 11000) {
        try {
          formRecords = await buildRecord();
          await formRecords.save();
        } catch (retryErr: unknown) {
          const retryMsg =
            retryErr instanceof Error
              ? retryErr.message
              : 'Duplicate form record';
          throw new BadRequestException(
            `Unable to save form response (duplicate key). ${retryMsg}`,
          );
        }
      } else if (
        mongoErr?.name === 'CastError' ||
        mongoErr?.name === 'ValidationError'
      ) {
        throw new BadRequestException(
          mongoErr.message || 'Invalid form response payload',
        );
      } else {
        throw new InternalServerErrorException(
          mongoErr?.message || 'Unable to submit form response',
        );
      }
    }

    return {
      status: true,
      message: 'User responses submitted successfully',
      Data: formRecords,
    };
  }

  async addComment(addCommentDto: AddCommentDto) {
    const response = await this.formRecordsModel.findById(
      addCommentDto.resultId,
    );
    if (!response) {
      throw new NotFoundException('Form record not found');
    }

    response.Comment = addCommentDto.comment;
    const updated = await this.formRecordsModel.findByIdAndUpdate(
      response._id,
      response,
      { returnDocument: 'after' },
    );
    return {
      status: true,
      message: 'Comment added successfully',
      data: updated,
    };
  }

  async verifyResponse(verifyDto: VerifyResponseDto) {
    const response = await this.formRecordsModel.findById(verifyDto.resultId);
    if (!response) {
      throw new NotFoundException('Form record not found');
    }

    if (response.Status && response.Status !== 'Pending') {
      throw new BadRequestException(
        `This response is already ${response.Status}`,
      );
    }

    const decision = verifyDto.decision || 'Verified';
    response.Status = decision;
    response.VerifiedBy = verifyDto.verifiedBy;
    response.VerificationDate = new Date();
    if (verifyDto.comment?.trim()) {
      response.Comment = verifyDto.comment.trim();
    }

    const updated = await this.formRecordsModel.findByIdAndUpdate(
      response._id,
      response,
      { returnDocument: 'after' },
    );
    return {
      status: true,
      message:
        decision === 'Rejected'
          ? 'Response disapproved successfully'
          : 'Response approved successfully',
      data: updated,
    };
  }

  async getResponsesByFormId(formId: string, departmentId: string) {
    const form = await this.listOfFormsModel.findById(formId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const filter: Record<string, unknown> = { Form: formId };
    if (departmentId && departmentId !== 'all') {
      filter.UserDepartment = departmentId;
    }

    const responseForm = await this.formRecordsModel
      .find(filter)
      .sort({ FillDate: -1 })
      .populate('UserDepartment')
      .populate({
        path: 'Form',
        populate: { path: 'departments', model: 'Department' },
      });

    return {
      status: true,
      message: 'User Responses Retrieved Successfully',
      data: responseForm,
    };
  }

  async getRecordByRecordId(recordId: string) {
    const responseForm = await this.formRecordsModel
      .findById(recordId)
      .populate('UserDepartment')
      .populate({
        path: 'Form',
        populate: { path: 'departments', model: 'Department' },
      });

    if (!responseForm) {
      throw new NotFoundException('Form record not found');
    }

    return {
      status: true,
      message: 'Form record retrieved successfully',
      data: responseForm,
    };
  }
}
