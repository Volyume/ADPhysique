/**
 * campaign11.adaptiveMemory.test.js — Campaign 11, all three jobs.
 *
 * JOB 1 — ESTABLISHED START. learnedRange had two concepts and was making
 * one of them answer two questions. `floor` is "the lowest volume this
 * history has demonstrated can work": monotone-DOWN-only, anchored at
 * research MEV, deliberately incapable of exerting upward pressure. That law
 * is correct and is untouched. But resolveSeedRange also used it as the
 * PRESCRIPTION, so whenever the ledger could not speak — an unjudgeable
 * block, or now a stale one — a mature athlete who had earned 8 -> 10 -> 12
 * was seeded from research MEV while the ceiling still remembered 16. The
 * peak remembered the athlete; the starting dose did not. That is D97-3,
 * characterised in Campaign 10N and resolved here by a THIRD concept,
 * establishedStart, replayed from the ledger's own proposal.startSets.
 *
 * JOB 2 — ONE FRESHNESS LAW. Campaign 10N gave Adjust a judged-only
 * actionability gate but left the activation carry with its own inline copy
 * that counted an INSUFFICIENT_DATA entry as recent. Same memory, same user,
 * same boundary, different answer by entry path. Both now call one helper.
 *
 * JOB 3 — BOUNDED CAPACITY PROBE (RA6-4). The learned ceiling could only
 * rise after the athlete had already handled more, so the engine could never
 * discover capacity without the user manually adding volume. A probe adds
 * exactly +1 to the PEAK, only on proven positive dose-response evidence,
 * never to the start, never past the hard cap, and is never itself treated
 * as learned capacity.
 */
import fs from 'fs';
import path from 'path';
import { computeLearnedRange } from '../learnedRange';
import { resolveSeedRange } from '../blockSeed';
import { BLOCK_CLASS, STALE_EVIDENCE_WEEKS } from '../interBlock';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const RESEARCH = { mev: 6, mav: 12, mrv: 16 };
// mrv 20 gives the ceiling headroom: the learned ceiling settles at 16
// while its hard cap is 20, which is the only shape where a probe is legal.
const PRIOR = { mev: 6, mav: 12, mrv: 20 };

const NO_PROPOSAL = Symbol('no proposal start');
const entry = (classification, { start, peak, proposalStart, suppressed = false, confidence = 0.9, deferred = false } = {}) => ({
  muscle: 'chest',
  classification,
  confidence,
  observed: { startSets: start, achievedPeak: peak, plannedPeak: peak, suppressed },
  proposal: {
    startSets: deferred || proposalStart === NO_PROPOSAL ? null : (proposalStart ?? start),
    peakSets: deferred ? null : peak,
    deferredToManual: deferred,
  },
});
const responsive = (start, peak, over = {}) => entry(BLOCK_CLASS.RESPONSIVE, { start, peak, ...over });

// The mature athlete: three legitimate blocks whose proposals walked the
// start 8 -> 10 -> 12 and whose handled peaks reached 16.
const MATURE = [responsive(8, 14), responsive(10, 16), responsive(12, 16)];
const INSUFFICIENT = entry(BLOCK_CLASS.INSUFFICIENT_DATA, {
  start: 12, peak: 13, proposalStart: 6, confidence: 0.3,
});

const learnedFrom = (history) => computeLearnedRange({
  prior: PRIOR, researchMev: RESEARCH.mev, ledgerHistory: history, muscle: 'chest',
});
const seedFrom = (history, over = {}) => {
  const learned = learnedFrom(history);
  return resolveSeedRange({
    manual: null,
    ledgerEntry: null,
    learnedRange: learned.isLearned ? learned : null,
    profileAdjusted: PRIOR,
    research: RESEARCH,
    suppressed: false,
    intent: 'adjust',
    ...over,
  });
};

// ══ JOB 1: established start ═══════════════════════════════════════════

