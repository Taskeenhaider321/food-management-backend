import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MRMService } from './mrm.service';
import { CreateMRMDto } from './dtos/create-mrm.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('MRM')
@Controller('mrm')
export class MRMController {
  constructor(private readonly mrmService: MRMService) {}

  @Post()
  @ApiBearerAuth()
  async createMRM(@Body() createDto: CreateMRMDto) {
    return this.mrmService.createMRM(createDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllMRMs(@Param('departmentId') departmentId: string) {
    return this.mrmService.getAllMRMs(departmentId);
  }

  @Get(':id')
  @ApiBearerAuth()
  async getMRMById(@Param('mrmId') mrmId: string) {
    return this.mrmService.getMRMById(mrmId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteMRM(@Body('id') id: string) {
    return this.mrmService.deleteMRM(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllMRMs(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.mrmService.deleteAllMRMs();
  }
}
