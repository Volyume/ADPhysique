const fs = require('fs');
const path = require('path');

const NUTRITION_SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'NutritionTargetsScreen.js'), 'utf8');
const ONBOARDING_SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ProOnboardingScreen.js'), 'utf8');

describe('profile age helpers', () => {
  test('computes age from local date parts instead of birth year alone', () => {
    const { ageYearsFromDateOfBirth } = require('../profileAge');
    const now = new Date(2026, 6, 5);

    expect(ageYearsFromDateOfBirth('1990-01-05', now)).toBe(36);
    expect(ageYearsFromDateOfBirth('1990-07-05', now)).toBe(36);
    expect(ageYearsFromDateOfBirth('1990-12-31', now)).toBe(35);
  });

  test('rejects impossible or future date-of-birth values', () => {
    const { ageYearsFromDateOfBirth } = require('../profileAge');
    const now = new Date(2026, 6, 5);

    expect(ageYearsFromDateOfBirth('2026-02-31', now)).toBeNull();
    expect(ageYearsFromDateOfBirth('2027-01-01', now)).toBeNull();
    expect(ageYearsFromDateOfBirth('not-a-date', now)).toBeNull();
  });

  test('creates an age-preserving local date key when onboarding only knows age', () => {
    const { ageYearsFromDateOfBirth, dateOfBirthFromAgeYears } = require('../profileAge');
    const now = new Date(2026, 6, 5);

    const dob = dateOfBirthFromAgeYears(34, now);

    expect(dob).toBe('1992-07-05');
    expect(ageYearsFromDateOfBirth(dob, now)).toBe(34);
  });

  test('clamps leap-day synthesis to a valid local date', () => {
    const { ageYearsFromDateOfBirth, dateOfBirthFromAgeYears } = require('../profileAge');
    const now = new Date(2028, 1, 29);

    const dob = dateOfBirthFromAgeYears(39, now);

    expect(dob).toBe('1989-02-28');
    expect(ageYearsFromDateOfBirth(dob, now)).toBe(39);
  });
});

describe('profile age caller guards', () => {
  test('Nutrition Targets uses the shared local-date age helper', () => {
    expect(NUTRITION_SOURCE).toMatch(/ageYearsFromDateOfBirth\(profile\.dateOfBirth\)/);
    expect(NUTRITION_SOURCE).not.toMatch(/new Date\(profile\.dateOfBirth\)\.getFullYear\(\)/);
  });

  test('Pro Onboarding stores an age-preserving synthetic date of birth', () => {
    expect(ONBOARDING_SOURCE).toMatch(/dateOfBirthFromAgeYears\(ageNum\)/);
    expect(ONBOARDING_SOURCE).not.toMatch(/new Date\(new Date\(\)\.getFullYear\(\) - ageNum, 6, 1\)/);
  });
});
