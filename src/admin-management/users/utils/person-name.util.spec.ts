import {
  normalizeOptionalEmail,
  resolvePersonName,
} from './person-name.util';

describe('person-name.util', () => {
  it('builds full name from first + last and keeps split fields', () => {
    expect(
      resolvePersonName({ firstName: 'Ali', lastName: 'Khan' }),
    ).toEqual({
      firstName: 'Ali',
      lastName: 'Khan',
      name: 'Ali Khan',
    });
  });

  it('falls back to legacy name when split fields absent', () => {
    expect(resolvePersonName({ name: 'Sara Ahmed' }).name).toBe('Sara Ahmed');
  });

  it('normalizes email and treats blank as absent', () => {
    expect(normalizeOptionalEmail('  Ali@Test.COM ')).toBe('ali@test.com');
    expect(normalizeOptionalEmail('')).toBeUndefined();
    expect(normalizeOptionalEmail(undefined)).toBeUndefined();
  });
});
