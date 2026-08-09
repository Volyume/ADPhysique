/**
 * deload.stage7.test.js — TEST-FIRST, Stage 7 of the adaptive mesocycle
 * build (founder order: "strain-aware deload — % of achieved peak; 7
 * days normal; longer only on multiple persistent signals,
 * user-confirmed"; authority blueprint §3.4: "Deload sets = max(MEV,
 * 40-60% of that muscle's actual peak, scaled by the block's strain
 * score) instead of flat MEV; RIR 4 unchanged").
 *
 * Pins BEFORE implementation:
 * - computeDeloadVolume(plannedRows, context): with { peaks,
 *   strainScore } the deload lands at max(MEV, peak x pct) where pct
 *   runs 60% (strain 0) down to 40% (strain >= 4) in 5-point steps —
 *   the muscle's ACTUAL performed peak, not the plan. A deload never
 *   raises a row (clamped at the current planned value) and rows that
 *   would not move are omitted, exactly as before. Without context the
 *   legacy flat-MEV cut is byte-identical.
 * - resolveSeedRange emits deloadSets for LEDGER-sourced seeds only
 *   (the only source carrying an achieved peak + strain evidence); the
 *   seeded deload week consumes it, research MEV otherwise.
 * - The 10-day recovery window stays a PROPOSAL
 *   (ledger.proposedRecoveryDays, Stage 2) — nothing here automates it;
 *   its user-facing copy lands with Stage 8's explanation surfaces.
 * - RIR 4 is untouched (setMesocycleWeekDeload's default).
 */
import fs from 'fs';
import path from 'path';
import { computeDeloadVolume } from '../coachApply';
import { resolveSeedRange } from '../blockSeed';

const rows = (over = {}) => ([{
  muscle: 'chest', planned_sets: 18, mev: 8, mav: 14, mrv: 22, ...over,
}]);

describe('strain-aware deload volume (§3.4)', () => {
  test('no context: the legacy flat-MEV cut is byte-identical', () => {
    expect(computeDeloadVolume(rows())).toEqual([
      { muscle: 'chest', plannedSets: 8, mev: 8, mav: 14, mrv: 22 },
    ]);
  });

  test('fresh block (strain 0): 60% of the achieved peak', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 16 }, strainScore: 0 });
    expect(changes).toEqual([
      { muscle: 'chest', plannedSets: 10, mev: 8, mav: 14, mrv: 22 }, // round(16 x 0.6)
    ]);
  });

  test('heavy strain (>= 4): 40%, floored at MEV', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 16 }, strainScore: 4 });
    expect(changes[0].plannedSets).toBe(8); // round(16 x 0.4) = 6 -> MEV 8
  });

  test('moderate strain scales in five-point steps', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 20 }, strainScore: 2 });
    expect(changes[0].plannedSets).toBe(10); // round(20 x 0.5)
  });

  test('strain beyond 4 never cuts below 40%', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 30 }, strainScore: 9 });
    expect(changes[0].plannedSets).toBe(12); // round(30 x 0.4)
  });

  test('a muscle without a recorded peak falls back to the MEV cut', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { quads: 12 }, strainScore: 0 });
    expect(changes[0].plannedSets).toBe(8);
  });

  test('a deload never raises a row: the computed target clamps at the current plan', () => {
    const changes = computeDeloadVolume(rows({ planned_sets: 9 }), { peaks: { chest: 20 }, strainScore: 0 });
    // round(20 x 0.6) = 12 would RAISE 9; the row must not move at all.
    expect(changes).toEqual([]);
  });

  test('rows already at or below their target are omitted, as before', () => {
    const changes = computeDeloadVolume(rows({ planned_sets: 8 }));
    expect(changes).toEqual([]);
  });
});

describe('the seeded deload week (ledger-sourced seeds carry their own deload)', () => {
  const LEDGER_ENTRY = {
    classification: 'RESPONSIVE',
    confidence: 0.9,
    observed: { startSets: 10, achievedPeak: 16, plannedPeak: 16, suppressed: false },
    evidence: [
      { signal: 'e1rm_slope_pct', value: 4 },
      { signal: 'recovery_cost_weight', value: 0 },
    ],
    proposal: { startSets: 11, peakSets: 17, stimulusChange: null, deferredToManual: false },
  };
  const base = (over = {}) => resolveSeedRange({
    manual: null,
    ledgerEntry: LEDGER_ENTRY,
    learnedRange: null,
    profileAdjusted: { mev: 9, mav: 15, mrv: 21 },
    research: { mev: 8, mav: 14, mrv: 22 },
    suppressed: false,
    intent: 'adjust',
    ...over,
  });

  test('a ledger seed carries deloadSets at the strain-scaled share of the ACHIEVED peak', () => {
    const out = base();
    expect(out.source).toBe('ledger');
    expect(out.deloadSets).toBe(10); // round(16 x 0.6), floored at research MEV 8
  });

  test('a strained ledger entry deloads at the 40% share', () => {
    const strained = {
      ...LEDGER_ENTRY,
      evidence: [{ signal: 'recovery_cost_weight', value: 4 }],
      observed: { ...LEDGER_ENTRY.observed, achievedPeak: 30 },
    };
    const out = base({ ledgerEntry: strained });
    expect(out.deloadSets).toBe(12); // round(30 x 0.4)
  });

  test('non-ledger sources emit NO deloadSets (no achieved evidence to scale from)', () => {
    expect(base({ ledgerEntry: null }).deloadSets).toBeUndefined();
    expect(base({ ledgerEntry: null, learnedRange: { floor: 9, ceiling: 16, isLearned: true } }).deloadSets).toBeUndefined();
  });

  test('a ledger entry without an achieved peak emits none either', () => {
    const noPeak = { ...LEDGER_ENTRY, observed: { ...LEDGER_ENTRY.observed, achievedPeak: null } };
    expect(base({ ledgerEntry: noPeak }).deloadSets).toBeUndefined();
  });
});

describe('wiring pins', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

  test('the seeded deload week consumes seed.deloadSets, research MEV otherwise', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/seed\.deloadSets \?\? mev|deloadSets: seed\?\.deloadSets \?\? mev/);
  });

  test('the coach deload apply passes achieved peaks and the persisted strain read', () => {
    const SRC = read('screens/CoachOutputScreen.js');
    expect(SRC).toMatch(/getAchievedWeeklyPeaks/);
    expect(SRC).toMatch(/deload_suggested' \? 4/);
  });

  test('RIR 4 stays the deload default (setMesocycleWeekDeload untouched)', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/rirTarget = 4/);
  });
});
