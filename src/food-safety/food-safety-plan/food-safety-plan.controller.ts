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

@ApiTags('Food Safety Plan')
@Controller('food-safety')
export class FoodSafetyPlanController {
  constructor(private readonly foodSafetyPlanService: FoodSafetyPlanService) {}

  @Post()
  @ApiBearerAuth()
  async createFoodSafety(
    @Body() createFoodSafetyPlanDto: CreateFoodSafetyPlanDto,
  ) {
    return this.foodSafetyPlanService.createFoodSafety(createFoodSafetyPlanDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllFoodSafety(@Param('departmentId') departmentId: string) {
    return this.foodSafetyPlanService.getAllFoodSafety(departmentId);
  }

  @Get(':planId')
  @ApiBearerAuth()
  async getFoodSafety(@Param('planId') planId: string) {
    return this.foodSafetyPlanService.getFoodSafety(planId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteFoodSafety(@Body('id') id: string) {
    return this.foodSafetyPlanService.deleteFoodSafety(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllFoodSafety(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.foodSafetyPlanService.deleteAllFoodSafety();
  }

  @Patch(':planId')
  @ApiBearerAuth()
  async updateFoodSafety(
    @Param('planId') planId: string,
    @Body() updateFoodSafetyPlanDto: UpdateFoodSafetyPlanDto,
  ) {
    return this.foodSafetyPlanService.updateFoodSafety(
      planId,
      updateFoodSafetyPlanDto,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveFoodSafety(
    @Body() approveFoodSafetyPlanDto: ApproveFoodSafetyPlanDto,
  ) {
    return this.foodSafetyPlanService.approveFoodSafety(
      approveFoodSafetyPlanDto,
    );
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveFoodSafety(
    @Body() disapproveFoodSafetyPlanDto: DisapproveFoodSafetyPlanDto,
  ) {
    return this.foodSafetyPlanService.disapproveFoodSafety(
      disapproveFoodSafetyPlanDto,
    );
  }
}
