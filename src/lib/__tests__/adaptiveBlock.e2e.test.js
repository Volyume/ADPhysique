/**
 * adaptiveBlock.e2e.test.js — the founder's end-to-end synthetic
 * athlete campaign (final Stage 6-8 order, 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.9).
 *
 * One athlete finishes one block and six muscles walk the WHOLE pure
 * chain — classifyMuscleBlock -> buildBlockLedger -> resolveSeedRange ->
 * buildSeededWeeklyTargets — to six different outcomes in one block:
 *
 *   BACK        RESPONSIVE with dose-response evidence -> +1 climb
 *   CHEST       RESPONSIVE without the pair            -> retention
 *   QUADS       STRAINED                               -> reduction
 *   HAMSTRINGS  STALE (entrenched)                     -> hold + stimulus proposal
 *   CALVES      INSUFFICIENT_DATA                      -> learned-band fallback
 *   SIDE DELTS  no ledger entry, no history            -> profile fallback
 *
 * The CALVES leg pins the founder's e2e ruling directly: an
 * INSUFFICIENT_DATA entry is NOT a recommendation, so it must never
 * seed as source 'ledger' — a muscle with useful learned history falls
 * back to it. The campaign then repeats under the ordered variants:
 * calm/ED suppression, stale evidence, manual override, null ledger,
 * and the PERMANENT repeat-vs-adjust divergence regression.
 *
 * Everything here is pure and deterministic: same inputs, same block,
 * for every user, every time. Tier never appears.
 */
import fs from 'fs';
import path from 'path';
import {
  classifyMuscleBlock,
  buildBlockLedger,
  BLOCK_CLASS,
  LEDGER_VERSION,
  LEDGER_ALGORITHM_VERSION,
} from '../interBlock';
import { resolveSeedRange } from '../blockSeed';
import { computeLearnedRange } from '../learnedRange';
import {
  buildSeededWeeklyTargets,
  profileAdjustedPrior,
  priorLedgerEntries,
  trailingStaleCount,
} from '../blockLedgerGather';
import { isManualEdit } from '../effectiveLandmarks';
import { VOLUME_LANDMARKS } from '../algorithms';

const perf = (over = {}) => ({
  e1rmSlopePct: 0, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
  confidence: 0.9, discontinuity: false, doseResponse: null, ...over,
});
const rec = (over = {}) => ({
  sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
  sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
  dataPoints: 8, ...over,
});
const adh = { plannedSets: 60, completedSets: 55 };

// The finished block, muscle by muscle.
const ATHLETE = [
  {
    muscle: 'back', landmarks: { mev: 10, mav: 20, mrv: 25 }, researchMev: 10,
    previousStart: 12, plannedPeak: 16, achievedPeak: 17, adherence: adh,
    performance: perf({ e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true } }),
    recovery: rec(),
  },
  {
    muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 22 }, researchMev: 8,
    previousStart: 10, plannedPeak: 14, achievedPeak: 14, adherence: adh,
    performance: perf({ e1rmSlopePct: 2 }), recovery: rec(),
  },
  {
    muscle: 'quads', landmarks: { mev: 8, mav: 16, mrv: 20 }, researchMev: 8,
    previousStart: 16, plannedPeak: 16, achievedPeak: 16, adherence: adh,
    performance: perf({ e1rmSlopePct: -2 }),
    recovery: rec({ sorenessLateAvg: 4, deloadFlagFired: true }),
  },
  {
    muscle: 'hamstrings', landmarks: { mev: 6, mav: 12, mrv: 16 }, researchMev: 6,
    previousStart: 10, plannedPeak: 12, achievedPeak: 12, adherence: adh,
    performance: perf({ e1rmSlopePct: 0.5 }), recovery: rec(), priorFlatBlocks: 1,
  },
  {
    muscle: 'calves', landmarks: { mev: 6, mav: 12, mrv: 16 }, researchMev: 6,
    previousStart: 8, plannedPeak: 10, achievedPeak: 9,
    adherence: { plannedSets: 40, completedSets: 30 },
    performance: perf({ eligibleExposures: 2 }), recovery: rec({ dataPoints: 5 }),
  },
];

const RESEARCH = { mev: 8, mav: 14, mrv: 22 };

