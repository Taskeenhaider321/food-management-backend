import {
  computeWeightedScore,
  isCertificationExpired,
  listExpiringCertifications,
  riskLevelFromWeightedScore,
  validateCertificationsForApproval,
} from './supplier-evaluation.util';

describe('supplier-evaluation.util', () => {
  describe('computeWeightedScore / risk bands', () => {
    it('computes weighted average', () => {
      expect(
        computeWeightedScore([
          { score: 1, weight: 1 },
          { score: 3, weight: 1 },
        ]),
      ).toBe(2);
    });

    it('maps Low / Moderate / High / Very High bands', () => {
      expect(riskLevelFromWeightedScore(1.0)).toBe('low');
      expect(riskLevelFromWeightedScore(1.79)).toBe('low');
      expect(riskLevelFromWeightedScore(1.8)).toBe('moderate');
      expect(riskLevelFromWeightedScore(2.59)).toBe('moderate');
      expect(riskLevelFromWeightedScore(2.6)).toBe('high');
      expect(riskLevelFromWeightedScore(3.39)).toBe('high');
      expect(riskLevelFromWeightedScore(3.4)).toBe('very_high');
      expect(riskLevelFromWeightedScore(5.0)).toBe('very_high');
    });

    it('does not invent a band for out-of-range scores', () => {
      expect(riskLevelFromWeightedScore(0.5)).toBeUndefined();
      expect(riskLevelFromWeightedScore(5.1)).toBeUndefined();
    });
  });

  describe('validateCertificationsForApproval', () => {
    it('allows empty certification list', () => {
      expect(validateCertificationsForApproval([]).valid).toBe(true);
      expect(validateCertificationsForApproval(undefined).valid).toBe(true);
    });

    it('requires number, document, and non-expired expiry for selected certs', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);

      const ok = validateCertificationsForApproval([
        {
          certificateNumber: 'C-1',
          documentUrl: 'https://cdn.example/c.pdf',
          expiryDate: future,
        },
      ]);
      expect(ok.valid).toBe(true);

      const bad = validateCertificationsForApproval([
        {
          certificateNumber: '',
          documentUrl: '',
          expiryDate: past,
        },
      ]);
      expect(bad.valid).toBe(false);
      expect(bad.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('expiry helpers', () => {
    it('treats missing expiry as expired for approval checks', () => {
      expect(isCertificationExpired(undefined)).toBe(true);
      expect(isCertificationExpired(null)).toBe(true);
    });

    it('lists certs expiring within the horizon but not already expired', () => {
      const in10 = new Date();
      in10.setDate(in10.getDate() + 10);
      const in60 = new Date();
      in60.setDate(in60.getDate() + 60);
      const past = new Date();
      past.setDate(past.getDate() - 2);

      const rows = listExpiringCertifications(
        [
          { catalogueId: 'a', expiryDate: in10 },
          { catalogueId: 'b', expiryDate: in60 },
          { catalogueId: 'c', expiryDate: past },
        ],
        30,
      );
      expect(rows.map((r) => r.catalogueId)).toEqual(['a']);
    });
  });
});
