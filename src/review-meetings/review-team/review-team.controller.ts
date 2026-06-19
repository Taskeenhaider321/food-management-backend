import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReviewTeamService } from './review-team.service';
import {
  BulkCreateReviewTeamMembersDto,
  CreateReviewTeamMemberDto,
} from './dtos/create-review-team-member.dto';
import { UpdateReviewTeamMemberDto } from './dtos/update-review-team-member.dto';

@ApiTags('Review Team')
@Controller('review-team')
export class ReviewTeamController {
  constructor(private readonly reviewTeamService: ReviewTeamService) {}

  @Post()
  @ApiOperation({ summary: 'Add a single review team member' })
  @ApiBearerAuth()
  async createMember(
    @Body() dto: CreateReviewTeamMemberDto,
    @CurrentUser() actor: any,
  ) {
    return this.reviewTeamService.createMember(dto, actor);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Add multiple review team members at once' })
  @ApiBearerAuth()
  async createMembersBulk(
    @Body() dto: BulkCreateReviewTeamMembersDto,
    @CurrentUser() actor: any,
  ) {
    return this.reviewTeamService.createMembersBulk(dto.members, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all review team members for the company' })
  @ApiBearerAuth()
  async getAllMembers(@CurrentUser() actor: any) {
    return this.reviewTeamService.getAllMembers(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review team member by id' })
  @ApiBearerAuth()
  async getMemberById(@Param('id') id: string) {
    return this.reviewTeamService.getMemberById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a review team member' })
  @ApiBearerAuth()
  async updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateReviewTeamMemberDto,
  ) {
    return this.reviewTeamService.updateMember(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review team member' })
  @ApiBearerAuth()
  async deleteMember(@Param('id') id: string) {
    return this.reviewTeamService.deleteMember(id);
  }
}
