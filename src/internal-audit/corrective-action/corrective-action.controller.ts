import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CorrectiveActionService } from './corrective-action.service';
import { CreateCorrectiveActionDto } from './dtos/create-corrective-action.dto';
import { UpdateCorrectiveActionDto } from './dtos/update-corrective-action.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Corrective Action')
@Controller('corrective-action')
export class CorrectiveActionController {
  constructor(
    private readonly correctiveActionService: CorrectiveActionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add corrective action' })
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 100))
  async addCorrectiveAction(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const createDto: CreateCorrectiveActionDto = {
      userId: body.userId,
      Report: body.Report,
      Answers: JSON.parse(body.Answers),
      files: files || [],
    };
    return this.correctiveActionService.addCorrectiveAction(createDto);
  }

  @Put()
  @ApiOperation({ summary: 'Update corrective action' })
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 100))
  async updateCorrectiveAction(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const updateDto: UpdateCorrectiveActionDto = {
      userId: body.userId,
      actionId: body.actionId,
      Answers: JSON.parse(body.Answers),
      files: files || [],
      updatedBy: body.updatedBy,
    };
    return this.correctiveActionService.updateCorrectiveAction(updateDto);
  }

  /** Must be registered before parameterized routes. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download corrective actions directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadCorrectiveActionsPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.correctiveActionService.downloadCorrectiveActionsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before parameterized routes. */
  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download a single corrective action PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadCorrectiveActionPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.correctiveActionService.downloadCorrectiveActionPdf(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async readAllCorrectiveActions(@Param('departmentId') departmentId: string) {
    return this.correctiveActionService.readAllCorrectiveActions(departmentId);
  }

  @Get('by-report/:reportId/:departmentId')
  @ApiBearerAuth()
  async readCorrectiveActionByReportId(
    @Param('reportId') reportId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.correctiveActionService.readCorrectiveActionByReportId(
      reportId,
      departmentId,
    );
  }

  @Get('by-action/:actionId')
  @ApiBearerAuth()
  async readCorrectiveActionById(@Param('actionId') actionId: string) {
    return this.correctiveActionService.readCorrectiveActionById(actionId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteCorrectiveAction(@Body('id') id: string) {
    return this.correctiveActionService.deleteCorrectiveAction(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllCorrectiveActions(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.correctiveActionService.deleteAllCorrectiveActions();
  }
}
