import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadDocumentsController } from './upload-documents.controller';
import { UploadDocumentsService } from './upload-documents.service';
import { UploadDocuments, UploadDocumentsSchema } from './schemas/upload-documents.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Company, CompanySchema } from '../../admin-management/company/schemas/company.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadDocuments.name, schema: UploadDocumentsSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [UploadDocumentsController],
  providers: [UploadDocumentsService],
  exports: [MongooseModule],
})
export class UploadDocumentsModule {}
