import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { DecisionTreeService } from './decision-tree.service';
import { CreateDecisionTreeDto } from './dtos/create-decision-tree.dto';
import { UpdateDecisionTreeDto } from './dtos/update-decision-tree.dto';
import { ApproveDecisionTreeDto } from './dtos/approve-decision-tree.dto';
import { DisapproveDecisionTreeDto } from './dtos/disapprove-decision-tree.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Decision Tree')
@Controller('decision-tree')
export class DecisionTreeController {
  constructor(private readonly decisionTreeService: DecisionTreeService) {}

  @Post()
  @ApiBearerAuth()
  async createDecisionTree(
    @Body() createDecisionTreeDto: CreateDecisionTreeDto,
    @CurrentUser() actor: any,
  ) {
    return this.decisionTreeService.createDecisionTree(
      createDecisionTreeDto,
      actor,
    );
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllDecisionTrees(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.decisionTreeService.getAllDecisionTrees(departmentId, actor);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedDecisionTrees(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.decisionTreeService.getApprovedDecisionTrees(
      departmentId,
      actor,
    );
  }

  /** Must be registered before `GET :treeId`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download CCP/OPRP assessments directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadDecisionTreesPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.decisionTreeService.downloadDecisionTreesPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :treeId`. */
  @Get(':treeId/download-pdf')
  @ApiOperation({ summary: 'Download a single CCP/OPRP assessment PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadDecisionTreePdf(
    @Param('treeId') treeId: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.decisionTreeService.downloadDecisionTreePdf(treeId, actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':treeId')
  @ApiBearerAuth()
  async getDecisionTree(
    @Param('treeId') treeId: string,
    @CurrentUser() actor: any,
  ) {
    return this.decisionTreeService.getDecisionTree(treeId, actor);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteDecisionTree(@Body('id') id: string, @CurrentUser() actor: any) {
    return this.decisionTreeService.deleteDecisionTree(id, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllDecisionTrees(@CurrentUser() actor: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.decisionTreeService.deleteAllDecisionTrees(actor);
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewDecisionTree(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.decisionTreeService.reviewDecisionTree(
      body.id,
      body.actor,
      currentUser,
    );
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectDecisionTree(
    @Body() body: { id: string; actor: string; reason: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.decisionTreeService.rejectDecisionTree(
      body.id,
      body.actor,
      body.reason,
      currentUser,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleDecisionTreeEnabled(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.decisionTreeService.toggleDecisionTreeEnabled(
      body.id,
      body.actor,
      currentUser,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveDecisionTree(
    @Body() approveDecisionTreeDto: ApproveDecisionTreeDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.decisionTreeService.approveDecisionTree(
      approveDecisionTreeDto,
      currentUser,
    );
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveDecisionTree(
    @Body() disapproveDecisionTreeDto: DisapproveDecisionTreeDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.decisionTreeService.disapproveDecisionTree(
      disapproveDecisionTreeDto,
      currentUser,
    );
  }

  @Patch(':treeId')
  @ApiBearerAuth()
  async updateDecisionTree(
    @Param('treeId') treeId: string,
    @Body() updateDecisionTreeDto: UpdateDecisionTreeDto,
    @CurrentUser() actor: any,
  ) {
    return this.decisionTreeService.updateDecisionTree(
      treeId,
      updateDecisionTreeDto,
      actor,
    );
  }
}
