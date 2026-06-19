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
import { ListOfFormsService } from './list-of-forms.service';
import {
  CreateListOfFormsDto,
  FormActionReasonDto,
  UpdateListOfFormsDto,
} from './dtos/create-list-of-forms.dto';

@ApiTags('Forms')
@Controller('list-of-forms')
export class ListOfFormsController {
  constructor(private readonly listOfFormsService: ListOfFormsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a digital form' })
  @ApiBearerAuth()
  async create(@Body() dto: CreateListOfFormsDto, @CurrentUser() actor: any) {
    return this.listOfFormsService.create(dto, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all forms for the company' })
  @ApiBearerAuth()
  async findAll(@CurrentUser() actor: any) {
    return this.listOfFormsService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a form by id (with timeline and versions)' })
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.listOfFormsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a form (resubmits rejected/disapproved)' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateListOfFormsDto,
    @CurrentUser() actor: any,
  ) {
    return this.listOfFormsService.update(id, dto, actor);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Mark a form as reviewed' })
  @ApiBearerAuth()
  async review(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.listOfFormsService.review(id, actor);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a reviewed form' })
  @ApiBearerAuth()
  async approve(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.listOfFormsService.approve(id, actor);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a form (reason required)' })
  @ApiBearerAuth()
  async reject(
    @Param('id') id: string,
    @Body() dto: FormActionReasonDto,
    @CurrentUser() actor: any,
  ) {
    return this.listOfFormsService.reject(id, dto, actor);
  }

  @Patch(':id/disapprove')
  @ApiOperation({ summary: 'Disapprove an approved form (reason required)' })
  @ApiBearerAuth()
  async disapprove(
    @Param('id') id: string,
    @Body() dto: FormActionReasonDto,
    @CurrentUser() actor: any,
  ) {
    return this.listOfFormsService.disapprove(id, dto, actor);
  }

  @Patch(':id/toggle-enabled')
  @ApiOperation({ summary: 'Enable / disable a reviewed or approved form' })
  @ApiBearerAuth()
  async toggleEnabled(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.listOfFormsService.toggleEnabled(id, actor);
  }
}
