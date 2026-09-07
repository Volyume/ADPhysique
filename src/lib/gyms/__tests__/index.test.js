/**
 * index.test.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`; migrate_162_gym_directory.sql).
 *
 * The small pure helpers `venueLine`, `distanceLabel` and `isPendingVenue`
 * over the migration's own contract: `verification_status` starts
 * `user_submitted_pending` while a submission awaits its second
 * confirmation, and moves to `user_submitted_verified` (no longer
 * pending) the moment it gets one. A badge that stayed lit for a
 * VERIFIED venue would tell a person to double-check something the
 * directory already settled.
 */

import { venueLine, distanceLabel, isPendingVenue } from '../index';

describe('distanceLabel', () => {
  test('one decimal under 10 miles', () => {
    expect(distanceLabel(1609.344)).toBe('1 mi');
    expect(distanceLabel(1200)).toBe('0.7 mi');
  });

  test('whole miles at or above 10', () => {
    expect(distanceLabel(16093.44)).toBe('10 mi');
    expect(distanceLabel(40233.6)).toBe('25 mi');
  });

  test('null when there is nothing to show', () => {
    expect(distanceLabel(null)).toBeNull();
    expect(distanceLabel(undefined)).toBeNull();
    expect(distanceLabel('not a number')).toBeNull();
  });
});

describe('venueLine', () => {
  test('the secondary line omits distance when it is null', () => {
    const out = venueLine({ display_name: 'Volt Gym', town: 'Burscough', outward: 'L40', distance_m: null });
    expect(out).toEqual({ primary: 'Volt Gym', secondary: 'Burscough · L40' });
  });

  test('the secondary line carries distance when it is known', () => {
    const out = venueLine({ display_name: 'PureGym Motherwell', town: 'Motherwell', outward: 'ML1', distance_m: 1200 });
    expect(out.secondary).toBe('Motherwell · ML1 · 0.7 mi');
  });

  test('falls back to name and an empty secondary when nothing else is known', () => {
    expect(venueLine({ name: 'Volt Gym' })).toEqual({ primary: 'Volt Gym', secondary: '' });
    expect(venueLine(null)).toEqual({ primary: '', secondary: '' });
  });
});

describe('isPendingVenue (migrate_162: verification_status)', () => {
  test('user_submitted_pending is pending', () => {
    expect(isPendingVenue({ verification_status: 'user_submitted_pending' })).toBe(true);
  });

  test('user_submitted_verified (a second confirmation landed) is NOT pending', () => {
    expect(isPendingVenue({ verification_status: 'user_submitted_verified' })).toBe(false);
  });

  test('a source-verified venue is not pending', () => {
    expect(isPendingVenue({ verification_status: 'source_verified' })).toBe(false);
    expect(isPendingVenue({ verification_status: 'verified' })).toBe(false);
  });

  test('no status at all is not pending', () => {
    expect(isPendingVenue({})).toBe(false);
    expect(isPendingVenue(null)).toBe(false);
  });
});
