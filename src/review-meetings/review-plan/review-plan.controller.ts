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
import { ReviewPlanService } from './review-plan.service';
import { CreateReviewPlanDto } from './dtos/create-review-plan.dto';
import { UpdateReviewPlanDto } from './dtos/update-review-plan.dto';

@ApiTags('Review Plans')
@Controller('review-plans')
export class ReviewPlanController {
  constructor(private readonly reviewPlanService: ReviewPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review plan (MRM)' })
  @ApiBearerAuth()
  async createPlan(
    @Body() dto: CreateReviewPlanDto,
    @CurrentUser() actor: any,
  ) {
    return this.reviewPlanService.createPlan(dto, actor);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all review plans for the company' })
  @ApiBearerAuth()
  async getAllPlans(@CurrentUser() actor: any) {
    return this.reviewPlanService.getAllPlans(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review plan by id' })
  @ApiBearerAuth()
  async getPlanById(@Param('id') id: string) {
    return this.reviewPlanService.getPlanById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a review plan' })
  @ApiBearerAuth()
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateReviewPlanDto) {
    return this.reviewPlanService.updatePlan(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review plan and its meeting minutes' })
  @ApiBearerAuth()
  async deletePlan(@Param('id') id: string) {
    return this.reviewPlanService.deletePlan(id);
  }
}
