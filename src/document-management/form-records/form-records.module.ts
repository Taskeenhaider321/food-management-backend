import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FormRecordsController } from './form-records.controller';
import { FormRecordsService } from './form-records.service';
import { FormRecords, FormRecordsSchema } from './schemas/form-records.schema';
import { ListOfForms, ListOfFormsSchema } from '../list-of-forms/schemas/list-of-forms.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FormRecords.name, schema: FormRecordsSchema },
      { name: ListOfForms.name, schema: ListOfFormsSchema },
    ]),
  ],
  controllers: [FormRecordsController],
  providers: [FormRecordsService],
})
export class FormRecordsModule {}
