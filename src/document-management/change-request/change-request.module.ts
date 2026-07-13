import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangeRequestController } from './change-request.controller';
import { ChangeRequestService } from './change-request.service';
import {
  ChangeRequest,
  ChangeRequestSchema,
} from './schemas/change-request.schema';
import { Document, DocumentSchema } from '../document/schemas/document.schema';
import {
  ListOfForms,
  ListOfFormsSchema,
} from '../list-of-forms/schemas/list-of-forms.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChangeRequest.name, schema: ChangeRequestSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: ListOfForms.name, schema: ListOfFormsSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ChangeRequestController],
  providers: [ChangeRequestService],
})
export class ChangeRequestModule {}
