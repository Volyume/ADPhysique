/**
 * campaign10n.learnedFreshness.test.js — Campaign 10N.
 *
 * TWO FINDINGS, and they are not the same as the brief's premise.
 *
 * FINDING 1 (the brief's premise is not what happens). The campaign was
 * commissioned to stop "a recent mature learned range being DISCARDED by one
 * insufficient block". It is not discarded. resolveSeedRange step 2 already
 * refuses an INSUFFICIENT_DATA entry and falls through to the learned band,
 * which is used and labelled `source: 'learned'`. The mature memory is
 * consulted, and the insufficient block changes nothing about it — the seed
 * is byte-identical with and without that block present, pinned below.
 *
 * The 6 the audit saw is real, but its cause is the learned band's FLOOR.
 * resolveSeedRange seeds startSets from learnedRange.floor, and
 * computeLearnedRange's floor is monotone-DOWN-only, anchored at research
 * MEV: it moves down toward the lowest progressing start and never up. So
 * the learned layer carries no memory of the dose a mature athlete has
 * established as their STARTING volume. That personalisation lives entirely
 * in the ledger proposal, which an unjudgeable block legitimately withholds.
 * Whether the learned layer should remember a start is a modelling decision
 * this campaign was not authorised to make, so it is reported, not invented.
 * These tests CHARACTERISE the behaviour so the fork is stated in code.
 *
 * FINDING 2 (a real gap, fixed here). Campaign 8 (D10) gated the ACTIVATION
 * carry on STALE_EVIDENCE_WEEKS, but the ADJUST decision had no freshness
 * gate at all. The same returning user therefore got a different answer
 * depending on which screen they reached — precisely the D97-3 asymmetry
 * Campaign 8 exists to prevent, surviving on the other path. Adjust now
 * reads the same boundary.
 *
 * NO new clock, no decay curve, no half-life, no detraining model: one
 * existing constant, one discrete boundary.
 */
import fs from 'fs';
import path from 'path';
import { computeLearnedRange } from '../learnedRange';
import { resolveSeedRange } from '../blockSeed';
import { BLOCK_CLASS, STALE_EVIDENCE_WEEKS } from '../interBlock';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const RESEARCH = { mev: 6, mav: 12, mrv: 16 };
const PRIOR = { mev: 6, mav: 12, mrv: 16 };

const judged = (startSets, achievedPeak, over = {}) => ({
  muscle: 'chest',
  classification: BLOCK_CLASS.RESPONSIVE,
  confidence: 0.9,
  observed: { startSets, achievedPeak, plannedPeak: achievedPeak, suppressed: false },
  proposal: { startSets, peakSets: achievedPeak, deferredToManual: false },
  ...over,
});
const INSUFFICIENT = {
  muscle: 'chest',
  classification: BLOCK_CLASS.INSUFFICIENT_DATA,
  confidence: 0.3,
  observed: { startSets: 12, achievedPeak: 13, plannedPeak: 16, suppressed: false },
  proposal: { startSets: 6, peakSets: 12, deferredToManual: false },
};
const MATURE = [judged(8, 14), judged(10, 16), judged(12, 16)];

const learnedFrom = (history) => computeLearnedRange({
  prior: PRIOR, researchMev: RESEARCH.mev, ledgerHistory: history, muscle: 'chest',
});
const seed = ({ history, ledgerEntry = null, fresh = true, suppressed = false, intent = 'adjust', manual = null }) => {
  const learned = learnedFrom(history);
  return resolveSeedRange({
    manual,
    ledgerEntry,
    learnedRange: (learned.isLearned && fresh) ? learned : null,
    profileAdjusted: PRIOR,
    research: RESEARCH,
    suppressed,
    intent,
  });
};

// ── FINDING 1: the insufficient block is not what collapses the start ───

