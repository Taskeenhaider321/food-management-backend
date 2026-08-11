// TEST/hr/trainer/trainer.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Header,
  StreamableFile,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TrainerService } from './trainer.service';
import { CreateTrainerDto } from './dtos/create-trainer.dto';
import { UpdateTrainerDto } from './dtos/update-trainer.dto';

@ApiTags('Trainers')
@Controller('trainers')
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create trainer (JSON body)',
    description:
      'Upload avatar and PDF via POST /upload/cloudinary first; send profile.avatar and trainerDocumentUrl.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Trainer created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'UserName already exists',
  })
  async create(
    @Body() createTrainerDto: CreateTrainerDto,
    @CurrentUser() actor: any,
  ) {
    return this.trainerService.create(createTrainerDto, actor);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List trainers for the signed-in user’s company (all for super-admin)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trainers found' })
  async listByCompany(@CurrentUser() actor: any) {
    return this.trainerService.findAllForCompany(actor);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trainer profile for the signed-in user' })
  async findMe(@CurrentUser() actor: any) {
    return this.trainerService.findMe(actor);
  }

  /** Must be registered before `GET :departmentId`. */
  @Get('download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download trainers directory PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadTrainersPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.trainerService.downloadTrainersPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Two-segment route; safe alongside single-segment `:departmentId`. */
  @Get(':id/download-pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a single trainer PDF' })
  @ApiParam({ name: 'id', description: 'Trainer ID' })
  @Header('Content-Type', 'application/pdf')
  async downloadTrainerPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.trainerService.downloadTrainerPdf(
      id,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':departmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trainers by department' })
  @ApiParam({ name: 'departmentId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trainers found' })
  async findByDepartment(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.trainerService.findByDepartment(departmentId, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all trainers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All trainers deleted successfully',
  })
  async removeAll(@CurrentUser() actor: any) {
    return this.trainerService.deleteAll(actor);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trainer by id' })
  @ApiParam({ name: 'id', description: 'Trainer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trainer updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTrainerDto: UpdateTrainerDto,
    @Req() req: { user?: unknown },
  ) {
    return this.trainerService.update(id, updateTrainerDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete trainer by id' })
  @ApiParam({ name: 'id', description: 'Trainer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trainer deleted successfully',
  })
  async delete(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.trainerService.delete(id, actor);
  }
}
