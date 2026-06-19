import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReviewTeamMember,
  ReviewTeamMemberDocument,
} from './schemas/review-team-member.schema';
import { CreateReviewTeamMemberDto } from './dtos/create-review-team-member.dto';
import { UpdateReviewTeamMemberDto } from './dtos/update-review-team-member.dto';
function actorDisplayName(actor: any): string | undefined {
  return actor?.name || actor?.userName || actor?._id?.toString() || undefined;
}

@Injectable()
export class ReviewTeamService {
  constructor(
    @InjectModel(ReviewTeamMember.name)
    private readonly reviewTeamMemberModel: Model<ReviewTeamMemberDocument>,
  ) {}

  private companyScopedFilter(actor: any): Record<string, unknown> {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    return companyId ? { companyId: new Types.ObjectId(companyId) } : {};
  }

  async createMember(dto: CreateReviewTeamMemberDto, actor: any) {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    const member = new this.reviewTeamMemberModel({
      ...dto,
      companyId: companyId ? new Types.ObjectId(companyId) : undefined,
      createdBy: actorDisplayName(actor),
    });
    const saved = await member.save();
    return {
      status: true,
      message: 'Team member added successfully',
      data: saved,
    };
  }

  async createMembersBulk(dtos: CreateReviewTeamMemberDto[], actor: any) {
    const companyId = actor?.companyId?._id?.toString() || actor?.companyId?.toString();
    const createdBy = actorDisplayName(actor);
    const saved: ReviewTeamMemberDocument[] = [];

    // Sequential saves so the member-code pre-save hook assigns unique codes.
    for (const dto of dtos) {
      const member = new this.reviewTeamMemberModel({
        ...dto,
        companyId: companyId ? new Types.ObjectId(companyId) : undefined,
        createdBy,
      });
      saved.push(await member.save());
    }

    return {
      status: true,
      message: `${saved.length} team member${saved.length === 1 ? '' : 's'} added successfully`,
      data: saved,
    };
  }

  async getAllMembers(actor: any) {
    const members = await this.reviewTeamMemberModel
      .find(this.companyScopedFilter(actor))
      .sort({ created_at: -1 })
      .exec();
    return { status: true, data: members };
  }

  async getMemberById(id: string) {
    const member = await this.reviewTeamMemberModel.findById(id).exec();
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    return { status: true, data: member };
  }

  async updateMember(id: string, dto: UpdateReviewTeamMemberDto) {
    const member = await this.reviewTeamMemberModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    return {
      status: true,
      message: 'Team member updated successfully',
      data: member,
    };
  }

  async deleteMember(id: string) {
    const member = await this.reviewTeamMemberModel
      .findByIdAndDelete(id)
      .exec();
    if (!member) {
      throw new NotFoundException('Team member not found');
    }
    return {
      status: true,
      message: 'Team member deleted successfully',
      data: member,
    };
  }
}
