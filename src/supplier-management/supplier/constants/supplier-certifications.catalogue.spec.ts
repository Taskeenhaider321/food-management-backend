import {
  getFlatCertificationCatalogue,
  SUPPLIER_CERTIFICATION_CATALOGUE,
} from './supplier-certifications.catalogue';

describe('supplier certification catalogue', () => {
  const flat = getFlatCertificationCatalogue();

  it('has unique catalogue ids', () => {
    const ids = flat.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks FSMA / FDA PC / FSVP as regulatory and PCQI as individual qualification', () => {
    expect(flat.find((i) => i.id === 'fsma')?.kind).toBe('regulatory');
    expect(flat.find((i) => i.id === 'fda-pc-human-food')?.kind).toBe(
      'regulatory',
    );
    expect(flat.find((i) => i.id === 'fsvp')?.kind).toBe('regulatory');
    expect(flat.find((i) => i.id === 'pcqi')?.kind).toBe(
      'individual_qualification',
    );
  });

  it('includes required category groups and core standards', () => {
    const titles = SUPPLIER_CERTIFICATION_CATALOGUE.map((c) => c.title);
    expect(titles.some((t) => /International management/i.test(t))).toBe(true);
    expect(titles.some((t) => /European food/i.test(t))).toBe(true);
    expect(titles.some((t) => /US food safety/i.test(t))).toBe(true);
    expect(titles.some((t) => /Agriculture/i.test(t))).toBe(true);
    expect(titles.some((t) => /Animal feed/i.test(t))).toBe(true);
    expect(titles.some((t) => /Environmental/i.test(t))).toBe(true);

    const ids = new Set(flat.map((i) => i.id));
    for (const id of [
      'iso-9001',
      'fssc-22000',
      'haccp',
      'brcgs-food',
      'ifs-food',
      'globalgap',
      'gmp-plus-feed',
      'iso-14064',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
