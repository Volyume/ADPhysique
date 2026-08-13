/**
 * campaign9.progression.test.js — closeout item 1.
 *
 * Progression consistency is a SEPARATE, observable evidence dimension.
 * It says this user has been able to add load or reps on this movement.
 * It never says the movement builds more muscle than another one, and
 * these tests pin that distinction as hard as they pin the arithmetic.
 */
import { detectProgressionConsistency, detectPlateau } from '../../algorithms';
import { exerciseEvidence, rankPersonalised, RANK_TIER, EXERCISE_INTENT } from '../intent';

const sets = (weight, reps, setType = 'straight') => ([
  { weight, actualReps: reps, setType },
  { weight, actualReps: reps, setType },
]);

const stateOf = ({ intents = [], swaps = [], defaults = [], usage = [], progression = [] } = {}) => ({
  intents: new Map(intents.map((r) => [r.exerciseId, r])),
  swaps,
  defaults,
  usage: new Map(usage.map((r) => [r.exerciseId, r])),
  progression: new Map(progression.map((r) => [r.exerciseId, { status: r.status }])),
  activeMesocycleId: 'block-1',
});
const cand = (id, name, score) => ({ exercise: { id, name }, score, reason: 'similar' });

describe('detectProgressionConsistency: the law, and its limits', () => {
  test('adding load across recent sessions reads as progressing', () => {
    // newest-first
    const out = detectProgressionConsistency([sets(80, 8), sets(75, 8), sets(70, 8), sets(65, 8)]);
    expect(out.status).toBe('progressing');
    expect(out.gains).toBe(3);
  });

  test('adding reps at the same load counts too', () => {
    const out = detectProgressionConsistency([sets(70, 11), sets(70, 10), sets(70, 9), sets(70, 8)]);
    expect(out.status).toBe('progressing');
  });

  test('a flat run is "holding", never a claim the exercise is bad', () => {
    const out = detectProgressionConsistency([sets(70, 8), sets(70, 8), sets(70, 8), sets(70, 8)]);
    expect(out.status).toBe('holding');
    expect(out.gains).toBe(0);
  });

  test('fewer than three sessions is INSUFFICIENT, never optimistic', () => {
    expect(detectProgressionConsistency([sets(80, 8), sets(70, 8)]).status).toBe('insufficient');
    expect(detectProgressionConsistency([sets(80, 8)]).status).toBe('insufficient');
    expect(detectProgressionConsistency([]).status).toBe('insufficient');
  });

  test('ineligible rows cannot manufacture a gain (existing e1RM eligibility law)', () => {
    // Warm-ups and cluster rows are the only thing "improving" here.
    const withJunk = [
      sets(120, 20, 'rest_pause'), sets(120, 20, 'myo_reps'), sets(60, 5, 'warmup'), sets(60, 5, 'warmup'),
    ];
    expect(detectProgressionConsistency(withJunk).status).toBe('insufficient');
  });

  test('warm-ups are stripped before the comparison, not counted alongside', () => {
    const withWarmups = [
      [...sets(80, 8), { weight: 20, actualReps: 15, setType: 'warmup' }],
      [...sets(75, 8), { weight: 20, actualReps: 15, setType: 'warmup' }],
      [...sets(70, 8), { weight: 20, actualReps: 15, setType: 'warmup' }],
    ];
    expect(detectProgressionConsistency(withWarmups).status).toBe('progressing');
  });

  test('it cannot contradict detectPlateau on the same data', () => {
    // C12 job 2: detectPlateau now also requires the run to span real local
    // calendar time, so the shared fixtures are dated a week apart
    // (newest-first). detectProgressionConsistency has no time law of its
    // own and ignores the dates; adding them only lets the plateau half of
    // this cross-check reach its verdict, which is what the test is about.
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const T0 = new Date(2026, 4, 20, 18, 0, 0).getTime();
    const dated = (rows, i) => rows.map((r) => ({ ...r, createdAt: T0 - i * WEEK }));
    const flat = [sets(70, 8), sets(70, 8), sets(70, 8), sets(70, 8)].map(dated);
    expect(detectPlateau(flat).plateau).toBe(true);
    expect(detectProgressionConsistency(flat).status).not.toBe('progressing');
    const rising = [sets(80, 8), sets(75, 8), sets(70, 8), sets(65, 8)].map(dated);
    expect(detectPlateau(rising).plateau).toBe(false);
    expect(detectProgressionConsistency(rising).status).toBe('progressing');
  });
});