const entryFor = (ledger, muscle) => ledger.entries.find((e) => e.muscle === muscle);

const seedFor = (ledger, muscle, over = {}) => resolveSeedRange({
  manual: null,
  ledgerEntry: entryFor(ledger, muscle) ?? null,
  learnedRange: null,
  profileAdjusted: { mev: 9, mav: 15, mrv: 21 },
  research: RESEARCH,
  suppressed: false,
  intent: 'adjust',
  ...over,
});

describe('the synthetic athlete: one block, six muscles, six outcomes', () => {
  const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: false, weeksSinceBlockEnd: 0 });

  test('the ledger carries its schema and algorithm versions and a normal recovery proposal', () => {
    expect(ledger.version).toBe(LEDGER_VERSION);
    expect(ledger.algorithmVersion).toBe(LEDGER_ALGORITHM_VERSION);
    expect(ledger.proposedRecoveryDays).toBe(7);
    expect(ledger.entries).toHaveLength(5);
  });

  test('BACK: RESPONSIVE with the dose-response pair earns exactly +1, never more', () => {
    const e = entryFor(ledger, 'back');
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(13); // 12 + 1
    expect(e.upwardCarryPrevented).toBe(false);
    expect(e.observed).toEqual({ startSets: 12, achievedPeak: 17, plannedPeak: 16, suppressed: false });
  });

  test('CHEST: RESPONSIVE without the pair retains — RESPONSIVE is never an auto-add', () => {
    const e = entryFor(ledger, 'chest');
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10); // retention, the default
    expect(e.proposal.peakSets).toBe(14); // the whole proven dose, no silent reset
  });

  test('QUADS: STRAINED reduces the start and tells the truth about why', () => {
    const e = entryFor(ledger, 'quads');
    expect(e.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(e.proposal.startSets).toBe(14); // 16 - 2
    expect(e.rationale).toContain('lost ground while recovery ran poor');
    expect(e.rationale).toContain('2 sets lower');
  });

  test('HAMSTRINGS: entrenched STALE holds volume and proposes a stimulus change instead', () => {
    const e = entryFor(ledger, 'hamstrings');
    expect(e.classification).toBe(BLOCK_CLASS.STALE);
    expect(e.proposal.startSets).toBe(10); // hold, not more sets
    expect(e.proposal.stimulusChange).toEqual({ primary: 'variant_swap', alternative: 'rep_range' });
  });

  test('CALVES: too little evidence is INSUFFICIENT_DATA, stated honestly', () => {
    const e = entryFor(ledger, 'calves');
    expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(e.rationale).toContain('too rarely');
  });

  test('seeding: BACK climbs, CHEST retains, QUADS reduces, HAMSTRINGS holds — all source ledger', () => {
    expect(seedFor(ledger, 'back')).toMatchObject({ startSets: 13, peakSets: 20, source: 'ledger' });
    expect(seedFor(ledger, 'chest')).toMatchObject({ startSets: 10, peakSets: 14, source: 'ledger' });
    expect(seedFor(ledger, 'quads')).toMatchObject({ startSets: 14, peakSets: 16, source: 'ledger' });
    expect(seedFor(ledger, 'hamstrings')).toMatchObject({ startSets: 10, peakSets: 12, source: 'ledger' });
  });

  test('FOUNDER PIN: an INSUFFICIENT_DATA entry never seeds as ledger — the learned band speaks next', () => {
    const out = seedFor(ledger, 'calves', {
      learnedRange: { floor: 7, ceiling: 11, isLearned: true },
      research: { mev: 6, mav: 12, mrv: 16 },
    });
    expect(out.source).toBe('learned');
    expect(out.startSets).toBe(7);
    expect(out.peakSets).toBe(11);
    // and without learned history, the profile prior speaks, never the entry
    expect(seedFor(ledger, 'calves').source).toBe('profile');
  });

  test('SIDE DELTS: a muscle with no entry and no history falls to the profile prior', () => {
    const out = seedFor(ledger, 'side_delts');
    expect(out).toEqual({ startSets: 9, peakSets: 15, source: 'profile' });
  });

  test('the strain-scaled recovery week is muscle-specific: strained QUADS gets the smallest share', () => {
    // RA6-2 (Campaign 10I): the deload flag's per-muscle weight went 2 -> 1,
    // so quads' recovery_cost_weight = 2 (soreness 1 + deload flag 1), and
    // deloadSharePct (60 - 5 x points) reads 50% instead of 45%. Quads is
    // still STRAINED on its own corroborated evidence and still takes its
    // start reduction (pinned below); only the flag's share of the recovery
    // week shrank with its weight, proportionally and by design.
    expect(seedFor(ledger, 'quads').deloadSets).toBe(8); // round(min(16,16) x 50 / 100)
    // back/chest ran clean (weight 0) -> 60%.
    expect(seedFor(ledger, 'back').deloadSets).toBe(10); // round(min(17,20) x 60 / 100)
    expect(seedFor(ledger, 'chest').deloadSets).toBe(8); // round(min(14,14) x 60 / 100)
  });

  test('per-muscle ramps: six different weekly shapes in the same block, none descending before the deload', () => {
    const ramp = (m, deloadSets) => {
      const s = seedFor(ledger, m, m === 'calves'
        ? { learnedRange: { floor: 7, ceiling: 11, isLearned: true }, research: { mev: 6, mav: 12, mrv: 16 } }
        : {});
      return buildSeededWeeklyTargets({
        startSets: s.startSets, peakSets: s.peakSets, accumWeeks: 4,
        deloadSets: s.deloadSets ?? deloadSets,
      });
    };
    expect(ramp('back')).toEqual([13, 15, 18, 20, 10]);
    expect(ramp('chest')).toEqual([10, 11, 13, 14, 8]);
    expect(ramp('quads')).toEqual([14, 15, 15, 16, 8]); // RA6-2: 50% share, see above
    expect(ramp('hamstrings')).toEqual([10, 11, 11, 12, 7]);
    expect(ramp('calves', 6)).toEqual([7, 8, 10, 11, 6]); // learned band, MEV-style deload passed by the writer
    expect(ramp('side_delts', 8)).toEqual([9, 11, 13, 15, 8]);
    for (const targets of [ramp('back'), ramp('chest'), ramp('quads'), ramp('hamstrings')]) {
      for (let i = 1; i < targets.length - 1; i += 1) {
        expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1]);
      }
    }
  });
});

