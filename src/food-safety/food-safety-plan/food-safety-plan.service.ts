import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FoodSafety } from './schemas/food-safety-plan.schema';
import { Plan } from './schemas/plan.schema';
import { CreateFoodSafetyPlanDto } from './dtos/create-food-safety-plan.dto';
import { UpdateFoodSafetyPlanDto } from './dtos/update-food-safety-plan.dto';
import { ApproveFoodSafetyPlanDto } from './dtos/approve-food-safety-plan.dto';
import { DisapproveFoodSafetyPlanDto } from './dtos/disapprove-food-safety-plan.dto';
import {
  assertActorMayAccessDepartmentId,
  assertActorMayAccessFoodSafetyRecord,
  foodSafetyCompanyDeleteFilter,
  isGlobalFoodSafetyActor,
  withOwnScopeFilter,
} from '../common/food-safety-tenant.util';

@Injectable()
export class FoodSafetyPlanService {
  constructor(
    @InjectModel('FoodSafety') private foodSafetyModel: Model<FoodSafety>,
    @InjectModel('Plan') private planModel: Model<Plan>,
    @InjectModel('Department') private departmentModel: Model<any>,
  ) {}

  private actorCompanyId(actor: any): string | undefined {
    return (
      actor?.companyId?._id?.toString() ||
      actor?.companyId?.toString() ||
      undefined
    );
  }

  private async companyDepartmentIds(actor: any): Promise<Types.ObjectId[]> {
    const companyId = this.actorCompanyId(actor);
    if (!companyId) return [];
    const depts = await this.departmentModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .select('_id')
      .lean();
    return depts.map((d: any) => d._id);
  }

  async createFoodSafety(
    createFoodSafetyPlanDto: CreateFoodSafetyPlanDto,
    actor?: any,
  ) {
    if (actor) {
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        createFoodSafetyPlanDto.departmentId ||
          createFoodSafetyPlanDto.Department,
      );
    }

    const createdPlans = await this.planModel.create(
      createFoodSafetyPlanDto.Plans as any,
    );
    const plansArr = Object.values(createdPlans);
    const plansIds = plansArr.map((planObj: any) => planObj._id);

    const createdFoodSafety = new this.foodSafetyModel({
      Department: createFoodSafetyPlanDto.Department,
      DocumentType: createFoodSafetyPlanDto.DocumentType,
      DecisionTree: createFoodSafetyPlanDto.DecisionTree,
      Plans: plansIds,
      UserDepartment: createFoodSafetyPlanDto.departmentId,
      CreatedBy: createFoodSafetyPlanDto.createdBy,
      CreationDate: new Date(),
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
    });

