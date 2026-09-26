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
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    // -- and the house dash rule: ranges read "X to Y", never an en dash.
    expect(line).toContain(`${mev} to ${mrv} sets/week`);
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

  // RE-ANCHORED 2026-09-26 (D204 addendum 3: the "Why?" panels describe,
  // never instruct). These used to REQUIRE the advice words ('drop', 'hold',
  // 'add', 'more sets', 'extra rep'); they now require each band's own fact
  // and forbid any next-week instruction.
  const ADVICE = /\b(drop|hold here|add a|sneak in|next week|try to|aim for|you should|piling on)\b/i;

  test('over the ceiling: says it is past the most sets the muscle can recover from, and what usually follows', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 30, 'over_mrv');
    expect(why).toMatch(/Past the most weekly sets .* can recover from/);
    expect(why).toMatch(/usually follow/);
    expect(why).not.toMatch(ADVICE);
  });

  test('near the ceiling: says how close it is, and what climbing reps mean', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 20, 'near_mrv');
    expect(why).toMatch(/Close to the most weekly sets/);
    expect(why).not.toMatch(ADVICE);
  });

  test('below the floor: names the point where growth becomes reliable', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 2, 'below');
    expect(why).toMatch(/Below \d+ sets a week, the point where research starts to show reliable growth/);
    expect(why).not.toMatch(ADVICE);
  });

  test('at the minimum: enough to grow, and where the helpful range runs', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 6, 'minimum');
    expect(why).toMatch(/enough to grow, but only just: the helpful range runs from here up to \d+/);
    expect(why).not.toMatch(ADVICE);
  });

  test('inside the range: says so, and where progress comes from there', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 14, 'optimal');
    expect(why).toMatch(/you landed inside it/);
    expect(why).toMatch(/progress comes mostly from reps and weight going up/);
    expect(why).not.toMatch(ADVICE);
  });
});

describe('C6 RD6-1 (D97-25): the copy quotes the band the verdict used', () => {
  const { getVolumeInsight, getVolumeWhy } = require('../volumeInsightCopy');
  // A user whose resolved chest ceiling is 16 (adapted), against a
  // research table of 22: the sentence must carry 16, not 22.
  const resolved = { chest: { mev: 6, mav: 12, mrv: 16 } };

  test('the insight line quotes the resolved range, not frozen research', () => {
    const line = getVolumeInsight('chest', 18, 'over_mrv', resolved);
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(line).toContain('6 to 16 sets/week');
    expect(line).not.toContain('22');
  });

  test('the why body quotes the resolved ceiling', () => {
    const why = getVolumeWhy('chest', 18, 'over_mrv', resolved, 'adapted');
    expect(why).toContain('(16 sets per week)');
    expect(why).not.toContain('22');
  });

  test('no table falls back to research byte-identically', () => {
    expect(getVolumeInsight('chest', 18, 'over_mrv')).toBe(getVolumeInsight('chest', 18, 'over_mrv', null));
  });

  test('the closing clause is true per provenance: adapted claims adaptation, manual claims ownership, research claims research', () => {
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'adapted')).toMatch(/adjusted from how your earlier blocks went\.$/);
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'manual')).toMatch(/your own volume targets, exactly as you set them\.$/);
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'research')).toMatch(/research-based starting points\.$/);
    // Unknown provenance may never claim adaptation.
    expect(getVolumeWhy('chest', 10, 'optimal', null, null)).not.toMatch(/adjust over time/);
  });
});
