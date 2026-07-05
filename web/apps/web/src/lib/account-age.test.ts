import { describe, it, expect } from 'vitest';
import { ageYearsFromDateOfBirth } from '@volyume/supabase';

describe('account profile age from date of birth', () => {
  it('uses calendar birthday boundaries instead of elapsed milliseconds', () => {
    expect(ageYearsFromDateOfBirth('1990-07-05', new Date('2026-07-05T12:00:00Z'))).toBe(36);
    expect(ageYearsFromDateOfBirth('1990-07-06', new Date('2026-07-05T12:00:00Z'))).toBe(35);
  });

  it('treats the DOB as a London local date, not an instant parsed with Date.parse', () => {
    expect(ageYearsFromDateOfBirth('1990-07-06', new Date('2026-07-05T23:30:00Z'))).toBe(36);
  });

  it('rejects invalid and future DOB values', () => {
    const now = new Date('2026-07-05T12:00:00Z');

    expect(ageYearsFromDateOfBirth('2026-02-31', now)).toBeNull();
    expect(ageYearsFromDateOfBirth('2027-01-01', now)).toBeNull();
    expect(ageYearsFromDateOfBirth('not-a-date', now)).toBeNull();
  });
});
