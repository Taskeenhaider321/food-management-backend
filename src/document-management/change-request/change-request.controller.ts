import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ChangeRequestService } from './change-request.service';
import {
  CreateChangeRequestDto,
  DisapproveChangeRequestDto,
  UpdateChangeRequestDto,
} from './dtos/create-change-request.dto';

@ApiTags('Change Requests')
@Controller('change-requests')
export class ChangeRequestController {
  constructor(private readonly changeRequestService: ChangeRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a change request for a controlled document' })
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() actor: any,
  ) {
    return this.changeRequestService.create(dto, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all change requests for the company' })
  @ApiBearerAuth()
  async findAll(@CurrentUser() actor: any) {
    return this.changeRequestService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a change request by id (with timeline)' })
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.changeRequestService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update / resubmit a pending or disapproved request' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeRequestDto,
    @CurrentUser() actor: any,
  ) {
    return this.changeRequestService.update(id, dto, actor);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending change request' })
  @ApiBearerAuth()
  async approve(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.changeRequestService.approve(id, actor);
  }

  @Patch(':id/disapprove')
  @ApiOperation({ summary: 'Disapprove a pending change request (reason required)' })
  @ApiBearerAuth()
  async disapprove(
    @Param('id') id: string,
    @Body() dto: DisapproveChangeRequestDto,
    @CurrentUser() actor: any,
  ) {
    return this.changeRequestService.disapprove(id, dto, actor);
  }
}
