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
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census W8): "In range: 6 to 22 sets a week", never
    // "target: 6 to 22 sets/week" ("target" is the heatmap's "range"; "sets/week" is not a sentence).
    expect(line).toContain(`${mev} to ${mrv} sets a week`);
    expect(line).toBe(`12 sets · In range: ${mev} to ${mrv} sets a week`);
    expect(line).not.toMatch(/target|sets\/week/);
  });

  // D214 addendum 9 (census 0.24, W4, W8): the insight line says the Volume heatmap's own five words,
  // read from the one shared map, and the range in the one form on every surface.
  test('each band says the heatmap\'s own word, then the range, and none says "target"', () => {
    const { mev, mrv } = VOLUME_LANDMARKS[KNOWN_MUSCLE];
    const range = `${mev} to ${mrv} sets a week`;
    expect(getVolumeInsight(KNOWN_MUSCLE, 3, 'below')).toBe(`3 sets · Under the range: ${range}`);
    expect(getVolumeInsight(KNOWN_MUSCLE, 7, 'minimum')).toBe(`7 sets · Just enough: ${range}`);
    expect(getVolumeInsight(KNOWN_MUSCLE, 12, 'optimal')).toBe(`12 sets · In range: ${range}`);
    expect(getVolumeInsight(KNOWN_MUSCLE, 20, 'near_mrv')).toBe(`20 sets · Near the limit: ${range}`);
    expect(getVolumeInsight(KNOWN_MUSCLE, 30, 'over_mrv')).toBe(`30 sets · Too much: ${range}`);
    for (const s of ['below', 'minimum', 'optimal', 'near_mrv', 'over_mrv', 'mystery']) {
      expect(getVolumeInsight(KNOWN_MUSCLE, 9, s)).not.toMatch(/target|sets\/week|on track|approaching upper limit|over your recovery limit|below the minimum for growth/);
    }
  });

  test('a muscle with no lower bound reads "up to 14 sets a week", never "0 to 14", as the heatmap rows do', () => {
    expect(getVolumeInsight('front_delts', 6, 'optimal')).toBe('6 sets · In range: up to 14 sets a week');
    expect(getVolumeInsight('front_delts', 6, 'optimal')).not.toMatch(/\b0 to 14\b/);
  });

  test('one set is "1 set", never "1 sets"', () => {
    expect(getVolumeInsight(KNOWN_MUSCLE, 1, 'below')).toMatch(/^1 set · /);
    expect(getVolumeInsight(KNOWN_MUSCLE, 1.2, 'below')).not.toMatch(/\b1 sets\b/);
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

  // RE-ANCHORED 2026-10-02 (D214 addendum 9, census W7, the lead's ruling): the heatmap's own legend says
  // "Too much" means past the point of extra benefit, NOT dangerous (coachGlossary volumeHeatmapBands), and this
  // line used to claim "Soreness, performance drops and joint aches usually follow at this level": opposite
  // claims for one band on two screens. The glossary's reading wins, so the claim goes, and the line is the
  // lead's own words. It names no figure, so it cannot disagree with the band beside it.
  test('over the ceiling: says it is past the most sets the muscle can recover from, and that more sets now add fatigue, not growth', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 30, 'over_mrv');
    expect(why).toMatch(/^Past the most sets this muscle can recover from in a week: more sets now add fatigue, not growth\./);
    expect(why).not.toMatch(/Soreness|joint aches|performance drops|usually follow|dangerous/i);
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

  test('at the minimum: enough to grow, and where the range runs', () => {
    const why = getVolumeWhy(KNOWN_MUSCLE, 6, 'minimum');
    expect(why).toMatch(/enough to grow, but only just: the range runs from here up to \d+/);
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
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census W8): "sets a week", and the range is "the range".
    expect(line).toContain('6 to 16 sets a week');
    expect(line).toBe('18 sets · Too much: 6 to 16 sets a week');
    expect(line).not.toContain('22');
  });

  test('the why body quotes the resolved ceiling', () => {
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census W7): this pinned "(16 sets per week)" in the OVER band's
    // body so the copy could never contradict the verdict (D97-25). The lead's replacement for that band names
    // no figure at all, so it cannot contradict anything, and the same row's insight line still quotes the
    // resolved range (pinned above). The guarantee moves to the band that still quotes the ceiling, near it.
    const near = getVolumeWhy('chest', 14, 'near_mrv', resolved, 'adapted');
    expect(near).toContain('(16 sets a week)');
    expect(near).not.toContain('22');
    const over = getVolumeWhy('chest', 18, 'over_mrv', resolved, 'adapted');
    expect(over).not.toContain('22');
    expect(over).toMatch(/^Past the most sets this muscle can recover from in a week: more sets now add fatigue, not growth\./);
  });

  test('no table falls back to research byte-identically', () => {
    expect(getVolumeInsight('chest', 18, 'over_mrv')).toBe(getVolumeInsight('chest', 18, 'over_mrv', null));
  });

  // D214 addendum 9 (census W6): British English, "programmes" for the verb.
  test('the plan source says "programmes", never "programs"', () => {
    const why = getVolumeWhy('chest', 10, 'optimal', resolved, 'plan');
    expect(why).toMatch(/This target is what your plan programmes for this muscle each week\.$/);
    expect(why).not.toMatch(/\bprograms\b/);
  });

  test('the closing clause is true per provenance: adapted claims adaptation, manual claims ownership, research claims research', () => {
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'adapted')).toMatch(/adjusted from how your earlier blocks went\.$/);
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'manual')).toMatch(/your own volume targets, exactly as you set them\.$/);
    expect(getVolumeWhy('chest', 10, 'optimal', resolved, 'research')).toMatch(/research-based starting points\.$/);
    // Unknown provenance may never claim adaptation.
    expect(getVolumeWhy('chest', 10, 'optimal', null, null)).not.toMatch(/adjust over time/);
  });
});
