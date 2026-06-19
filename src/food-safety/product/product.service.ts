import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ApproveProductDto } from './dtos/approve-product.dto';
import { DisapproveProductDto } from './dtos/disapprove-product.dto';
import {
  approveRecord,
  canEditRecord,
  disapproveRecord,
  initCreatedTimeline,
  rejectRecord,
  resubmitRecord,
  reviewRecord,
  shouldTrackChanges,
  toggleEnabledRecord,
} from '../common/haccp-workflow.util';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  async createProduct(createProductDto: CreateProductDto) {
    const user = await this.userModel.findById(createProductDto.userId).populate('companyId departmentId');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const department = await this.departmentModel.findById(createProductDto.Department);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const createdProduct = new this.productModel({
      Department: createProductDto.Department,
      DocumentType: createProductDto.DocumentType,
      ProductDetails: createProductDto.ProductDetails,
      CreatedBy: createProductDto.createdBy,
      CreationDate: new Date(),
      UserDepartment: createProductDto.departmentId,
      User: user,
    });
    initCreatedTimeline(createdProduct, createProductDto.createdBy);

    await createdProduct.save();
    return { status: true, message: 'Product document created successfully', data: createdProduct };
  }

  async getAllProducts(departmentId: string) {
    const products = await this.productModel
      .find({ UserDepartment: departmentId as any })
      .populate('Department')
      .populate({ path: 'UserDepartment', model: 'Department' })
      .exec();

    if (!products) {
      throw new NotFoundException('Product documents not found');
    }

    console.log('Product documents retrieved successfully');
    return { status: true, data: products };
  }

  async getProduct(productId: string) {
    const product = await this.productModel
      .findById(productId)
      .populate('Department')
      .populate({ path: 'UserDepartment', model: 'Department' })
      .exec();

    if (!product) {
      throw new NotFoundException(`Product document with ID: ${productId} not found`);
    }

    console.log(`Product document with ID: ${productId} retrieved successfully`);
    return { status: true, data: product };
  }

  async deleteProduct(productId: string) {
    const existing = await this.productModel.findById(productId);
    if (!existing) {
      throw new NotFoundException(`Product document with ID: ${productId} not found`);
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException('Only records in review, rejected, or disapproved can be deleted');
    }

    const deletedProduct = await this.productModel.findByIdAndDelete(productId);
    if (!deletedProduct) {
      throw new NotFoundException(`Product document with ID: ${productId} not found`);
    }

    console.log(`Product document with ID: ${productId} deleted successfully`);
    return { status: true, message: 'Product document deleted successfully', data: deletedProduct };
  }

  async deleteAllProducts(): Promise<{ status: boolean; message: string; data: any }> {
  const result = await this.productModel.deleteMany({});
  if (result.deletedCount === 0) {
    throw new NotFoundException('No Product documents found to delete!');
  }

  console.log(new Date().toLocaleString() + ' ' + 'DELETE All Product documents Successfully!');
  return { status: true, message: 'All Product documents have been deleted!', data: result };
}


  async updateProduct(productId: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(`Product document with ID: ${productId} not found`);
    }
    if (!canEditRecord(existingProduct)) {
      throw new BadRequestException('Reviewed or approved products cannot be modified');
    }

    const trackChanges = shouldTrackChanges(existingProduct);
    const changedFields: string[] = [];

    if (
      updateProductDto.ProductDetails?.Name &&
      updateProductDto.ProductDetails.Name !== existingProduct.ProductDetails?.Name
    ) {
      changedFields.push('Product Name');
    }
    if (updateProductDto.DocumentType && updateProductDto.DocumentType !== existingProduct.DocumentType) {
      changedFields.push('Document Type');
    }

    const updates = {
      ...updateProductDto,
      UpdatedBy: updateProductDto.updatedBy,
      UpdationDate: new Date(),
    };

    if (trackChanges) {
      resubmitRecord(
        existingProduct,
        updateProductDto.updatedBy || 'System',
        changedFields,
        { ProductDetails: existingProduct.ProductDetails },
      );
    }

    Object.assign(existingProduct, updates);
    const updatedProduct = await existingProduct.save();
    return { status: true, message: trackChanges ? 'Product updated and resubmitted' : 'Product document updated successfully', data: updatedProduct };
  }

  async reviewProduct(id: string, actor: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    reviewRecord(product, actor);
    await product.save();
    return { status: true, message: 'Product reviewed successfully', data: product };
  }

  async approveProduct(approveProductDto: ApproveProductDto) {
    const product = await this.productModel.findById(approveProductDto.id);
    if (!product) throw new NotFoundException(`Product with ID: ${approveProductDto.id} not found.`);
    approveRecord(product, approveProductDto.approvedBy);
    await product.save();
    return { status: true, message: 'The Product has been marked as approved.', data: product };
  }

  async rejectProduct(id: string, actor: string, reason: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    rejectRecord(product, actor, reason);
    await product.save();
    return { status: true, message: 'Product rejected', data: product };
  }

  async disapproveProduct(disapproveProductDto: DisapproveProductDto) {
    const product = await this.productModel.findById(disapproveProductDto.id);
    if (!product) throw new NotFoundException(`Product with ID: ${disapproveProductDto.id} not found.`);
    disapproveRecord(product, disapproveProductDto.disapprovedBy, disapproveProductDto.Reason);
    await product.save();
    return { status: true, message: 'The Product has been marked as disapproved.', data: product };
  }

  async toggleProductEnabled(id: string, actor: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    toggleEnabledRecord(product, actor);
    await product.save();
    return {
      status: true,
      message: product.enabled ? 'Product enabled' : 'Product disabled',
      data: product,
    };
  }
}
