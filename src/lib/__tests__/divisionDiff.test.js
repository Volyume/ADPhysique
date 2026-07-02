/**
 * divisionDiff.test.js
 * Pins the A4 division set-count diff (audit/04-competitive.md section 4:
 * "a general plan gives glutes N sets; yours has M"; "division fingerprints
 * on the heatmap/routine detail") against the REAL engine. What must never
 * happen:
 *   - a division with known overlays failing to show its judged muscles as
 *     elevated and its de-emphasised muscles as capped (the fingerprint
 *     vanishing again after minute five),
 *   - the 'general' division claiming any fingerprint at all,
 *   - the diff drifting between two identical calls (the engine is
 *     deterministic; a re-presentation of it must be too),
 *   - the routine-detail line acquiring an em dash or losing its division.
 * No engine outputs are asserted as exact set counts (split tuning may move
 * them); directions and orderings are the contract.
 */

import {
  computeDivisionDiff,
  fingerprintMarkers,
  divisionFingerprintLine,
  hasDivisionOverlay,
  planWearsDivision,
  FINGERPRINT_MIN_DELTA,
} from '../divisionDiff';

const cfg = (goal, over = {}) => ({
  goal,
  experience: 'intermediate',
  daysPerWeek: 5,
  sessionLengthMinutes: 75,
  equipment: 'full_gym',
  phase: 'maintain',
  nutritionPhase: 'maintain',
  weakPoints: [],
  recoveryRating: 'average',
  ...over,
});

const byMuscle = diff => Object.fromEntries(diff.map(d => [d.muscle, d]));

