/**
 * D214 (progress, recovery heatmap and Consistency audit, 2026-10-01), PR-4
 * and Q2: the Progress root's Body row.
 *
 * Pins, against the real derivation:
 *  - the weekly coach's own verdict leads the Body row's headline when it is
 *    fresh (on target, slower or faster than planned, holding steady on
 *    maintenance), so the row and the coaching decision never disagree;
 *  - a verdict older than a fortnight, or no verdict, falls back to the
 *    sentences the derivation printed before (the headline is never a stale
 *    week's verdict beside a live figure);
 *  - the goal-phase signs the words rely on mirror weeklyCoach.js's
 *    PHASE_CONFIG (source guard: the two cannot drift apart);
 *  - the ED-flag branch withholds the pillar's figure (`pillarFigure:
 *    false`) exactly as calm mode does, a withhold strengthened, never
 *    weakened; the ordinary branch exposes it (`pillarFigure: true`).
 */
const fs = require('fs');
const path = require('path');
const {
  deriveWeightTrend, coachVerdictInsight, GOAL_SIGN_BY_PHASE, COACH_VERDICT_FRESH_MS,
} = require('../weightTrend');

const NOW = Date.UTC(2026, 9, 1, 12);
// Dated points ending at NOW (the two-week direction reads real dates; D214
// addendum 4), rising 0.01 kg a day: inside the one steady rule.
function series(n) {
  return Array.from({ length: n }, (_, i) => ({
    ewma: 80 + i * 0.01, weightKg: 80 + i * 0.01, date: new Date(NOW - (n - 1 - i) * 86400000).toISOString(),
  }));
}
const base = { ewmaData: series(20), weeklyChange: -0.2, adaptiveBurn: null, nowMs: NOW };
const fresh = NOW - 2 * 86400000;