describe('PERMANENT REGRESSION: repeat and adjust genuinely diverge', () => {
  const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: false, weeksSinceBlockEnd: 0 });

  test('the +1 muscle diverges: adjust climbs, repeat re-runs the finished block unchanged', () => {
    const adjust = seedFor(ledger, 'back', { intent: 'adjust' });
    const repeat = seedFor(ledger, 'back', { intent: 'repeat' });
    expect(adjust.startSets).toBe(13);
    expect(repeat.startSets).toBe(12); // observed start, not the proposal
    expect(repeat.peakSets).toBe(16); // observed planned peak
    expect(repeat.deloadSets).toBeUndefined(); // a true repeat keeps its own recovery week
    expect(adjust.startSets).not.toBe(repeat.startSets);
  });

  test('the retained muscle lands identically under both buttons', () => {
    const adjust = seedFor(ledger, 'chest', { intent: 'adjust' });
    const repeat = seedFor(ledger, 'chest', { intent: 'repeat' });
    expect({ startSets: adjust.startSets, peakSets: adjust.peakSets })
      .toEqual({ startSets: repeat.startSets, peakSets: repeat.peakSets });
  });
});

describe('campaign variants', () => {
  test('calm/ED suppression: the +1 never happens, reductions still pass, seeds never rise', () => {
    const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: true, weeksSinceBlockEnd: 0 });
    const back = entryFor(ledger, 'back');
    expect(back.proposal.startSets).toBe(12); // dose-response +1 withheld
    expect(back.observed.suppressed).toBe(true);
    expect(back.evidence).toContainEqual({ signal: 'progression_suppressed', value: true });
    const quads = entryFor(ledger, 'quads');
    expect(quads.proposal.startSets).toBe(14); // the reduction still lands
    const seed = seedFor(ledger, 'back', { suppressed: true });
    expect(seed.startSets).toBe(12);
    expect(seed.deloadSets).toBeUndefined(); // recovery week stays the flat MEV week
  });

  test('suppression holds an adapted-MEV climb at the research anchor and records the hold', () => {
    const entry = classifyMuscleBlock({
      muscle: 'chest',
      landmarks: { mev: 12, mav: 14, mrv: 22 }, // adapted table drifted upward
      researchMev: 10,
      previousStart: 8, plannedPeak: 13, achievedPeak: 13, adherence: adh,
      performance: perf({ e1rmSlopePct: 2 }), recovery: rec(),
    }, { suppressed: true });
    expect(entry.proposal.startSets).toBe(10); // held at max(previousStart, research MEV)
    expect(entry.upwardCarryPrevented).toBe(true);
  });

  test('stale evidence (4+ weeks old) is treated exactly like suppression for upward carry', () => {
    const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: false, weeksSinceBlockEnd: 5 });
    const back = entryFor(ledger, 'back');
    expect(back.proposal.startSets).toBe(12); // no +1 from stale evidence
    expect(back.evidence).toContainEqual({ signal: 'evidence_weeks_old', value: 5 });
    expect(entryFor(ledger, 'quads').proposal.startSets).toBe(14); // reductions unaffected
  });

  test('a manual override beats a valid ledger, but only a REAL edit counts', () => {
    const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: false, weeksSinceBlockEnd: 0 });
    const edited = seedFor(ledger, 'back', { manual: { mev: 12, mav: 18, mrv: 24 }, research: { mev: 10, mav: 20, mrv: 25 } });
    expect(edited.source).toBe('manual');
    expect(edited.startSets).toBe(12);
    // Untouched research defaults saved by the old editor are NOT an override.
    const untouched = seedFor(ledger, 'back', { manual: { mev: 10, mav: 20, mrv: 25 }, research: { mev: 10, mav: 20, mrv: 25 } });
    expect(untouched.source).toBe('ledger');
    expect(isManualEdit({ mev: 10, mav: 20, mrv: 25 }, { mev: 10, mav: 20, mrv: 25 })).toBe(false);
  });

  test('a null ledger (pre-campaign block) falls through the whole chain to research', () => {
    const out = resolveSeedRange({
      manual: null, ledgerEntry: null, learnedRange: null,
      profileAdjusted: null, research: RESEARCH, suppressed: false, intent: 'adjust',
    });
    expect(out).toEqual({ startSets: 8, peakSets: 14, source: 'research' });
  });

  test('the INSUFFICIENT_DATA entry never teaches the learned range either', () => {
    const ledger = buildBlockLedger({ muscles: ATHLETE, systemic: rec(), suppressed: false, weeksSinceBlockEnd: 0 });
    const calvesEntry = entryFor(ledger, 'calves');
    const range = computeLearnedRange({
      prior: { mev: 6, mav: 12, mrv: 16 }, researchMev: 6,
      ledgerHistory: [calvesEntry], muscle: 'calves',
    });
    expect(range.isLearned).toBe(false);
    expect(range.evidenceBlocks).toBe(0);
  });
});

