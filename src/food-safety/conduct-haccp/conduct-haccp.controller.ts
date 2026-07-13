import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { ConductHaccpService } from './conduct-haccp.service';
import { CreateConductHaccpDto } from './dtos/create-conduct-haccp.dto';
import { UpdateConductHaccpDto } from './dtos/update-conduct-haccp.dto';
import { ApproveConductHaccpDto } from './dtos/approve-conduct-haccp.dto';
import { DisapproveConductHaccpDto } from './dtos/disapprove-conduct-haccp.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Conduct HACCP')
@Controller('conduct-haccp')
export class ConductHaccpController {
  constructor(private readonly conductHaccpService: ConductHaccpService) {}

  @Post('')
  @ApiBearerAuth()
  async createConductHaccp(
    @Body() createConductHaccpDto: CreateConductHaccpDto,
  ) {
    return this.conductHaccpService.createConductHaccp(createConductHaccpDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllConductHaccp(@Param('departmentId') departmentId: string) {
    return this.conductHaccpService.getAllConductHaccp(departmentId);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedConductHaccp(@Param('departmentId') departmentId: string) {
    return this.conductHaccpService.getApprovedConductHaccp(departmentId);
  }

  /** Must be registered before `GET :haccpId`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download risk assessments directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadConductHaccpsPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.conductHaccpService.downloadConductHaccpsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :haccpId`. */
  @Get(':haccpId/download-pdf')
  @ApiOperation({ summary: 'Download a single risk assessment PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadConductHaccpPdf(
    @Param('haccpId') haccpId: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.conductHaccpService.downloadConductHaccpPdf(haccpId, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':haccpId')
  @ApiBearerAuth()
  async getConductHaccp(@Param('haccpId') haccpId: string) {
    return this.conductHaccpService.getConductHaccp(haccpId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteConductHaccp(@Body('id') id: string) {
    return this.conductHaccpService.deleteConductHaccp(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllConductHaccp(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.conductHaccpService.deleteAllConductHaccp();
  }

  @Put(':haccpId')
  @ApiBearerAuth()
  async updateConductHaccp(
    @Param('haccpId') haccpId: string,
    @Body() updateConductHaccpDto: UpdateConductHaccpDto,
  ) {
    return this.conductHaccpService.updateConductHaccp(
      haccpId,
      updateConductHaccpDto,
    );
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewConductHaccp(@Body() body: { id: string; actor: string }) {
    return this.conductHaccpService.reviewConductHaccp(body.id, body.actor);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectConductHaccp(
    @Body() body: { id: string; actor: string; reason: string },
  ) {
    return this.conductHaccpService.rejectConductHaccp(
      body.id,
      body.actor,
      body.reason,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleConductHaccpEnabled(@Body() body: { id: string; actor: string }) {
    return this.conductHaccpService.toggleConductHaccpEnabled(
      body.id,
      body.actor,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveConductHaccp(
    @Body() approveConductHaccpDto: ApproveConductHaccpDto,
  ) {
    return this.conductHaccpService.approveConductHaccp(approveConductHaccpDto);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveConductHaccp(
    @Body() disapproveConductHaccpDto: DisapproveConductHaccpDto,
  ) {
    return this.conductHaccpService.disapproveConductHaccp(
      disapproveConductHaccpDto,
    );
  }
}
