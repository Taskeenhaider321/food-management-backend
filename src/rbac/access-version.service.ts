import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  actorCompanyIdString,
  isSuperAdminActor,
} from '../auth/utils/request-actor.util';
import {
  RbacAccessVersion,
  RbacAccessVersionDocument,
} from './schemas/rbac-access-version.schema';

export const GLOBAL_ACCESS_SCOPE = 'global';

@Injectable()
export class AccessVersionService {
  constructor(
    @InjectModel(RbacAccessVersion.name)
    private readonly versionModel: Model<RbacAccessVersionDocument>,
  ) {}

  companyScopeKey(companyId: string): string {
    return `company:${companyId}`;
  }

  async getVersion(scopeKey: string): Promise<number> {
    const row = await this.versionModel.findOne({ scopeKey }).lean();
    return row?.version ?? 1;
  }

  async bump(scopeKey: string): Promise<number> {
    const updated = await this.versionModel.findOneAndUpdate(
      { scopeKey },
      { $inc: { version: 1 }, $setOnInsert: { scopeKey } },
      { upsert: true, new: true },
    );
    return updated.version;
  }

  async bumpCompany(companyId: string): Promise<number> {
    return this.bump(this.companyScopeKey(companyId));
  }

  async bumpGlobal(): Promise<number> {
    return this.bump(GLOBAL_ACCESS_SCOPE);
  }

  /**
   * Version string the FE polls. Changes whenever RBAC grants for this
   * actor's scope change (company ceiling/roles or global roles).
   */
  async versionForUser(user: any): Promise<string> {
    if (isSuperAdminActor(user)) {
      const global = await this.getVersion(GLOBAL_ACCESS_SCOPE);
      return `super-admin:${global}`;
    }
    const companyId = actorCompanyIdString(user);
    if (companyId) {
      const v = await this.getVersion(this.companyScopeKey(companyId));
      return `company:${companyId}:${v}`;
    }
    const global = await this.getVersion(GLOBAL_ACCESS_SCOPE);
    return `global:${global}`;
  }
}