describe('computeDivisionDiff', () => {
  test('bikini elevates its judged muscles and caps the de-emphasised ones vs general', () => {
    const d = byMuscle(computeDivisionDiff(cfg('bikini')));

    // Primary judging criteria (GOAL_OVERLAYS.bikini glutes 1.55 / hams 1.35)
    // must read as elevated, meaningfully (>= the marker threshold).
    expect(d.glutes.direction).toBe('elevated');
    expect(d.glutes.delta).toBeGreaterThanOrEqual(FINGERPRINT_MIN_DELTA);
    expect(d.hamstrings.direction).toBe('elevated');
    expect(d.hamstrings.delta).toBeGreaterThanOrEqual(FINGERPRINT_MIN_DELTA);

    // De-emphasised upper body (chest 0.80, traps 0.70) must read as capped.
    expect(d.chest.direction).toBe('capped');
    expect(d.traps.direction).toBe('capped');

    // yours/general/delta are internally consistent (the audit's "N vs M").
    for (const entry of Object.values(d)) {
      expect(entry.delta).toBe(entry.yours - entry.general);
    }
  });

  test("mens physique elevates side delts and caps traps (the division's stated shape)", () => {
    const d = byMuscle(computeDivisionDiff(cfg('mens_physique')));
    expect(d.side_delts.direction).toBe('elevated');
    expect(d.side_delts.delta).toBeGreaterThanOrEqual(FINGERPRINT_MIN_DELTA);
    expect(d.traps.direction).toBe('capped');
  });

  test("the 'general' division produces no fingerprint: every muscle reads 'same'", () => {
    const diff = computeDivisionDiff(cfg('general'));
    expect(diff.length).toBeGreaterThan(0);
    for (const d of diff) {
      expect(d.direction).toBe('same');
      expect(d.delta).toBe(0);
      expect(d.yours).toBe(d.general);
    }
    expect(fingerprintMarkers(diff)).toBeNull();
    expect(divisionFingerprintLine('general', diff)).toBeNull();
  });

  test('deterministic: two identical calls return byte-identical diffs', () => {
    const a = computeDivisionDiff(cfg('bikini'));
    const b = computeDivisionDiff(cfg('bikini'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('sorted most-elevated first so surfaces can take the top entries directly', () => {
    const diff = computeDivisionDiff(cfg('wellness'));
    for (let i = 1; i < diff.length; i++) {
      expect(diff[i - 1].delta).toBeGreaterThanOrEqual(diff[i].delta);
    }
  });

  test('missing goal returns an empty diff (never throws on a bare profile)', () => {
    expect(computeDivisionDiff(null)).toEqual([]);
    expect(computeDivisionDiff({})).toEqual([]);
  });
});

describe('fingerprintMarkers', () => {
  test('only meaningful deltas become markers, keyed by muscle', () => {
    const markers = fingerprintMarkers(computeDivisionDiff(cfg('bikini')));
    expect(markers.glutes).toBe('elevated');
    expect(markers.hamstrings).toBe('elevated');
    expect(markers.chest).toBe('capped');
    for (const dir of Object.values(markers)) {
      expect(['elevated', 'capped']).toContain(dir);
    }
    // Threshold respected: nothing below FINGERPRINT_MIN_DELTA gets a marker.
    const diff = computeDivisionDiff(cfg('bikini'));
    for (const d of diff) {
      if (Math.abs(d.delta) < FINGERPRINT_MIN_DELTA) {
        expect(markers[d.muscle]).toBeUndefined();
      }
    }
  });
});

describe('divisionFingerprintLine', () => {
  test('names the division and its strongest emphases, British copy, no em dash', () => {
    const diff = computeDivisionDiff(cfg('bikini'));
    const line = divisionFingerprintLine('bikini', diff);
    expect(line).toMatch(/^Built for Bikini: /);
    expect(line).toContain('Glutes');
    expect(line).toContain('elevated');
    expect(line).toContain('capped');
    expect(line).not.toContain('—'); // no em dash in user-facing copy
  });

  test('caps each list at the requested size', () => {
    const diff = computeDivisionDiff(cfg('wellness'));
    const line = divisionFingerprintLine('wellness', diff, 1);
    // One elevated + one capped muscle only: exactly one 'and'-free pair.
    expect(line).toMatch(/^Built for Wellness: [A-Za-z ]+ elevated, [A-Za-z ]+ capped\.$/);
  });

  test('returns null for general (no fingerprint to claim)', () => {
    expect(divisionFingerprintLine('general', computeDivisionDiff(cfg('general')))).toBeNull();
  });
});

describe('gating helpers', () => {
  test('hasDivisionOverlay: divisions yes, general and unknown no', () => {
    expect(hasDivisionOverlay('bikini')).toBe(true);
    expect(hasDivisionOverlay('mens_physique')).toBe(true);
    expect(hasDivisionOverlay('womens_bodybuilding')).toBe(true);
    expect(hasDivisionOverlay('general')).toBe(false);
    expect(hasDivisionOverlay(null)).toBe(false);
    expect(hasDivisionOverlay('not_a_goal')).toBe(false);
  });

  test('planWearsDivision: only a generated division plan name qualifies', () => {
    // Generated names lead with the division label (planEngine goalShort).
    expect(planWearsDivision('Bikini · Cut · Lower Focus 5×/week', 'bikini')).toBe(true);
    expect(planWearsDivision("Men's Physique PPL 5×/week", 'mens_physique')).toBe(true);
    // A manually built or library plan the user activated instead: no claim.
    expect(planWearsDivision('My push day plan', 'bikini')).toBe(false);
    // No division goal at all: never claims, whatever the plan is called.
    expect(planWearsDivision('Bikini · Cut · Lower Focus 5×/week', 'general')).toBe(false);
    expect(planWearsDivision(null, 'bikini')).toBe(false);
  });

  test('planWearsDivision: weak-point / strength-size blocks keep the fingerprint', () => {
    // planEngine shadows the name label during these phases but the division
    // overlay is still applied, so the generated names qualify.
    expect(planWearsDivision('Specialisation · Lean Gain · UL + WP 5×/week', 'bikini')).toBe(true);
    expect(planWearsDivision('Strength + Size · Bulk · PPL 5×/week', 'mens_physique')).toBe(true);
    // The seed routine name has no ' · ' separator: not a generated plan.
    expect(planWearsDivision('Chest & Shoulder Specialisation', 'bikini')).toBe(false);
    // A general user's specialisation plan carries no division to claim.
    expect(planWearsDivision('Specialisation · Lean Gain · UL + WP 5×/week', 'general')).toBe(false);
  });
});