    await createdFoodSafety.save();
    console.log(
      new Date().toLocaleString() +
        ' ' +
        'CREATE FoodSafety document Successfully!',
    );
    return {
      status: true,
      message: 'FoodSafety document created successfully',
      data: createdFoodSafety,
    };
  }

  async getAllFoodSafety(departmentId: string, actor?: any) {
    if (actor) {
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    }
    const foodSafetyDocs = await this.foodSafetyModel
      .find(
        withOwnScopeFilter(actor, {
          UserDepartment: departmentId as any,
        }) as any,
      )
      .populate('Department UserDepartment')
      .populate({
        path: 'DecisionTree',
        model: 'DecisionTree',
        populate: {
          path: 'ConductHaccp',
          model: 'ConductHaccp',
          populate: [
            {
              path: 'Teams',
              model: 'HaccpTeam',
              populate: { path: 'TeamMembers', model: 'User' },
            },
            { path: 'Process', model: 'Processes' },
          ],
        },
      })
      .populate({
        path: 'Plans',
        model: 'Plan',
        populate: {
          path: 'Decision',
          model: 'Decision',
          populate: {
            path: 'Hazard',
            model: 'Hazard',
            populate: { path: 'Process', model: 'ProcessDetail' },
          },
        },
      })
      .exec();

    if (!foodSafetyDocs) {
      throw new NotFoundException('FoodSafety documents not found');
    }

    console.log('FoodSafety documents retrieved successfully');
    return { status: true, data: foodSafetyDocs };
  }

  async getFoodSafety(planId: string, actor?: any) {
    const foodSafety = await this.foodSafetyModel
      .findById(planId)
      .populate('Department UserDepartment')
      .populate({
        path: 'DecisionTree',
        model: 'DecisionTree',
        populate: {
          path: 'ConductHaccp',
          model: 'ConductHaccp',
          populate: [
            {
              path: 'Teams',
              model: 'HaccpTeam',
              populate: { path: 'TeamMembers', model: 'User' },
            },
            { path: 'Process', model: 'Processes' },
          ],
        },
      })
      .populate({
        path: 'Plans',
        model: 'Plan',
        populate: {
          path: 'Decision',
          model: 'Decision',
          populate: {
            path: 'Hazard',
            model: 'Hazard',
            populate: { path: 'Process', model: 'ProcessDetail' },
          },
        },
      })
      .exec();

    if (!foodSafety) {
      throw new NotFoundException(
        `FoodSafety document with ID: ${planId} not found`,
      );
    }

    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        foodSafety,
      );
    }

    console.log(
      `FoodSafety document with ID: ${planId} retrieved successfully`,
    );
    return { status: true, data: foodSafety };
  }

  async deleteFoodSafety(id: string, actor?: any) {
    const existing = await this.foodSafetyModel.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `FoodSafety document with ID: ${id} not found`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existing,
      );
    }

    const deletedFoodSafety = await this.foodSafetyModel.findByIdAndDelete(id);
    if (!deletedFoodSafety) {
      throw new NotFoundException(
        `FoodSafety document with ID: ${id} not found`,
      );
    }

    console.log(`FoodSafety document with ID: ${id} deleted successfully`);
    return {
      status: true,
      message: 'FoodSafety document deleted successfully',
      data: deletedFoodSafety,
    };
  }

  async deleteAllFoodSafety(actor?: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    let filter: Record<string, unknown> = {};
    if (actor && !isGlobalFoodSafetyActor(actor)) {
      const deptIds = await this.companyDepartmentIds(actor);
      filter = foodSafetyCompanyDeleteFilter(actor, deptIds);
    }
    const result = await this.foodSafetyModel.deleteMany(filter);
    if (result.deletedCount === 0) {
      throw new NotFoundException('No FoodSafety documents found to delete!');
    }

    console.log(
      new Date().toLocaleString() +
        ' ' +
        'DELETE All FoodSafety documents Successfully!',
    );
    return {
      status: true,
      message: 'All FoodSafety documents have been deleted!',
      data: result,
    };
  }

  async updateFoodSafety(
    planId: string,
    updateFoodSafetyPlanDto: UpdateFoodSafetyPlanDto,
    actor?: any,
  ) {
    const existingFoodSafety = await this.foodSafetyModel.findById(planId);
    if (!existingFoodSafety) {
      throw new NotFoundException(
        `FoodSafety document with ID: ${planId} not found`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existingFoodSafety,
      );
    }

    const createdPlans = await this.planModel.create(
      (updateFoodSafetyPlanDto.Plans || []).map((plan: any) => {
        if (plan._id) {
          const { _id, ...newPlan } = plan;
          return newPlan;
        } else {
          return plan;
        }
      }),
    );
    const plansArr = Object.values(createdPlans);
    const plansIds = plansArr.map((planObj: any) => planObj._id);

    const wasChangeRequest = existingFoodSafety.Status === 'Change Request';

    const updates = {
      ...updateFoodSafetyPlanDto,
      RevisionNo: existingFoodSafety.RevisionNo + 1,
      UpdatedBy: updateFoodSafetyPlanDto.updatedBy,
      Plans: plansIds,
      UpdationDate: new Date(),
      Status: wasChangeRequest ? 'In Review' : 'Pending',
      ApprovalDate: undefined,
      ApprovedBy: undefined,
      DisapprovalDate: undefined,
      DisapprovedBy: undefined,
      Reason: undefined,
    };

    const updatedFoodSafety = await this.foodSafetyModel.findByIdAndUpdate(
      planId,
      updates,
      { returnDocument: 'after' },
    );
    console.log(`FoodSafety document with ID: ${planId} updated successfully`);
    return {
      status: true,
      message: 'FoodSafety document updated successfully',
      data: updatedFoodSafety,
    };
  }

  async approveFoodSafety(
    approveFoodSafetyPlanDto: ApproveFoodSafetyPlanDto,
    actor?: any,
  ) {
    const foodSafety = await this.foodSafetyModel.findById(
      approveFoodSafetyPlanDto.id,
    );
    if (!foodSafety) {
      throw new NotFoundException(
        `FoodSafety with ID: ${approveFoodSafetyPlanDto.id} not found.`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        foodSafety,
      );
    }

    if (foodSafety.Status === 'Approved') {
      throw new BadRequestException('FoodSafety is already approved.');
    }

    foodSafety.ApprovalDate = new Date();
    foodSafety.Status = 'Approved';
    foodSafety.DisapprovalDate = undefined;
    foodSafety.DisapprovedBy = undefined;
    foodSafety.Reason = undefined;
    foodSafety.ApprovedBy = approveFoodSafetyPlanDto.approvedBy;

    await this.foodSafetyModel.findByIdAndUpdate(foodSafety._id, foodSafety, {
      returnDocument: 'after',
    });
    console.log(
      `FoodSafety with ID: ${approveFoodSafetyPlanDto.id} has been approved.`,
    );
    return {
      status: true,
      message: 'The FoodSafety has been marked as approved.',
      data: foodSafety,
    };
  }

  async disapproveFoodSafety(
    disapproveFoodSafetyPlanDto: DisapproveFoodSafetyPlanDto,
    actor?: any,
  ) {
    const foodSafety = await this.foodSafetyModel.findById(
      disapproveFoodSafetyPlanDto.id,
    );
    if (!foodSafety) {
      throw new NotFoundException(
        `FoodSafety with ID: ${disapproveFoodSafetyPlanDto.id} not found.`,
      );
    }
    if (actor) {
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        foodSafety,
      );
    }

    if (foodSafety.Status === 'Approved') {
      throw new BadRequestException('FoodSafety is already approved.');
    }

    foodSafety.DisapprovalDate = new Date();
    foodSafety.Status = 'Disapproved';
    foodSafety.Reason = disapproveFoodSafetyPlanDto.Reason;
    foodSafety.ApprovalDate = undefined;
    foodSafety.ApprovedBy = undefined;
    foodSafety.DisapprovedBy = disapproveFoodSafetyPlanDto.disapprovedBy;

    await this.foodSafetyModel.findByIdAndUpdate(foodSafety._id, foodSafety, {
      returnDocument: 'after',
    });
    console.log(
      `FoodSafety with ID: ${disapproveFoodSafetyPlanDto.id} has been disapproved.`,
    );
    return {
      status: true,
      message: 'The FoodSafety has been marked as disapproved.',
      data: foodSafety,
    };
  }
}