describe('progression as an evidence dimension', () => {
  test('it is reported separately, never fused into a score', () => {
    const s = stateOf({ progression: [{ exerciseId: 'e1', status: 'progressing' }] });
    const ev = exerciseEvidence(s, 'e1');
    expect(ev.progression).toBe('progressing');
    expect(Object.keys(ev)).toEqual(expect.arrayContaining(['sessions', 'trainedRecently', 'repeatedChoice', 'retained', 'swappedAway', 'tolerance', 'progression']));
    expect(Object.keys(ev)).not.toEqual(expect.arrayContaining(['score', 'fit', 'rating', 'percent', 'grade']));
  });

  test('no loaded window means insufficient, never a guess', () => {
    expect(exerciseEvidence(stateOf({}), 'e1').progression).toBe('insufficient');
  });
});

describe('progression in the ranking: it may reorder, never introduce or override', () => {
  test('it reorders structurally valid alternatives', () => {
    const s = stateOf({ progression: [{ exerciseId: 'b', status: 'progressing' }] });
    const ranked = rankPersonalised(s, [cand('a', 'A', 90), cand('b', 'B', 90)], { fromExerciseId: 'x' });
    expect(ranked[0].exercise.id).toBe('b');
    expect(ranked[0].personal.tag).toBe('Progressing consistently');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.PERSONAL_EVIDENCE);
  });

  test('it can NEVER introduce a candidate the structural engine rejected', () => {
    const s = stateOf({ progression: [{ exerciseId: 'unsuitable', status: 'progressing' }] });
    const ranked = rankPersonalised(s, [cand('a', 'A', 90)], { fromExerciseId: 'x' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['a']);
  });

  test('an explicit exclusion outranks it outright', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: 'progressing' }],
      intents: [{ exerciseId: 'b', kind: EXERCISE_INTENT.EXCLUDED }],
    });
    const ranked = rankPersonalised(s, [cand('a', 'A', 90), cand('b', 'B', 90)], { fromExerciseId: 'x' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['a']);
  });

  test('a user-approved default outranks it', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: 'progressing' }],
      defaults: [{ fromExerciseId: 'x', routineId: null, exerciseId: 'a' }],
    });
    const ranked = rankPersonalised(s, [cand('a', 'A', 90), cand('b', 'B', 90)], { fromExerciseId: 'x' });
    expect(ranked[0].exercise.id).toBe('a');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.APPROVED_DEFAULT);
  });

  test('a deliberate contextual swap history outranks it', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: 'progressing' }],
      swaps: [{ fromExerciseId: 'x', toExerciseId: 'a', explicit: 1, createdAt: 10 }],
    });
    const ranked = rankPersonalised(s, [cand('a', 'A', 90), cand('b', 'B', 90)], { fromExerciseId: 'x' });
    expect(ranked[0].exercise.id).toBe('a');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.RECENT_REPLACEMENT);
  });
});

describe('what progression copy may never claim', () => {
  test('no efficacy language in any string the user could ever see', () => {
    const read = (p) => require('fs').readFileSync(require('path').resolve(__dirname, p), 'utf8');
    // Comments are stripped first: the modules DISCUSS these claims in
    // order to forbid them, and a doc comment saying "never claims X" must
    // not read as claiming X.
    const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const rel of ['../intent.js', '../../algorithms.js']) {
      const code = stripComments(read(rel));
      expect(code).not.toMatch(/best for growth|most effective|optimal (exercise|for you)|builds more muscle|responds best/i);
    }
  });

  test('the user-facing tag states the observation, not a verdict', () => {
    const s = stateOf({ progression: [{ exerciseId: 'b', status: 'progressing' }] });
    const tag = rankPersonalised(s, [cand('b', 'B', 90)], { fromExerciseId: 'x' })[0].personal.tag;
    expect(tag).toBe('Progressing consistently');
    expect(tag).not.toMatch(/best|effective|optimal|growth|muscle/i);
  });
});
