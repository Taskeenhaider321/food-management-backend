import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import {
  asText,
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  formatDate,
  resolveActorCompany,
  safePdfFileName,
} from '../../common/branded-pdf.util';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Company') private companyModel: Model<any>,
  ) {}

  private actorCompanyId(actor: any): string | undefined {
    return (
      actor?.companyId?._id?.toString() || actor?.companyId?.toString() || undefined
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

  private departmentLabel(dept: any): string {
    if (!dept || typeof dept !== 'object') return '---';
    return asText(dept.departmentName || dept.shortName);
  }

  private mapProductPdfRow(product: any) {
    return {
      DocumentId: asText(product?.DocumentId),
      Name: asText(product?.ProductDetails?.Name),
      department: this.departmentLabel(
        product?.Department || product?.UserDepartment,
      ),
      DocumentType: asText(product?.DocumentType),
      Status: asText(product?.Status),
      CreatedBy: asText(product?.CreatedBy),
      CreationDate: formatDate(product?.CreationDate),
    };
  }

  async findAllForActor(actor: any) {
    const deptIds = await this.companyDepartmentIds(actor);
    const filter: Record<string, unknown> =
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {};
    const products = await this.productModel
      .find(filter as any)
      .populate('Department')
      .populate({ path: 'UserDepartment', model: 'Department' })
      .exec();
    return { status: true, data: products };
  }

  async downloadProductsPdf(actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data } = await this.findAllForActor(actor);

    const pdfBytes = await buildBrandedListPdf({
      company,
      title: 'Products Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'DocumentId', label: 'DOC ID', width: 1.3 },
        { key: 'Name', label: 'NAME', width: 2.2 },
        { key: 'department', label: 'DEPT', width: 1.5 },
        { key: 'DocumentType', label: 'TYPE', width: 1.3 },
        { key: 'Status', label: 'STATUS', width: 1.3 },
        { key: 'CreatedBy', label: 'CREATED BY', width: 1.5 },
      ],
      rows: (data || []).map((p) => this.mapProductPdfRow(p)),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('products', 'directory'),
    };
  }

  async downloadProductPdf(productId: string, actor: any) {
    const company = await resolveActorCompany(this.companyModel, actor);
    const { data: product } = await this.getProduct(productId);
    const row = this.mapProductPdfRow(product);
    const details = (product as any)?.ProductDetails || {};

    const pdfBytes = await buildBrandedDetailPdf({
      company,
      title: row.Name !== '---' ? row.Name : 'Product',
      subtitle: row.DocumentId !== '---' ? row.DocumentId : undefined,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Document ID', row.DocumentId],
        ['Name', row.Name],
        ['Department', row.department],
        ['Document Type', row.DocumentType],
        ['Status', row.Status],
        ['Created By', row.CreatedBy],
        ['Creation Date', row.CreationDate],
        ['Origin', asText(details.Origin)],
        ['Raw Material', asText(details.RawMaterial)],
        ['Packing Material', asText(details.PackingMaterial)],
        ['Physical Properties', asText(details.PhysicalProperties)],
        ['Chemical Properties', asText(details.ChemicalProperties)],
        ['Product Description', asText(details.ProductDescription)],
        ['Microbial Properties', asText(details.MicrobialProperties)],
        ['Allergens', asText(details.Allergens)],
        ['Intended Users', asText(details.IntendedUsers)],
        ['Storage Conditions', asText(details.StorageConditions)],
        ['Labelling Instructions', asText(details.LabellingInstructions)],
        ['Transportation', asText(details.Transportation)],
        ['Food Safety Risk', asText(details.FoodSafetyRisk)],
        ['Shelf Life', asText(details.ShelfLife)],
        ['Consumer', asText(details.Consumer)],
        ['Target Market', asText(details.TargtMarket)],
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(
        row.DocumentId || row.Name || 'product',
        'product',
      ),
    };
  }

  async createProduct(createProductDto: CreateProductDto) {
    const user = await this.userModel
      .findById(createProductDto.userId)
      .populate('companyId departmentId');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const department = await this.departmentModel.findById(
      createProductDto.Department,
    );
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
    return {
      status: true,
      message: 'Product document created successfully',
      data: createdProduct,
    };
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
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }

    console.log(
      `Product document with ID: ${productId} retrieved successfully`,
    );
    return { status: true, data: product };
  }

  async deleteProduct(productId: string) {
    const existing = await this.productModel.findById(productId);
    if (!existing) {
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }
    if (!canEditRecord(existing)) {
      throw new BadRequestException(
        'Only records in review, rejected, or disapproved can be deleted',
      );
    }

    const deletedProduct = await this.productModel.findByIdAndDelete(productId);
    if (!deletedProduct) {
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }

    console.log(`Product document with ID: ${productId} deleted successfully`);
    return {
      status: true,
      message: 'Product document deleted successfully',
      data: deletedProduct,
    };
  }

  async deleteAllProducts(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    const result = await this.productModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Product documents found to delete!');
    }

    console.log(
      new Date().toLocaleString() +
        ' ' +
        'DELETE All Product documents Successfully!',
    );
    return {
      status: true,
      message: 'All Product documents have been deleted!',
      data: result,
    };
  }

  async updateProduct(productId: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }
    if (!canEditRecord(existingProduct)) {
      throw new BadRequestException(
        'Reviewed or approved products cannot be modified',
      );
    }

    const trackChanges = shouldTrackChanges(existingProduct);
    const changedFields: string[] = [];

    if (
      updateProductDto.ProductDetails?.Name &&
      updateProductDto.ProductDetails.Name !==
        existingProduct.ProductDetails?.Name
    ) {
      changedFields.push('Product Name');
    }
    if (
      updateProductDto.DocumentType &&
      updateProductDto.DocumentType !== existingProduct.DocumentType
    ) {
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
    return {
      status: true,
      message: trackChanges
        ? 'Product updated and resubmitted'
        : 'Product document updated successfully',
      data: updatedProduct,
    };
  }

  async reviewProduct(id: string, actor: string) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    reviewRecord(product, actor);
    await product.save();
    return {
      status: true,
      message: 'Product reviewed successfully',
      data: product,
    };
  }

  async approveProduct(approveProductDto: ApproveProductDto) {
    const product = await this.productModel.findById(approveProductDto.id);
    if (!product)
      throw new NotFoundException(
        `Product with ID: ${approveProductDto.id} not found.`,
      );
    approveRecord(product, approveProductDto.approvedBy);
    await product.save();
    return {
      status: true,
      message: 'The Product has been marked as approved.',
      data: product,
    };
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
    if (!product)
      throw new NotFoundException(
        `Product with ID: ${disapproveProductDto.id} not found.`,
      );
    disapproveRecord(
      product,
      disapproveProductDto.disapprovedBy,
      disapproveProductDto.Reason,
    );
    await product.save();
    return {
      status: true,
      message: 'The Product has been marked as disapproved.',
      data: product,
    };
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
