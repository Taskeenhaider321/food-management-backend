import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ApproveProductDto } from './dtos/approve-product.dto';
import { DisapproveProductDto } from './dtos/disapprove-product.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBearerAuth()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllProducts(@Param('departmentId') departmentId: string) {
    return this.productService.getAllProducts(departmentId);
  }

  @Get(':productId')
  @ApiBearerAuth()
  async getProduct(@Param('productId') productId: string) {
    return this.productService.getProduct(productId);
  }

  @Delete(':productId')
  @ApiBearerAuth()
  async deleteProduct(@Param('productId') productId: string) {
    return this.productService.deleteProduct(productId);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllProducts(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.productService.deleteAllProducts();
  }

  @Patch('review')
  @ApiBearerAuth()
  async reviewProduct(@Body() body: { id: string; actor: string }) {
    return this.productService.reviewProduct(body.id, body.actor);
  }

  @Patch('reject')
  @ApiBearerAuth()
  async rejectProduct(@Body() body: { id: string; actor: string; reason: string }) {
    return this.productService.rejectProduct(body.id, body.actor, body.reason);
  }

  @Patch('toggle-enabled')
  @ApiBearerAuth()
  async toggleProductEnabled(@Body() body: { id: string; actor: string }) {
    return this.productService.toggleProductEnabled(body.id, body.actor);
  }

  @Patch('approve')
  @ApiBearerAuth()
  async approveProduct(@Body() approveProductDto: ApproveProductDto) {
    return this.productService.approveProduct(approveProductDto);
  }

  @Patch('disapprove')
  @ApiBearerAuth()
  async disapproveProduct(@Body() disapproveProductDto: DisapproveProductDto) {
    return this.productService.disapproveProduct(disapproveProductDto);
  }

  @Patch(':productId')
  @ApiBearerAuth()
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(productId, updateProductDto);
  }
}
