import { SetMetadata } from '@nestjs/common';

/** Marks route as requiring only a valid JWT (skips module + permission guards). */
export const AUTH_ONLY_KEY = 'authOnly';

export const AuthenticatedOnly = () => SetMetadata(AUTH_ONLY_KEY, true);
