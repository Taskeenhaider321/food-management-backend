import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { Document, DocumentSchema } from './schemas/document.schema';
import {
  Department,
  DepartmentSchema,
} from '../../admin-management/department/schemas/department.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [MongooseModule],
})
export class DocumentModule {}
