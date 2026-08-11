import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { UserService } from '../users/user.service';
import { Company, CompanyDocument } from './schemas/company.schema';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import {
  actorCompanyIdString,
  assertActorMayAccessCompany,
  isCompanyAdminActor,
} from '../../auth/utils/request-actor.util';
import {
  buildBrandedDetailPdf,
  buildBrandedListPdf,
  safePdfFileName,
} from '../../common/branded-pdf.util';
import { CompanyModuleAssignmentService } from '../../rbac/company-module-assignment.service';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel('Department') private departmentModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly companyModuleAssignmentService: CompanyModuleAssignmentService,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Multi-doc transaction when Mongo supports it (replica set / sharded).
   * Standalone local mongod rejects transactions — fall back without a session.
   */
  private async withOptionalTransaction<T>(
    fn: (session: ClientSession | null) => Promise<T>,
  ): Promise<T> {
    const disabled =
      String(process.env.MONGODB_DISABLE_TRANSACTIONS || '')
        .toLowerCase()
        .trim() === 'true' ||
      String(process.env.MONGODB_DISABLE_TRANSACTIONS || '').trim() === '1';

    if (disabled) {
      return fn(null);
    }

    try {
      return await this.connection.transaction((session) => fn(session));
    } catch (err: unknown) {
      const anyErr = err as {
        code?: number;
        codeName?: string;
        message?: string;
        errorResponse?: { errmsg?: string; code?: number };
      };
      const msg = String(
        anyErr?.message || anyErr?.errorResponse?.errmsg || '',
      );
      const code = anyErr?.code ?? anyErr?.errorResponse?.code;
      const noTxn =
        code === 20 ||
        anyErr?.codeName === 'IllegalOperation' ||
        /Transaction numbers are only allowed on a replica set/i.test(msg);

      if (noTxn) {
        return fn(null);
      }
      throw err;
    }
  }

  private mapDuplicateKeyError(error: any): never {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || error.keyValue || {})[0];
      if (key === 'userName' || key === 'email') {
        throw new ConflictException(
          `Company admin ${key} already exists. Choose a different admin ${key}.`,
        );
      }
      throw new ConflictException('Company name or short name already exists');
    }
    throw error;
  }

  async create(
    dto: CreateCompanyDto,
    userId?: string,
  ): Promise<{ status: boolean; message: string; data: any }> {
    if (!dto.admin?.userName?.trim() || !dto.admin?.password) {
      throw new BadRequestException(
        'Company admin username and password are required',
      );
    }

    const { admin, modules, ...companyFields } = dto;
    const adminUserName = admin.userName.trim();
    const createdByObjectId = userId ? new Types.ObjectId(userId) : undefined;

    let saved: CompanyDocument;
    let adminUser: any;

    try {
      const result = await this.withOptionalTransaction(async (session) => {
        let company: CompanyDocument | null = null;
        try {
          const companyDoc = new this.companyModel({
            companyName: companyFields.companyName,
            shortName: companyFields.shortName,
            address: companyFields.address ?? '',
            contactNo: companyFields.contactNo ?? '',
            email: companyFields.email,
            companyLogo: companyFields.companyLogo ?? '',
            status: companyFields.status,
            createdBy: createdByObjectId,
          });
          company =
            session != null
              ? await companyDoc.save({ session })
              : await companyDoc.save();

          const user = await this.userService.createUserRecord(
            {
              name: admin.name.trim(),
              email: admin.email.trim(),
              userName: adminUserName,
              passwordPlain: admin.password,
              roleType: 'company-admin',
              companyId: company._id.toString(),
              roleId: admin.roleId,
            },
            session,
          );

          return { company, user };
        } catch (error) {
          // Without a transaction, roll back the company if admin create fails.
          if (session == null && company?._id) {
            await this.companyModel.findByIdAndDelete(company._id).exec();
          }
          throw error;
        }
      });
      saved = result.company;
      adminUser = result.user;
    } catch (error: any) {
      this.mapDuplicateKeyError(error);
    }

    const companyId = saved._id.toString();

    // Modules + optional role assignment after commit (not session-bound).
    try {
      if (modules?.length) {
        await this.companyModuleAssignmentService.replaceForCompany(
          companyId,
          modules,
          userId,
        );
      }
      if (admin.roleId) {
        await this.rbacService.assignRole({
          userId: adminUser._id.toString(),
          roleId: admin.roleId,
        });
      }
    } catch (error: any) {
      const detail =
        error?.message ||
        error?.response?.message ||
        'module/role setup failed';
      throw new BadRequestException(
        `Company and admin were created, but ${detail}. Open Edit on the company to finish module assignment.`,
      );
    }

    return {
      status: true,
      message: `Company created successfully. Sign in as company admin with username "${adminUserName}".`,
      data: {
        company: saved,
        modules: modules?.length
          ? await this.companyModuleAssignmentService.listForCompany(companyId)
          : [],
        admin: {
          _id: adminUser._id,
          userName: adminUser.userName,
          email: adminUser.email,
          roleType: adminUser.roleType,
        },
      },
    };
  }

  async findAll(
    actor?: any,
  ): Promise<{ status: boolean; data: CompanyDocument[] }> {
    if (isCompanyAdminActor(actor)) {
      const companyId = actorCompanyIdString(actor);
      if (!companyId) {
        return { status: true, data: [] };
      }
      const company = await this.companyModel.findById(companyId).exec();
      return { status: true, data: company ? [company] : [] };
    }

    const companies = await this.companyModel.find().exec();
    return { status: true, data: companies };
  }

  async findOne(
    id: string,
    actor?: any,
  ): Promise<{ status: boolean; data: CompanyDocument }> {
    if (isCompanyAdminActor(actor)) {
      assertActorMayAccessCompany(actor, id);
    }

    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return { status: true, data: company };
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId?: string,
  ): Promise<{ status: boolean; message: string; data: CompanyDocument }> {
    const { modules, ...companyFields } = updateCompanyDto;
    const company = await this.companyModel
      .findByIdAndUpdate(id, companyFields, { returnDocument: 'after' })
      .exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (modules) {
      await this.companyModuleAssignmentService.replaceForCompany(
        id,
        modules,
        userId,
      );
    }

    return {
      status: true,
      message: 'Company updated successfully',
      data: company,
    };
  }

  async delete(
    id: string,
    _userId?: string,
  ): Promise<{ status: boolean; message: string }> {
    const company = await this.companyModel.findByIdAndDelete(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    await this.departmentModel.deleteMany({ companyId: id }).exec();
    await this.userModel.deleteMany({ companyId: id }).exec();
    return { status: true, message: 'Company deleted successfully' };
  }

  async deleteAll(
    _userId?: string,
  ): Promise<{ status: boolean; message: string; data: any }> {
    const result = await this.companyModel.deleteMany({});
    if (result.deletedCount === 0) {
      throw new NotFoundException('No companies found to delete');
    }
    return { status: true, message: 'All companies deleted', data: result };
  }

  async downloadCompaniesPdf(actor?: any) {
    const { data } = await this.findAll();
    const brandCompany =
      data.find(
        (c) =>
          c._id.toString() ===
          (actor?.companyId?._id?.toString() || actor?.companyId?.toString()),
      ) || data[0];

    const pdfBytes = await buildBrandedListPdf({
      company: brandCompany
        ? {
            companyName: brandCompany.companyName,
            address: brandCompany.address,
            companyLogo: brandCompany.companyLogo,
          }
        : { companyName: 'Feat Technology' },
      title: 'Companies Directory',
      exportedBy: actor?.name || actor?.userName || 'System',
      columns: [
        { key: 'companyName', label: 'NAME', width: 3 },
        { key: 'shortName', label: 'SHORT', width: 1.2 },
        { key: 'email', label: 'EMAIL', width: 2.5 },
        { key: 'contactNo', label: 'CONTACT', width: 1.5 },
        { key: 'status', label: 'STATUS', width: 1.2 },
      ],
      rows: data.map((c) => ({
        companyName: c.companyName,
        shortName: c.shortName,
        email: c.email,
        contactNo: c.contactNo || '---',
        status: c.status || '---',
      })),
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName('companies', 'directory'),
    };
  }

  async downloadCompanyPdf(id: string, actor?: any) {
    const { data: company } = await this.findOne(id);
    const pdfBytes = await buildBrandedDetailPdf({
      company: {
        companyName: company.companyName,
        address: company.address,
        companyLogo: company.companyLogo,
      },
      title: company.companyName,
      subtitle: company.shortName,
      exportedBy: actor?.name || actor?.userName || 'System',
      coverRows: [
        ['Company Name', company.companyName],
        ['Short Name', company.shortName],
        ['Email', company.email],
        ['Contact No', company.contactNo || '---'],
        ['Address', company.address || '---'],
        ['Status', company.status || '---'],
      ],
    });

    return {
      buffer: Buffer.from(pdfBytes),
      fileName: safePdfFileName(company.companyName, 'company'),
    };
  }
}
