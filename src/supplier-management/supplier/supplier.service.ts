import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { ProfileService } from '../../admin-management/profile/profile.service';
import { UserService } from '../../admin-management/users/user.service';
import {
  User,
  UserDocument,
} from '../../admin-management/users/schemas/user.schema';
import {
  Profile,
  ProfileDocument,
} from '../../admin-management/profile/schemas/profile.schema';
import {
  Company,
  CompanyDocument,
} from '../../admin-management/company/schemas/company.schema';
import {
  SUPPLIER_CERTIFICATION_CATALOGUE,
  findCatalogueItemById,
} from './constants/supplier-certifications.catalogue';
import { SupplierCertificationDto } from './dtos/supplier-certification.dto';
import { SaveSupplierEvaluationDto } from './dtos/supplier-workflow.dto';
import {
  computeWeightedScore,
  listExpiringCertifications,
  riskLevelFromWeightedScore,
  validateCertificationsForApproval,
} from './utils/supplier-evaluation.util';
import { assertActorMayAccessCompany } from '../../auth/utils/request-actor.util';

const supplierPopulate = [
  { path: 'companyId' },
  { path: 'departmentId' },
  {
    path: 'profileId',
    populate: { path: 'userId' },
  },
] as const;

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) {}

  getCatalogue() {
    return {
      status: true,
      data: SUPPLIER_CERTIFICATION_CATALOGUE,
    };
  }

  resolveSupplierDisplayName(supplier: SupplierDocument | Supplier): string {
    if (supplier.supplierName?.trim()) {
      return supplier.supplierName.trim();
    }
    const profile = supplier.profileId as
      | { userId?: { name?: string } }
      | undefined;
    const legacyName = profile?.userId?.name;
    return legacyName?.trim() || 'Supplier';
  }

  private mapCertificationsFromDto(certifications?: SupplierCertificationDto[]) {
    if (!certifications?.length) {
      return [];
    }
    return certifications.map((entry) => {
      const catalogue = findCatalogueItemById(entry.catalogueId);
      return {
        catalogueId: entry.catalogueId,
        label: entry.label ?? catalogue?.label ?? entry.catalogueId,
        kind: entry.kind ?? catalogue?.kind ?? 'certification',
        certificateNumber: entry.certificateNumber,
        expiryDate: new Date(entry.expiryDate),
        documentUrl: entry.documentUrl,
        uploadedAt: new Date(),
      };
    });
  }

  private async assertCompanyExists(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private async assertDepartment(departmentId?: string) {
    if (!departmentId) {
      return;
    }
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }
  }

  private buildProductList(dto: CreateSupplierDto): string[] {
    return dto.productServiceOffered ?? dto.products ?? dto.supplier?.productServiceOffered ?? [];
  }

  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const { user, profile, supplier, departmentId, createdBy } =
      createSupplierDto;

    if (user) {
      return this.createLegacySupplier(
        createSupplierDto,
        user,
        profile ?? {},
        supplier ?? {},
        departmentId,
        createdBy,
      );
    }

    if (!createSupplierDto.supplierName?.trim()) {
      throw new BadRequestException('supplierName is required');
    }
    if (!createSupplierDto.companyId) {
      throw new BadRequestException('companyId is required');
    }

    await this.assertCompanyExists(createSupplierDto.companyId);
    await this.assertDepartment(departmentId);

    const row = new this.supplierModel({
      supplierName: createSupplierDto.supplierName.trim(),
      companyId: new Types.ObjectId(createSupplierDto.companyId),
      departmentId: departmentId
        ? new Types.ObjectId(departmentId)
        : undefined,
      supplierType: createSupplierDto.supplierType,
      address: createSupplierDto.address,
      contactNo: createSupplierDto.contactNo ?? [],
      contactPerson: createSupplierDto.contactPerson,
      productServiceOffered: this.buildProductList(createSupplierDto),
      certifications: this.mapCertificationsFromDto(
        createSupplierDto.certifications,
      ),
      riskCategory: createSupplierDto.riskCategory,
      workflowStatus: 'pending_review',
      approvalStatus: 'pending',
      createdBy,
    });

    const saved = await row.save();
    const populated = await this.supplierModel
      .findById(saved._id)
      .populate([...supplierPopulate])
      .exec();

    return {
      status: true,
      message: 'Supplier document created successfully',
      data: populated!,
    };
  }

  private async createLegacySupplier(
    dto: CreateSupplierDto,
    user: NonNullable<CreateSupplierDto['user']>,
    profile: NonNullable<CreateSupplierDto['profile']>,
    supplier: NonNullable<CreateSupplierDto['supplier']>,
    departmentId: string | undefined,
    createdBy: string,
  ) {
    if (!user.companyId) {
      throw new BadRequestException('user.companyId is required');
    }

    await this.assertDepartment(departmentId ?? user.departmentId);

    const emailTaken = await this.userModel.findOne({
      email: user.email.toLowerCase(),
    });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const saved = await this.profileService.withTransaction(async (session) => {
      const u = await this.userService.createUserRecord(
        {
          name: user.name,
          email: user.email,
          userName: user.userName,
          passwordPlain: user.password,
          roleType: user.roleType ?? 'company-user',
          companyId: user.companyId,
          departmentId: user.departmentId,
          roleId: user.roleId,
        },
        session,
      );

      const p = await this.profileService.createForUser(
        u._id,
        profile,
        session,
      );

      const row = new this.supplierModel({
        supplierName: user.name,
        companyId: new Types.ObjectId(user.companyId),
        profileId: p._id,
        departmentId: departmentId
          ? new Types.ObjectId(departmentId)
          : user.departmentId
            ? new Types.ObjectId(user.departmentId)
            : undefined,
        contactNo: supplier.contactNo ?? dto.contactNo ?? [],
        contactPerson: supplier.contactPerson ?? dto.contactPerson,
        productServiceOffered: this.buildProductList(dto),
        certifications: this.mapCertificationsFromDto(dto.certifications),
        riskCategory: supplier.riskCategory ?? dto.riskCategory,
        dueAt: supplier.dueAt ? new Date(supplier.dueAt) : undefined,
        currentApprovalAt: supplier.currentApprovalAt
          ? new Date(supplier.currentApprovalAt)
          : undefined,
        nextApprovalAt: supplier.nextApprovalAt
          ? new Date(supplier.nextApprovalAt)
          : undefined,
        supplierType: dto.supplierType,
        address: dto.address,
        workflowStatus: 'pending_review',
        approvalStatus: 'pending',
        createdBy,
      });
      return row.save({ session });
    });

    const populated = await this.supplierModel
      .findById(saved._id)
      .populate([...supplierPopulate])
      .exec();

    return {
      status: true,
      message: 'Supplier document created successfully',
      data: populated!,
    };
  }

  async findByCompany(
    companyId: string,
    actor?: any,
  ): Promise<{ status: boolean; data: SupplierDocument[] }> {
    if (actor) {
      assertActorMayAccessCompany(actor, companyId);
    }
    const suppliers = await this.supplierModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .populate([...supplierPopulate])
      .exec();
    return { status: true, data: suppliers };
  }

  async listApproved(
    companyId: string,
    actor?: any,
  ): Promise<{ status: boolean; data: SupplierDocument[] }> {
    if (actor) {
      assertActorMayAccessCompany(actor, companyId);
    }
    const suppliers = await this.supplierModel
      .find({
        companyId: new Types.ObjectId(companyId),
        $or: [
          { workflowStatus: 'approved' },
          { approvalStatus: 'approved' },
        ],
      })
      .populate([...supplierPopulate])
      .exec();
    return { status: true, data: suppliers };
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<{ status: boolean; data: SupplierDocument[] }> {
    if (!Types.ObjectId.isValid(departmentId)) {
      throw new BadRequestException('Invalid departmentId');
    }
    const suppliers = await this.supplierModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate([...supplierPopulate])
      .exec();
    return { status: true, data: suppliers };
  }

  async findOne(
    id: string,
    actor?: any,
  ): Promise<{ status: boolean; data: SupplierDocument }> {
    const supplier = await this.supplierModel
      .findById(id)
      .populate([...supplierPopulate])
      .exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier document with ID: ${id} not found`);
    }
    this.assertActorMayAccessSupplier(actor, supplier);
    return { status: true, data: supplier };
  }

  async remove(
    id: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier document with ID: ${id} not found`);
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    if (!supplier.profileId) {
      await this.supplierModel.deleteOne({ _id: supplier._id });
      return {
        status: true,
        message: 'Supplier document deleted successfully',
      };
    }

    await this.profileService.withTransaction(async (session) => {
      await this.supplierModel
        .deleteOne({ _id: supplier._id })
        .session(session);
      const profile = await this.profileModel
        .findById(supplier.profileId)
        .session(session);
      if (profile) {
        await this.userModel
          .deleteOne({ _id: profile.userId })
          .session(session);
        await this.profileModel
          .deleteOne({ _id: profile._id })
          .session(session);
      }
    });

    return { status: true, message: 'Supplier document deleted successfully' };
  }

  async removeAll(): Promise<{ status: boolean; message: string }> {
    const result = await this.supplierModel.deleteMany({}).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('No Supplier documents found to delete!');
    }
    return {
      status: true,
      message: 'All Supplier documents have been deleted!',
    };
  }

  private assertCanApproveSupplier(supplier: SupplierDocument) {
    if (supplier.criticalIssuesFlag || supplier.evaluation?.criticalIssuesFlag) {
      throw new BadRequestException(
        'Supplier cannot be approved while critical issues are flagged.',
      );
    }

    const certCheck = validateCertificationsForApproval(supplier.certifications);
    if (!certCheck.valid) {
      throw new BadRequestException(certCheck.reasons.join(' '));
    }
  }

  private appendReviewHistory(
    supplier: SupplierDocument,
    entry: {
      action: string;
      by: string;
      note?: string;
      riskScore?: number;
    },
  ) {
    if (!supplier.reviewHistory) {
      supplier.reviewHistory = [];
    }
    supplier.reviewHistory.push({
      action: entry.action,
      by: entry.by,
      at: new Date(),
      note: entry.note,
      riskScore: entry.riskScore,
    });
  }

  private assertNotTerminal(supplier: SupplierDocument) {
    if (
      supplier.approvalStatus === 'approved' ||
      supplier.workflowStatus === 'approved'
    ) {
      throw new BadRequestException('Supplier is already approved.');
    }
    if (
      supplier.approvalStatus === 'disapproved' ||
      supplier.workflowStatus === 'rejected'
    ) {
      throw new BadRequestException('Supplier is already rejected.');
    }
  }

  private assertActorMayAccessSupplier(actor: any, supplier: SupplierDocument) {
    if (!actor) return;
    const raw = supplier.companyId as any;
    const companyId =
      raw == null
        ? null
        : typeof raw === 'object' && raw._id != null
          ? String(raw._id)
          : String(raw);
    if (companyId && companyId !== '[object Object]') {
      assertActorMayAccessCompany(actor, companyId);
    }
  }

  async approve(
    id: string,
    approvedBy: string,
    approvedScope?: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    if (supplier.approvalStatus === 'approved') {
      throw new BadRequestException('Supplier is already approved.');
    }

    const status = supplier.workflowStatus || 'pending_review';
    if (!['pending_review', 'on_hold'].includes(status)) {
      throw new BadRequestException(
        `Cannot approve supplier in status "${status}". Submit for review first.`,
      );
    }

    this.assertCanApproveSupplier(supplier);

    this.appendReviewHistory(supplier, {
      action: 'approved',
      by: approvedBy,
      note: approvedScope,
      riskScore: supplier.evaluation?.weightedScore,
    });

    supplier.approvalDate = new Date();
    supplier.approvalStatus = 'approved';
    supplier.workflowStatus = 'approved';
    supplier.approvedBy = approvedBy;
    supplier.disapprovalDate = undefined;
    supplier.disapprovedBy = undefined;
    supplier.disapprovalReason = undefined;
    if (approvedScope?.trim()) {
      supplier.approvedScope = approvedScope.trim();
    }

    const updated = await supplier.save();

    return {
      status: true,
      message: 'The Supplier has been marked as approved.',
      data: updated,
    };
  }

  async disapprove(
    id: string,
    disapprovedBy: string,
    reason: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    if (supplier.approvalStatus === 'approved') {
      throw new BadRequestException('Supplier is already approved.');
    }

    this.appendReviewHistory(supplier, {
      action: 'rejected',
      by: disapprovedBy,
      note: reason,
    });

    supplier.disapprovalDate = new Date();
    supplier.approvalStatus = 'disapproved';
    supplier.workflowStatus = 'rejected';
    supplier.disapprovalReason = reason;
    supplier.disapprovedBy = disapprovedBy;
    supplier.approvalDate = undefined;
    supplier.approvedBy = undefined;

    const updated = await supplier.save();

    return {
      status: true,
      message: 'The Supplier has been disapproved.',
      data: updated,
    };
  }

  async submitForReview(
    id: string,
    by: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    const allowed = ['draft', 'returned', 'on_hold'];
    if (
      supplier.workflowStatus &&
      !allowed.includes(supplier.workflowStatus)
    ) {
      throw new BadRequestException(
        `Cannot submit supplier in status "${supplier.workflowStatus}".`,
      );
    }

    this.appendReviewHistory(supplier, { action: 'submitted', by });
    supplier.workflowStatus = 'pending_review';
    supplier.approvalStatus = 'pending';

    const updated = await supplier.save();
    return {
      status: true,
      message: 'Supplier submitted for review.',
      data: updated,
    };
  }

  async returnForCorrection(
    id: string,
    by: string,
    note?: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    this.assertNotTerminal(supplier);
    const status = supplier.workflowStatus || 'pending_review';
    if (!['pending_review', 'on_hold'].includes(status)) {
      throw new BadRequestException(
        `Cannot return supplier in status "${status}".`,
      );
    }
    if (!note?.trim()) {
      throw new BadRequestException(
        'A correction note is required when returning a supplier.',
      );
    }

    this.appendReviewHistory(supplier, { action: 'returned', by, note });
    supplier.workflowStatus = 'returned';
    supplier.approvalStatus = 'pending';

    const updated = await supplier.save();
    return {
      status: true,
      message: 'Supplier returned for correction.',
      data: updated,
    };
  }

  async hold(
    id: string,
    by: string,
    note?: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    this.assertNotTerminal(supplier);
    const status = supplier.workflowStatus || 'pending_review';
    if (status !== 'pending_review') {
      throw new BadRequestException(
        `Cannot hold supplier in status "${status}".`,
      );
    }

    this.appendReviewHistory(supplier, { action: 'on_hold', by, note });
    supplier.workflowStatus = 'on_hold';

    const updated = await supplier.save();
    return {
      status: true,
      message: 'Supplier placed on hold.',
      data: updated,
    };
  }

  async reject(
    id: string,
    by: string,
    note?: string,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);
    this.assertNotTerminal(supplier);
    if (!note?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    return this.disapprove(id, by, note.trim(), actor);
  }

  async saveEvaluation(
    id: string,
    payload: SaveSupplierEvaluationDto,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    const weightedScore = computeWeightedScore(payload.categories);
    const riskLevel = riskLevelFromWeightedScore(weightedScore);

    supplier.evaluation = {
      categories: payload.categories,
      weightedScore,
      riskLevel,
      evaluatedBy: payload.evaluatedBy,
      evaluatedAt: new Date(),
      notes: payload.notes,
      criticalIssuesFlag: payload.criticalIssuesFlag ?? false,
    };
    supplier.criticalIssuesFlag = payload.criticalIssuesFlag ?? false;

    this.appendReviewHistory(supplier, {
      action: 'evaluation_saved',
      by: payload.evaluatedBy,
      note: payload.notes,
      riskScore: weightedScore,
    });

    const updated = await supplier.save();
    return {
      status: true,
      message: 'Supplier evaluation saved.',
      data: updated,
    };
  }

  async updateCertifications(
    id: string,
    certifications: SupplierCertificationDto[],
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: SupplierDocument }> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
    this.assertActorMayAccessSupplier(actor, supplier);

    supplier.certifications = this.mapCertificationsFromDto(certifications);
    const updated = await supplier.save();

    return {
      status: true,
      message: 'Supplier certifications updated.',
      data: updated,
    };
  }

  /**
   * In-app expiry status helper only.
   * Scheduled email/cron certificate-expiry reminders are NOT implemented.
   */
  getCertificateExpiryInsights(supplier: SupplierDocument) {
    const certs = supplier.certifications ?? [];
    return {
      expiringWithin30Days: listExpiringCertifications(certs, 30),
      invalidForApproval: validateCertificationsForApproval(certs),
    };
  }
}