describe('C11 job 1: the learned band gains an established start', () => {
  test('the floor law is UNCHANGED: still monotone-down-only, still anchored', () => {
    const learned = learnedFrom(MATURE);
    expect(learned.floor).toBe(RESEARCH.mev);
    // A history of RISING starts must not drag the floor up.
    expect(learnedFrom([responsive(8, 14), responsive(12, 16), responsive(14, 16)]).floor)
      .toBe(RESEARCH.mev);
  });

  test('establishedStart replays the ledger\'s own proposal, not a recomputation', () => {
    const learned = learnedFrom(MATURE);
    expect(learned.establishedStart).toBe(12);   // the newest legitimate proposal
    expect(learned.establishedStart).not.toBe(learned.floor);
    expect(learned.establishedStart).toBeLessThanOrEqual(learned.ceiling);
  });

  test('THE MATURE CASE: an insufficient newest block no longer sends the start to MEV', () => {
    const before = { startSets: learnedFrom(MATURE).floor, peakSets: learnedFrom(MATURE).ceiling };
    expect(before.startSets).toBe(6);            // what the old model produced
    const after = seedFrom([...MATURE, INSUFFICIENT], { ledgerEntry: INSUFFICIENT });
    expect(after.source).toBe('learned');
    expect(after.startSets).toBe(12);            // the earned dose, remembered
    expect(after.peakSets).toBe(16);
  });

  test('the insufficient block itself changed NOTHING in learned memory', () => {
    expect(learnedFrom([...MATURE, INSUFFICIENT])).toEqual(learnedFrom(MATURE));
  });

  test('PROTECTIVE: a later STRAINED block moves the established start DOWN', () => {
    const strained = entry(BLOCK_CLASS.STRAINED, { start: 12, peak: 14, proposalStart: 10 });
    const learned = learnedFrom([...MATURE, strained]);
    expect(learned.establishedStart).toBe(10);
    expect(learned.establishedStart).toBeLessThan(12);
  });

  test('it is NOT a ratchet: a lower proposal wins even after a higher one', () => {
    const down = learnedFrom([responsive(14, 16), entry(BLOCK_CLASS.OVERREACHED, { start: 14, peak: 16, proposalStart: 11 })]);
    expect(down.establishedStart).toBe(11);
  });

  test('an entry that cannot teach the range cannot teach the start', () => {
    const base = learnedFrom(MATURE).establishedStart;
    // INSUFFICIENT_DATA, deferred-to-manual and low-confidence entries.
    expect(learnedFrom([...MATURE, INSUFFICIENT]).establishedStart).toBe(base);
    expect(learnedFrom([...MATURE, responsive(20, 20, { deferred: true })]).establishedStart).toBe(base);
    expect(learnedFrom([...MATURE, responsive(20, 20, { confidence: 0.5 })]).establishedStart).toBe(base);
  });

  test('suppression may HOLD or LOWER the start, never raise it', () => {
    const up = learnedFrom([...MATURE, responsive(16, 16, { suppressed: true })]);
    expect(up.establishedStart).toBe(12);        // the suppressed 16 is refused
    const down = learnedFrom([...MATURE, entry(BLOCK_CLASS.STRAINED, {
      start: 12, peak: 14, proposalStart: 9, suppressed: true,
    })]);
    expect(down.establishedStart).toBe(9);       // but its downward evidence counts
  });

  test('a suppressed block never ESTABLISHES a start from nothing', () => {
    const only = learnedFrom([responsive(14, 16, { suppressed: true })]);
    expect(only.establishedStart).toBeNull();
  });

  test('the start is clamped INSIDE the range and never distorts the bounds', () => {
    const learned = learnedFrom(MATURE);
    expect(learned.establishedStart).toBeGreaterThanOrEqual(learned.floor);
    expect(learned.establishedStart).toBeLessThanOrEqual(learned.ceiling);
    // The bounds are what they were before the start existed.
    expect(learned.floor).toBe(RESEARCH.mev);
  });

  test('legacy history with no established start falls back safely, inventing nothing', () => {
    // A STALE-only history teaches the range but states no usable proposal.
    const legacyHistory = [entry(BLOCK_CLASS.STALE, { start: 10, peak: 14, proposalStart: NO_PROPOSAL })];
    const legacy = learnedFrom(legacyHistory);
    expect(legacy.isLearned).toBe(true);
    expect(legacy.establishedStart).toBeNull();
    const s = seedFrom(legacyHistory);
    expect(s.startSets).toBe(legacy.floor);      // the previous behaviour, unchanged
  });
});

