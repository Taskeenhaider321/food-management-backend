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
  promoteChangeRequestToReview,
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
import {
  assertActorMayAccessDepartmentId,
  assertActorMayAccessFoodSafetyRecord,
  foodSafetyCompanyDeleteFilter,
  isGlobalFoodSafetyActor,
  withOwnScopeFilter,
} from '../common/food-safety-tenant.util';

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
    const filter = withOwnScopeFilter(
      actor,
      deptIds.length > 0 ? { UserDepartment: { $in: deptIds } } : {},
    );
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
    const { data: product } = await this.getProduct(productId, actor);
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

  async createProduct(createProductDto: CreateProductDto, actor?: any) {
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

    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        createProductDto.departmentId || createProductDto.Department,
      );

    const createdProduct = new this.productModel({
      Department: createProductDto.Department,
      DocumentType: createProductDto.DocumentType,
      ProductDetails: createProductDto.ProductDetails,
      CreatedBy: createProductDto.createdBy,
      CreationDate: new Date(),
      UserDepartment: createProductDto.departmentId,
      User: user,
      createdByUserId: actor?._id
        ? new Types.ObjectId(String(actor._id))
        : undefined,
    });
    initCreatedTimeline(createdProduct, createProductDto.createdBy);

    await createdProduct.save();
    return {
      status: true,
      message: 'Product document created successfully',
      data: createdProduct,
    };
  }

  async getAllProducts(departmentId: string, actor?: any) {
    if (actor)
      await assertActorMayAccessDepartmentId(
        actor,
        this.departmentModel,
        departmentId,
      );
    const filter = withOwnScopeFilter(actor, {
      UserDepartment: departmentId as any,
    });
    const products = await this.productModel
      .find(filter as any)
      .populate('Department')
      .populate({ path: 'UserDepartment', model: 'Department' })
      .exec();

    if (!products) {
      throw new NotFoundException('Product documents not found');
    }

    return { status: true, data: products };
  }

  async getProduct(productId: string, actor?: any) {
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

    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
      );
    return { status: true, data: product };
  }

  async deleteProduct(productId: string, actor?: any) {
    const existing = await this.productModel.findById(productId);
    if (!existing) {
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existing,
      );
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

    return {
      status: true,
      message: 'Product document deleted successfully',
      data: deletedProduct,
    };
  }

  async deleteAllProducts(actor?: any): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    let filter: Record<string, unknown> = {};
    if (actor && !isGlobalFoodSafetyActor(actor)) {
      const deptIds = await this.companyDepartmentIds(actor);
      filter = foodSafetyCompanyDeleteFilter(actor, deptIds);
    }
    const result = await this.productModel.deleteMany(filter);
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Product documents found to delete!');
    }

    return {
      status: true,
      message: 'All Product documents have been deleted!',
      data: result,
    };
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
    actor?: any,
  ) {
    const existingProduct = await this.productModel.findById(productId);
    if (!existingProduct) {
      throw new NotFoundException(
        `Product document with ID: ${productId} not found`,
      );
    }
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        existingProduct,
      );
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
      throw new BadRequestException(
        'Document type cannot be changed after creation',
      );
    }
    if (
      updateProductDto.Department &&
      updateProductDto.Department.toString() !==
        existingProduct.Department?.toString()
    ) {
      throw new BadRequestException(
        'Department cannot be changed after creation',
      );
    }

    const {
      DocumentType: _dt,
      Department: _dept,
      ...productUpdates
    } = updateProductDto;
    const updates = {
      ...productUpdates,
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
    const promoted = promoteChangeRequestToReview(
      existingProduct,
      updateProductDto.updatedBy || 'System',
    );
    const updatedProduct = await existingProduct.save();
    return {
      status: true,
      message: trackChanges
        ? 'Product updated and resubmitted'
        : promoted
          ? 'Product updated and submitted for review'
          : 'Product document updated successfully',
      data: updatedProduct,
    };
  }

  async reviewProduct(id: string, actorName: string, actor?: any) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
      );
    reviewRecord(product, actorName);
    await product.save();
    return {
      status: true,
      message: 'Product reviewed successfully',
      data: product,
    };
  }

  async approveProduct(approveProductDto: ApproveProductDto, actor?: any) {
    const product = await this.productModel.findById(approveProductDto.id);
    if (!product)
      throw new NotFoundException(
        `Product with ID: ${approveProductDto.id} not found.`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
      );
    approveRecord(product, approveProductDto.approvedBy);
    await product.save();
    return {
      status: true,
      message: 'The Product has been marked as approved.',
      data: product,
    };
  }

  async rejectProduct(
    id: string,
    actorName: string,
    reason: string,
    actor?: any,
  ) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
      );
    rejectRecord(product, actorName, reason);
    await product.save();
    return { status: true, message: 'Product rejected', data: product };
  }

  async disapproveProduct(
    disapproveProductDto: DisapproveProductDto,
    actor?: any,
  ) {
    const product = await this.productModel.findById(disapproveProductDto.id);
    if (!product)
      throw new NotFoundException(
        `Product with ID: ${disapproveProductDto.id} not found.`,
      );
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
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

  async toggleProductEnabled(id: string, actorName: string, actor?: any) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    if (actor)
      await assertActorMayAccessFoodSafetyRecord(
        actor,
        this.departmentModel,
        product,
      );
    toggleEnabledRecord(product, actorName);
    await product.save();
    return {
      status: true,
      message: product.enabled ? 'Product enabled' : 'Product disabled',
      data: product,
    };
  }
}