describe('C10N finding 1: an insufficient block neither erases nor changes learned memory', () => {
  test('the learned band is IDENTICAL with and without the insufficient block', () => {
    const withIt = learnedFrom([...MATURE, INSUFFICIENT]);
    const without = learnedFrom(MATURE);
    expect(withIt).toEqual(without);
    expect(withIt.isLearned).toBe(true);
    expect(withIt.evidenceBlocks).toBe(3);   // the insufficient block taught nothing
  });

  test('the SEED is identical too, so the block did not discard the memory', () => {
    const withIt = seed({ history: [...MATURE, INSUFFICIENT], ledgerEntry: INSUFFICIENT });
    const without = seed({ history: MATURE, ledgerEntry: null });
    expect(withIt).toEqual(without);
    // And the memory IS consulted - this is not a fallback to Day-1.
    expect(withIt.source).toBe('learned');
  });

  // RESOLVED by Campaign 11 job 1. This test characterised the defect: the
  // start came from the learned FLOOR, which is monotone-down-only, so a
  // mature athlete seeded from research MEV. The band now carries a third
  // concept, establishedStart, and the floor law is unchanged.
  test('the floor is STILL monotone-down-only, but no longer the prescription', () => {
    const learned = learnedFrom(MATURE);
    expect(learned.floor).toBe(RESEARCH.mev);            // 6: the floor law stands
    expect(learned.ceiling).toBeGreaterThan(PRIOR.mav);  // the ceiling learned
    expect(learned.establishedStart).toBe(12);           // and now so does the start
    const s = seed({ history: MATURE });
    expect(s.startSets).toBe(12);                        // was learned.floor (6)
    expect(s.peakSets).toBe(learned.ceiling);
    // The ledger proposal still speaks first when it can.
    const viaLedger = seed({ history: MATURE, ledgerEntry: judged(12, 16) });
    expect(viaLedger.source).toBe('ledger');
    expect(viaLedger.startSets).toBe(12);
  });

  test('the insufficient block cannot earn upward volume or manufacture a proposal', () => {
    const withIt = seed({ history: [...MATURE, INSUFFICIENT], ledgerEntry: INSUFFICIENT });
    // Its own proposal numbers are never used: it is not a recommendation.
    expect(withIt.source).not.toBe('ledger');
    // C11: the bound is now what the LEGITIMATE history established, and the
    // insufficient block moved neither end of it.
    const base = learnedFrom(MATURE);
    expect(withIt.startSets).toBe(base.establishedStart);
    expect(withIt.peakSets).toBeLessThanOrEqual(base.ceiling);
    expect(withIt).toEqual(seed({ history: MATURE, ledgerEntry: null }));
  });

  test('it cannot move the learned floor or ceiling in either direction', () => {
    const base = learnedFrom(MATURE);
    const after = learnedFrom([...MATURE, INSUFFICIENT]);
    expect(after.floor).toBe(base.floor);
    expect(after.ceiling).toBe(base.ceiling);
  });
});

// ── FINDING 2: the Adjust path now expires actionability ────────────────

