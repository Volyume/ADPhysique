/**
 * campaign6.dividend.test.js — the personalisation dividend, pinned
 * permanently against the REAL pure chain (C6 RA6-7, D97-25).
 *
 * PERSONALISATION-DIVIDEND.md's §1 counterfactual table was produced by
 * a session-scratch probe and cited three suites that do not pin its
 * headline arc (Review A, RA6-7). This suite IS the missing home: every
 * §1 row is recomputed here from the shipping modules
 * (profileAdjustedPrior → computeLearnedRange → resolveSeedRange →
 * classifyMuscleBlock) and asserted, including the commissioned
 * "Block 6 WITHOUT history" counterfactual. If an engine change moves
 * any number in that document, this suite fails and the document must
 * be re-verified rather than silently drifting into aspiration.
 *
 * Mechanism truth pinned alongside the numbers (RA6-7 corrections):
 *  - the calves reduction is the RESPONSIVE handled-peak rule (the
 *    ceiling learns what the athlete actually delivered), NOT a
 *    STRAINED/OVERREACHED fold — the arc contains neither class;
 *  - the calves "21" is the PROFILE-ADJUSTED MAV, not the research MAV
 *    (research calves MAV is lower), so the dividend is measured
 *    against the profile prior, exactly as the doc now states.
 */
import { computeLearnedRange } from '../lib/learnedRange';
import { classifyMuscleBlock, BLOCK_CLASS } from '../lib/interBlock';
import { resolveSeedRange } from '../lib/blockSeed';
import { profileAdjustedPrior } from '../lib/blockLedgerGather';
import { VOLUME_LANDMARKS } from '../lib/algorithms';

const PROFILE = { experience: 'intermediate', recoveryRating: 'average', trainingPhase: 'lean_gain', age: 31 };
const research = (m) => ({ mev: VOLUME_LANDMARKS[m].mev, mav: VOLUME_LANDMARKS[m].mav, mrv: VOLUME_LANDMARKS[m].mrv });
const perf = (o = {}) => ({
  e1rmSlopePct: 2, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
  confidence: 0.9, discontinuity: false, doseResponse: null, ...o,
});
const rec = (o = {}) => ({
  sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
  sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
  dataPoints: 8, ...o,
});
const PAIR = { doseResponse: { lateProgression: true, lateRecoveryOk: true }, e1rmSlopePct: 3 };

function runBlock({ muscle, history, script, suppressed = false, manual = null, intent = 'adjust' }) {
  const prior = profileAdjustedPrior(muscle, PROFILE);
  const learned = computeLearnedRange({
    prior, researchMev: research(muscle).mev, ledgerHistory: history, muscle,
  });
  const seed = resolveSeedRange({
    manual, ledgerEntry: history.length ? history[history.length - 1] : null,
    learnedRange: learned, profileAdjusted: prior, research: research(muscle),
    suppressed, intent,
  });
  const entry = classifyMuscleBlock({
    muscle, landmarks: prior, researchMev: research(muscle).mev,
    learnedCeiling: learned.isLearned ? learned.ceiling : null,
    manualOverride: !!manual, previousStart: seed.startSets,
    plannedPeak: seed.peakSets, achievedPeak: script.achievedPeak ?? seed.peakSets,
    priorFlatBlocks: 0,
    adherence: script.adherence ?? { plannedSets: 70, completedSets: 64 },
    performance: perf(script.perf ?? {}), recovery: rec(script.rec ?? {}),
  }, { suppressed, weeksSinceBlockEnd: 0 });
  history.push(entry);
  return { learned, seed, entry };
}

const noHistorySeed = (muscle) => resolveSeedRange({
  manual: null, ledgerEntry: null, learnedRange: null,
  profileAdjusted: profileAdjustedPrior(muscle, PROFILE),
  research: research(muscle), suppressed: false, intent: 'adjust',
});

