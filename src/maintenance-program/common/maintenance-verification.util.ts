import { BadRequestException } from '@nestjs/common';
import {
  MAINTENANCE_VERIFICATION_CHECKLIST,
  MAINTENANCE_VERIFICATION_ANSWERS,
  MaintenanceVerificationAnswer,
} from './maintenance-verification.constants';

export type VerificationChecklistInput = {
  key: string;
  answer: string;
  reason?: string;
};

export function validateVerificationChecklist(
  items: VerificationChecklistInput[],
): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestException('Verification checklist is required.');
  }

  for (const definition of MAINTENANCE_VERIFICATION_CHECKLIST) {
    const response = items.find((item) => item.key === definition.key);
    if (!response) {
      throw new BadRequestException(
        `Missing checklist response for "${definition.label}"`,
      );
    }

    if (
      !MAINTENANCE_VERIFICATION_ANSWERS.includes(
        response.answer as MaintenanceVerificationAnswer,
      )
    ) {
      throw new BadRequestException(
        `Invalid answer for "${definition.label}". Use Yes, No, or N/A.`,
      );
    }

    if (response.answer === 'No') {
      if (!response.reason?.trim()) {
        throw new BadRequestException(
          `Reason is required when "${definition.label}" is answered No.`,
        );
      }
      if (definition.mandatory) {
        throw new BadRequestException(
          `Mandatory checklist item "${definition.label}" cannot be verified while answered No. Resolve the issue before verification.`,
        );
      }
    }
  }
}

export function buildVerificationChecklist(
  items: VerificationChecklistInput[],
) {
  return MAINTENANCE_VERIFICATION_CHECKLIST.map((definition) => {
    const response = items.find((item) => item.key === definition.key)!;
    return {
      key: definition.key,
      label: definition.label,
      mandatory: definition.mandatory,
      answer: response.answer,
      reason: response.reason?.trim() || undefined,
    };
  });
}
