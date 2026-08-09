/**
 * learnedRange.stage5.test.js — TEST-FIRST, Stage 5 of the adaptive
 * mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.2 + the founder's
 * Stage 5 spec: "learned working range — reuse the existing
 * adaptive-band system, no parallel store; profile-adjusted research
 * landmarks as prior; slow conservative updates, min evidence; one
 * block nudges, never overwrites").
 *
 * Pins the pure src/lib/learnedRange.js BEFORE it exists.
 * computeLearnedRange REPLAYS the per-muscle Block Ledger history (the
 * one store Stage 6 persists — no parallel store) over the
 * profile-adjusted prior:
 * - ceiling starts at the prior's MAV and moves TOWARD the highest
 *   weekly volume the muscle handled with recovery ok and performance
 *   up (RESPONSIVE: toward achievedPeak, capped +/-2 per block;
 *   OVERREACHED: toward achievedPeak - 2, downward only; STRAINED:
 *   toward the block's start, downward only; STALE: no move — volume
 *   was not the lever).
 * - floor starts at the prior's MEV and nudges +/-1 per block toward
 *   the lowest start that still produced progress (RESPONSIVE blocks
 *   only).
 * - clamps: research MEV is the absolute floor anchor; the ceiling
 *   never exceeds the adapted MRV (when the session-grain system has
 *   one), the prior MRV otherwise, nor 30; floor <= ceiling - 2.
 * - min evidence: only ledger entries with confidence >= 0.6, a real
 *   classification and observed numbers count; anything else is
 *   skipped and does not mark the range as learned.
 *
 * Also pins the interBlock entry echo (entry.observed) the replay
 * feeds on — without it a persisted ledger could not be folded.
 */
import fs from 'fs';
import path from 'path';
import { computeLearnedRange } from '../learnedRange';
import { classifyMuscleBlock, BLOCK_CLASS } from '../interBlock';

const PRIOR = { mev: 10, mav: 14, mrv: 22 };

const entry = (classification, over = {}) => ({
  classification,
  confidence: 0.9,
  observed: { startSets: 10, achievedPeak: 16, plannedPeak: 16, ...over.observed },
  ...over.top,
});

const range = (history, over = {}) => computeLearnedRange({
  prior: PRIOR,
  researchMev: 8,
  adaptedMrv: null,
  ledgerHistory: history,
  ...over,
});

describe('prior and no-evidence behaviour', () => {
  test('no history returns the profile-adjusted prior, unlearned', () => {
    expect(range([])).toEqual({ floor: 10, ceiling: 14, isLearned: false, evidenceBlocks: 0 });
  });

  test('low-confidence and INSUFFICIENT_DATA entries are skipped entirely', () => {
    const out = range([
      entry(BLOCK_CLASS.RESPONSIVE, { top: { confidence: 0.5 } }),
      entry(BLOCK_CLASS.INSUFFICIENT_DATA),
      entry(BLOCK_CLASS.RESPONSIVE, { top: { observed: null } }),
    ]);
    expect(out).toEqual({ floor: 10, ceiling: 14, isLearned: false, evidenceBlocks: 0 });
  });

  test('junk history rows are tolerated', () => {
    const out = range([null, 42, {}, entry(BLOCK_CLASS.STALE)]);
    expect(out.evidenceBlocks).toBe(1);
  });
});

describe('the ceiling learns what was handled, two sets a block at most', () => {
  test('one RESPONSIVE block nudges the ceiling toward its achieved peak, never straight onto it', () => {
    const out = range([entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 17 } })]);
    expect(out.ceiling).toBe(16); // 14 + 2, not 17
    expect(out.isLearned).toBe(true);
    expect(out.evidenceBlocks).toBe(1);
  });

  test('a second corroborating block completes the move', () => {
    const out = range([
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 17 } }),
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 17 } }),
    ]);
    expect(out.ceiling).toBe(17);
    expect(out.evidenceBlocks).toBe(2);
  });

  test('OVERREACHED never raises the ceiling, only pulls it toward achieved - 2', () => {
    const up = range([entry(BLOCK_CLASS.OVERREACHED, { observed: { achievedPeak: 18 } })]);
    expect(up.ceiling).toBe(14); // target 16 is above 14: no upward move for a costly block
    const down = range(
      [entry(BLOCK_CLASS.OVERREACHED, { observed: { achievedPeak: 14 } })],
      { prior: { mev: 10, mav: 18, mrv: 22 } },
    );
    expect(down.ceiling).toBe(16); // toward 12, capped at -2
  });

  test('STRAINED pulls the ceiling toward the start the block began at', () => {
    const out = range([entry(BLOCK_CLASS.STRAINED, { observed: { startSets: 10 } })]);
    expect(out.ceiling).toBe(12); // toward 10 from 14, capped at -2
  });

  test('STALE moves nothing: volume was not the lever', () => {
    const out = range([entry(BLOCK_CLASS.STALE, { observed: { achievedPeak: 20 } })]);
    expect(out.ceiling).toBe(14);
    expect(out.floor).toBe(10);
    expect(out.evidenceBlocks).toBe(1); // it still counts as evidence seen
  });
});

