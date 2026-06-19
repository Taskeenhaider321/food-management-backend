import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skips JWT and permission/module checks (use only for login, bootstrap, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
