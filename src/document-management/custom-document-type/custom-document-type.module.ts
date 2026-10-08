import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomDocumentTypeController } from './custom-document-type.controller';
import { CustomDocumentTypeService } from './custom-document-type.service';
import {
  CustomDocumentType,
  CustomDocumentTypeSchema,
} from './schemas/custom-document-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomDocumentType.name, schema: CustomDocumentTypeSchema },
    ]),
  ],
  controllers: [CustomDocumentTypeController],
  providers: [CustomDocumentTypeService],
  exports: [CustomDocumentTypeService, MongooseModule],
})
export class CustomDocumentTypeModule {}