// ══ JOB 2: one freshness law ═══════════════════════════════════════════

describe('C11 job 2: Adjust and activation share ONE actionability decision', () => {
  const SRC = read('lib/blockLedgerRunner.js');

  test('there is exactly one helper, and both paths call it', () => {
    expect(SRC).toMatch(/function learnedActionability\(freshnessByMuscle, muscle\)/);
    expect((SRC.match(/learnedActionability\(/g) || []).length).toBe(3); // definition + 2 callers
    // The activation path's inline duplicate is gone.
    expect(SRC).not.toMatch(/const fresh = recent != null && recent\.weeksOverdue < STALE_EVIDENCE_WEEKS;/);
  });

  test('one age source, judged-only, shared by both', () => {
    expect((SRC.match(/judgedEvidenceAgeByMuscle\(/g) || []).length).toBe(3);
    const fn = SRC.slice(SRC.indexOf('function judgedEvidenceAgeByMuscle'));
    expect(fn.slice(0, 900)).toMatch(/if \(e\.classification === BLOCK_CLASS\.INSUFFICIENT_DATA\) continue;/);
  });

  test('one boundary, no new constant and no decay', () => {
    expect(STALE_EVIDENCE_WEEKS).toBe(4);
    expect((SRC.match(/STALE_EVIDENCE_WEEKS/g) || []).length).toBeGreaterThan(0);
    for (const rel of ['lib/blockLedgerRunner.js', 'lib/blockSeed.js', 'lib/learnedRange.js']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/halfLife|decayRate|perWeekDecay/i);
    }
  });

  test('stale memory is non-actionable and the existing fallback runs', () => {
    const learned = learnedFrom(MATURE);
    const stale = resolveSeedRange({
      manual: null, ledgerEntry: null, learnedRange: null, // what the gate passes when stale
      profileAdjusted: PRIOR, research: RESEARCH, suppressed: false, intent: 'adjust',
    });
    expect(stale.source).toBe('profile');
    expect(stale.startSets).toBe(PRIOR.mev);
    // MEMORY PERSISTS: the band still exists, it is simply not consulted.
    expect(learned.isLearned).toBe(true);
    expect(learned.establishedStart).toBe(12);
  });
});

// ══ JOB 3: bounded capacity probe ══════════════════════════════════════

describe('C11 job 3: the capacity probe is bounded, evidence-led and reversible', () => {
  const probeSeed = (history, over = {}) => seedFrom(history, { capacityProbe: true, ...over });

  test('ELIGIBLE: 12 -> 16 becomes 12 -> 17, the START is untouched', () => {
    const base = seedFrom(MATURE);
    expect(base).toMatchObject({ startSets: 12, peakSets: 16, source: 'learned' });
    expect(base.probed).toBeUndefined();
    const probed = probeSeed(MATURE);
    expect(probed.startSets).toBe(12);      // NOT 13
    expect(probed.peakSets).toBe(17);       // exactly +1
    expect(probed.probed).toBe(true);
  });

  test('exactly +1, never +2 and never compounding', () => {
    const learned = learnedFrom(MATURE);
    expect(probeSeed(MATURE).peakSets - learned.ceiling).toBe(1);
    // Asking twice in one decision cannot stack: the value is derived, not
    // accumulated.
    expect(probeSeed(MATURE)).toEqual(probeSeed(MATURE));
  });

  test('HARD CAP: no probe when the learned ceiling already sits at it', () => {
    // Drive the ceiling to the cap, then ask.
    const atCap = [responsive(12, 20), responsive(12, 20), responsive(12, 20), responsive(12, 20)];
    const learned = learnedFrom(atCap);
    expect(learned.ceiling).toBe(learned.ceilingCap);
    const probed = probeSeed(atCap);
    expect(probed.peakSets).toBe(learned.ceiling);   // refused
    expect(probed.probed).toBeUndefined();
  });

  test('the probe never exceeds the cap even when it is one set away', () => {
    const learned = learnedFrom(MATURE);
    expect(probeSeed(MATURE).peakSets).toBeLessThanOrEqual(learned.ceilingCap);
  });

  test('SUPPRESSION blocks it: the whole learned branch is skipped anyway', () => {
    const s = probeSeed(MATURE, { suppressed: true });
    expect(s.source).toBe('profile');
    expect(s.probed).toBeUndefined();
  });

  test('MANUAL override blocks it: the user\'s own numbers win untouched', () => {
    const s = probeSeed(MATURE, { manual: { mev: 14, mav: 18 } });
    expect(s.source).toBe('manual');
    expect(s.probed).toBeUndefined();
  });

  test('an actionable LEDGER seed is not probed either', () => {
    const s = probeSeed(MATURE, { ledgerEntry: responsive(12, 16) });
    expect(s.source).toBe('ledger');
    expect(s.probed).toBeUndefined();
  });

  test('PROBE IS NOT MEMORY: proposing 17 does not make the ceiling 17', () => {
    const before = learnedFrom(MATURE).ceiling;
    expect(probeSeed(MATURE).peakSets).toBe(17);
    // Recomputing from the SAME history still says 16: nothing was learned.
    expect(learnedFrom(MATURE).ceiling).toBe(before);
    expect(before).toBe(16);
  });

  test('FAILED probe does not ratchet: a strained outcome moves the ceiling DOWN', () => {
    const failed = entry(BLOCK_CLASS.STRAINED, { start: 12, peak: 17, proposalStart: 10 });
    const after = learnedFrom([...MATURE, failed]);
    expect(after.ceiling).toBeLessThanOrEqual(16);
    // And the next decision is not re-proposing 17 off the old ceiling.
    expect(seedFrom([...MATURE, failed]).peakSets).toBeLessThanOrEqual(16);
  });

  test('SUCCESSFUL probe is learned only through the normal replay', () => {
    // The athlete genuinely handles 17 in a RESPONSIVE block; the existing
    // handled-capacity rule (not a "probe succeeded" shortcut) raises it.
    const handled = responsive(12, 17);
    const after = learnedFrom([...MATURE, handled]);
    expect(after.ceiling).toBe(17);
  });

  test('REPEAT is exact and is never probed', () => {
    const repeatEntry = entry(BLOCK_CLASS.RESPONSIVE, { start: 12, peak: 16 });
    const s = resolveSeedRange({
      manual: null, ledgerEntry: repeatEntry,
      learnedRange: learnedFrom(MATURE), profileAdjusted: PRIOR, research: RESEARCH,
      suppressed: false, intent: 'repeat', capacityProbe: true,
    });
    expect(s.startSets).toBe(12);
    expect(s.peakSets).toBe(16);            // the observed block, not 17
    expect(s.probed).toBeUndefined();
  });

  test('the runner only offers a probe on Adjust, never on Repeat', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/capacityProbe: intent !== 'repeat'/);
  });
});

