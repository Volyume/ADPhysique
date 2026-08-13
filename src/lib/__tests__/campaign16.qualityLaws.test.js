/**
 * campaign16.qualityLaws.test.js — Campaign 16 ADDITIONAL QUALITY LAWS.
 *
 * Six laws added to the campaign after the first phases landed. They are
 * folded into the EXISTING decision and reason system rather than given a
 * campaign of their own, which is what the founder asked for.
 *
 *   1. Distinguish temporary session swaps from persistent programme
 *      replacements and explicit Don't Suggest. A one-day
 *      equipment-availability substitution must not teach negative
 *      exercise preference.
 *   2. New/replacement exercises begin with insufficient personal
 *      evidence. Do not transfer confidence or working load from the
 *      exercise they replaced.
 *   3. Exercise Intelligence must expose evidence maturity/confidence so
 *      generic canonicality dominates when evidence is weak and legitimate
 *      personal evidence increasingly dominates as it becomes established.
 *   4. Exercise selection must consider whole-programme fatigue
 *      compatibility as well as local coverage.
 *   5. Generated routine ordering must be sensible even though Volyume
 *      does not control calendar rest days.
 *   6. KEEP is a first-class intelligent decision.
 *
 * Two of these closed live defects rather than adding polish:
 *
 *   Law 1: ActiveWorkoutScreen recorded a swap made mid-workout - on a
 *   sheet that explicitly says the plan is unchanged, usually because the
 *   machine was busy - in exactly the shape RoutineDetailScreen used for a
 *   permanent plan edit. Both fed one counter and two busy-machine days
 *   were enough to have the exercise proposed for removal.
 *
 *   Law 5: the 5-day balanced upper/lower split emitted Lower, Upper,
 *   Lower, Upper, UPPER - two identical upper days back to back, because
 *   the interleave emptied the shorter list first.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../planEngine');
const {
  swappedAwayCount, sessionSubstitutionCount, exerciseEvidence,
  evidenceMaturity, maturityWeight, EVIDENCE_MATURITY, ESTABLISHED_SESSIONS,
  rankPersonalised, RANK_TIER,
} = require('../exercise/intent');
const { SWAP_SCOPE } = require('../exercise/swapScope');
const { slotVerdict, SLOT_VERDICT, SLOT_REASON } = require('../programmeEpoch');
const { LIBRARY, inputs } = require('./campaign16.helpers');

const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

const stateOf = ({ swaps = [], usage = [], intents = [] } = {}) => ({
  intents: new Map(intents.map(r => [r.exerciseId, r])),
  swaps,
  defaults: [],
  usage: new Map(usage.map(r => [r.exerciseId, r])),
  progression: new Map(),
  activeMesocycleId: 'block-1',
});

// ---------------------------------------------------------------------------

describe('LAW 1 a session substitution is not a statement about the exercise', () => {
  const swaps = [
    { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 1, scope: SWAP_SCOPE.SESSION },
    { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 2, scope: SWAP_SCOPE.SESSION },
    { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 3, scope: SWAP_SCOPE.SESSION },
  ];

  test('three busy-machine days do NOT count as swapping the exercise away', () => {
    const s = stateOf({ swaps });
    expect(swappedAwayCount(s, 'bench')).toBe(0);
    expect(sessionSubstitutionCount(s, 'bench')).toBe(3);
  });

  test('and therefore cannot reach the replace threshold', () => {
    const s = stateOf({ swaps });
    const { verdict } = slotVerdict({ swappedAwayCount: swappedAwayCount(s, 'bench') });
    expect(verdict).not.toBe(SLOT_VERDICT.REPLACE);
  });

  test('two PROGRAMME replacements still do', () => {
    const s = stateOf({ swaps: [
      { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 1, scope: SWAP_SCOPE.PROGRAMME },
      { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 2, scope: SWAP_SCOPE.PROGRAMME },
    ] });
    expect(swappedAwayCount(s, 'bench')).toBe(2);
    const { verdict, reason } = slotVerdict({ swappedAwayCount: swappedAwayCount(s, 'bench') });
    expect(verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('an unknown-scope legacy row never costs the user an exercise', () => {
    // Rows recorded before scope existed cannot be classified. The negative
    // reading declines to guess; the cost of under-counting is one more
    // deliberate swap, the cost of over-counting is deleting something the
    // user likes.
    const s = stateOf({ swaps: [
      { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 1 },
      { fromExerciseId: 'bench', toExerciseId: 'db-press', createdAt: 2 },
    ] });
    expect(swappedAwayCount(s, 'bench')).toBe(0);
  });

  test('the two screens record DIFFERENT scopes, which is the whole fix', () => {
    const active = fs.readFileSync(
      path.resolve(__dirname, '../../screens/ActiveWorkoutScreen.js'), 'utf8');
    const routine = fs.readFileSync(
      path.resolve(__dirname, '../../screens/RoutineDetailScreen.js'), 'utf8');
    expect(active).toMatch(/scope: SWAP_SCOPE\.SESSION/);
    expect(active).not.toMatch(/scope: SWAP_SCOPE\.PROGRAMME/);
    expect(routine).toMatch(/scope: SWAP_SCOPE\.PROGRAMME/);
    expect(routine).not.toMatch(/scope: SWAP_SCOPE\.SESSION/);
  });

  test('explicit Don\'t Suggest remains a THIRD, stronger fact of its own', () => {
    // It lives in exercise_intent, not in the swap log, because it is
    // intent rather than an event - and it outranks both.
    const { verdict, reason } = slotVerdict({ excluded: true, swappedAwayCount: 0 });
    expect(verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(reason).toBe(SLOT_REASON.USER_EXCLUDED);
  });
});

describe('LAW 2 a replacement starts with no personal evidence of its own', () => {
  test('a brand-new exercise reports the lowest maturity', () => {
    const s = stateOf({ usage: [{ exerciseId: 'old', sessions: 20, lastTrainedMs: Date.now() }] });
    expect(exerciseEvidence(s, 'new').maturity).toBe(EVIDENCE_MATURITY.NONE);
    expect(exerciseEvidence(s, 'new').sessions).toBe(0);
  });

  test('the exercise it replaced keeps its own history, and lends none of it', () => {
    const s = stateOf({
      usage: [{ exerciseId: 'old', sessions: 20, lastTrainedMs: Date.now() }],
      swaps: [{ fromExerciseId: 'old', toExerciseId: 'new', createdAt: 1, scope: SWAP_SCOPE.PROGRAMME }],
    });
    expect(exerciseEvidence(s, 'old').maturity).toBe(EVIDENCE_MATURITY.ESTABLISHED);
    // Being chosen once is a choice, not exposures.
    expect(exerciseEvidence(s, 'new').sessions).toBe(0);
    expect(exerciseEvidence(s, 'new').maturity).not.toBe(EVIDENCE_MATURITY.ESTABLISHED);
  });

  test('maturity is earned by actual exposures', () => {
    expect(evidenceMaturity({ sessions: 0 })).toBe(EVIDENCE_MATURITY.NONE);
    expect(evidenceMaturity({ sessions: 1 })).toBe(EVIDENCE_MATURITY.EMERGING);
    expect(evidenceMaturity({ sessions: ESTABLISHED_SESSIONS })).toBe(EVIDENCE_MATURITY.ESTABLISHED);
  });

  test('no working load travels with a replacement', () => {
    // The other half of law 2, enforced at the database seam: a swap
    // clears starting_weight rather than carrying a barbell number onto a
    // machine. Pinned behaviourally in campaign16.prescription; pinned here
    // as the LAW so the two cannot drift apart.
    const src = fs.readFileSync(path.resolve(__dirname, '../database.js'), 'utf8');
    const fn = src.slice(src.indexOf('export async function updateRoutineExerciseExercise'));
    expect(fn.slice(0, 4000)).toMatch(/starting_weight = NULL/);
  });
});

describe('LAW 3 generic judgement leads until personal evidence is established', () => {
  test('weight rises with maturity, and is zero with no exposures', () => {
    expect(maturityWeight(EVIDENCE_MATURITY.NONE)).toBe(0);
    expect(maturityWeight(EVIDENCE_MATURITY.EMERGING)).toBeGreaterThan(0);
    expect(maturityWeight(EVIDENCE_MATURITY.ESTABLISHED))
      .toBeGreaterThan(maturityWeight(EVIDENCE_MATURITY.EMERGING));
  });

  test('with NO evidence, the recognisable movement leads', () => {
    // Both candidates are structurally valid and neither has any history.
    // Canonicality is all there is to go on, and a staple beats a niche
    // powerlifting press.
    const s = stateOf({});
    const ranked = rankPersonalised(s, [
      { exercise: { id: 'jm', name: 'JM Press' }, score: 10 },
      { exercise: { id: 'rope', name: 'Rope Pushdown' }, score: 10 },
    ], { fromExerciseId: 'src' });
    expect(ranked[0].exercise.name).toBe('Rope Pushdown');
  });

  test('ESTABLISHED personal evidence overturns that generic order', () => {
    const now = Date.now();
    const s = stateOf({
      usage: [{ exerciseId: 'jm', sessions: 12, lastTrainedMs: now }],
      swaps: Array.from({ length: 3 }, (_, i) => ({
        fromExerciseId: 'src', toExerciseId: 'jm', createdAt: now - i, scope: SWAP_SCOPE.PROGRAMME,
      })),
    });
    const ranked = rankPersonalised(s, [
      { exercise: { id: 'jm', name: 'JM Press' }, score: 10 },
      { exercise: { id: 'rope', name: 'Rope Pushdown' }, score: 10 },
    ], { fromExerciseId: 'src', nowMs: now });
    expect(ranked[0].exercise.name).toBe('JM Press');
    expect(ranked[0].personal.maturity).toBe(EVIDENCE_MATURITY.ESTABLISHED);
  });

  test('an APPROVED DEFAULT is intent, not evidence, and is never maturity-gated', () => {
    // The user pressed a button. That does not need exposures to be
    // believed, and it must not be diluted by them.
    const s = {
      ...stateOf({}),
      defaults: [{ fromExerciseId: 'src', exerciseId: 'jm', routineId: null }],
    };
    const ranked = rankPersonalised(s, [
      { exercise: { id: 'rope', name: 'Rope Pushdown' }, score: 99 },
      { exercise: { id: 'jm', name: 'JM Press' }, score: 1 },
    ], { fromExerciseId: 'src' });
    expect(ranked[0].exercise.id).toBe('jm');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.APPROVED_DEFAULT);
  });

  test('maturity is reported as a named level, never a confidence percentage', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../exercise/intent.js'), 'utf8');
    const region = src.slice(src.indexOf('export const EVIDENCE_MATURITY'));
    expect(region).not.toMatch(/confidencePercent|confidence: \d|score: \d/);
    expect(Object.values(EVIDENCE_MATURITY)).toEqual(['none', 'emerging', 'established']);
  });
});

describe('LAW 4 whole-session fatigue compatibility', () => {
  test('the library fatigue rating reaches the selection pool', () => {
    const { toPoolEntry } = require('../poolGenerator');
    const entry = toPoolEntry({
      name: 'Conventional Deadlift', primaryMuscle: 'back', equipmentCategory: 'barbell',
      compoundIsolation: 'compound', equipmentProfiles: ['full_gym'], fatigueCost: 5,
    });
    expect(entry.fatigue).toBe(5);
  });

  test('no session stacks an unreasonable number of very demanding movements', () => {
    const offenders = [];
    for (const over of [{}, { daysPerWeek: 3 }, { daysPerWeek: 5 }, { daysPerWeek: 6 },
      { experience: 'advanced', daysPerWeek: 6 }, { goal: 'bodybuilding', daysPerWeek: 5 },
      { goal: 'classic_physique', daysPerWeek: 5 }, { goal: 'wellness', daysPerWeek: 5 }]) {
      const p = plan(over);
      for (const w of p.workouts) {
        const high = w.exercises.filter(
          e => (BY_NAME.get(e.exerciseName)?.fatigueCost ?? 0) >= 4).length;
        // The nudge is a preference between equally valid options, not a
        // hard cap, so this is a generous ceiling: it catches a session
        // built ENTIRELY out of the most demanding lifts available.
        if (high > 4) offenders.push(`${JSON.stringify(over)}/${w.name}: ${high}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('fatigue is a nudge and can never leave a required family uncovered', () => {
    // The weight is deliberately an order of magnitude below the
    // required-coverage term, so coverage always wins.
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    const fn = src.slice(src.indexOf('function sortScore'), src.indexOf('const sorted = rank('));
    expect(fn).toMatch(/fatiguePenalty/);
    expect(fn).toMatch(/const reqBonus\s+= satisfiesAnyRequiredRole\(e\) \? 0 : 100/);
    // and never a filter
    expect(fn).not.toMatch(/filter\(.*fatigue/);
  });

  test('an unknown fatigue rating is never penalised', () => {
    // The hand-written fallback pool carries no rating. Treating unknown as
    // high would quietly demote every fallback exercise.
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(src).toMatch(/e\.fatigue != null && e\.fatigue >= HIGH_FATIGUE_COST/);
  });
});

describe('LAW 5 consecutive sessions do not repeat the same demand', () => {
  const musclesOf = w => new Set(
    w.exercises.map(e => BY_NAME.get(e.exerciseName)?.primaryMuscle).filter(Boolean));
  const overlap = (a, b) => {
    const inter = [...a].filter(x => b.has(x)).length;
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : inter / union;
  };

  test('no split places two near-identical sessions back to back', () => {
    const offenders = [];
    for (const over of [{ daysPerWeek: 3 }, { daysPerWeek: 4 }, { daysPerWeek: 5 },
      { daysPerWeek: 6 }, { experience: 'advanced', daysPerWeek: 5 },
      { experience: 'advanced', daysPerWeek: 6 }, { goal: 'bikini', daysPerWeek: 5 },
      { goal: 'bikini', daysPerWeek: 6 }, { goal: 'wellness', daysPerWeek: 5 },
      { goal: 'bodybuilding', daysPerWeek: 5 }, { goal: 'classic_physique', daysPerWeek: 5 },
      { goal: 'womens_physique', daysPerWeek: 5 }, { goal: 'figure', daysPerWeek: 5 }]) {
      const p = plan(over);
      // A full-body split trains everything every session by definition;
      // overlap there is the design, not a scheduling mistake.
      if (p.splitType === 'full_body') continue;
      const ms = p.workouts.map(musclesOf);
      for (let i = 0; i < ms.length - 1; i++) {
        if (overlap(ms[i], ms[i + 1]) > 0.5) {
          offenders.push(`${JSON.stringify(over)} ${p.splitType}: ${p.workouts[i].name} -> ${p.workouts[i + 1].name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the 5-day balanced split specifically alternates all the way through', () => {
    // The regression: it used to end Lower, Upper, Lower, Upper, UPPER.
    const p = plan({ daysPerWeek: 5 });
    expect(p.splitType).toBe('balanced_ul');
    const kinds = p.workouts.map(w => (w.name.startsWith('Upper') ? 'U' : 'L'));
    for (let i = 0; i < kinds.length - 1; i++) {
      expect(`${i}:${kinds[i]}${kinds[i + 1]}`).not.toBe(`${i}:UU`);
      expect(`${i}:${kinds[i]}${kinds[i + 1]}`).not.toBe(`${i}:LL`);
    }
  });

  test('a lower-priority division still opens its week on lower work', () => {
    // The ordering fix must not cost the lower-focus divisions the reason
    // the interleave was lower-first to begin with.
    for (const goal of ['bikini', 'wellness']) {
      const p = plan({ goal, daysPerWeek: 5 });
      const first = musclesOf(p.workouts[0]);
      const lower = ['glutes', 'quads', 'hamstrings', 'calves'];
      expect({ goal, opensLower: lower.some(m => first.has(m)) })
        .toEqual({ goal, opensLower: true });
    }
  });
});

describe('LAW 6 KEEP is a decision, recorded with its reason', () => {
  test('every KEEP verdict names a positive reason', () => {
    const cases = [
      [{ progressing: true }, SLOT_REASON.STILL_PRODUCTIVE],
      [{ establishedPersonalFit: true }, SLOT_REASON.PERSONAL_FIT_KEEP],
      [{}, SLOT_REASON.INSUFFICIENT_HISTORY],
    ];
    for (const [evidence, expected] of cases) {
      const { verdict, reason } = slotVerdict(evidence, { epochBlocks: 0 });
      expect(verdict).toBe(SLOT_VERDICT.KEEP);
      expect(reason).toBe(expected);
      expect(reason).toBeTruthy();
    }
  });

  test('an established personal fit is its own reason, not "nothing was wrong"', () => {
    const withFit = slotVerdict({ establishedPersonalFit: true }, { epochBlocks: 5 });
    const without = slotVerdict({}, { epochBlocks: 5 });
    expect(withFit.reason).toBe(SLOT_REASON.PERSONAL_FIT_KEEP);
    expect(without.reason).toBe(SLOT_REASON.NO_REASON_TO_CHANGE);
    expect(withFit.reason).not.toBe(without.reason);
  });

  test('a KEEP reason can never be null, at any epoch age', () => {
    for (const epochBlocks of [0, 1, 2, 3, 6, 12]) {
      const { verdict, reason } = slotVerdict({ sessions: 3 }, { epochBlocks });
      if (verdict === SLOT_VERDICT.KEEP) expect(reason).toBeTruthy();
    }
  });

  test('positive evidence protects a movement at every epoch age', () => {
    // Law 6 read together with the amendment: a productive exercise is
    // never rotated for novelty, and the KEEP says why.
    for (const epochBlocks of [3, 6, 12, 30]) {
      const { verdict, reason } = slotVerdict(
        { progressing: true, systematicCandidate: true }, { epochBlocks });
      expect(verdict).toBe(SLOT_VERDICT.KEEP);
      expect(reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
    }
  });
});