describe('C10N finding 2: stale learned memory is no longer actionable on Adjust', () => {
  test('fresh evidence: the learned band prescribes', () => {
    const s = seed({ history: MATURE, fresh: true });
    expect(s.source).toBe('learned');
    expect(s.peakSets).toBe(learnedFrom(MATURE).ceiling);
  });

  test('stale evidence: it does not, and the existing fallback chain runs', () => {
    const s = seed({ history: MATURE, fresh: false });
    expect(s.source).toBe('profile');
    expect(s.startSets).toBe(PRIOR.mev);
    expect(s.peakSets).toBe(PRIOR.mav);   // 12, NOT the learned 16
  });

  test('MEMORY PERSISTS: the band still exists, it is just not consulted', () => {
    // Nothing is deleted or rewritten - the same call still returns it.
    const learned = learnedFrom(MATURE);
    expect(learned.isLearned).toBe(true);
    expect(learned.ceiling).toBeGreaterThan(PRIOR.mav);
    expect(learned.evidenceBlocks).toBe(3);
  });

  test('ONE fresh judged block restores actionability, without restoring a number by fiat', () => {
    const restored = seed({ history: MATURE, fresh: true });
    expect(restored.source).toBe('learned');
    // The number comes from the normal replay, not from an entitlement.
    expect(restored.peakSets).toBe(learnedFrom(MATURE).ceiling);
  });

  test('the gate reuses the EXISTING boundary and adds no decay maths', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/recent\.weeksOverdue < STALE_EVIDENCE_WEEKS/);
    expect(SRC).toMatch(/learnedRange: \(learned\.isLearned && learnedFresh\) \? learned : null/);
    expect(STALE_EVIDENCE_WEEKS).toBe(4);
    // No invented curve anywhere in the seeding path.
    for (const rel of ['lib/blockLedgerRunner.js', 'lib/blockSeed.js', 'lib/learnedRange.js']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/Math\.exp|Math\.pow\s*\(\s*0\.\d/);
      expect(src).not.toMatch(/halfLife|decayRate|perWeekDecay/i);
    }
  });
});

// ── The clock only moves on real evidence ───────────────────────────────

describe('C10N: only a newly judged block can refresh actionability', () => {
  test('an INSUFFICIENT_DATA entry is excluded from the freshness read', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    const fn = SRC.slice(SRC.indexOf('function judgedEvidenceAgeByMuscle'));
    expect(fn.slice(0, 900)).toMatch(/if \(e\.classification === BLOCK_CLASS\.INSUFFICIENT_DATA\) continue;/);
  });

  test('freshness is derived from stored block dates, not from any read event', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    const fn = SRC.slice(SRC.indexOf('function judgedEvidenceAgeByMuscle'));
    const body = fn.slice(0, 1200);
    // Age comes from the block's own start date through getBlockStatus.
    expect(body).toMatch(/getBlockStatus\(\s*\n?\s*toMs\(m\.startDate\)/);
    // Nothing writes a "last seen" style timestamp anywhere in the module.
    const src = read('lib/blockLedgerRunner.js');
    expect(src).not.toMatch(/lastOpenedAt|lastSeenAt|touchEvidence|refreshEvidence/);
  });

  test('reading, syncing, restarting or repeating cannot change the clock inputs', () => {
    // The clock's ONLY inputs are the block's startDate and plannedWeeks.
    // The seeding path may compute and persist a ledger (idempotently), but
    // it never writes either of those, so no read-side event can move the
    // age of the evidence.
    const SRC = read('lib/blockLedgerRunner.js');
    const seedFn = SRC.slice(SRC.indexOf('export async function buildSeedRangesForNextBlock'));
    expect(seedFn).not.toMatch(/startDate\s*[:=]\s*(?!null)/);
    expect(seedFn).not.toMatch(/plannedWeeks\s*=/);
    // Whole module: nothing mutates a mesocycle's schedule.
    expect(SRC).not.toMatch(/UPDATE mesocycles SET start_date/);
    expect(SRC).not.toMatch(/UPDATE mesocycles SET planned_weeks/);
  });

  test('an already-stored ledger is reused, never recomputed by the passage of time', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/stored\?\.version === LEDGER_VERSION/);
    expect(SRC).toMatch(/stored\?\.programmeSignature \|\| !isCurrent/);
    expect(SRC).not.toMatch(/stored\?\.algorithmVersion/);
  });
});

// ── Precedence, manual, suppression, Repeat ─────────────────────────────

