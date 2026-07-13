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
  ) {
    return this.decisionTreeService.createDecisionTree(createDecisionTreeDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllDecisionTrees(@Param('departmentId') departmentId: string) {
    return this.decisionTreeService.getAllDecisionTrees(departmentId);
  }

  @Get('approved/:departmentId')
  @ApiBearerAuth()
  async getApprovedDecisionTrees(@Param('departmentId') departmentId: string) {
    return this.decisionTreeService.getApprovedDecisionTrees(departmentId);
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
  async getDecisionTree(@Param('treeId') treeId: string) {
    return this.decisionTreeService.getDecisionTree(treeId);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteDecisionTree(@Body('id') id: string) {
    return this.decisionTreeService.deleteDecisionTree(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllDecisionTrees(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.decisionTreeService.deleteAllDecisionTrees();
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewDecisionTree(@Body() body: { id: string; actor: string }) {
    return this.decisionTreeService.reviewDecisionTree(body.id, body.actor);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectDecisionTree(
    @Body() body: { id: string; actor: string; reason: string },
  ) {
    return this.decisionTreeService.rejectDecisionTree(
      body.id,
      body.actor,
      body.reason,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleDecisionTreeEnabled(@Body() body: { id: string; actor: string }) {
    return this.decisionTreeService.toggleDecisionTreeEnabled(
      body.id,
      body.actor,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveDecisionTree(
    @Body() approveDecisionTreeDto: ApproveDecisionTreeDto,
  ) {
    return this.decisionTreeService.approveDecisionTree(approveDecisionTreeDto);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveDecisionTree(
    @Body() disapproveDecisionTreeDto: DisapproveDecisionTreeDto,
  ) {
    return this.decisionTreeService.disapproveDecisionTree(
      disapproveDecisionTreeDto,
    );
  }

  @Patch(':treeId')
  @ApiBearerAuth()
  async updateDecisionTree(
    @Param('treeId') treeId: string,
    @Body() updateDecisionTreeDto: UpdateDecisionTreeDto,
  ) {
    return this.decisionTreeService.updateDecisionTree(
      treeId,
      updateDecisionTreeDto,
    );
  }
}
