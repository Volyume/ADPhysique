/**
 * deload.stage7.test.js — TEST-FIRST, Stage 7 of the adaptive mesocycle
 * build (founder order: "strain-aware deload — % of achieved peak; 7
 * days normal; longer only on multiple persistent signals,
 * user-confirmed"; authority blueprint §3.4, AMENDED by the founder's
 * Stage 7 refinement of 2026-08-09: "Research MEV remains a safety
 * reference but should not force a deload UPWARD when a
 * percentage-based recovery dose is appropriately lower … MEV is a
 * productive-training landmark, not automatically a recovery-week
 * minimum". The recovery-week floor is deloadFloor: half of MEV, never
 * below one set).
 *
 * Pins (post Stage 7-8 adversarial review):
 * - computeDeloadVolume(plannedRows, context): with { peaks,
 *   strainScore, strains } the deload lands at max(deloadFloor(mev),
 *   share of the muscle's peak CAPPED at the row's own planned sets)
 *   where the share runs 60% (strain 0) down to 40% (strain >= 4) in
 *   5-point steps. The cap (review #4) exists because achieved peaks
 *   carry secondary half-credit while planned rows count direct sets
 *   only — uncapped, a heavily-pressed muscle kept its full row and the
 *   recovery week was a no-op. Without context the legacy flat-MEV cut
 *   is byte-identical. A deload never raises a row; rows that would not
 *   move are omitted.
 * - FOUNDER PIN (verbatim): "Greater strain can only make a recovery
 *   prescription easier or longer; it can never make it harder or
 *   shorter." Monotonicity is pinned directly.
 * - An UNREADABLE strain fails CLOSED to heavy (review #13): the
 *   protective, smallest dose — never the lightest cut.
 * - resolveSeedRange emits deloadSets for LEDGER-sourced seeds only,
 *   and then only for the 'adjust' intent with suppression off:
 *   a true repeat repeats its own recovery week (review NIT #17) and a
 *   calm-mode / open-ED-flag user keeps the flat MEV recovery week
 *   (review BLOCKER #2 — no upward carry-over anywhere, D91 ruling 11).
 * - deloadSets is clamped to min(startSets, ABSOLUTE_WEEKLY_SET_CEILING)
 *   (review BLOCKER #1): a recovery week never exceeds the block's own
 *   lightest training week nor the absolute backstop.
 * - The 10-day recovery window stays a PROPOSAL
 *   (ledger.proposedRecoveryDays, Stage 2) — nothing here automates it.
 * - RIR 4 is untouched (setMesocycleWeekDeload's default).
 */
import fs from 'fs';
import path from 'path';
import { computeDeloadVolume, deloadShare, deloadSharePct, deloadFloor } from '../coachApply';
import { resolveSeedRange } from '../blockSeed';

const rows = (over = {}) => ([{
  muscle: 'chest', planned_sets: 18, mev: 8, mav: 14, mrv: 22, ...over,
}]);

describe('deloadFloor (founder Stage 7 refinement: MEV is not a recovery-week minimum)', () => {
  test('half of MEV, rounded', () => {
    expect(deloadFloor(8)).toBe(4);
    expect(deloadFloor(9)).toBe(5); // round(4.5) half-up
  });
  test('never below one set, even without a usable MEV', () => {
    expect(deloadFloor(1)).toBe(1);
    expect(deloadFloor(0)).toBe(1);
    expect(deloadFloor(null)).toBe(1);
    expect(deloadFloor(undefined)).toBe(1);
  });
});

