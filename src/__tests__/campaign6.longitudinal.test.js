/**
 * campaign6.longitudinal.test.js — Phases 5, 6 and 8 of the Campaign 6
 * order (long-term audit 2026-08-11).
 *
 * Phase 5: learnedRange replay over LONG histories — the floor cannot
 * rise through absence, the ceiling cannot blindly ratchet, manual and
 * insufficient blocks teach nothing, suppressed blocks cannot teach
 * upward but their downward evidence still counts.
 *
 * Phase 6: D91-25 long-layoff CHARACTERISATION. These tests pin what
 * the engine does TODAY after 30/60/90/180/365 days away. They do NOT
 * implement any freshness/decay rule — several of them exist precisely
 * to document current behaviour (including its one asymmetry) so the
 * deferral stays visible. If a future D91-25 implementation lands,
 * these pins are the ones it will consciously re-anchor.
 *
 * Phase 8: D91-24 CHARACTERISATION. Early applied recovery weeks still
 * participate in accumulation-week maths (the accepted deferral); the
 * conservative bias holds because the applied early deload is itself a
 * double-weighted strain signal that alone crosses the excessive-cost
 * threshold. Pinned so any drift toward an aggressive consequence
 * fails loudly.
 */
import { computeLearnedRange } from '../lib/learnedRange';
import { classifyMuscleBlock, buildBlockLedger, BLOCK_CLASS } from '../lib/interBlock';
import { resolveSeedRange } from '../lib/blockSeed';
import { deriveDeloadFlags } from '../lib/blockLedgerGather';
import { computeSetTargets } from '../lib/algorithms';
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const PRIOR = { mev: 8, mav: 16, mrv: 22 };
const RESEARCH_MEV = 8;

const entry = ({
  classification = BLOCK_CLASS.RESPONSIVE, confidence = 0.9,
  startSets = 10, achievedPeak = 16, plannedPeak = 16,
  suppressed = false, deferredToManual = false, muscle = 'chest',
} = {}) => ({
  muscle, classification, confidence,
  proposal: { startSets: null, peakSets: null, stimulusChange: null, deferredToManual },
  observed: { startSets, achievedPeak, plannedPeak, suppressed },
});

const fold = (history, over = {}) => computeLearnedRange({
  prior: PRIOR, researchMev: RESEARCH_MEV, ledgerHistory: history, muscle: 'chest', ...over,
});

// ── Phase 5: learnedRange over long histories ──────────────────────────

describe('PHASE 5: the learned floor is monotone downward and absence teaches nothing', () => {
  test('ten responsive blocks at the same start never raise the floor', () => {
    const history = Array.from({ length: 10 }, () => entry({ startSets: 10 }));
    const r = fold(history);
    expect(r.floor).toBeLessThanOrEqual(PRIOR.mev);
  });

  test('a lower progressing start pulls the floor down 1 per block; later higher starts never pull it back up', () => {
    // The research MEV is the ABSOLUTE floor anchor, so downward motion
    // only exists when the profile prior sits above it.
    const anchored = { researchMev: 6 };
    const down = [entry({ startSets: 6 }), entry({ startSets: 6 })];
    const r1 = fold(down, anchored);
    expect(r1.floor).toBeLessThan(PRIOR.mev);
    const thenHigher = [...down, ...Array.from({ length: 5 }, () => entry({ startSets: 14 }))];
    const r2 = fold(thenHigher, anchored);
    expect(r2.floor).toBeLessThanOrEqual(r1.floor);
  });

  test('the research MEV anchor stops the floor absolutely: progressing starts below it change nothing', () => {
    const down = [entry({ startSets: 4 }), entry({ startSets: 4 }), entry({ startSets: 4 })];
    const r = fold(down); // researchMev 8 == prior.mev
    expect(r.floor).toBe(RESEARCH_MEV);
  });

  test('an empty history and a history of skipped entries are identical: absence is not evidence', () => {
    const empty = fold([]);
    const skippedOnly = fold([
      entry({ classification: BLOCK_CLASS.INSUFFICIENT_DATA }),
      entry({ deferredToManual: true }),
      entry({ confidence: 0.3 }),
      entry({ muscle: 'quads' }), // other muscle: never blended
    ]);
    expect(skippedOnly).toEqual(empty);
    expect(empty.isLearned).toBe(false);
    expect(empty.evidenceBlocks).toBe(0);
  });
});

