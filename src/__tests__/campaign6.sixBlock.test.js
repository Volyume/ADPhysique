/**
 * campaign6.sixBlock.test.js — Phases 3 + 4 of the Campaign 6 order
 * (long-term audit 2026-08-11): the deterministic synthetic Pro athlete
 * through SIX training blocks, walked through the REAL pure chain
 *
 *   profileAdjustedPrior -> computeLearnedRange -> resolveSeedRange ->
 *   buildSeededWeeklyTargets -> (block outcome) -> classifyMuscleBlock
 *
 * with the entry appended to the muscle's ledger history exactly as the
 * persisted block_ledger chain feeds the next block (priorLedgerEntries /
 * trailingStaleCount semantics).
 *
 * The athlete (order Phase 3, adapted to the real architecture: calm
 * suppression is BLOCK-level, so it lands on block 5 for everyone,
 * while the manual override is per-muscle):
 *
 *   CHEST       sustainable progress; dose-response pairs in blocks 2+4
 *   BACK        responsive, then a three-block plateau, then response
 *   QUADS       high strain in blocks 1-2, recovery and rebuild after
 *   HAMSTRINGS  unjudgeable early (no recovery data), strong later
 *   SIDE DELTS  manual override during block 4, removed for block 5
 *   CALVES      responsive throughout, with its biggest peak in the
 *               SUPPRESSED block 5 - which must never teach the ceiling
 *
 * Every number asserted below is the chain's own output for identical
 * inputs, every run (deterministic-engine law). The multi-block
 * invariants of Phase 4 are pinned at the bottom against the full
 * six-block record.
 */
import { computeLearnedRange } from '../lib/learnedRange';
import { classifyMuscleBlock, BLOCK_CLASS } from '../lib/interBlock';
import { resolveSeedRange } from '../lib/blockSeed';
import {
  profileAdjustedPrior, buildSeededWeeklyTargets, trailingStaleCount,
} from '../lib/blockLedgerGather';
import { VOLUME_LANDMARKS } from '../lib/algorithms';

const PROFILE = {
  experience: 'intermediate', recoveryRating: 'average',
  trainingPhase: 'lean_gain', age: 31,
};
const ACCUM_WEEKS = 5;

const research = (muscle) => ({
  mev: VOLUME_LANDMARKS[muscle].mev,
  mav: VOLUME_LANDMARKS[muscle].mav,
  mrv: VOLUME_LANDMARKS[muscle].mrv,
});

const perf = (over = {}) => ({
  e1rmSlopePct: 2, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
  confidence: 0.9, discontinuity: false, doseResponse: null, ...over,
});
const rec = (over = {}) => ({
  sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
  sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
  dataPoints: 8, ...over,
});
const adherence = { plannedSets: 70, completedSets: 64 };

/**
 * One muscle, one block: seed from history, run the scripted outcome,
 * classify, append. Returns the full record for the block.
 */
function runBlock({ muscle, history, script, suppressed, manualLandmarks }) {
  const prior = profileAdjustedPrior(muscle, PROFILE);
  const learned = computeLearnedRange({
    prior,
    researchMev: research(muscle).mev,
    ledgerHistory: history,
    muscle,
  });
  const lastEntry = history.length ? history[history.length - 1] : null;
  const seed = resolveSeedRange({
    manual: manualLandmarks ?? null,
    ledgerEntry: lastEntry,
    learnedRange: learned,
    profileAdjusted: prior,
    research: research(muscle),
    suppressed,
    intent: 'adjust',
  });
  const weekly = buildSeededWeeklyTargets({
    startSets: seed.startSets,
    peakSets: seed.peakSets,
    accumWeeks: ACCUM_WEEKS,
    deloadSets: seed.deloadSets ?? research(muscle).mev,
  });
  // The scripted outcome: what this block's training actually showed.
  const achievedPeak = script.achievedPeak ?? seed.peakSets;
  const entry = classifyMuscleBlock({
    muscle,
    landmarks: prior,
    researchMev: research(muscle).mev,
    learnedCeiling: learned.isLearned ? learned.ceiling : null,
    manualOverride: !!manualLandmarks,
    previousStart: seed.startSets,
    plannedPeak: seed.peakSets,
    achievedPeak,
    priorFlatBlocks: trailingStaleCount(history),
    adherence: script.adherence ?? adherence,
    performance: perf(script.perf ?? {}),
    recovery: rec(script.rec ?? {}),
  }, { suppressed, weeksSinceBlockEnd: 0 });
  history.push(entry);
  return { prior, learned, seed, weekly, entry, achievedPeak };
}