describe('strain share (integer maths, fail-closed)', () => {
  test('60% at strain 0 stepping to 40% at strain >= 4', () => {
    expect(deloadSharePct(0)).toBe(60);
    expect(deloadSharePct(1)).toBe(55);
    expect(deloadSharePct(2)).toBe(50);
    expect(deloadSharePct(3)).toBe(45);
    expect(deloadSharePct(4)).toBe(40);
    expect(deloadSharePct(9)).toBe(40);
    expect(deloadShare(2)).toBe(0.5);
  });
  test('FAIL CLOSED (review #13): an unreadable strain takes the protective 40% share', () => {
    expect(deloadSharePct(undefined)).toBe(40);
    expect(deloadSharePct(null)).toBe(40);
    expect(deloadSharePct(NaN)).toBe(40);
    expect(deloadSharePct('not a number')).toBe(40);
  });
  test('a numeric string coerces instead of silently failing open', () => {
    expect(deloadSharePct('4')).toBe(40);
    expect(deloadSharePct('0')).toBe(60);
  });
  test('FOUNDER PIN: greater strain can only make the recovery dose easier, never harder', () => {
    for (let s = 0; s < 8; s++) {
      expect(deloadSharePct(s + 1)).toBeLessThanOrEqual(deloadSharePct(s));
    }
  });
  test('no float half-loss (review NIT #14): peak 10 at strain 3 rounds 4.5 up to 5', () => {
    const changes = computeDeloadVolume(
      rows({ planned_sets: 12, mev: 2 }),
      { peaks: { chest: 10 }, strainScore: 3 },
    );
    expect(changes[0].plannedSets).toBe(5); // round(10 x 45 / 100), NOT 4
  });
});