describe('gather extraction helpers (Stage 6 completion)', () => {
  test('profileAdjustedPrior: no experience falls back to the raw research row', () => {
    expect(profileAdjustedPrior('chest', null)).toEqual({
      mev: VOLUME_LANDMARKS.chest.mev,
      mav: VOLUME_LANDMARKS.chest.mav,
      mrv: VOLUME_LANDMARKS.chest.mrv,
    });
    expect(profileAdjustedPrior('not_a_muscle', null)).toBeNull();
  });

  test('profileAdjustedPrior: an experience profile genuinely adjusts the bands', () => {
    const adjusted = profileAdjustedPrior('chest', { experience: 'advanced', recoveryRating: 'average' });
    expect(adjusted).not.toBeNull();
    expect(adjusted.mev).not.toBe(VOLUME_LANDMARKS.chest.mev); // advanced multiplier applied
    expect(adjusted.mav).toBeGreaterThan(adjusted.mev);
  });

  test('VOCABULARY GUARD (Stage 6 review #4): the prior maps the phase through phaseToNutritionKey', () => {
    const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'blockLedgerGather.js'), 'utf8');
    expect(SRC).toMatch(/phaseToNutritionKey\(/);
    expect(SRC).not.toMatch(/computeLandmarks\([^)]*goalPhase/);
  });

  test('priorLedgerEntries: oldest first, only prior blocks, corrupt ledgers are no evidence', () => {
    const entry = (start, sets) => ({
      startDate: start,
      blockLedger: JSON.stringify({ entries: [{ muscle: 'back', classification: 'RESPONSIVE', observed: { startSets: sets } }] }),
    });
    const mesos = [
      entry(2000, 11), // second block
      { startDate: 1500, blockLedger: '{corrupt' }, // unparseable: skipped
      entry(1000, 10), // first block
      entry(9000, 99), // AFTER the cutoff: not prior
      { startDate: 500, blockLedger: null }, // never had a ledger: not a failed block
    ];
    const out = priorLedgerEntries(mesos, 5000, 'back');
    expect(out.map((e) => e.observed.startSets)).toEqual([10, 11]);
  });

  test('trailingStaleCount counts only the CONSECUTIVE trailing STALE run', () => {
    expect(trailingStaleCount([])).toBe(0);
    expect(trailingStaleCount([{ classification: 'STALE' }, { classification: 'RESPONSIVE' }])).toBe(0);
    expect(trailingStaleCount([
      { classification: 'RESPONSIVE' }, { classification: 'STALE' }, { classification: 'STALE' },
    ])).toBe(2);
  });
});