describe('PHASE 5: the learned ceiling never blindly ratchets', () => {
  test('twenty responsive blocks at the same peak converge on that peak and stop', () => {
    const history = Array.from({ length: 20 }, () => entry({ achievedPeak: 18 }));
    const r = fold(history);
    expect(r.ceiling).toBe(18);
  });

  test('the ceiling moves at most 2 per block toward the highest HANDLED peak, and a later lower block cannot erase proven capacity', () => {
    const high = Array.from({ length: 4 }, () => entry({ achievedPeak: 20 }));
    const afterHigh = fold(high);
    const thenLower = [...high, ...Array.from({ length: 6 }, () => entry({ achievedPeak: 12 }))];
    const r = fold(thenLower);
    // RESPONSIVE lower-volume blocks do not pull the ceiling down.
    expect(r.ceiling).toBe(afterHigh.ceiling);
  });

  test('strain and overreach walk the ceiling down; alternating outcomes stay bounded, never runaway', () => {
    const alternating = [];
    for (let i = 0; i < 8; i += 1) {
      alternating.push(entry({ achievedPeak: 20 }));
      alternating.push(entry({ classification: BLOCK_CLASS.STRAINED, startSets: 10, achievedPeak: 18 }));
    }
    const r = fold(alternating);
    expect(r.ceiling).toBeGreaterThanOrEqual(RESEARCH_MEV + 2);
    expect(r.ceiling).toBeLessThanOrEqual(PRIOR.mrv);
  });

  test('the ceiling is capped by the prior MRV and the 30-set backstop whatever the history claims', () => {
    const absurd = Array.from({ length: 15 }, () => entry({ achievedPeak: 60 }));
    const r = fold(absurd);
    expect(r.ceiling).toBeLessThanOrEqual(PRIOR.mrv);
  });
});

describe('PHASE 5: suppressed and manual blocks obey the memory laws', () => {
  test('a suppressed block can never move the ceiling up, however big its peak', () => {
    const base = [entry({ achievedPeak: 16 })];
    const withSuppressedPeak = [...base, entry({ achievedPeak: 26, suppressed: true })];
    expect(fold(withSuppressedPeak).ceiling).toBe(fold(base).ceiling);
  });

  test('a suppressed STRAINED block still counts downward (downward safety evidence survives suppression)', () => {
    const base = Array.from({ length: 3 }, () => entry({ achievedPeak: 20 }));
    const r0 = fold(base);
    const withSuppressedStrain = [...base,
      entry({ classification: BLOCK_CLASS.STRAINED, startSets: 9, suppressed: true })];
    const r = fold(withSuppressedStrain);
    expect(r.ceiling).toBeLessThan(r0.ceiling);
  });

  test('manual-override blocks are skipped entirely: they neither raise nor lower anything', () => {
    const base = [entry({ achievedPeak: 16 })];
    const withManual = [...base,
      entry({ achievedPeak: 30, deferredToManual: true }),
      entry({ classification: BLOCK_CLASS.STRAINED, startSets: 6, deferredToManual: true })];
    expect(fold(withManual)).toEqual({ ...fold(base), evidenceBlocks: fold(base).evidenceBlocks });
  });
});

// ── Phase 6: D91-25 long-layoff characterisation (AUDIT ONLY) ──────────

