/**
 * src/lib/ageFromDateOfBirth.js
 *
 * The one place an age in whole years is derived from a stored date of
 * birth (the profile's `dateOfBirth`, an ISO `YYYY-MM-DD` string). Used by
 * the effective-maintenance service (nutrition, BMR) and by
 * planAutoGen.buildPlanInputs (the plan engine's age-adjusted volume
 * landmarks, computeLandmarks' `age`), so the two can never disagree about
 * how old the athlete is.
 *
 * Pure: `nowMs` is an argument, never the clock. Floors at 13 (the app's
 * minimum age) and returns null for a missing or unparseable value, so a
 * caller reads "unknown" rather than a wrong number.
 */
const MS_PER_YEAR = 365.2425 * 86400000;

export function ageFromDateOfBirth(value, nowMs) {
  const born = value ? new Date(value) : null;
  if (!born || !Number.isFinite(born.getTime()) || !Number.isFinite(nowMs)) return null;
  return Math.max(13, Math.floor((nowMs - born.getTime()) / MS_PER_YEAR));
}