describe('strain-aware deload volume (§3.4)', () => {
  test('no context: the legacy flat-MEV cut is byte-identical', () => {
    expect(computeDeloadVolume(rows())).toEqual([
      { muscle: 'chest', plannedSets: 8, mev: 8, mav: 14, mrv: 22 },
    ]);
  });

  test('fresh block (strain 0): 60% of the achieved peak', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 16 }, strainScore: 0 });
    expect(changes).toEqual([
      { muscle: 'chest', plannedSets: 10, mev: 8, mav: 14, mrv: 22 }, // round(16 x 60 / 100)
    ]);
  });

  test('heavy strain (>= 4): 40%, floored at deloadFloor — MEV no longer forces the dose up', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 16 }, strainScore: 4 });
    // round(16 x 40 / 100) = 6; deloadFloor(8) = 4 does not intervene.
    // Pre-ruling this was forced up to MEV 8.
    expect(changes[0].plannedSets).toBe(6);
  });

  test('moderate strain scales in five-point steps, peak capped at the row (review #4)', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 20 }, strainScore: 2 });
    // min(20, 18) x 50 / 100 = 9: the share applies to the row it cuts,
    // not to a secondary-credit-inflated peak above it.
    expect(changes[0].plannedSets).toBe(9);
  });

  test('strain beyond 4 never cuts below 40%', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { chest: 30 }, strainScore: 9 });
    expect(changes[0].plannedSets).toBe(7); // round(min(30, 18) x 40 / 100)
  });

  test('REVIEW #4 PIN: an inflated peak can never turn the recovery week into a no-op', () => {
    // Front-delt case from the review: row 12, achieved peak 20 (12
    // direct + pressing half-credit). Uncapped this was target 12 = no
    // change; capped it is a genuine cut.
    const changes = computeDeloadVolume(
      rows({ planned_sets: 12 }),
      { peaks: { chest: 20 }, strainScore: 0 },
    );
    expect(changes).toEqual([
      { muscle: 'chest', plannedSets: 7, mev: 8, mav: 14, mrv: 22 }, // round(12 x 60 / 100)
    ]);
    // Grossly inflated (the review's executed case: planned 20, peak 120).
    const gross = computeDeloadVolume(
      rows({ planned_sets: 20 }),
      { peaks: { chest: 120 }, strainScore: 0 },
    );
    expect(gross[0].plannedSets).toBe(12); // round(20 x 60 / 100) — a real cut
  });

  test('per-muscle strains override the block-level score (founder: deload strain is muscle-specific)', () => {
    const two = [
      { muscle: 'chest', planned_sets: 18, mev: 8, mav: 14, mrv: 22 },
      { muscle: 'back', planned_sets: 18, mev: 8, mav: 14, mrv: 22 },
    ];
    const changes = computeDeloadVolume(two, {
      peaks: { chest: 16, back: 16 },
      strains: { chest: 4, back: 0 },
      strainScore: 2,
    });
    expect(changes.find(c => c.muscle === 'chest').plannedSets).toBe(6); // 40%
    expect(changes.find(c => c.muscle === 'back').plannedSets).toBe(10); // 60%
  });

  test('a muscle without a recorded peak falls back to the MEV cut', () => {
    const changes = computeDeloadVolume(rows(), { peaks: { quads: 12 }, strainScore: 0 });
    expect(changes[0].plannedSets).toBe(8);
  });

  test('a deload never raises a row: a floor above the current plan leaves it untouched', () => {
    // planned 4 with deloadFloor(8) = 4: target 4 is not below 4, no move.
    const changes = computeDeloadVolume(rows({ planned_sets: 4 }), { peaks: { chest: 16 }, strainScore: 0 });
    expect(changes).toEqual([]);
    // legacy path: planned 3 under MEV 8 must not be raised either.
    expect(computeDeloadVolume(rows({ planned_sets: 3 }))).toEqual([]);
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

  test('a ledger seed carries deloadSets at the strain-scaled share of the achieved peak', () => {
    const out = base();
    expect(out.source).toBe('ledger');
    expect(out.deloadSets).toBe(10); // round(16 x 60 / 100), floor 4, clamp 11 untouched
  });

  test('a strained ledger entry deloads at the 40% share of a peak capped at its own seeded peak', () => {
    const strained = {
      ...LEDGER_ENTRY,
      evidence: [{ signal: 'recovery_cost_weight', value: 4 }],
      observed: { ...LEDGER_ENTRY.observed, achievedPeak: 30 },
    };
    const out = base({ ledgerEntry: strained });
    // min(30, peak 17) x 40 / 100 = 6.8 -> 7 (review #4's cap applies
    // here too: the achieved peak carries secondary credit).
    expect(out.deloadSets).toBe(7);
  });

  test('REVIEW BLOCKER #1: deloadSets never exceeds the block start nor the absolute ceiling', () => {
    const huge = {
      ...LEDGER_ENTRY,
      observed: { ...LEDGER_ENTRY.observed, achievedPeak: 60 },
      proposal: { startSets: 10, peakSets: 28, stimulusChange: null, deferredToManual: false },
    };
    const out = base({ ledgerEntry: huge });
    // dose round(min(60, 28) x 60 / 100) = 17 would sit ABOVE the
    // 10-set start week; the clamp holds recovery <= start.
    expect(out.startSets).toBe(10);
    expect(out.deloadSets).toBe(10);
    expect(out.deloadSets).toBeLessThanOrEqual(out.startSets);
    expect(out.deloadSets).toBeLessThanOrEqual(30);
  });

  test('REVIEW BLOCKER #2 (ED-SAFETY): suppression emits NO deloadSets — the flat MEV recovery week stands', () => {
    const out = base({ suppressed: true });
    expect(out.source).toBe('ledger'); // degraded to repeat numbers, still used
    expect(out.deloadSets).toBeUndefined();
  });

  test('REVIEW NIT #17: a true repeat emits NO deloadSets — it repeats its own recovery week', () => {
    const out = base({ intent: 'repeat' });
    expect(out.startSets).toBe(10);
    expect(out.deloadSets).toBeUndefined();
  });

  test('REVIEW #13: unreadable strain evidence fails CLOSED to the protective 40% share', () => {
    const unreadable = {
      ...LEDGER_ENTRY,
      evidence: [{ signal: 'recovery_cost_weight', value: 'corrupt' }],
    };
    const out = base({ ledgerEntry: unreadable });
    expect(out.deloadSets).toBe(6); // round(16 x 40 / 100), not the 60% 10
  });

  test('missing strain evidence also fails closed, never to the lightest cut', () => {
    const missing = { ...LEDGER_ENTRY, evidence: [{ signal: 'e1rm_slope_pct', value: 4 }] };
    const out = base({ ledgerEntry: missing });
    expect(out.deloadSets).toBe(6);
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
