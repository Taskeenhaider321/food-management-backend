import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FoodSafetyPlanService } from './food-safety-plan.service';
import { CreateFoodSafetyPlanDto } from './dtos/create-food-safety-plan.dto';
import { UpdateFoodSafetyPlanDto } from './dtos/update-food-safety-plan.dto';
import { ApproveFoodSafetyPlanDto } from './dtos/approve-food-safety-plan.dto';
import { DisapproveFoodSafetyPlanDto } from './dtos/disapprove-food-safety-plan.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Food Safety Plan')
@Controller('food-safety')
export class FoodSafetyPlanController {
  constructor(private readonly foodSafetyPlanService: FoodSafetyPlanService) {}

  @Post()
  @ApiBearerAuth()
  async createFoodSafety(
    @Body() createFoodSafetyPlanDto: CreateFoodSafetyPlanDto,
    @CurrentUser() actor: any,
  ) {
    return this.foodSafetyPlanService.createFoodSafety(
      createFoodSafetyPlanDto,
      actor,
    );
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllFoodSafety(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.foodSafetyPlanService.getAllFoodSafety(departmentId, actor);
  }

  @Get(':planId')
  @ApiBearerAuth()
  async getFoodSafety(
    @Param('planId') planId: string,
    @CurrentUser() actor: any,
  ) {
    return this.foodSafetyPlanService.getFoodSafety(planId, actor);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteFoodSafety(@Body('id') id: string, @CurrentUser() actor: any) {
    return this.foodSafetyPlanService.deleteFoodSafety(id, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllFoodSafety(@CurrentUser() actor: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.foodSafetyPlanService.deleteAllFoodSafety(actor);
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveFoodSafety(
    @Body() approveFoodSafetyPlanDto: ApproveFoodSafetyPlanDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.foodSafetyPlanService.approveFoodSafety(
      approveFoodSafetyPlanDto,
      currentUser,
    );
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveFoodSafety(
    @Body() disapproveFoodSafetyPlanDto: DisapproveFoodSafetyPlanDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.foodSafetyPlanService.disapproveFoodSafety(
      disapproveFoodSafetyPlanDto,
      currentUser,
    );
  }

  @Patch(':planId')
  @ApiBearerAuth()
  async updateFoodSafety(
    @Param('planId') planId: string,
    @Body() updateFoodSafetyPlanDto: UpdateFoodSafetyPlanDto,
    @CurrentUser() actor: any,
  ) {
    return this.foodSafetyPlanService.updateFoodSafety(
      planId,
      updateFoodSafetyPlanDto,
      actor,
    );
  }
}
