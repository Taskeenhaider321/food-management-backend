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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ConductAuditsService } from './conduct-audits.service';
import { CreateConductAuditDto } from './dtos/create-conduct-audit.dto';
import { UpdateConductAuditDto } from './dtos/update-conduct-audit.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Conduct Audits')
@Controller('conduct-audits')
export class ConductAuditsController {
  constructor(private readonly conductAuditsService: ConductAuditsService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 100))
  async addConductAudit(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const createDto: CreateConductAuditDto = {
      userId: body.userId,
      Checklist: body.Checklist,
      departmentId: body.departmentId || undefined,
      Answers: JSON.parse(body.Answers),
      files: files || [],
    };
    return this.conductAuditsService.addConductAudit(createDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async readConductAudits(@Param('departmentId') departmentId: string) {
    return this.conductAuditsService.readConductAudits(departmentId);
  }

  @Get('by-checklist/:checklistId/:departmentId')
  @ApiBearerAuth()
  async getConductAuditsByChecklistId(
    @Param('checklistId') checklistId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.conductAuditsService.getConductAuditsByChecklistId(
      checklistId,
      departmentId,
    );
  }

  @Get('by-audit/:auditId')
  @ApiBearerAuth()
  async getConductAuditByAuditId(@Param('auditId') auditId: string) {
    return this.conductAuditsService.getConductAuditByAuditId(auditId);
  }

  @Put()
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 100))
  async updateConductAudit(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const updateDto: UpdateConductAuditDto = {
      userId: body.userId,
      conductAuditId: body.conductAuditId,
      departmentId: body.departmentId || undefined,
      Answers: JSON.parse(body.Answers),
      files: files || [],
    };
    return this.conductAuditsService.updateConductAudit(updateDto);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteConductAudit(@Body('id') id: string) {
    return this.conductAuditsService.deleteConductAudit(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllConductAudits(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.conductAuditsService.deleteAllConductAudits();
  }
}
