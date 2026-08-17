import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RbacService } from './rbac.service';

/**
 * Ensures master RBAC data exists on every application startup.
 * Safe on fresh and existing databases (idempotent upserts).
 */
@Injectable()
export class RbacBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(private readonly rbacService: RbacService) {}

  async onModuleInit(): Promise<void> {
    const result = await this.rbacService.bootstrapRbac();
    this.logger.log(
      `RBAC bootstrap: ${result.masterModulesCount} modules, ${result.masterPermissionsCount} permissions` +
        (result.superAdminRoleSynced ? ', SUPER_ADMIN role synced' : ''),
    );
  }
}
