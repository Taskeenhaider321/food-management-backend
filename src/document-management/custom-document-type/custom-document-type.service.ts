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
import { CreateCustomDocumentTypeDto } from './dtos/custom-document-type.dto';
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
