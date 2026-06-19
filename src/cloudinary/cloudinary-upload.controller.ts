import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';

@ApiTags('Upload')
@Controller('upload')
export class CloudinaryUploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('cloudinary')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a file to Cloudinary',
    description:
      'Any authenticated user (Bearer JWT) may upload one file. Returns the HTTPS URL of the stored asset.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Any file type (images, PDFs, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Upload succeeded',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean', example: true },
        url: {
          type: 'string',
          example: 'https://res.cloudinary.com/.../image/upload/v1/...',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'No file provided' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadToCloudinary(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }
    const url = await this.cloudinaryService.uploadFile(file);
    return { status: true, url };
  }

  @Post('cloudinary/delete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a file from Cloudinary by its HTTPS URL',
    description:
      'URL must belong to the configured CLOUDINARY_CLOUD_NAME. Used when replacing or removing uploads.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delete attempted (ok or already gone)' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid URL' })
  async deleteCloudinary(@Body() body: { url?: string }) {
    const url = body?.url?.trim();
    if (!url) {
      throw new BadRequestException('url is required');
    }
    await this.cloudinaryService.deleteBySecureUrl(url);
    return { status: true };
  }
}
