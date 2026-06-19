import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryUploadController } from './cloudinary-upload.controller';

@Module({
  controllers: [CloudinaryUploadController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