describe('PHASE 6 (D91-25 characterisation): a ledger COMPUTED after the layoff holds every climb', () => {
  const responsiveInput = (over = {}) => ({
    muscle: 'chest', landmarks: PRIOR, researchMev: RESEARCH_MEV,
    previousStart: 10, plannedPeak: 16, achievedPeak: 17,
    adherence: { plannedSets: 60, completedSets: 55 },
    performance: {
      e1rmSlopePct: 3, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
      confidence: 0.9, discontinuity: false,
      doseResponse: { lateProgression: true, lateRecoveryOk: true },
    },
    recovery: {
      sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
      sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
      dataPoints: 8,
    },
    ...over,
  });

  test.each([[4], [8], [13], [26], [52]])(
    'at %s weeks since block end, the earned climb is withheld and the hold is recorded',
    (weeks) => {
      const e = classifyMuscleBlock(responsiveInput(), { suppressed: false, weeksSinceBlockEnd: weeks });
      expect(e.proposal.startSets).toBe(10); // the +1 the pair earned is held
      expect(e.evidence).toContainEqual({ signal: 'evidence_weeks_old', value: weeks });
    },
  );

  test('under 4 weeks the same evidence still earns its +1 (the boundary is 4 weeks)', () => {
    const e = classifyMuscleBlock(responsiveInput(), { suppressed: false, weeksSinceBlockEnd: 3 });
    expect(e.proposal.startSets).toBe(11);
  });

  test('reductions pass through the stale-evidence hold untouched at any age', () => {
    const strained = responsiveInput({
      performance: {
        e1rmSlopePct: -2, prDensity: 0, rawPrCount: 0, eligibleExposures: 10,
        confidence: 0.9, discontinuity: false, doseResponse: null,
      },
      recovery: {
        sorenessLateAvg: 4, jointDiscomfortAvg: 3, readinessSlope: -0.35,
        sleepFlaggedWeeks: 0, deloadFlagFired: true, deloadFlagMidBlock: false,
        dataPoints: 8,
      },
    });
    const e = classifyMuscleBlock(strained, { suppressed: false, weeksSinceBlockEnd: 26 });
    expect(e.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(e.proposal.startSets).toBeLessThan(10);
  });
});

describe('PHASE 6 (D91-25 characterisation): the stored-ledger asymmetry, pinned as CURRENT behaviour', () => {
  // The runner is idempotent: a ledger stored at decision time (0 weeks
  // overdue) is served AS-IS months later (blockLedgerRunner.js, the
  // version guard), and resolveSeedRange takes NO time input. So a user
  // who SAW the decision screen before a 6-month layoff is offered the
  // fresh-time climb; a user who never opened it gets the >= 4-week
  // hold above, because the ledger computes on their return. This
  // asymmetry is the D91-25 surface: documented, NOT fixed here.
  test('a fresh-time entry applies its climb through resolveSeedRange regardless of elapsed time', () => {
    const freshEntry = classifyMuscleBlock({
      muscle: 'chest', landmarks: PRIOR, researchMev: RESEARCH_MEV,
      previousStart: 10, plannedPeak: 16, achievedPeak: 17,
      adherence: { plannedSets: 60, completedSets: 55 },
      performance: {
        e1rmSlopePct: 3, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
        confidence: 0.9, discontinuity: false,
        doseResponse: { lateProgression: true, lateRecoveryOk: true },
      },
      recovery: {
        sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
        sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
        dataPoints: 8,
      },
    }, { suppressed: false, weeksSinceBlockEnd: 0 });
    expect(freshEntry.proposal.startSets).toBe(11);
    const seed = resolveSeedRange({
      ledgerEntry: freshEntry, profileAdjusted: PRIOR,
      research: { mev: 8, mav: 16, mrv: 22 }, suppressed: false, intent: 'adjust',
    });
    // No age input exists; the climb applies verbatim.
    expect(seed.startSets).toBe(11);
    expect(seed.source).toBe('ledger');
  });

  test('the ledger runner preserves historical idempotency by version', () => {
    const src = read('lib/blockLedgerRunner.js');
    expect(src).toMatch(/if \(!force && meso\.blockLedger\)/);
    expect(src).toMatch(/stored\?\.version === LEDGER_VERSION/);
    expect(src).toMatch(/stored\?\.programmeSignature \|\| !isCurrent/);
  });

  test('the runner passes the REAL overdue age when it does compute on return', () => {
    const src = read('lib/blockLedgerRunner.js');
    expect(src).toMatch(/weeksSinceBlockEnd: status\.weeksOverdue/);
  });
});

describe('PHASE 6: the existing session-level re-entry mechanism (what protects loads today)', () => {
  test('a 7-day exercise gap applies the one-time 10% layoff reduction in the live session path', () => {
    const src = read('screens/ActiveWorkoutScreen.js');
    expect(src).toMatch(/layoffMultiplier = lastTs > 0 && \(Date\.now\(\) - lastTs\) > SEVEN_DAYS \? 0\.9 : 1\.0/);
  });

  test('under a layoff multiplier the engine reduces every load and never claims an increase', () => {
    const prev = [
      { weight: 100, actualReps: 10, setType: 'straight' },
      { weight: 100, actualReps: 10, setType: 'straight' },
    ];
    const out = computeSetTargets(prev, 6, 12, 'kg', { layoffMultiplier: 0.9 });
    for (const t of out.targets) expect(t.weight).toBeLessThan(100);
    expect(out.reason).toBeTruthy();
  });
});

// ── Phase 8: D91-24 characterisation (NOT stealth-fixed) ───────────────

describe('PHASE 8 (D91-24 characterisation): early deload weeks stay in accumulation maths, conservatively', () => {
  test('an applied early deload week is itself the strain signal, fired and mid-block', () => {
    const flags = deriveDeloadFlags({
      recoveryFlagWeekStarts: [],
      appliedEarlyDeloadWeekIndices: [3],
      blockStart: Date.UTC(2026, 0, 5),
      blockWeeks: 6,
      deloadWeekIndex: 6,
    });
    expect(flags).toEqual({ deloadFlagFired: true, deloadFlagMidBlock: true });
  });

  // RE-ANCHORED by RA6-2 (founder ruling, Campaign 10I), and the
  // interaction is recorded rather than smoothed over. This test used to
  // pin that the fired flag ALONE reached RECOVERY_EXCESSIVE_WEIGHT, which
  // is what compensated for D91-24's known dilution artefact (an early
  // deload week's light sessions drag the late soreness average below every
  // per-signal threshold). RA6-2 rules that a block-level flag may not
  // classify a muscle by itself, so that compensation is gone: this muscle
  // now reads as unproven rather than strained.
  //
  // FOLLOW-UP (Campaign 10J): the dilution that made this fixture's numbers
  // possible is fixed at source - an applied early-deload week's rows no
  // longer enter the aggregates at all. This test keeps its diluted values
  // because it feeds classifyMuscleBlock DIRECTLY, so it still pins the
  // classifier half of the law: whatever the aggregates say, a flag with no
  // corroborating per-muscle cost is not a per-muscle verdict. The gather
  // half is pinned in campaign10j.earlyDeloadEvidence.test.js.
  test('RA6-2: the fired flag alone no longer classifies the muscle, so the D91-24 dilution is no longer masked', () => {
    const e = classifyMuscleBlock({
      muscle: 'quads', landmarks: PRIOR, researchMev: RESEARCH_MEV,
      previousStart: 12, plannedPeak: 16, achievedPeak: 14,
      adherence: { plannedSets: 60, completedSets: 50 },
      performance: {
        e1rmSlopePct: 0.5, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
        confidence: 0.9, discontinuity: false, doseResponse: null,
      },
      recovery: {
        // Diluted by the light week: below every per-signal threshold.
        sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: -0.1,
        sleepFlaggedWeeks: 0,
        deloadFlagFired: true, deloadFlagMidBlock: true,
        dataPoints: 8,
      },
    }, { suppressed: false, weeksSinceBlockEnd: 0 });
    // No corroborating per-muscle recovery cost, and flat performance: the
    // honest verdict is "not proven", not "strained".
    expect(e.classification).not.toBe(BLOCK_CLASS.STRAINED);
    // And it must not become an upward carry either - the dose holds.
    expect(e.proposal.startSets).toBeLessThanOrEqual(12);
  });

  test('RA6-2: the SAME block with real per-muscle soreness is still STRAINED and still cut', () => {
    // The dilution artefact is a measurement problem, not a licence: when
    // the muscle's own late soreness does clear its threshold, the
    // corroborated verdict and its reduction are exactly as before.
    const e = classifyMuscleBlock({
      muscle: 'quads', landmarks: PRIOR, researchMev: RESEARCH_MEV,
      previousStart: 12, plannedPeak: 16, achievedPeak: 14,
      adherence: { plannedSets: 60, completedSets: 50 },
      performance: {
        e1rmSlopePct: 0.5, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
        confidence: 0.9, discontinuity: false, doseResponse: null,
      },
      recovery: {
        sorenessLateAvg: 4, jointDiscomfortAvg: 1, readinessSlope: -0.1,
        sleepFlaggedWeeks: 0,
        deloadFlagFired: true, deloadFlagMidBlock: true,
        dataPoints: 8,
      },
    }, { suppressed: false, weeksSinceBlockEnd: 0 });
    expect(e.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(e.proposal.startSets).toBeLessThan(12);
  });

  test('the week LIST still excludes only the PLANNED deload week (C10J: chronology is not re-indexed)', () => {
    // Was "D91-24 pinned as CURRENT behaviour, not fixed". D91-24 IS now
    // fixed (Campaign 10J), but this assertion survives unchanged and is
    // load-bearing for the opposite reason: the fix excludes an applied
    // early-deload week's ROWS, never the week itself. accumulationWeeks
    // must keep describing the PLANNED structure so the early/late split
    // cannot shift and quietly promote an earlier normal week into "late".
    const src = read('lib/blockLedgerGather.js');
    expect(src).toMatch(/function accumulationWeeks\(blockWeeks, deloadWeekIndex\) \{[\s\S]{0,200}if \(w !== deloadWeekIndex\) weeks\.push\(w\);/);
  });

  test('a strained-with-early-deload block also proposes the longer recovery only with systemic corroboration', () => {
    const strainedMuscle = {
      muscle: 'quads', landmarks: PRIOR, researchMev: RESEARCH_MEV,
      previousStart: 12, plannedPeak: 16, achievedPeak: 14,
      adherence: { plannedSets: 60, completedSets: 50 },
      performance: {
        e1rmSlopePct: 0.5, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
        confidence: 0.9, discontinuity: false, doseResponse: null,
      },
      recovery: {
        sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: -0.1,
        sleepFlaggedWeeks: 0, deloadFlagFired: true, deloadFlagMidBlock: true,
        dataPoints: 8,
      },
    };
    // RA6-2 re-anchor: the systemic read must be MIRRORED into the muscle,
    // which is what blockLedgerRunner actually does (it computes one
    // systemic triple and passes it to every muscle). The old fixture left
    // the muscle on its own weaker numbers and still got STRAINED, because
    // the flag alone carried it - exactly the defect. With mirroring, the
    // corroborated case reaches STRAINED on real corroboration and the
    // uncorroborated case does not, which is the behaviour this test is
    // actually about.
    const withSystemic = (sys) => ({ ...strainedMuscle, recovery: { ...strainedMuscle.recovery, ...sys } });
    const aloneSys = { readinessSlope: -0.1, sleepFlaggedWeeks: 0, deloadFlagFired: true };
    const alone = buildBlockLedger({
      muscles: [withSystemic(aloneSys)],
      systemic: aloneSys,
      suppressed: false, weeksSinceBlockEnd: 0,
    });
    // One persistent signal only: normal 7 days.
    expect(alone.proposedRecoveryDays).toBe(7);
    const corroboratedSys = { readinessSlope: -0.4, sleepFlaggedWeeks: 2, deloadFlagFired: true };
    const corroborated = buildBlockLedger({
      muscles: [withSystemic(corroboratedSys)],
      systemic: corroboratedSys,
      suppressed: false, weeksSinceBlockEnd: 0,
    });
    expect(corroborated.entries[0].classification).toBe(BLOCK_CLASS.STRAINED);
    expect(corroborated.proposedRecoveryDays).toBe(10);
  });
});
