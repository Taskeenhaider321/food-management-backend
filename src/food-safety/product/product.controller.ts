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
import { ProductService } from './product.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ApproveProductDto } from './dtos/approve-product.dto';
import { DisapproveProductDto } from './dtos/disapprove-product.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBearerAuth()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() actor: any,
  ) {
    return this.productService.createProduct(createProductDto, actor);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllProducts(
    @Param('departmentId') departmentId: string,
    @CurrentUser() actor: any,
  ) {
    return this.productService.getAllProducts(departmentId, actor);
  }

  /** Must be registered before `GET :productId`. */
  @Get('download-pdf')
  @ApiOperation({ summary: 'Download products directory PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadProductsPdf(
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.productService.downloadProductsPdf(actor);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  /** Must be registered before `GET :productId`. */
  @Get(':productId/download-pdf')
  @ApiOperation({ summary: 'Download a single product PDF' })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  async downloadProductPdf(
    @Param('productId') productId: string,
    @CurrentUser() actor: any,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.productService.downloadProductPdf(
      productId,
      actor,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':productId')
  @ApiBearerAuth()
  async getProduct(
    @Param('productId') productId: string,
    @CurrentUser() actor: any,
  ) {
    return this.productService.getProduct(productId, actor);
  }

  @Delete(':productId')
  @ApiBearerAuth()
  async deleteProduct(
    @Param('productId') productId: string,
    @CurrentUser() actor: any,
  ) {
    return this.productService.deleteProduct(productId, actor);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllProducts(@CurrentUser() actor: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.productService.deleteAllProducts(actor);
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewProduct(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.productService.reviewProduct(body.id, body.actor, currentUser);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectProduct(
    @Body() body: { id: string; actor: string; reason: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.productService.rejectProduct(
      body.id,
      body.actor,
      body.reason,
      currentUser,
    );
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleProductEnabled(
    @Body() body: { id: string; actor: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.productService.toggleProductEnabled(
      body.id,
      body.actor,
      currentUser,
    );
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveProduct(
    @Body() approveProductDto: ApproveProductDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.productService.approveProduct(approveProductDto, currentUser);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveProduct(
    @Body() disapproveProductDto: DisapproveProductDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.productService.disapproveProduct(
      disapproveProductDto,
      currentUser,
    );
  }

  @Patch(':productId')
  @ApiBearerAuth()
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() actor: any,
  ) {
    return this.productService.updateProduct(
      productId,
      updateProductDto,
      actor,
    );
  }
}