describe('cross-device and provenance authority (source pins)', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

  test('a cloud row with NO ledger never wipes the local one (stale device cannot regress)', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/existing\?\.block_ledger \?\? null/);
  });

  test('push sends the ledger as jsonb; pull stringifies an object row back to local TEXT', () => {
    // Re-anchored (Campaign 1 P0-8 D1): the push now OMITS the key when
    // the device has no ledger - an upsert without the column leaves the
    // cloud value untouched, where the old explicit null erased a stored
    // ledger from the cloud. Stronger protection, same jsonb parse.
    const SYNC = read('lib/sync.js');
    expect(SYNC).toMatch(/JSON\.parse\(m\.blockLedger\)/);
    expect(SYNC).toMatch(/return v == null \? \{\} : \{ block_ledger: v \}/);
    expect(read('lib/database.js')).toMatch(/typeof m\.block_ledger === 'string' \? m\.block_ledger : JSON\.stringify\(m\.block_ledger\)/);
  });

  test('the runner computes once per version, only for a FINISHED block, and fails suppression closed', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/version === LEDGER_VERSION/);
    expect(SRC).toMatch(/awaitingDecision/);
    expect(SRC).toMatch(/read_failed/);
  });

  test('the seed outcome (how the recommendation was used) is recorded on the stored ledger', () => {
    expect(read('lib/blockLedgerRunner.js')).toMatch(/seedOutcome/);
    expect(read('screens/PlansScreen.js')).toMatch(/recordSeedOutcome/);
  });

  test("the Plans buttons map by LABEL semantics: only 'adjust' applies the proposal", () => {
    // Re-anchored under D137 (fully free product, no tier split): only the
    // "Continue with adjustments" option applies the ledger proposal and
    // everything else is a true repeat. The entitlement clause is gone --
    // there is no tier to check any more (PlansScreen.js:634's own comment:
    // "only the 'adjust' option applies the full ledger, now with no
    // entitlement to check") -- but the LABEL semantics this test is really
    // pinning are unchanged: label 'adjust' seeds 'adjust', every other
    // label seeds a true repeat.
    expect(read('screens/PlansScreen.js')).toMatch(/intent === 'adjust' \? 'adjust' : 'repeat'/);
  });
});

describe('purity of the whole chain', () => {
  test('no clocks, no randomness, no I/O, tier-blind', () => {
    for (const mod of ['interBlock.js', 'blockSeed.js', 'learnedRange.js', 'blockLedgerGather.js', 'blockExplain.js']) {
      const SRC = fs.readFileSync(path.resolve(__dirname, '..', mod), 'utf8');
      expect(SRC).not.toMatch(/Date\.now|Math\.random/);
      expect(SRC).not.toMatch(/AsyncStorage|useAppStore|supabase/);
      expect(SRC).not.toMatch(/\btier\b/);
    }
  });
});
