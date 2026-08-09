/**
 * interBlock.stage2.test.js — TEST-FIRST, Stage 2 of the adaptive
 * mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1-§3.4, §3.7, §3.8,
 * amended by the founder's Stage 2 refinement, verbatim: "do not
 * automatically define RESPONSIVE as previousStart + 1. A successful dose
 * should normally be retained. Increase next-block starting volume only
 * when evidence indicates that higher volume later in the block produced
 * additional useful progression without excessive recovery cost.").
 *
 * Pins the pure Block Ledger module BEFORE it exists: per-muscle
 * classification into RESPONSIVE / OVERREACHED / STALE / STRAINED /
 * INSUFFICIENT_DATA with evidence, confidence, proposed start/peak,
 * rationale, optional stimulus-change and recovery-duration proposals.
 * Deterministic, no I/O, tier-blind, ED-suppression aware (§3.8: under
 * calm mode or an open ED flag no upward carry-over anywhere; reductions
 * still allowed — matching D15).
 */
import fs from 'fs';
import path from 'path';
import {
  classifyMuscleBlock, buildBlockLedger, BLOCK_CLASS, LEDGER_VERSION,
} from '../interBlock';

// ── Input builders ──────────────────────────────────────────────────────────
// The input contract Stage 3 will eventually compute from stored data; here
// it is constructed directly so the classifier is pinned in isolation.

const perf = (over = {}) => ({
  e1rmSlopePct: 4,          // stable-exercise slope across the block, %
  prDensity: 0.5,           // rebound-discounted PRs per eligible exposure
  rawPrCount: 6,            // raw count — must NEVER drive classification
  eligibleExposures: 12,    // sessions featuring the muscle that count
  confidence: 0.9,          // Stage 3 discounts new lifts / rep-range changes
  discontinuity: false,     // exercise swap broke the e1RM series
  doseResponse: { lateProgression: true, lateRecoveryOk: true },
  ...over,
});

const recov = (over = {}) => ({
  sorenessLateAvg: 2,       // weeks 3+ mean, 1-5
  jointDiscomfortAvg: 1,    // 1-5
  readinessSlope: 0.1,      // systemic; negative = worsening
  sleepFlaggedWeeks: 0,
  deloadFlagFired: false,   // advisor early-deload fired during the block
  deloadFlagMidBlock: false, // ...and it fired before the peak week
  dataPoints: 10,           // feedback rows informing this muscle
  ...over,
});

const muscle = (over = {}) => ({
  muscle: 'chest',
  landmarks: { mev: 8, mav: 14, mrv: 22 },
  learnedCeiling: null,     // adapted ceiling when Stage 5 has one
  manualOverride: false,    // user-set manual landmarks exist
  previousStart: 10,        // the finished block's planned start sets
  plannedPeak: 16,
  achievedPeak: 16,         // highest weekly sets actually completed
  priorFlatBlocks: 0,       // consecutive immediately-prior flat blocks
  adherence: { completedSets: 180, plannedSets: 200 },
  ...over,
  performance: perf(over.performance),
  recovery: recov(over.recovery),
});

const CTX = { suppressed: false, weeksSinceBlockEnd: 0 };

// ── §3.7 worked examples — four muscles, four verdicts ─────────────────────