describe('the floor learns the lowest progressing start, one set a block', () => {
  test('a RESPONSIVE block at a lower start nudges the floor down by one', () => {
    const out = range([entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 8 } })]);
    expect(out.floor).toBe(9);
  });

  test('two blocks reach it', () => {
    const out = range([
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 8 } }),
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 8 } }),
    ]);
    expect(out.floor).toBe(8);
  });

  test('progressing only from HIGHER starts nudges the floor up toward the lowest proven one', () => {
    const out = range([entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 12 } })]);
    expect(out.floor).toBe(11);
  });

  test('non-RESPONSIVE blocks never move the floor', () => {
    const out = range([
      entry(BLOCK_CLASS.OVERREACHED, { observed: { startSets: 6 } }),
      entry(BLOCK_CLASS.STRAINED, { observed: { startSets: 6 } }),
    ]);
    expect(out.floor).toBe(10);
  });
});

describe('clamps: research MEV anchors, adapted MRV caps, 30 backstops', () => {
  test('the floor never goes below research MEV however much evidence points lower', () => {
    const out = range([
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 5 } }),
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 5 } }),
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 5 } }),
    ]);
    expect(out.floor).toBe(8); // researchMev
  });

  test('the ceiling never exceeds the adapted MRV when one exists', () => {
    const out = range(
      [
        entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 20 } }),
        entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 20 } }),
      ],
      { adaptedMrv: 15 },
    );
    expect(out.ceiling).toBe(15);
  });

  test('without an adapted MRV the prior MRV caps it, and 30 always does', () => {
    const capped = range(
      Array.from({ length: 6 }, () => entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 40 } })),
      { prior: { mev: 10, mav: 26, mrv: 40 } },
    );
    expect(capped.ceiling).toBeLessThanOrEqual(30);
  });

  test('floor always sits at least two below the ceiling', () => {
    const out = range([
      entry(BLOCK_CLASS.STRAINED, { observed: { startSets: 10 } }),
      entry(BLOCK_CLASS.STRAINED, { observed: { startSets: 10 } }),
      entry(BLOCK_CLASS.RESPONSIVE, { observed: { startSets: 12 } }),
    ]);
    expect(out.floor).toBeLessThanOrEqual(out.ceiling - 2);
  });
});

describe('the interBlock entry carries the observed numbers the replay feeds on', () => {
  test('classifyMuscleBlock echoes observed start, achieved peak and planned peak', () => {
    const e = classifyMuscleBlock({
      muscle: 'chest',
      landmarks: { mev: 8, mav: 14, mrv: 22 },
      previousStart: 10, plannedPeak: 16, achievedPeak: 17,
      adherence: { completedSets: 180, plannedSets: 200 },
      performance: { e1rmSlopePct: 4, prDensity: 0.5, rawPrCount: 6, eligibleExposures: 12, confidence: 0.9, discontinuity: false, doseResponse: null },
      recovery: { sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0.1, sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false, dataPoints: 10 },
    }, { suppressed: false, weeksSinceBlockEnd: 0 });
    expect(e.observed).toEqual({ startSets: 10, achievedPeak: 17, plannedPeak: 16 });
  });
});

describe('purity', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'learnedRange.js'), 'utf8');

  test('deterministic and non-mutating', () => {
    const history = [entry(BLOCK_CLASS.RESPONSIVE, { observed: { achievedPeak: 17 } })];
    const snapshot = JSON.parse(JSON.stringify(history));
    const a = range(history);
    const b = range(history);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(history))).toEqual(snapshot);
  });

  test('no clocks, no randomness, no I/O, no store, tier-blind', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
    expect(SRC).not.toMatch(/tier/i);
  });
});
