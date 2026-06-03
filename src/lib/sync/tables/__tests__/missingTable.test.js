/**
 * isMissingTableError, the shared benign-skip detector for additive sync
 * tables. A not-yet-migrated cloud table must read as benign so it cannot
 * wedge the push-first sign-out guard; a missing COLUMN or any other error
 * must NOT, so real schema drift still surfaces.
 */
import { isMissingTableError } from '../_missingTable';

describe('isMissingTableError', () => {
  test('matches PostgREST schema-cache code PGRST205', () => {
    expect(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.cardio_log' in the schema cache" }, 'cardio_log')).toBe(true);
  });

  test('matches relation-does-not-exist code 42P01', () => {
    expect(isMissingTableError({ code: '42P01', message: 'relation "daily_steps" does not exist' }, 'daily_steps')).toBe(true);
  });

  test('matches on message + table name when no code is present', () => {
    expect(isMissingTableError({ message: "Could not find the table 'public.daily_steps' in the schema cache" }, 'daily_steps')).toBe(true);
    expect(isMissingTableError({ message: 'relation "cardio_log" does not exist' }, 'cardio_log')).toBe(true);
  });

  test('does NOT benign-skip a missing COLUMN, even when its message names the table', () => {
    // Real schema drift. PGRST204 carries the table name + "schema cache", and
    // 42703's message carries the table token + "does not exist", so without
    // the column exclusion these would be misread as a missing table and the
    // drift would be silently skipped. Both must surface as real errors.
    expect(isMissingTableError({ code: 'PGRST204', message: "Could not find the 'steps_v2' column of 'daily_steps' in the schema cache" }, 'daily_steps')).toBe(false);
    expect(isMissingTableError({ code: '42703', message: 'column daily_steps.steps_v2 does not exist' }, 'daily_steps')).toBe(false);
    expect(isMissingTableError({ message: 'column "daily_steps.foo" does not exist' }, 'daily_steps')).toBe(false);
  });

  test('returns false for unrelated errors and falsy input', () => {
    expect(isMissingTableError({ code: '42501', message: 'permission denied for table daily_steps' }, 'daily_steps')).toBe(false);
    expect(isMissingTableError(new Error('network timeout'), 'daily_steps')).toBe(false);
    expect(isMissingTableError(null, 'daily_steps')).toBe(false);
  });
});
