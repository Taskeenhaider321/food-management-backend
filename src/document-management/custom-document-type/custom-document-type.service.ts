import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  actorCompanyIdString,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';
import { DEFAULT_DOCUMENT_TYPES_BY_SCOPE } from './constants/default-document-types';
import { CreateCustomDocumentTypeDto } from './dtos/custom-document-type.dto';
import { DOCUMENT_TYPE_SCOPE_KEYS } from './scope-keys';
import {
  CustomDocumentType,
  CustomDocumentTypeDocument,
} from './schemas/custom-document-type.schema';

const ALLOWED_ICONS = new Set([
  'book',
  'clipboard',
  'file',
  'list',
  'shield',
  'users',
  'wrench',
  'check',
]);

@Injectable()
export class CustomDocumentTypeService {
  constructor(
    @InjectModel(CustomDocumentType.name)
    private readonly model: Model<CustomDocumentTypeDocument>,
  ) {}

  private assertCompanyAccess(actor: any, companyId: string) {
    if (isSuperAdminActor(actor) || isSuperStaffActor(actor)) return;
    const actorCompany = actorCompanyIdString(actor);
    if (!actorCompany || actorCompany !== companyId) {
      throw new ForbiddenException(
        'Cannot manage document types for another company',
      );
    }
  }

  private resolveDocumentNumber(
    preferred: number,
    title: string,
    numberToTitle: Map<number, string>,
  ): number {
    const preferredTitle = numberToTitle.get(preferred);
    if (preferredTitle === undefined || preferredTitle === title) {
      return preferred;
    }
    for (let n = 1; n <= 99; n++) {
      const existingTitle = numberToTitle.get(n);
      if (existingTitle === undefined || existingTitle === title) {
        return n;
      }
    }
    return preferred;
  }

  /**
   * Inserts missing default document types for a company scope (by title only).
   * Does not update or remove existing types.
   *
   * Product rule: soft-deleted defaults (isActive=false) are intentionally
   * included when checking existing titles, so ensureDefaults will NOT re-seed
   * a default the company removed. Seeding remains company- and scope-scoped
   * and idempotent for active rows.
   */
  async ensureDefaults(companyId: string, scopeKey: string): Promise<void> {
    const normalizedScope = scopeKey.trim().toLowerCase();
    const seeds = DEFAULT_DOCUMENT_TYPES_BY_SCOPE[normalizedScope];
    if (!seeds?.length) return;

    const companyObjectId = new Types.ObjectId(companyId) as any;
    // Include inactive/soft-deleted rows so removed defaults are not recreated.
    const existing = await this.model
      .find({ companyId: companyObjectId, scopeKey: normalizedScope })
      .select({ title: 1, documentNumber: 1, isActive: 1 })
      .lean()
      .exec();

    const existingTitles = new Set(
      existing.map((row) => String(row.title).trim()),
    );
    const numberToTitle = new Map<number, string>();
    for (const row of existing) {
      numberToTitle.set(row.documentNumber, String(row.title).trim());
    }

    for (const seed of seeds) {
      const title = seed.title.trim();
      if (existingTitles.has(title)) continue;

      const documentNumber = this.resolveDocumentNumber(
        seed.documentNumber,
        title,
        numberToTitle,
      );

      try {
        await this.model.create({
          title,
          description: '',
          documentNumber,
          icon: seed.icon,
          scopeKey: normalizedScope,
          companyId: companyObjectId,
          isActive: true,
          isDefault: true,
        });
        existingTitles.add(title);
        numberToTitle.set(documentNumber, title);
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
      }
    }
  }

  /** Seeds default types for document-management documents and forms scopes. */
  async ensureDefaultsForCompany(companyId: string): Promise<void> {
    await this.ensureDefaults(
      companyId,
      DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_DOCUMENTS,
    );
    await this.ensureDefaults(
      companyId,
      DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_FORMS,
    );
  }

  async create(dto: CreateCustomDocumentTypeDto, actor: any) {
    this.assertCompanyAccess(actor, dto.companyId);

    const icon = String(dto.icon || 'file').toLowerCase().trim();
    if (!ALLOWED_ICONS.has(icon)) {
      throw new BadRequestException(
        `Invalid icon. Allowed: ${[...ALLOWED_ICONS].join(', ')}`,
      );
    }

    const scopeKey = dto.scopeKey.trim().toLowerCase();
    const title = dto.title.trim();

    try {
      const created = await this.model.create({
        title,
        description: dto.description?.trim() || '',
        documentNumber: dto.documentNumber,
        icon,
        scopeKey,
        companyId: new Types.ObjectId(dto.companyId) as any,
        createdBy:
          actor?.name || actor?.userName || actor?.email || 'Unknown',
        isActive: true,
      });

      return {
        status: true,
        message: 'Custom document type created',
        data: created,
      };
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'A document type with this title or number already exists for this form',
        );
      }
      throw err;
    }
  }

  async listByScope(scopeKey: string, companyId: string, actor: any) {
    this.assertCompanyAccess(actor, companyId);

    await this.ensureDefaults(companyId, scopeKey);

    const data = await this.model
      .find({
        companyId: new Types.ObjectId(companyId) as any,
        scopeKey: scopeKey.trim().toLowerCase(),
        isActive: { $ne: false },
      })
      .sort({ documentNumber: 1, title: 1 })
      .lean()
      .exec();

    return { status: true, data };
  }

  async findOne(id: string, actor: any) {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Custom document type not found');
    this.assertCompanyAccess(actor, String(doc.companyId));
    return { status: true, data: doc };
  }

  async softDelete(id: string, actor: any) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Custom document type not found');
    this.assertCompanyAccess(actor, String(doc.companyId));
    doc.isActive = false;
    await doc.save();
    return { status: true, message: 'Custom document type removed' };
  }
}
