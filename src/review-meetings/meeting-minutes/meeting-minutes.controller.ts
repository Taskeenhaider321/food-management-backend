import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MeetingMinutesService } from './meeting-minutes.service';
import { CreateMeetingMinutesDto } from './dtos/create-meeting-minutes.dto';
import { UpdateMeetingMinutesDto } from './dtos/update-meeting-minutes.dto';

@ApiTags('Meeting Minutes')
@Controller('meeting-minutes')
export class MeetingMinutesController {
  constructor(private readonly meetingMinutesService: MeetingMinutesService) {}

  @Post()
  @ApiOperation({ summary: 'Record minutes of meeting for a review plan' })
  @ApiBearerAuth()
  async createMinutes(
    @Body() dto: CreateMeetingMinutesDto,
    @CurrentUser() actor: any,
  ) {
    return this.meetingMinutesService.createMinutes(dto, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all meeting minutes for the company' })
  @ApiBearerAuth()
  async getAllMinutes(@CurrentUser() actor: any) {
    return this.meetingMinutesService.getAllMinutes(actor);
  }

  @Get('download-pdf')
  @ApiOperation({ summary: 'Download meeting minutes directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadMeetingMinutesPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.meetingMinutesService.downloadMeetingMinutesPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('by-plan/:planId')
  @ApiOperation({ summary: 'Get meeting minutes by review plan id' })
  @ApiBearerAuth()
  async getMinutesByPlan(@Param('planId') planId: string) {
    return this.meetingMinutesService.getMinutesByPlan(planId);
  }

  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download a single meeting minutes PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadMeetingMinutesByIdPdf(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.meetingMinutesService.downloadMeetingMinutesByIdPdf(id, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting minutes by id' })
  @ApiBearerAuth()
  async getMinutesById(@Param('id') id: string) {
    return this.meetingMinutesService.getMinutesById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update meeting minutes' })
  @ApiBearerAuth()
  async updateMinutes(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingMinutesDto,
  ) {
    return this.meetingMinutesService.updateMinutes(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete meeting minutes' })
  @ApiBearerAuth()
  async deleteMinutes(@Param('id') id: string) {
    return this.meetingMinutesService.deleteMinutes(id);
  }
}
