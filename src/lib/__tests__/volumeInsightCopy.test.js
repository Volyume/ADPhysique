/**
 * volumeInsightCopy — pure status→guidance copy for the Workout Summary
 * per-muscle volume rows. The key tests are directional: the advice a row
 * gives must match its status, because a wrong-direction line (telling an
 * over-ceiling lifter to add sets, or a below-floor lifter to drop them)
 * would push training the wrong way.
 */
import { getVolumeInsight, getVolumeWhy } from '../volumeInsightCopy';
import { VOLUME_LANDMARKS } from '../algorithms';

// A muscle that exists in the landmark table, picked dynamically so the test
// does not hard-code a key that could be renamed.
const KNOWN_MUSCLE = Object.keys(VOLUME_LANDMARKS)[0];

describe('getVolumeInsight', () => {
  test('returns null for a muscle with no landmarks', () => {
    expect(getVolumeInsight('not_a_muscle', 10, 'optimal')).toBeNull();
  });

  test('rounds the set count and shows the MEV–MRV range', () => {
    const { mev, mrv } = VOLUME_LANDMARKS[KNOWN_MUSCLE];
    const line = getVolumeInsight(KNOWN_MUSCLE, 12.4, 'optimal');
    expect(line).toContain('12 sets');
    expect(line).toContain(`${mev}–${mrv} sets/week`);
  });

  test('each status produces a distinct phrase', () => {
    const statuses = ['optimal', 'minimum', 'below', 'near_mrv', 'over_mrv'];
    const lines = statuses.map(s => getVolumeInsight(KNOWN_MUSCLE, 10, s));
    expect(new Set(lines).size).toBe(statuses.length);
  });

  test('an unknown status still returns a safe fallback line', () => {
    expect(getVolumeInsight(KNOWN_MUSCLE, 10, 'mystery')).toContain('10 sets');
  });
});

describe('getVolumeWhy', () => {
  test('returns null for a muscle with no landmarks', () => {
    expect(getVolumeWhy('not_a_muscle', 10, 'over_mrv')).toBeNull();
  });

  test('returns null for an unknown status', () => {
    expect(getVolumeWhy(KNOWN_MUSCLE, 10, 'mystery')).toBeNull();
  });

  test('over-ceiling guidance tells the lifter to back off, never to add', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 30, 'over_mrv').toLowerCase();
    expect(why).toContain('drop');
    expect(why).not.toMatch(/add a couple of sets|sneak in one extra|one or two more sets/);
  });

  test('near-ceiling guidance holds volume, never adds', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 20, 'near_mrv').toLowerCase();
    expect(why).toContain('hold');
    expect(why).not.toMatch(/add a couple of sets|sneak in one extra/);
  });

  test('below-floor guidance tells the lifter to add, never to drop', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 2, 'below').toLowerCase();
    expect(why).toContain('add');
    expect(why).not.toContain('drop');
  });

  test('at-minimum guidance nudges volume up, never down', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 6, 'minimum').toLowerCase();
    expect(why).toMatch(/more sets/);
    expect(why).not.toContain('drop');
  });

  test('optimal guidance favours an extra rep over more sets', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 14, 'optimal').toLowerCase();
    expect(why).toContain('extra rep');
    expect(why).not.toContain('drop');
  });
});
