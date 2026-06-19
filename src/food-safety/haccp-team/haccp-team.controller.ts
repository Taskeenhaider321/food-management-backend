import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { HaccpTeamService } from './haccp-team.service';
import { CreateHaccpTeamDto } from './dtos/create-haccp-team.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('HACCP Team')
@Controller('haccp-team')
export class HaccpTeamController {
  constructor(private readonly haccpTeamService: HaccpTeamService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor())
  async createHaccpTeam(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = JSON.parse(body.Data);
    const memberFiles = (files || []).filter((file) =>
      /^files-\d+$/.test(file.fieldname),
    );
    const createDto: CreateHaccpTeamDto = {
      userId: body.userId,
      teamName: data.teamName,
      Department: data.Department,
      DocumentType: data.DocumentType,
      TeamMembers: data.TeamMembers,
      files: memberFiles,
    };
    return this.haccpTeamService.createHaccpTeam(createDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllHaccpTeams(@Param('departmentId') departmentId: string) {
    return this.haccpTeamService.getAllHaccpTeams(departmentId);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedHaccpTeams(@Param('departmentId') departmentId: string) {
    return this.haccpTeamService.getApprovedHaccpTeams(departmentId);
  }

  @Get(':teamId')
  @ApiBearerAuth()
  async getHaccpTeam(@Param('teamId') teamId: string) {
    return this.haccpTeamService.getHaccpTeam(teamId);
  }

  @Delete(':teamId')
  @ApiBearerAuth()
  async deleteHaccpTeam(@Param('teamId') teamId: string) {
    return this.haccpTeamService.deleteHaccpTeam(teamId);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllHaccpTeams(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.haccpTeamService.deleteAllHaccpTeams();
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewHaccpTeam(@Body() body: { id: string; actor: string }) {
    return this.haccpTeamService.reviewHaccpTeam(body.id, body.actor);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectHaccpTeam(
    @Body() body: { id: string; actor: string; reason: string },
  ) {
    return this.haccpTeamService.rejectHaccpTeam(
      body.id,
      body.actor,
      body.reason,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleHaccpTeamEnabled(@Body() body: { id: string; actor: string }) {
    return this.haccpTeamService.toggleHaccpTeamEnabled(body.id, body.actor);
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveHaccpTeam(@Body() body: { id: string; approvedBy: string }) {
    return this.haccpTeamService.approveHaccpTeam(body.id, body.approvedBy);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveHaccpTeam(
    @Body() body: { id: string; disapprovedBy: string; Reason: string },
  ) {
    return this.haccpTeamService.disapproveHaccpTeam(
      body.id,
      body.disapprovedBy,
      body.Reason,
    );
  }
}
