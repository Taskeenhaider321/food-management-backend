import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MeetingParticipantsService } from './meeting-participants.service';
import { CreateMeetingParticipantsDto } from './dtos/create-meeting-participants.dto';
import { UpdateMeetingParticipantsDto } from './dtos/update-meeting-participants.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Meeting Participants')
@Controller('meeting-participants')
export class MeetingParticipantsController {
  constructor(
    private readonly meetingParticipantsService: MeetingParticipantsService,
  ) {}

  @Post()
  @ApiBearerAuth()
  async createMeetingParticipants(
    @Body() createDto: CreateMeetingParticipantsDto,
    @CurrentUser() actor: any,
  ) {
    return this.meetingParticipantsService.createMeetingParticipants(
      createDto,
      actor,
    );
  }

  @Get()
  @ApiBearerAuth()
  async getMeetingParticipantsForCompany(@CurrentUser() user: any) {
    const companyId = user?.companyId?._id?.toString() || user?.companyId?.toString();
    return this.meetingParticipantsService.getMeetingParticipantsByCompany(
      companyId,
    );
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllMeetingParticipants(@Param('departmentId') departmentId: string) {
    return this.meetingParticipantsService.getAllMeetingParticipants(
      departmentId,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  async getMeetingParticipant(@Param('id') id: string) {
    return this.meetingParticipantsService.getMeetingParticipant(id);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteMeetingParticipants(@Body('id') id: string) {
    return this.meetingParticipantsService.deleteMeetingParticipants(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllMeetingParticipants(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.meetingParticipantsService.deleteAllMeetingParticipants();
  }

  @Put(':id')
  @ApiBearerAuth()
  async updateMeetingParticipants(
    @Param('id') id: string,
    @Body() updateDto: UpdateMeetingParticipantsDto,
  ) {
    return this.meetingParticipantsService.updateMeetingParticipants(updateDto);
  }
}
