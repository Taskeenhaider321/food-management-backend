import { BadRequestException } from '@nestjs/common';

export type PersonNameInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
};

/** Trim and build display `name` from split fields or legacy `name`. */
export function resolvePersonName(input: PersonNameInput): {
  name: string;
  firstName?: string;
  lastName?: string;
} {
  const firstName = String(input.firstName ?? '').trim();
  const lastName = String(input.lastName ?? '').trim();
  const fromParts = [firstName, lastName].filter(Boolean).join(' ').trim();
  const legacy = String(input.name ?? '').trim();

  if (fromParts) {
    return {
      name: fromParts,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    };
  }
  if (legacy) {
    return { name: legacy };
  }
  throw new BadRequestException(
    'Provide name or both firstName and lastName',
  );
}

export function normalizeOptionalEmail(
  email?: string | null,
): string | undefined {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  return normalized || undefined;
}