describe('coachVerdictInsight', () => {
  test('on target on a cut or a bulk reads "Moving at the planned rate."', () => {
    expect(coachVerdictInsight({ onTarget: true, direction: 0, goalPhase: 'mild_cut', at: fresh }, NOW)).toBe('Moving at the planned rate.');
    expect(coachVerdictInsight({ onTarget: true, direction: 1, goalPhase: 'mod_bulk', at: fresh }, NOW)).toBe('Moving at the planned rate.');
  });
  test('on target on maintenance reads "Holding steady, as planned."', () => {
    expect(coachVerdictInsight({ onTarget: true, direction: 0, goalPhase: 'maint', at: fresh }, NOW)).toBe('Holding steady, as planned.');
  });
  test('off target: the words follow the goal sign and the direction of actual minus goal', () => {
    // Cut: actual above the goal (less loss) is slower; below it is faster.
    expect(coachVerdictInsight({ onTarget: false, direction: 1, goalPhase: 'mild_cut', at: fresh }, NOW)).toBe('Moving slower than planned.');
    expect(coachVerdictInsight({ onTarget: false, direction: -1, goalPhase: 'recomp', at: fresh }, NOW)).toBe('Moving faster than planned.');
    // Bulk: actual above the goal is faster.
    expect(coachVerdictInsight({ onTarget: false, direction: 1, goalPhase: 'mild_bulk', at: fresh }, NOW)).toBe('Moving faster than planned.');
    expect(coachVerdictInsight({ onTarget: false, direction: -1, goalPhase: 'mod_bulk', at: fresh }, NOW)).toBe('Moving slower than planned.');
    // Maintenance: a drift, named by direction.
    expect(coachVerdictInsight({ onTarget: false, direction: 1, goalPhase: 'maint', at: fresh }, NOW)).toBe('Drifting up.'); // no size word (census P11, D214 addendum 9)
    expect(coachVerdictInsight({ onTarget: false, direction: -1, goalPhase: 'maint', at: fresh }, NOW)).toBe('Drifting down.'); // no size word (census P11, D214 addendum 9)
  });
  test('no verdict, an unknown phase, or a stale verdict gives nothing', () => {
    expect(coachVerdictInsight(null, NOW)).toBeNull();
    expect(coachVerdictInsight({ onTarget: null, direction: 0, goalPhase: 'mild_cut', at: fresh }, NOW)).toBeNull();
    expect(coachVerdictInsight({ onTarget: true, direction: 0, goalPhase: 'agg_cut', at: fresh }, NOW)).toBeNull();
    expect(coachVerdictInsight({ onTarget: true, direction: 0, goalPhase: 'mild_cut', at: NOW - COACH_VERDICT_FRESH_MS - 1 }, NOW)).toBeNull();
  });
  test('the verdict words describe and never instruct, in plain words', () => {
    const all = [];
    for (const goalPhase of Object.keys(GOAL_SIGN_BY_PHASE)) {
      for (const onTarget of [true, false]) {
        for (const direction of [-1, 0, 1]) {
          all.push(coachVerdictInsight({ onTarget, direction, goalPhase, at: fresh }, NOW));
        }
      }
    }
    for (const line of all) {
      expect(line).toMatch(/^[A-Z][a-z ,]+\.$/);
      expect(line).not.toMatch(/\b(eat|should|consider|try|cut|more|less)\b/i);
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe('deriveWeightTrend with a coach verdict', () => {
  test('a fresh verdict leads the headline and sets the dot by the verdict; the figure stays available to the pillar', () => {
    const vm = deriveWeightTrend({ ...base, coachVerdict: { onTarget: false, direction: 1, goalPhase: 'mild_cut', at: fresh } });
    expect(vm.insight).toBe('Moving slower than planned.');
    expect(vm.dot).toBe('watch');
    expect(vm.pillarFigure).toBe(true);
    expect(vm.ewmaNow).toBeCloseTo(80.19, 2);
  });
  test('a stale verdict falls back to the sentence the derivation printed before', () => {
    const vm = deriveWeightTrend({ ...base, coachVerdict: { onTarget: false, direction: 1, goalPhase: 'mild_cut', at: NOW - 30 * 86400000 } });
    // RE-ANCHORED D214 addendum 4 (BM-15): the fallback is the direction with
    // its window, never the maintenance sentence.
    expect(vm.insight).toBe('Holding steady over the last 2 weeks.');
    expect(vm.dot).toBe('onTrack');
  });
  test('calm mode returns first: no figure, the calm line, pillarFigure false', () => {
    const vm = deriveWeightTrend({ ...base, calm: true, coachVerdict: { onTarget: false, direction: 1, goalPhase: 'mild_cut', at: fresh } });
    expect(vm.ewmaNow).toBeNull();
    expect(vm.pillarFigure).toBe(false);
    expect(vm.insight).not.toMatch(/planned/);
  });
  test('an open ED flag returns before the verdict: direction-only copy, no rate, and the pillar withholds the figure', () => {
    const vm = deriveWeightTrend({ ...base, edFlagOpen: true, coachVerdict: { onTarget: false, direction: 1, goalPhase: 'mild_cut', at: fresh } });
    expect(vm.edFlagOpen).toBe(true);
    expect(vm.showRate).toBe(false);
    expect(vm.pillarFigure).toBe(false);
    expect(vm.insight).not.toMatch(/planned|\d/);
  });
});

describe('source guard: GOAL_SIGN_BY_PHASE mirrors weeklyCoach.js PHASE_CONFIG', () => {
  test('every configured phase has the same sign here as its goalRatePct there, and no phase is missing', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');
    const block = src.match(/const PHASE_CONFIG = \{([\s\S]*?)\n\};/);
    expect(block).not.toBeNull();
    const entries = [...block[1].matchAll(/(\w+):\s*\{[^}]*goalRatePct:\s*(-?[\d.]+)/g)];
    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const [, phase, rate] of entries) {
      expect(GOAL_SIGN_BY_PHASE[phase]).toBe(Math.sign(Number(rate)));
    }
    expect(Object.keys(GOAL_SIGN_BY_PHASE).sort()).toEqual(entries.map((e) => e[1]).sort());
  });
});