describe('C10N: the seed hierarchy is unchanged around the new gate', () => {
  const MANUAL = { mev: 14, mav: 18 };

  test('manual override wins regardless of freshness', () => {
    for (const fresh of [true, false]) {
      const s = seed({ history: MATURE, fresh, manual: MANUAL });
      expect(s.source).toBe('manual');
      expect(s.startSets).toBe(14);
    }
  });

  test('an actionable ledger still outranks the learned band', () => {
    const s = seed({ history: MATURE, ledgerEntry: judged(11, 15), fresh: true });
    expect(s.source).toBe('ledger');
    expect(s.startSets).toBe(11);
  });

  test('stale learned memory cannot outrank an actionable ledger', () => {
    const s = seed({ history: MATURE, ledgerEntry: judged(11, 15), fresh: false });
    expect(s.source).toBe('ledger');
    expect(s.startSets).toBe(11);
  });

  test('suppression still withholds the band, fresh or not', () => {
    for (const fresh of [true, false]) {
      const s = seed({ history: MATURE, fresh, suppressed: true });
      expect(s.source).toBe('profile');
    }
  });

  test('a suppressed block still cannot teach the ceiling upward', () => {
    const suppressedHistory = [
      judged(8, 14),
      judged(12, 20, { observed: { startSets: 12, achievedPeak: 20, plannedPeak: 20, suppressed: true } }),
    ];
    const learned = learnedFrom(suppressedHistory);
    expect(learned.ceiling).toBeLessThan(20);
  });

  test('REPEAT is untouched: it still returns the observed previous block', () => {
    const s = seed({ history: MATURE, ledgerEntry: INSUFFICIENT, intent: 'repeat', fresh: true });
    expect(s.source).toBe('ledger');
    expect(s.startSets).toBe(INSUFFICIENT.observed.startSets); // 12, exactly
    expect(s.peakSets).toBe(INSUFFICIENT.observed.plannedPeak);
  });

  test('Repeat is not made adaptive by the freshness gate', () => {
    const stale = seed({ history: MATURE, ledgerEntry: INSUFFICIENT, intent: 'repeat', fresh: false });
    const fresh = seed({ history: MATURE, ledgerEntry: INSUFFICIENT, intent: 'repeat', fresh: true });
    expect(stale).toEqual(fresh);
  });
});

// ── Neighbouring laws ───────────────────────────────────────────────────

describe('C10N: 10I-10L and Campaign 8 laws are untouched', () => {
  test('no schema or ledger version moved', () => {
    // eslint-disable-next-line global-require
    const { LEDGER_VERSION, LEDGER_ALGORITHM_VERSION } = require('../interBlock');
    expect(LEDGER_VERSION).toBe(1);
    // Seed freshness happens OUTSIDE ledger computation - a stored ledger's
    // decision rules are unchanged - so the algorithm identity does not move.
    expect(LEDGER_ALGORITHM_VERSION).toBe(2);
  });

  // C11 job 2 consolidated the two implementations into one helper, so the
  // pin moves from "activation has its own matching line" to "both call the
  // same decision".
  test('Adjust and activation share ONE actionability decision', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/function learnedActionability\(freshnessByMuscle, muscle\)/);
    expect((SRC.match(/learnedActionability\(/g) || []).length).toBe(3); // def + 2 callers
    expect(SRC).toMatch(/learnedRange: \(learned\.isLearned && fresh\) \? learned : null/);
    expect(SRC).toMatch(/learnedRange: \(learned\.isLearned && learnedFresh\) \? learned : null/);
  });

  test('the 10I/10J/10K/10L engine laws are where they were', () => {
    expect(read('lib/interBlock.js')).toMatch(/if \(recovery\.deloadFlagFired\) weight \+= 1;/);
    expect(read('lib/blockLedgerGather.js')).toMatch(/if \(earlyDeloadWeeks\.has\(w\)\) continue;/);
    expect(read('lib/blockMetrics.js')).toMatch(/if \(earlyDeloadWeeks\.has\(w\)\) continue; \/\/ reduced dose: not evidence/);
    expect(read('lib/algorithms.js')).toMatch(/if \(r <= 10\) return epley \* 0\.6 \+ brzycki \* 0\.4;\n\s*return epley;/);
  });
});
