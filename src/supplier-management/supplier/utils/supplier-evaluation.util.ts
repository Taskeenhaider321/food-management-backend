import { SupplierEvaluationRiskLevel } from '../constants/supplier.enums';

export function computeWeightedScore(
  categories: { score: number; weight: number }[],
): number | undefined {
  if (!categories.length) {
    return undefined;
  }
  const totalWeight = categories.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) {
    return undefined;
  }
  const weighted = categories.reduce(
    (sum, row) => sum + row.score * row.weight,
    0,
  );
  return Math.round((weighted / totalWeight) * 100) / 100;
}

export function riskLevelFromWeightedScore(
  weightedScore: number | undefined,
): SupplierEvaluationRiskLevel | undefined {
  if (weightedScore == null || Number.isNaN(weightedScore)) {
    return undefined;
  }
  if (weightedScore >= 1.0 && weightedScore <= 1.79) {
    return 'low';
  }
  if (weightedScore >= 1.8 && weightedScore <= 2.59) {
    return 'moderate';
  }
  if (weightedScore >= 2.6 && weightedScore <= 3.39) {
    return 'high';
  }
  if (weightedScore >= 3.4 && weightedScore <= 5.0) {
    return 'very_high';
  }
  return undefined;
}

export function isCertificationExpired(expiryDate?: Date | string | null): boolean {
  if (!expiryDate) {
    return true;
  }
  const end = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(end.getTime())) {
    return true;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(end);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
}

export interface SupplierCertificationLike {
  certificateNumber?: string;
  expiryDate?: Date | string;
  documentUrl?: string;
}

export function validateCertificationsForApproval(
  certifications: SupplierCertificationLike[] | undefined,
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!certifications?.length) {
    return { valid: true, reasons };
  }
  certifications.forEach((cert, index) => {
    const label = `Certification #${index + 1}`;
    if (!cert.certificateNumber?.trim()) {
      reasons.push(`${label}: certificate number is required.`);
    }
    if (!cert.documentUrl?.trim()) {
      reasons.push(`${label}: document URL is required.`);
    }
    if (!cert.expiryDate) {
      reasons.push(`${label}: expiry date is required.`);
    } else if (isCertificationExpired(cert.expiryDate)) {
      reasons.push(`${label}: certificate is expired.`);
    }
  });
  return { valid: reasons.length === 0, reasons };
}

export function listExpiringCertifications(
  certifications: (SupplierCertificationLike & {
    catalogueId?: string;
    label?: string;
  })[],
  withinDays = 30,
): typeof certifications {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  horizon.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return certifications.filter((cert) => {
    if (!cert.expiryDate) {
      return false;
    }
    const expiry =
      cert.expiryDate instanceof Date
        ? cert.expiryDate
        : new Date(cert.expiryDate);
    if (Number.isNaN(expiry.getTime()) || expiry < today) {
      return false;
    }
    return expiry <= horizon;
  });
}
