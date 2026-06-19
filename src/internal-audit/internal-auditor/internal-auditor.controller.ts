import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { InternalAuditorService } from './internal-auditor.service';
import { CreateAuditorDto } from './dtos/create-auditor.dto';
import { UpdateAuditorDto } from './dtos/update-auditor.dto';
import {
  AddAccountCredentialsDto,
  ResetAccountCredentialsDto,
} from './dtos/account-credentials.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Internal Auditor')
@Controller('internal-auditor')
export class InternalAuditorController {
  constructor(private readonly auditorService: InternalAuditorService) {}

  @Post()
  @ApiOperation({ summary: 'Add auditor' })
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'AuditorImage', maxCount: 1 },
      { name: 'SupportingDocuments', maxCount: 10 },
      { name: 'ApprovalDocuments', maxCount: 10 },
    ]),
  )
  async addAuditor(
    @Body() createDto: CreateAuditorDto,
    @UploadedFiles() files: any,
  ) {
    return this.auditorService.addAuditor(createDto, files);
  }

  @Put()
  @ApiOperation({ summary: 'Update auditor profile' })
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'AuditorImage', maxCount: 1 },
      { name: 'SupportingDocuments', maxCount: 10 },
      { name: 'ApprovalDocuments', maxCount: 10 },
    ]),
  )
  async updateAuditor(
    @Body() updateDto: UpdateAuditorDto,
    @UploadedFiles() files: any,
  ) {
    return this.auditorService.updateAuditor(updateDto, files);
  }

  @Get('all/:departmentId')
  @ApiOperation({ summary: 'Get all auditors by department' })
  @ApiBearerAuth()
  async readAuditor(@Param('departmentId') departmentId: string) {
    return this.auditorService.readAuditor(departmentId);
  }

  @Get(':auditorId')
  @ApiOperation({ summary: 'Get auditor profile by ID' })
  @ApiBearerAuth()
  async getAuditorById(@Param('auditorId') auditorId: string) {
    return this.auditorService.getAuditorById(auditorId);
  }

  @Patch('toggle-status/:auditorId')
  @ApiOperation({ summary: 'Enable/Disable auditor' })
  @ApiBearerAuth()
  async toggleStatus(@Param('auditorId') auditorId: string) {
    return this.auditorService.toggleStatus(auditorId);
  }

  @Post('add-credentials')
  @ApiOperation({ summary: 'Add account credentials for auditor' })
  @ApiBearerAuth()
  async addAccountCredentials(@Body() dto: AddAccountCredentialsDto) {
    return this.auditorService.addAccountCredentials(dto);
  }

  @Patch('reset-credentials')
  @ApiOperation({ summary: 'Reset account credentials for auditor' })
  @ApiBearerAuth()
  async resetAccountCredentials(@Body() dto: ResetAccountCredentialsDto) {
    return this.auditorService.resetAccountCredentials(dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  async deleteAuditor(@Param('id') id: string) {
    return this.auditorService.deleteAuditor(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllAuditors(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.auditorService.deleteAllAuditors();
  }
}