describe('§3.7 worked examples', () => {
  test('Chest: perf up, recovery ok, late-block dose-response -> RESPONSIVE, 10 -> 11, peak at learned ceiling', () => {
    const e = classifyMuscleBlock(muscle({ learnedCeiling: 17 }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(11);
    expect(e.proposal.peakSets).toBe(17);
    expect(e.proposal.stimulusChange).toBeNull();
  });

  test('Shoulders: perf up BUT late soreness >= 4 and the deload flag fired (peak week) -> OVERREACHED, start holds, peak = achieved - 2', () => {
    const e = classifyMuscleBlock(muscle({
      muscle: 'shoulders',
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      landmarks: { mev: 8, mav: 20, mrv: 26 },
      performance: { e1rmSlopePct: 2 },
      recovery: { sorenessLateAvg: 4.2, deloadFlagFired: true, deloadFlagMidBlock: false },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.OVERREACHED);
    expect(e.proposal.startSets).toBe(12);
    expect(e.proposal.peakSets).toBe(16);
  });

  test('Back: flat this block AND the previous one, recovery good -> STALE, volume holds, stimulus change proposed', () => {
    const e = classifyMuscleBlock(muscle({
      muscle: 'back',
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      landmarks: { mev: 10, mav: 20, mrv: 25 },
      priorFlatBlocks: 1,
      performance: { e1rmSlopePct: 0.4, prDensity: 0.05, doseResponse: null },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.STALE);
    expect(e.proposal.startSets).toBe(12);
    expect(e.proposal.peakSets).toBe(18);
    expect(e.proposal.stimulusChange).toEqual({ primary: 'variant_swap', alternative: 'rep_range' });
  });

  test('Quads: perf down, readiness slope negative, sleep flagged two weeks -> STRAINED, max(MEV, start - 2), peak capped at MAV', () => {
    const e = classifyMuscleBlock(muscle({
      muscle: 'quads',
      previousStart: 10, plannedPeak: 16, achievedPeak: 16,
      landmarks: { mev: 8, mav: 14, mrv: 20 },
      performance: { e1rmSlopePct: -3, prDensity: 0, doseResponse: null },
      recovery: { readinessSlope: -0.5, sleepFlaggedWeeks: 2 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(e.proposal.startSets).toBe(8);   // max(MEV 8, 10 - 2)
    expect(e.proposal.peakSets).toBe(14);   // capped at MAV
  });

  test('all four verdicts arrive independently from ONE buildBlockLedger call', () => {
    const ledger = buildBlockLedger({
      muscles: [
        muscle({ learnedCeiling: 17 }),
        muscle({ muscle: 'shoulders', previousStart: 12, plannedPeak: 18, achievedPeak: 18, landmarks: { mev: 8, mav: 20, mrv: 26 }, performance: { e1rmSlopePct: 2 }, recovery: { sorenessLateAvg: 4.2, deloadFlagFired: true } }),
        muscle({ muscle: 'back', previousStart: 12, plannedPeak: 18, achievedPeak: 18, landmarks: { mev: 10, mav: 20, mrv: 25 }, priorFlatBlocks: 1, performance: { e1rmSlopePct: 0.4, prDensity: 0.05, doseResponse: null } }),
        muscle({ muscle: 'quads', landmarks: { mev: 8, mav: 14, mrv: 20 }, performance: { e1rmSlopePct: -3, prDensity: 0, doseResponse: null }, recovery: { readinessSlope: -0.5, sleepFlaggedWeeks: 2 } }),
      ],
      systemic: { readinessSlope: -0.5, sleepFlaggedWeeks: 2, deloadFlagFired: false },
      suppressed: false,
      weeksSinceBlockEnd: 0,
    });
    const byMuscle = Object.fromEntries(ledger.entries.map((e) => [e.muscle, e.classification]));
    expect(byMuscle).toEqual({
      chest: BLOCK_CLASS.RESPONSIVE,
      shoulders: BLOCK_CLASS.OVERREACHED,
      back: BLOCK_CLASS.STALE,
      quads: BLOCK_CLASS.STRAINED,
    });
    expect(ledger.version).toBe(LEDGER_VERSION);
    // §3.4 + founder Stage 7 seam: a strained muscle plus two persistent
    // systemic signals earns the longer recovery PROPOSAL (never auto).
    expect(ledger.proposedRecoveryDays).toBe(10);
  });
});

// ── The founder's RESPONSIVE retention rule ────────────────────────────────

describe('RESPONSIVE retains the successful dose by default', () => {
  test('perf strongly up but NO late-block dose-response evidence -> same start, not +1', () => {
    const e = classifyMuscleBlock(muscle({ performance: { e1rmSlopePct: 6, doseResponse: null } }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10);
  });

  test('late progression WITHOUT late recovery headroom -> retained, not +1', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { doseResponse: { lateProgression: true, lateRecoveryOk: false } },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10);
  });

  test('the increase is +1, never more, even on the strongest evidence', () => {
    const e = classifyMuscleBlock(muscle({
      learnedCeiling: 20,
      performance: { e1rmSlopePct: 12, prDensity: 1.5 },
    }), CTX);
    expect(e.proposal.startSets).toBe(11);
  });
});

// ── The founder's twelve scenarios ─────────────────────────────────────────

describe('founder scenario matrix', () => {
  test('1. first-ever block: no previous ledger, still classifies without crashing', () => {
    const e = classifyMuscleBlock(muscle({ priorFlatBlocks: 0, performance: { confidence: 0.7 } }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.confidence).toBeLessThanOrEqual(0.7);
    expect(typeof e.rationale).toBe('string');
  });

  test('2. no recovery data at all: never upgrades blind -> INSUFFICIENT_DATA, dose retained (it was delivered), honest rationale', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: 5 },
      recovery: { dataPoints: 0 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.proposal.startSets).toBe(10);   // delivered dose retained, no increase
    expect(e.proposal.peakSets).toBe(16);
    expect(e.rationale.toLowerCase()).toContain('recovery');
  });

  test('3. new exercise halfway through the block: low perf confidence blocks any upgrade', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: 5, confidence: 0.4 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.proposal.startSets).toBe(10);   // recovery was fine, dose retained
  });

  test('4. high raw PR count straight after a deload never buys an upgrade: discounted density rules', () => {
    const rebound = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: 0.5, prDensity: 0.05, rawPrCount: 9, doseResponse: null },
    }), CTX);
    expect(rebound.classification).toBe(BLOCK_CLASS.STALE);
    expect(rebound.proposal.startSets).toBe(10);
  });

  test('4b. rawPrCount cannot influence the outcome at all', () => {
    const a = classifyMuscleBlock(muscle({ performance: { rawPrCount: 0 } }), CTX);
    const b = classifyMuscleBlock(muscle({ performance: { rawPrCount: 40 } }), CTX);
    expect(b.classification).toBe(a.classification);
    expect(b.proposal).toEqual(a.proposal);
  });

  test('5. strong progress at an unchanged low volume: RESPONSIVE, dose retained (no evidence higher volume helps)', () => {
    const e = classifyMuscleBlock(muscle({
      previousStart: 8, plannedPeak: 8, achievedPeak: 8,
      performance: { e1rmSlopePct: 6, doseResponse: { lateProgression: false, lateRecoveryOk: true } },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(8);
  });

  test('6. strong progress but deteriorating recovery -> OVERREACHED, no increase', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: 5 },
      recovery: { sorenessLateAvg: 4.5, readinessSlope: -0.4 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.OVERREACHED);
    expect(e.proposal.startSets).toBe(10);
  });

  test('7. one muscle strained while another is responsive: entries never bleed into each other', () => {
    const ledger = buildBlockLedger({
      muscles: [
        muscle({ learnedCeiling: 17 }),
        muscle({ muscle: 'quads', performance: { e1rmSlopePct: -3, doseResponse: null }, recovery: { readinessSlope: -0.5, sleepFlaggedWeeks: 2 } }),
      ],
      systemic: { readinessSlope: 0, sleepFlaggedWeeks: 0, deloadFlagFired: false },
      suppressed: false, weeksSinceBlockEnd: 0,
    });
    const chest = ledger.entries.find((e) => e.muscle === 'chest');
    const quads = ledger.entries.find((e) => e.muscle === 'quads');
    expect(chest.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(chest.proposal.startSets).toBe(11);
    expect(quads.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(quads.proposal.startSets).toBe(8);
  });

  test('8. manual override: classification still computed, volume proposal defers to the user', () => {
    const e = classifyMuscleBlock(muscle({ manualOverride: true }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.deferredToManual).toBe(true);
    expect(e.proposal.startSets).toBeNull();
    expect(e.proposal.peakSets).toBeNull();
  });

  test('9. calm mode / open ED flag: RESPONSIVE degrades to repeat, reductions still allowed, tier never consulted', () => {
    const sup = { suppressed: true, weeksSinceBlockEnd: 0 };
    const up = classifyMuscleBlock(muscle({ learnedCeiling: 17 }), sup);
    expect(up.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(up.proposal.startSets).toBe(10);            // no upward carry
    expect(up.proposal.peakSets).toBeLessThanOrEqual(16); // never above the finished block's plan
    const down = classifyMuscleBlock(muscle({
      muscle: 'quads', performance: { e1rmSlopePct: -3, doseResponse: null },
      recovery: { readinessSlope: -0.5, sleepFlaggedWeeks: 2 },
    }), sup);
    expect(down.proposal.startSets).toBe(8);           // reduction untouched
  });

  test('10. overdue completed block: evidence gone stale (>= 4 weeks) suppresses the increase, classification stands', () => {
    const e = classifyMuscleBlock(muscle({ learnedCeiling: 17 }), { suppressed: false, weeksSinceBlockEnd: 5 });
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10);
  });

  test('11. two consecutive stale blocks -> stimulus change proposed; the FIRST flat block holds quietly', () => {
    const first = classifyMuscleBlock(muscle({
      priorFlatBlocks: 0,
      performance: { e1rmSlopePct: 0.3, prDensity: 0.05, doseResponse: null },
    }), CTX);
    expect(first.classification).toBe(BLOCK_CLASS.STALE);
    expect(first.proposal.stimulusChange).toBeNull();
    const second = classifyMuscleBlock(muscle({
      priorFlatBlocks: 1,
      performance: { e1rmSlopePct: 0.3, prDensity: 0.05, doseResponse: null },
    }), CTX);
    expect(second.classification).toBe(BLOCK_CLASS.STALE);
    expect(second.proposal.stimulusChange).toEqual({ primary: 'variant_swap', alternative: 'rep_range' });
  });

  test('12. exercise swap discontinuity: an apparent e1RM drop never reads as STRAINED', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: -6, discontinuity: true, doseResponse: null },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.proposal.startSets).toBe(10);   // tolerated dose retained
  });
});

// ── Quadrant gaps and guard rails ──────────────────────────────────────────

describe('quadrant gaps resolve conservatively', () => {
  test('flat performance + poor recovery -> STRAINED (cost without return)', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: 0.2, prDensity: 0.05, doseResponse: null },
      recovery: { sorenessLateAvg: 4.4, readinessSlope: -0.5 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(e.proposal.startSets).toBe(8);
  });

  test('perf down + recovery good + trusted measurement -> STALE with an immediate stimulus-change proposal', () => {
    const e = classifyMuscleBlock(muscle({
      performance: { e1rmSlopePct: -3, prDensity: 0, doseResponse: null },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.STALE);
    expect(e.proposal.startSets).toBe(10);
    expect(e.proposal.stimulusChange).toEqual({ primary: 'variant_swap', alternative: 'rep_range' });
  });

  test('low adherence: the dose was never delivered -> INSUFFICIENT_DATA seeded from the research table', () => {
    const e = classifyMuscleBlock(muscle({
      adherence: { completedSets: 60, plannedSets: 200 },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.proposal.startSets).toBe(8);    // research MEV
    expect(e.proposal.peakSets).toBe(14);    // research MAV
  });

  test('insufficient exposure -> INSUFFICIENT_DATA seeded from the research table', () => {
    const e = classifyMuscleBlock(muscle({ performance: { eligibleExposures: 2 } }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.proposal.startSets).toBe(8);
    expect(e.proposal.peakSets).toBe(14);
  });
});

describe('caps and clamps', () => {
  test('start never rises above learnedCeiling - 2', () => {
    const e = classifyMuscleBlock(muscle({ previousStart: 12, plannedPeak: 16, learnedCeiling: 13 }), CTX);
    expect(e.proposal.startSets).toBe(11);   // 12 + 1 capped to 13 - 2
  });

  test('start never falls below research MEV, even for STRAINED', () => {
    const e = classifyMuscleBlock(muscle({
      previousStart: 9, landmarks: { mev: 8, mav: 14, mrv: 22 },
      performance: { e1rmSlopePct: -3, doseResponse: null },
      recovery: { sorenessLateAvg: 4.5, readinessSlope: -0.5 },
    }), CTX);
    expect(e.proposal.startSets).toBe(8);    // max(8, 9 - 2)
  });

  test('peak never exceeds MRV nor the absolute 30-set ceiling', () => {
    const e = classifyMuscleBlock(muscle({
      learnedCeiling: 40, landmarks: { mev: 8, mav: 34, mrv: 36 },
    }), CTX);
    expect(e.proposal.peakSets).toBeLessThanOrEqual(30);
  });

  test('OVERREACHED with the flag fired mid-block starts one lower', () => {
    const e = classifyMuscleBlock(muscle({
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      landmarks: { mev: 8, mav: 20, mrv: 26 },
      performance: { e1rmSlopePct: 2 },
      recovery: { sorenessLateAvg: 4.2, deloadFlagFired: true, deloadFlagMidBlock: true },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.OVERREACHED);
    expect(e.proposal.startSets).toBe(11);
  });
});

describe('block-level recovery proposal', () => {
  test('defaults to 7 days with nothing strained', () => {
    const ledger = buildBlockLedger({
      muscles: [muscle({ learnedCeiling: 17 })],
      systemic: { readinessSlope: 0.1, sleepFlaggedWeeks: 0, deloadFlagFired: false },
      suppressed: false, weeksSinceBlockEnd: 0,
    });
    expect(ledger.proposedRecoveryDays).toBe(7);
  });

  test('a strained muscle alone is not enough: multiple persistent systemic signals required for 10', () => {
    const ledger = buildBlockLedger({
      muscles: [muscle({ muscle: 'quads', performance: { e1rmSlopePct: -3, doseResponse: null }, recovery: { sorenessLateAvg: 4.5, readinessSlope: -0.5 } })],
      systemic: { readinessSlope: -0.5, sleepFlaggedWeeks: 0, deloadFlagFired: false },
      suppressed: false, weeksSinceBlockEnd: 0,
    });
    expect(ledger.proposedRecoveryDays).toBe(7);
  });
});

// ── Evidence, voice and purity ─────────────────────────────────────────────

describe('evidence and voice', () => {
  test('every entry carries evidence and a plain-English rationale with no em dash', () => {
    const inputs = [
      muscle({ learnedCeiling: 17 }),
      muscle({ muscle: 'quads', performance: { e1rmSlopePct: -3, doseResponse: null }, recovery: { readinessSlope: -0.5, sleepFlaggedWeeks: 2 } }),
      muscle({ muscle: 'back', recovery: { dataPoints: 0 } }),
    ];
    for (const input of inputs) {
      const e = classifyMuscleBlock(input, CTX);
      expect(Array.isArray(e.evidence)).toBe(true);
      expect(e.evidence.length).toBeGreaterThan(0);
      expect(typeof e.rationale).toBe('string');
      expect(e.rationale.length).toBeGreaterThan(10);
      expect(e.rationale).not.toMatch(/—/);
    }
  });
});

describe('purity and safety posture', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'interBlock.js'), 'utf8');

  test('deterministic: identical input -> deep-equal output', () => {
    const input = muscle({ learnedCeiling: 17 });
    expect(classifyMuscleBlock(input, CTX)).toEqual(classifyMuscleBlock(muscle({ learnedCeiling: 17 }), CTX));
  });

  test('no clocks, no randomness, no I/O, no store', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
  });

  test('tier-blind: the word tier never appears in the module', () => {
    expect(SRC).not.toMatch(/tier/i);
  });

  test('the ledger output is versioned for persistence', () => {
    expect(LEDGER_VERSION).toBe(1);
  });
});