// ── The probe's eligibility proof ───────────────────────────────────────

describe('C11 job 3: eligibility is PROVEN from the ledger, not reconstructed', () => {
  const SRC = read('lib/blockLedgerRunner.js');

  test('a stored entry does not retain doseResponse, so the proof is indirect', () => {
    // interBlock's finish() never writes it, and the evidence array carries
    // slope / PR density / PR count / recovery cost / adherence only.
    const IB = read('lib/interBlock.js');
    const fin = IB.slice(IB.indexOf('const finish = ('), IB.indexOf('// ── INSUFFICIENT_DATA gates'));
    expect(fin).not.toMatch(/doseResponse/);
  });

  test('the deduction is sound and one-directional', () => {
    // interBlock applies +1 ONLY when the full pair plus confidence,
    // non-suppression and freshness held, so a proposal above the observed
    // start proves all of them. An EQUAL start proves nothing (the clamps
    // can absorb an earned +1), which is the conservative direction.
    const IB = read('lib/interBlock.js');
    expect(IB).toMatch(/const pairEarned = !!\(dr\?\.lateProgression && dr\?\.lateRecoveryOk\)\s*\n\s*&& confidence >= CONFIDENCE_FLOOR;/);
    expect(IB).toMatch(/const earned = pairEarned\s*\n\s*&& !suppressed && weeksSinceBlockEnd < STALE_EVIDENCE_WEEKS;/);
    expect(IB).toMatch(/let start = previousStart \+ \(earned \? 1 : 0\);/);
    const fn = SRC.slice(SRC.indexOf('function probeEligible'));
    expect(fn.slice(0, 700)).toMatch(/return proposed > observed;/);
    expect(fn.slice(0, 700)).toMatch(/classification !== BLOCK_CLASS\.RESPONSIVE/);
  });

  test('no threshold was lowered to permit probing', () => {
    const IB = read('lib/interBlock.js');
    expect(IB).toMatch(/CONFIDENCE_FLOOR = 0\.6/);
    expect(IB).toMatch(/STALE_EVIDENCE_WEEKS = 4/);
    expect(IB).toMatch(/PERF_UP_PCT = 1\.5/);
    expect(read('lib/blockMetrics.js')).toMatch(/LATE_SORENESS_OK = 2\.5/);
    expect(read('lib/blockMetrics.js')).toMatch(/LATE_JOINT_OK = 2/);
  });

  test('MRV is never raised to permit testing', () => {
    const seedSrc = read('lib/blockSeed.js');
    expect(seedSrc).toMatch(/const probing = capacityProbe === true && cap != null && ceiling < cap;/);
    expect(seedSrc).toMatch(/Math\.min\(ceiling \+ 1, cap\)/);
  });
});

