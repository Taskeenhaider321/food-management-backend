import { PartialType } from '@nestjs/swagger';
import { CreateUploadDocumentsDto } from './create-upload-documents.dto';

export class UpdateUploadDocumentsDto extends PartialType(CreateUploadDocumentsDto) {}
