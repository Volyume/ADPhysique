/**
 * ageFromDateOfBirth.test.js -- the one derivation of age from a stored
 * date of birth, shared by the effective-maintenance service and the plan
 * input builder. Pins: whole years, floored; the 13 floor; null for a
 * missing, malformed or non-finite input; pure (no clock read).
 */
import fs from 'fs';
import path from 'path';
import { ageFromDateOfBirth } from '../ageFromDateOfBirth';

const NOW = new Date(2026, 8, 25, 12, 0, 0).getTime(); // 25 September 2026, local

describe('ageFromDateOfBirth', () => {
  test('whole years, floored', () => {
    expect(ageFromDateOfBirth('1990-01-01', NOW)).toBe(36);
    expect(ageFromDateOfBirth('1990-12-31', NOW)).toBe(35);
  });

  test('never below the 13 floor', () => {
    expect(ageFromDateOfBirth('2020-01-01', NOW)).toBe(13);
  });

  test('null for a missing, malformed or non-finite input', () => {
    expect(ageFromDateOfBirth(null, NOW)).toBeNull();
    expect(ageFromDateOfBirth('', NOW)).toBeNull();
    expect(ageFromDateOfBirth('not-a-date', NOW)).toBeNull();
    expect(ageFromDateOfBirth('1990-01-01', NaN)).toBeNull();
  });

  test('pure: the module never reads the clock', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'ageFromDateOfBirth.js'), 'utf8');
    expect(src).not.toContain('Date.now(');
  });
});