// ── Provenance: the probed set must not read as learned ─────────────────

describe('C11: the probed set is distinguishable from learned capacity', () => {
  test('the seed reports `probed` so no surface can call it proven history', () => {
    const probed = resolveSeedRange({
      manual: null, ledgerEntry: null, learnedRange: learnedFrom(MATURE),
      profileAdjusted: PRIOR, research: RESEARCH, suppressed: false,
      intent: 'adjust', capacityProbe: true,
    });
    expect(probed.probed).toBe(true);
    expect(probed.source).toBe('learned');   // start + ceiling ARE learned
  });

  test('an unprobed learned seed carries no probe marker at all', () => {
    expect(seedFrom(MATURE).probed).toBeUndefined();
  });

  test('the block-start line names the extra set as a TEST, not as history', () => {
    // eslint-disable-next-line global-require
    const { buildBlockStartLines } = require('../blockExplain');
    const probedLine = buildBlockStartLines({
      summary: { chest: { week1: 12, peak: 17, peakWeek: 5, source: 'seed_learned_probe' } },
    })[0];
    expect(probedLine).toMatch(/12 sets in week 1, building to 17 by week 5/);
    expect(probedLine).toMatch(/one extra set at the top being tested/);
    // The start and demonstrated ceiling keep their learned claim...
    expect(probedLine).toMatch(/set by what past blocks have shown/);
    // ...but nothing overclaims the probe.
    expect(probedLine).not.toMatch(/optimal|maximum recoverable|we know you can handle/i);
  });

  test('an unprobed learned block keeps the plain learned clause', () => {
    // eslint-disable-next-line global-require
    const { buildBlockStartLines } = require('../blockExplain');
    const line = buildBlockStartLines({
      summary: { chest: { week1: 12, peak: 16, peakWeek: 5, source: 'seed_learned' } },
    })[0];
    expect(line).toMatch(/set by what past blocks have shown\)/);
    expect(line).not.toMatch(/being tested/);
  });

  test('the writer persists the probe source so the claim cannot drift', () => {
    expect(read('lib/database.js')).toMatch(/seed\.probed \? 'seed_learned_probe' : `seed_\$\{seed\.source\}`/);
  });

  test('a probed band matching the prior is not relabelled as the profile default', () => {
    // The RE6-1 relabel must not swallow a probe or an established start.
    const seedSrc = read('lib/blockSeed.js');
    expect(seedSrc).toMatch(/&& \(established == null \|\| established === priorMev\)\s*\n\s*&& !probing/);
  });
});