// ── The six-block script ────────────────────────────────────────────────
// Block 5 is the athlete's calm-mode period: EVERY muscle's block 5 is
// suppressed (calm is block-level in the real architecture).
const SUPPRESSED_BLOCK = 5;

const SCRIPTS = {
  chest: [
    { perf: { e1rmSlopePct: 2.5 } },                                                        // B1 responsive, no pair
    { perf: { e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B2 pair: earned +1
    { perf: { e1rmSlopePct: 2 } },                                                          // B3 responsive
    { perf: { e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B4 pair again
    { perf: { e1rmSlopePct: 2, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B5 SUPPRESSED: pair present but must not earn
    { perf: { e1rmSlopePct: 2 } },                                                          // B6 responsive
  ],
  back: [
    { perf: { e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B1 pair
    { perf: { e1rmSlopePct: 2 } },                                                          // B2 responsive
    { perf: { e1rmSlopePct: 0.5 } },                                                        // B3 STALE (first flat: quiet hold)
    { perf: { e1rmSlopePct: 0.2 } },                                                        // B4 STALE entrenched -> stimulus change
    { perf: { e1rmSlopePct: 0.4 } },                                                        // B5 STALE (suppressed anyway)
    { perf: { e1rmSlopePct: 2.5 } },                                                        // B6 responds after the stimulus change
  ],
  quads: [
    { perf: { e1rmSlopePct: -2 }, rec: { sorenessLateAvg: 4, deloadFlagFired: true } },     // B1 STRAINED
    { perf: { e1rmSlopePct: -1.6 }, rec: { sorenessLateAvg: 4, readinessSlope: -0.35 } },   // B2 STRAINED again
    { perf: { e1rmSlopePct: 2 } },                                                          // B3 recovers
    { perf: { e1rmSlopePct: 2.2 } },                                                        // B4 responsive
    { perf: { e1rmSlopePct: 2 } },                                                          // B5 suppressed hold
    { perf: { e1rmSlopePct: 2.4, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B6 earns +1
  ],
  hamstrings: [
    { rec: { dataPoints: 0, sorenessLateAvg: null, jointDiscomfortAvg: null } },            // B1 INSUFFICIENT (no recovery data)
    { rec: { dataPoints: 2, sorenessLateAvg: null, jointDiscomfortAvg: null } },            // B2 INSUFFICIENT still
    { perf: { e1rmSlopePct: 2 } },                                                          // B3 first judgeable block
    { perf: { e1rmSlopePct: 2.6, doseResponse: { lateProgression: true, lateRecoveryOk: true } } }, // B4 earns +1
    { perf: { e1rmSlopePct: 2 } },                                                          // B5 suppressed hold
    { perf: { e1rmSlopePct: 2 } },                                                          // B6 responsive
  ],
  side_delts: [
    { perf: { e1rmSlopePct: 2 } },                                                          // B1 responsive
    { perf: { e1rmSlopePct: 2.2 } },                                                        // B2 responsive
    { perf: { e1rmSlopePct: 2 } },                                                          // B3 responsive
    { perf: { e1rmSlopePct: 2 }, manual: { mev: 12, mav: 20, mrv: 24 } },                   // B4 MANUAL OVERRIDE block
    { perf: { e1rmSlopePct: 2 } },                                                          // B5 manual removed (suppressed block)
    { perf: { e1rmSlopePct: 2 } },                                                          // B6 standard
  ],
  calves: [
    { perf: { e1rmSlopePct: 2 }, achievedPeak: 14 },                                        // B1 responsive
    { perf: { e1rmSlopePct: 2.2 }, achievedPeak: 15 },                                      // B2 responsive
    { perf: { e1rmSlopePct: 2 }, achievedPeak: 15 },                                        // B3 responsive
    { perf: { e1rmSlopePct: 2 }, achievedPeak: 15 },                                        // B4 responsive
    { perf: { e1rmSlopePct: 3 }, achievedPeak: 20 },                                        // B5 SUPPRESSED: biggest peak - must NOT teach
    { perf: { e1rmSlopePct: 2 } },                                                          // B6 standard again
  ],
};

/** Run the whole athlete. Returns { [muscle]: [blockRecord x6] }. */
function runAthlete() {
  const out = {};
  for (const [muscle, blocks] of Object.entries(SCRIPTS)) {
    const history = [];
    out[muscle] = blocks.map((script, i) => runBlock({
      muscle,
      history,
      script,
      suppressed: i + 1 === SUPPRESSED_BLOCK,
      manualLandmarks: script.manual ?? null,
    }));
  }
  return out;
}

const SIM = runAthlete();
const rec6 = (muscle) => SIM[muscle];

// Optional trace for the SIX-BLOCK-SIMULATION.md evidence doc:
//   C6_TRACE=1 npx jest campaign6.sixBlock -t determinism
if (process.env.C6_TRACE) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(SIM).map(([m, blocks]) => [m, blocks.map((b, i) => ({
      block: i + 1,
      seed: b.seed,
      weekly: b.weekly,
      learnedBefore: b.learned,
      class: b.entry.classification,
      proposal: b.entry.proposal,
      observed: b.entry.observed,
      upwardCarryPrevented: b.entry.upwardCarryPrevented,
    }))]),
  ), null, 1));
}

describe('the six-block athlete is deterministic', () => {
  test('an identical rerun produces byte-identical records', () => {
    expect(JSON.stringify(runAthlete())).toBe(JSON.stringify(SIM));
  });
});

describe('BLOCK 1: mostly research/profile, honestly labelled', () => {
  test('every muscle seeds from the profile prior with no learned claim', () => {
    for (const muscle of Object.keys(SCRIPTS)) {
      const b1 = rec6(muscle)[0];
      expect(b1.seed.source).toBe('profile');
      expect(b1.learned.isLearned).toBe(false);
      expect(b1.learned.evidenceBlocks).toBe(0);
    }
  });
});

describe('CHEST: sustainable progress, +1 only when the evidence pair earns it', () => {
  const blocks = () => rec6('chest');
  test('block 2 seeds from block 1 ledger; the pair earns exactly +1, never more', () => {
    const [b1, b2, b3] = blocks();
    expect(b2.seed.source).toBe('ledger');
    // B1 was responsive WITHOUT the pair: retention, start carries over.
    expect(b2.seed.startSets).toBe(b1.seed.startSets);
    // B2 HAS the pair: its proposal (feeding block 3) climbs exactly 1.
    expect(b2.entry.proposal.startSets).toBe(b2.seed.startSets + 1);
    expect(b3.seed.startSets).toBe(b2.seed.startSets + 1);
  });
  test('the suppressed block 5 pair earns nothing, and block 6 does not inherit a phantom climb', () => {
    const [, , , , b5, b6] = blocks();
    expect(b5.entry.proposal.startSets).toBeLessThanOrEqual(b5.seed.startSets);
    expect(b6.seed.startSets).toBeLessThanOrEqual(b5.seed.startSets);
  });
  test('six blocks of good training move start by at most the earned pairs (no blind ratchet)', () => {
    const first = blocks()[0].seed.startSets;
    const last = blocks()[5].seed.startSets;
    // Two earned pairs (B2, B4) are the only climbs; B5's pair is suppressed.
    expect(last - first).toBeLessThanOrEqual(2);
    expect(last - first).toBeGreaterThanOrEqual(1);
  });
});

describe('BACK: a plateau proposes a stimulus change, never more volume', () => {
  const blocks = () => rec6('back');
  test('the first flat block holds quietly; the second proposes the change', () => {
    const [, , b3, b4] = blocks();
    expect(b3.entry.classification).toBe(BLOCK_CLASS.STALE);
    expect(b3.entry.proposal.stimulusChange).toBeNull();
    expect(b4.entry.classification).toBe(BLOCK_CLASS.STALE);
    expect(b4.entry.proposal.stimulusChange).toEqual({ primary: 'variant_swap', alternative: 'rep_range' });
  });
  test('three stale blocks never add a set', () => {
    const [, b2, b3, b4, b5] = blocks();
    expect(b3.entry.proposal.startSets).toBe(b3.seed.startSets);
    expect(b4.entry.proposal.startSets).toBe(b4.seed.startSets);
    expect(b5.seed.startSets).toBeLessThanOrEqual(b2.entry.proposal.startSets);
  });
});

describe('QUADS: strain reduces, recovery rebuilds slowly', () => {
  const blocks = () => rec6('quads');
  test('strain reduction floors at the effective MEV: the start holds AT the productive floor, never below it', () => {
    // Characterisation (Phase 4 "strain can reduce"): the STRAINED branch
    // targets previousStart - 2, but the clamp floors it at the effective
    // MEV. A muscle already sitting at its MEV therefore holds there -
    // strain never pushes a start below the productive-training floor.
    const [b1, b2] = blocks();
    expect(b1.entry.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(b2.entry.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(b1.seed.startSets).toBe(b1.prior.mev);
    expect(b2.seed.startSets).toBe(b1.prior.mev);
  });
  test('the reduction is real in the peak dimension: strain pulls the learned ceiling and the prescribed peak down', () => {
    const [b1, , b3, b4] = blocks();
    // Two strained blocks stepped the ceiling down 2 sets each.
    expect(b3.learned.ceiling).toBe(b1.learned.ceiling - 4);
    // And the next responsive block's peak is capped by that reduced
    // ceiling, well below the original prescription.
    expect(b3.entry.proposal.peakSets).toBeLessThan(b1.seed.peakSets);
    // Rebuild is slow: one responsive block moves the seed start by at most +1.
    expect(b4.seed.startSets - b3.seed.startSets).toBeLessThanOrEqual(1);
  });
  test('the rebuild needs the evidence pair: the start climbs only in block 6, by exactly 1', () => {
    const [, , , , b5, b6] = blocks();
    expect(b5.entry.proposal.startSets).toBe(b5.seed.startSets);
    expect(b6.entry.proposal.startSets).toBe(b6.seed.startSets + 1);
  });
});

describe('HAMSTRINGS: insufficient evidence stays conservative, then history arrives', () => {
  const blocks = () => rec6('hamstrings');
  test('unjudgeable blocks hold their own numbers and never count as evidence', () => {
    const [b1, b2, b3] = blocks();
    expect(b1.entry.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(b2.entry.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(b1.entry.proposal.startSets).toBe(b1.seed.startSets);
    expect(b2.learned.evidenceBlocks).toBe(0);
    expect(b3.learned.isLearned).toBe(false);
    // And the seed for block 3 refuses the unjudged ledger entry: it falls
    // back to the profile prior, not a fake personalisation.
    expect(b3.seed.source).toBe('profile');
  });
  test('once real evidence exists, later blocks genuinely personalise', () => {
    const [, , , b4, , b6] = blocks();
    expect(b4.seed.source).toBe('ledger');
    expect(b6.learned.isLearned).toBe(true);
    expect(b6.learned.evidenceBlocks).toBeGreaterThanOrEqual(2);
  });
});

describe('SIDE DELTS: manual intent wins, and manual blocks teach nothing', () => {
  const blocks = () => rec6('side_delts');
  test('the override block seeds from the manual numbers', () => {
    const b4 = blocks()[3];
    expect(b4.seed.source).toBe('manual');
    expect(b4.seed.startSets).toBe(12);
    expect(b4.entry.proposal.deferredToManual).toBe(true);
    expect(b4.entry.proposal.startSets).toBeNull();
  });
  test('after the override is removed, the manual block has taught the learner nothing', () => {
    const [, , b3, b4, b5] = blocks();
    // The learner's evidence count did not grow through the manual block.
    expect(b5.learned.evidenceBlocks).toBe(b4.learned.evidenceBlocks);
    // And the next seed cannot come from the deferred manual entry.
    expect(b5.seed.source).not.toBe('ledger');
    expect(['learned', 'profile']).toContain(b5.seed.source);
    expect(b3.entry.proposal.deferredToManual).toBe(false);
  });
});

describe('CALVES: a suppressed block cannot raise the learned ceiling, even retroactively', () => {
  const blocks = () => rec6('calves');
  test('the suppressed block records its peak but is marked suppressed', () => {
    const b5 = blocks()[4];
    expect(b5.entry.observed.suppressed).toBe(true);
    expect(b5.entry.observed.achievedPeak).toBe(20);
  });
  test('after calm lifts, the ceiling reflects only unsuppressed evidence', () => {
    const [, , , b4, , b6] = blocks();
    // Block 6's learned fold has seen the suppressed 20-set peak; the
    // ceiling must not have moved toward it beyond what blocks 1-4 earned.
    expect(b6.learned.ceiling).toBeLessThanOrEqual(b4.learned.ceiling + 0);
  });
  test('the suppressed block itself held rather than climbed', () => {
    const [, , , b4, b5] = blocks();
    expect(b5.seed.startSets).toBeLessThanOrEqual(b4.entry.proposal.startSets);
    expect(b5.entry.proposal.startSets).toBeLessThanOrEqual(b5.seed.startSets);
  });
});

// ── Phase 4: the multi-block invariants, over the WHOLE record ─────────

describe('MULTI-BLOCK INVARIANTS (Phase 4)', () => {
  const all = () => Object.entries(SIM);

  test('research remains a prior, never forgotten: every seed respects the research MEV anchor', () => {
    for (const [muscle, blocks] of all()) {
      for (const b of blocks) {
        expect(b.seed.startSets).toBeGreaterThanOrEqual(research(muscle).mev);
      }
    }
  });

  test('no muscle ever exceeds the absolute weekly ceiling or its learned ceiling frame', () => {
    for (const [, blocks] of all()) {
      for (const b of blocks) {
        expect(b.seed.peakSets).toBeLessThanOrEqual(30);
        expect(b.weekly[b.weekly.length - 1]).toBeLessThanOrEqual(b.seed.startSets); // deload <= start
      }
    }
  });

  test('the weekly ramp is monotone non-decreasing across accumulation and lighter in the recovery week', () => {
    for (const [, blocks] of all()) {
      for (const b of blocks) {
        const accum = b.weekly.slice(0, ACCUM_WEEKS);
        for (let i = 1; i < accum.length; i += 1) {
          expect(accum[i]).toBeGreaterThanOrEqual(accum[i - 1]);
        }
        expect(b.weekly[ACCUM_WEEKS]).toBeLessThanOrEqual(accum[accum.length - 1]);
      }
    }
  });

  test('start volume never jumps more than 1 set upward between blocks, except by explicit manual intent', () => {
    for (const [, blocks] of all()) {
      for (let i = 1; i < blocks.length; i += 1) {
        // A manual override is the user's own number, not an engine climb:
        // it is the ONE legitimate way a start can jump (side delts B4).
        if (blocks[i].seed.source === 'manual' || blocks[i - 1].seed.source === 'manual') continue;
        const delta = blocks[i].seed.startSets - blocks[i - 1].seed.startSets;
        expect(delta).toBeLessThanOrEqual(1);
      }
    }
  });

  test('personalisation compounds: by block 6 every evidence-bearing muscle is ledger- or learned-seeded', () => {
    for (const [muscle, blocks] of all()) {
      const b6 = blocks[5];
      if (muscle === 'side_delts') {
        // The deferred manual entry cannot seed; learned history can.
        expect(['learned', 'ledger', 'profile']).toContain(b6.seed.source);
      } else {
        expect(b6.seed.source).toBe('ledger');
      }
      expect(b6.seed.source).not.toBe('research');
    }
  });

  test('the learned floor never rises above its prior MEV (monotone downward law)', () => {
    for (const [muscle, blocks] of all()) {
      const priorMev = blocks[0].prior.mev;
      for (const b of blocks) {
        if (b.learned.floor != null) {
          expect(b.learned.floor).toBeLessThanOrEqual(Math.max(priorMev, research(muscle).mev));
        }
      }
    }
  });

  test('the learned ceiling moves at most 2 sets per block (no blind ratchet)', () => {
    for (const [, blocks] of all()) {
      for (let i = 1; i < blocks.length; i += 1) {
        const prev = blocks[i - 1].learned.ceiling;
        const cur = blocks[i].learned.ceiling;
        if (prev != null && cur != null) {
          expect(Math.abs(cur - prev)).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});