describe('§1 row 1 — the headline chest arc (evidence every block, adjust intent)', () => {
  test('earned +1 per block climbs 6 → 11 by Block 6; without history Block 6 would restart at 6', () => {
    const history = [];
    const starts = [];
    let last = null;
    for (let i = 0; i < 6; i += 1) {
      last = runBlock({ muscle: 'chest', history, script: { perf: PAIR } });
      starts.push(last.seed.startSets);
    }
    expect(starts).toEqual([6, 7, 8, 9, 10, 11]);
    expect(last.entry.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    const counterfactual = noHistorySeed('chest');
    expect(counterfactual.startSets).toBe(6);
    // The dividend: +5 weekly starting sets of EARNED progression.
    expect(starts[5] - counterfactual.startSets).toBe(5);
    // Both prescriptions share the same profile peak frame.
    expect(last.seed.peakSets).toBe(counterfactual.peakSets);
  });
});

describe('§1 row 2 — the disrupted chest arc (exercise change B4, calm B5)', () => {
  test('the working start honestly resets, but the learned band survives the disruption', () => {
    const history = [];
    const scripts = [
      { script: { perf: PAIR } },
      { script: { perf: {} } },
      { script: { perf: PAIR }, intent: 'repeat' },
      { script: { perf: { discontinuity: true } } },
      { script: { perf: PAIR }, suppressed: true },
      { script: { perf: {} } },
    ];
    let last = null;
    scripts.forEach((cfg) => { last = runBlock({ muscle: 'chest', history, ...cfg }); });
    const counterfactual = noHistorySeed('chest');
    // Numbers deliberately COINCIDE with the no-history prescription...
    expect(last.seed.startSets).toBe(counterfactual.startSets);
    expect(last.seed.peakSets).toBe(counterfactual.peakSets);
    // ...but the app still KNOWS: the band is learned, the memory kept.
    expect(last.learned.isLearned).toBe(true);
  });
});

describe('§1 row 3 — side delts, the retained-dose case', () => {
  test('no earned pairs means Block 6 = Block 1 = the no-history seed, by evidence rather than assumption', () => {
    const history = [];
    let first = null;
    let last = null;
    for (let i = 0; i < 6; i += 1) {
      last = runBlock({
        muscle: 'side_delts', history, script: { perf: {} },
        manual: i === 3 ? { mev: 12, mav: 20, mrv: 24 } : null,
      });
      if (i === 0) first = last;
      if (i === 3) {
        // Manual ownership: the user's own table wins the seed outright...
        expect(last.seed.startSets).toBe(12);
        // ...and teaches nothing (deferred, not learned from).
        expect(last.entry.proposal.deferredToManual).toBe(true);
      }
    }
    const counterfactual = noHistorySeed('side_delts');
    expect(last.seed.startSets).toBe(first.seed.startSets);
    expect(last.seed.startSets).toBe(counterfactual.startSets);
    expect(last.seed.peakSets).toBe(counterfactual.peakSets);
  });
});

describe('§1 row 4 — calves, the handled-volume reduction (RA6-7 corrected mechanism)', () => {
  test('six blocks hone the peak to what the muscle actually handled; without history the profile prior would re-prescribe its full MAV', () => {
    const history = [];
    const classes = [];
    const scripts = [
      { script: { perf: {}, achievedPeak: 14 } },
      { script: { perf: {}, achievedPeak: 15 } },
      { script: { perf: {}, achievedPeak: 15 }, intent: 'repeat' },
      { script: { perf: {}, rec: { dataPoints: 3, sorenessLateAvg: null, jointDiscomfortAvg: null }, adherence: { plannedSets: 70, completedSets: 45 } } },
      { script: { perf: { e1rmSlopePct: 3 }, achievedPeak: 21 }, suppressed: true },
      { script: { perf: {} } },
    ];
    let last = null;
    scripts.forEach((cfg) => {
      last = runBlock({ muscle: 'calves', history, ...cfg });
      classes.push(last.entry.classification);
    });
    const prior = profileAdjustedPrior('calves', PROFILE);
    const counterfactual = noHistorySeed('calves');
    // WITH history the peak is honed down to the handled volume...
    expect(last.seed.peakSets).toBe(15);
    // ...WITHOUT history the profile prior would prescribe its full MAV.
    expect(counterfactual.peakSets).toBe(prior.mav);
    expect(counterfactual.peakSets).toBe(21);
    // RA6-7 correction 3: 21 is the PROFILE-ADJUSTED MAV, not research.
    expect(research('calves').mav).toBeLessThan(prior.mav);
    // RA6-7 correction 2: the mechanism is the RESPONSIVE handled-peak
    // rule — this arc contains no STRAINED and no OVERREACHED block, so
    // the reduction cannot be attributed to the strain fold rules.
    expect(classes).not.toContain(BLOCK_CLASS.STRAINED);
    expect(classes).not.toContain(BLOCK_CLASS.OVERREACHED);
    // The suppressed block's 21-set peak never raised the ceiling.
    expect(last.learned.ceiling).toBe(15);
  });
});
