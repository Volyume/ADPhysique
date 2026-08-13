/**
 * campaign9.intent.test.js — the canonical exercise-intent layer's product
 * laws (Campaign 9, Works 1-4).
 *
 * These run against the REAL module. What they pin are founder laws, not
 * implementation details:
 *
 *   - explicit user intent outranks every inferred preference
 *   - exclusion is about future suggestions, never about history
 *   - block-scoped avoidance expires at the block boundary, on no timer
 *   - ranking exposure is not preference evidence
 *   - no exercise is ever claimed to be better for growth
 *   - a new exercise is allowed to say "not enough history yet"
 */
import {
  loadExerciseIntentState,
  isExcluded, isAvoidedThisBlock, isEligible, filterEligible,
  approvedDefaultFor, swapEvidenceFor, swappedAwayCount, sessionSubstitutionCount, previouslyUsedBefore,
  exerciseEvidence, repeatedDefaultCandidate, rankPersonalised,
  EXERCISE_INTENT, RANK_TIER, REPEATED_SWAP_MIN,
} from '../intent';

jest.mock('../../database', () => ({
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block' },
  getExerciseIntents: jest.fn(),
  getExerciseSwaps: jest.fn(),
  getExerciseSlotDefaults: jest.fn(),
  getExerciseUsageStats: jest.fn(),
}));
const db = require('../../database');

const DAY = 24 * 60 * 60 * 1000;

/** Build a state object without going through the database. */
function stateOf({ intents = [], swaps = [], defaults = [], usage = [], activeMesocycleId = 'block-2' } = {}) {
  return {
    intents: new Map(intents.map((r) => [r.exerciseId, r])),
    swaps,
    defaults,
    usage: new Map(usage.map((r) => [r.exerciseId, r])),
    activeMesocycleId,
  };
}

const cand = (id, name, score) => ({ exercise: { id, name }, score, reason: 'similar' });

// ─── Exclusion ───────────────────────────────────────────────────────────────

describe('exclusion: "Don\'t suggest this exercise"', () => {
  const excluded = stateOf({ intents: [{ exerciseId: 'bench', kind: EXERCISE_INTENT.EXCLUDED }] });

  test('an excluded exercise is not eligible to be suggested', () => {
    expect(isExcluded(excluded, 'bench')).toBe(true);
    expect(isEligible(excluded, 'bench')).toBe(false);
    expect(isEligible(excluded, 'incline-db')).toBe(true);
  });

  test('it is filtered out of any candidate list', () => {
    const list = [{ id: 'bench' }, { id: 'incline-db' }, { id: 'dip' }];
    expect(filterEligible(excluded, list).map((e) => e.id)).toEqual(['incline-db', 'dip']);
  });

  test('exclusion touches NO history: the layer cannot reach workouts, sets or PRs', () => {
    const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../intent.js'), 'utf8');
    // The module imports only intent/swap/default/usage readers. If a
    // history mutator ever appears here, that is the bug this pins.
    expect(SRC).not.toMatch(/deleteWorkout|deleteSet|removeWorkoutSet|DELETE FROM workout/i);
    // And it is read-only: the import block pulls in readers only, so the
    // layer physically cannot write evidence while ranking.
    const imports = SRC.slice(SRC.indexOf("} from '../database'") - 400, SRC.indexOf("} from '../database'"));
    expect(imports).not.toMatch(/recordExerciseSwap|setExerciseIntent|setExerciseSlotDefault|clearExercise/);
    expect(imports).toMatch(/getExerciseIntents/);
  });

  test('restoring clears the suppression completely (no secret residue)', () => {
    // "Allow again" removes the row; the layer then has nothing to say.
    const restored = stateOf({ intents: [] });
    expect(isExcluded(restored, 'bench')).toBe(false);
    expect(isEligible(restored, 'bench')).toBe(true);
    expect(filterEligible(restored, [{ id: 'bench' }]).map((e) => e.id)).toEqual(['bench']);
  });
});

// ─── Block-scoped avoidance ──────────────────────────────────────────────────

describe('avoidance: "Avoid for this block"', () => {
  const rows = [{ exerciseId: 'squat', kind: EXERCISE_INTENT.AVOIDED_BLOCK, scopeMesocycleId: 'block-2' }];

  test('is live while its own block is the current one', () => {
    const s = stateOf({ intents: rows, activeMesocycleId: 'block-2' });
    expect(isAvoidedThisBlock(s, 'squat')).toBe(true);
    expect(isEligible(s, 'squat')).toBe(false);
  });

  test('EXPIRES at the block boundary, with no calendar duration involved', () => {
    const s = stateOf({ intents: rows, activeMesocycleId: 'block-3' });
    expect(isAvoidedThisBlock(s, 'squat')).toBe(false);
    expect(isEligible(s, 'squat')).toBe(true);
  });

  test('is not confused with an indefinite exclusion', () => {
    const s = stateOf({ intents: rows, activeMesocycleId: 'block-2' });
    expect(isExcluded(s, 'squat')).toBe(false);
  });
});

// ─── Swap memory ─────────────────────────────────────────────────────────────

describe('swap memory is contextual, not global', () => {
  const swaps = [
    { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', routineId: 'r1', explicit: 1, createdAt: 300 },
    { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', routineId: 'r1', explicit: 1, createdAt: 200 },
    { fromExerciseId: 'bb-row', toExerciseId: 'lat-pull', routineId: 'r1', explicit: 1, createdAt: 100 },
    { fromExerciseId: 'squat', toExerciseId: 'hack', routineId: 'r2', explicit: 1, createdAt: 400 },
  ];
  const s = stateOf({ swaps });

  test('evidence is keyed by the SOURCE exercise, never "the user prefers X"', () => {
    expect(swapEvidenceFor(s, 'bb-row').map((e) => e.exerciseId)).toEqual(['cs-row', 'lat-pull']);
    // A swap made instead of a different exercise says nothing here.
    expect(swapEvidenceFor(s, 'squat').map((e) => e.exerciseId)).toEqual(['hack']);
  });

  test('repeated choices outrank one-off choices', () => {
    const [top] = swapEvidenceFor(s, 'bb-row');
    expect(top).toEqual(expect.objectContaining({ exerciseId: 'cs-row', count: 2 }));
  });

  // RE-ANCHORED, C16 quality law 1. This used to count every swap row.
  // Since scope exists, only a PROGRAMME swap is negative preference: a
  // substitution made mid-workout because the machine was busy must not
  // teach Volyume that the user dislikes the exercise. The fixture rows
  // predate scope and are therefore unknown, which is exactly the case the
  // law says must not count.
  test('swapped-away frequency counts programme swaps only', () => {
    expect(swappedAwayCount(s, 'bb-row')).toBe(0);
    expect(swappedAwayCount(s, 'cs-row')).toBe(0);

    const scoped = stateOf({
      swaps: [
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 300, scope: 'programme' },
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 200, scope: 'session' },
        { fromExerciseId: 'bb-row', toExerciseId: 'lat-pull', explicit: 1, createdAt: 100, scope: 'programme' },
      ],
    });
    expect(swappedAwayCount(scoped, 'bb-row')).toBe(2);
    expect(sessionSubstitutionCount(scoped, 'bb-row')).toBe(1);
  });

  test('the positive reading still counts EVERY swap, whatever its scope', () => {
    // Choosing something is a positive signal however it happened. Only the
    // negative reading is scope-gated.
    expect(swapEvidenceFor(s, 'bb-row').map((e) => e.count)).toEqual([2, 1]);
  });

  test('the previous exercise stays findable after a second swap', () => {
    expect(previouslyUsedBefore(s, 'cs-row')).toBe('bb-row');
  });

  test('but an EXCLUDED previous exercise is never resurfaced', () => {
    const excl = stateOf({ swaps, intents: [{ exerciseId: 'bb-row', kind: EXERCISE_INTENT.EXCLUDED }] });
    expect(previouslyUsedBefore(excl, 'cs-row')).toBeNull();
  });
});

// ─── Explicit intent beats inference ─────────────────────────────────────────

describe('explicit intent outranks inferred preference', () => {
  const swaps = [
    { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', routineId: 'r1', explicit: 1, createdAt: 300 },
    { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', routineId: 'r1', explicit: 1, createdAt: 200 },
  ];

  test('an approved default wins over a repeatedly chosen alternative', () => {
    const s = stateOf({
      swaps,
      defaults: [{ fromExerciseId: 'bb-row', routineId: null, exerciseId: 'seal-row' }],
    });
    const ranked = rankPersonalised(s, [cand('cs-row', 'Chest-Supported Row', 90), cand('seal-row', 'Seal Row', 80)], { fromExerciseId: 'bb-row' });
    expect(ranked[0].exercise.id).toBe('seal-row');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.APPROVED_DEFAULT);
    expect(ranked[0].personal.tag).toBe('Your default here');
  });

  test('a routine-specific default beats a plan-wide one (context wins)', () => {
    const s = stateOf({
      defaults: [
        { fromExerciseId: 'bb-row', routineId: null, exerciseId: 'seal-row' },
        { fromExerciseId: 'bb-row', routineId: 'r1', exerciseId: 'cs-row' },
      ],
    });
    expect(approvedDefaultFor(s, 'bb-row', 'r1')).toBe('cs-row');
    expect(approvedDefaultFor(s, 'bb-row', 'r9')).toBe('seal-row');
  });

  test('an exclusion made LATER beats an approved default made earlier', () => {
    const s = stateOf({
      defaults: [{ fromExerciseId: 'bb-row', routineId: null, exerciseId: 'seal-row' }],
      intents: [{ exerciseId: 'seal-row', kind: EXERCISE_INTENT.EXCLUDED }],
    });
    expect(approvedDefaultFor(s, 'bb-row')).toBeNull();
  });

  test('an excluded exercise cannot be ranked back in by swap history', () => {
    const s = stateOf({ swaps, intents: [{ exerciseId: 'cs-row', kind: EXERCISE_INTENT.EXCLUDED }] });
    const ranked = rankPersonalised(s, [cand('cs-row', 'Chest-Supported Row', 90), cand('seal-row', 'Seal Row', 80)], { fromExerciseId: 'bb-row' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['seal-row']);
  });
});

// ─── Ranking behaviour ───────────────────────────────────────────────────────

describe('personalised ordering', () => {
  test('a repeatedly chosen replacement outranks an unrelated alphabetical option', () => {
    const s = stateOf({
      swaps: [
        // 'one-off' is the MOST RECENT, so it takes the recency tier and
        // leaves 'cs-row' to be judged purely on repetition.
        { fromExerciseId: 'bb-row', toExerciseId: 'one-off', explicit: 1, createdAt: 400 },
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 300 },
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 200 },
      ],
    });
    // 'apron-row' sorts first alphabetically and scores the same.
    const ranked = rankPersonalised(
      s,
      [cand('apron-row', 'Apron Row', 90), cand('cs-row', 'Chest-Supported Row', 90)],
      { fromExerciseId: 'bb-row' },
    );
    expect(ranked[0].exercise.id).toBe('cs-row');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.REPEATED_REPLACEMENT);
    expect(ranked[0].personal.tag).toBe("You've chosen this replacement several times");
    expect(ranked[1].exercise.id).toBe('apron-row');
  });

  test('the most recent replacement for this slot leads', () => {
    const s = stateOf({
      swaps: [
        { fromExerciseId: 'bb-row', toExerciseId: 'seal-row', explicit: 1, createdAt: 400 },
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 300 },
        { fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: 200 },
      ],
    });
    const ranked = rankPersonalised(
      s,
      [cand('cs-row', 'Chest-Supported Row', 90), cand('seal-row', 'Seal Row', 90)],
      { fromExerciseId: 'bb-row' },
    );
    expect(ranked[0].exercise.id).toBe('seal-row');
    expect(ranked[0].personal.tag).toBe('Last used here');
  });

  test('structural suitability is NOT overridden by recency', () => {
    // rankPersonalised only reorders what the structural engine already
    // judged suitable; it cannot introduce a candidate. An unsuitable
    // exercise the user trained yesterday is simply absent.
    const s = stateOf({ usage: [{ exerciseId: 'bicep-curl', sessions: 40, lastTrainedMs: Date.now() }] });
    const ranked = rankPersonalised(s, [cand('incline-db', 'Incline DB Press', 95)], { fromExerciseId: 'bench' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['incline-db']);
  });

  test('within a tier the structural score still decides', () => {
    const s = stateOf({});
    const ranked = rankPersonalised(s, [cand('a', 'A', 40), cand('b', 'B', 95)], { fromExerciseId: 'x' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['b', 'a']);
  });

  test('ordering is deterministic: the same input gives the same output', () => {
    const s = stateOf({ swaps: [{ fromExerciseId: 'x', toExerciseId: 'b', explicit: 1, createdAt: 5 }] });
    const input = [cand('a', 'A', 50), cand('b', 'B', 50), cand('c', 'C', 50)];
    const once = rankPersonalised(s, input, { fromExerciseId: 'x' }).map((r) => r.exercise.id);
    const twice = rankPersonalised(s, input, { fromExerciseId: 'x' }).map((r) => r.exercise.id);
    expect(once).toEqual(twice);
  });

  // THE SELF-REINFORCEMENT LAW. Being shown first is not a preference.
  test('ranking exposure does NOT become preference evidence', () => {
    const s = stateOf({ swaps: [{ fromExerciseId: 'x', toExerciseId: 'b', explicit: 1, createdAt: 5 }] });
    const input = [cand('a', 'A', 50), cand('b', 'B', 50)];
    const before = JSON.parse(JSON.stringify({ swaps: s.swaps, defaults: s.defaults }));
    rankPersonalised(s, input, { fromExerciseId: 'x' });
    rankPersonalised(s, input, { fromExerciseId: 'x' });
    rankPersonalised(s, input, { fromExerciseId: 'x' });
    // Three rankings later, the evidence is byte-identical.
    expect({ swaps: s.swaps, defaults: s.defaults }).toEqual(before);
    expect(swapEvidenceFor(s, 'x')[0].count).toBe(1);
  });
});

// ─── Evidence dimensions ─────────────────────────────────────────────────────

describe('evidence dimensions, and what we refuse to claim', () => {
  test('a brand-new exercise reports insufficient evidence', () => {
    const s = stateOf({});
    const ev = exerciseEvidence(s, 'never-done');
    expect(ev.sufficient).toBe(false);
    expect(ev.sessions).toBe(0);
    expect(ev.lastTrainedMs).toBeNull();
  });

  test('one session is a try, not a preference', () => {
    const s = stateOf({ usage: [{ exerciseId: 'e1', sessions: 1, lastTrainedMs: Date.now() }] });
    expect(exerciseEvidence(s, 'e1').sufficient).toBe(false);
  });

  test('recency and session count are reported separately, never fused into a score', () => {
    const now = Date.now();
    const s = stateOf({ usage: [{ exerciseId: 'e1', sessions: 9, lastTrainedMs: now - 2 * DAY }] });
    const ev = exerciseEvidence(s, 'e1', { nowMs: now });
    expect(ev.sessions).toBe(9);
    expect(ev.trainedRecently).toBe(true);
    expect(ev.sufficient).toBe(true);
    // No composite number anywhere in the shape.
    expect(Object.keys(ev)).not.toEqual(expect.arrayContaining(['score', 'fit', 'rating', 'percent']));
  });

  test('a long-unused exercise is not "recent" even with many sessions', () => {
    const now = Date.now();
    const s = stateOf({ usage: [{ exerciseId: 'e1', sessions: 30, lastTrainedMs: now - 200 * DAY }] });
    expect(exerciseEvidence(s, 'e1', { nowMs: now }).trainedRecently).toBe(false);
  });

  test('tolerance is explicitly NOT tracked rather than inferred from whole-body feedback', () => {
    expect(exerciseEvidence(stateOf({}), 'e1').tolerance).toBe('not_tracked');
  });

  test('no dimension claims hypertrophic superiority', () => {
    const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../intent.js'), 'utf8');
    expect(SRC).not.toMatch(/hypertroph\w*\s*(score|%|percent)|growthScore|effectivenessScore|fitScore|qualityScore/i);
    expect(SRC).not.toMatch(/best for growth|most effective|optimal exercise/i);
  });
});

// ─── Approved-default proposal ───────────────────────────────────────────────

describe('proposing a default after repeated swaps', () => {
  const three = [300, 200, 100].map((t) => ({ fromExerciseId: 'bb-row', toExerciseId: 'cs-row', explicit: 1, createdAt: t }));

  test('never proposes after a single swap', () => {
    const s = stateOf({ swaps: [three[0]] });
    expect(repeatedDefaultCandidate(s, 'bb-row')).toBeNull();
  });

  test('proposes once the same choice repeats', () => {
    const s = stateOf({ swaps: three });
    expect(repeatedDefaultCandidate(s, 'bb-row')).toEqual({ exerciseId: 'cs-row', count: REPEATED_SWAP_MIN });
  });

  test('does not propose what is already the approved default', () => {
    const s = stateOf({ swaps: three, defaults: [{ fromExerciseId: 'bb-row', routineId: null, exerciseId: 'cs-row' }] });
    expect(repeatedDefaultCandidate(s, 'bb-row')).toBeNull();
  });

  test('does not propose an exercise the user has excluded', () => {
    const s = stateOf({ swaps: three, intents: [{ exerciseId: 'cs-row', kind: EXERCISE_INTENT.EXCLUDED }] });
    expect(repeatedDefaultCandidate(s, 'bb-row')).toBeNull();
  });

  test('proposing is not applying: the layer never mutates anything', () => {
    const s = stateOf({ swaps: three });
    repeatedDefaultCandidate(s, 'bb-row');
    expect(s.defaults).toEqual([]);
  });
});

// ─── Loader ──────────────────────────────────────────────────────────────────

describe('loadExerciseIntentState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getExerciseIntents.mockResolvedValue([{ exerciseId: 'bench', kind: 'excluded' }]);
    db.getExerciseSwaps.mockResolvedValue([]);
    db.getExerciseSlotDefaults.mockResolvedValue([]);
    db.getExerciseUsageStats.mockResolvedValue([]);
  });

  test('assembles the state and honours the active block id', async () => {
    const s = await loadExerciseIntentState('u1', { activeMesocycleId: 'block-7' });
    expect(s.activeMesocycleId).toBe('block-7');
    expect(isExcluded(s, 'bench')).toBe(true);
  });

  test('no user id means no intent, never a guess', async () => {
    const s = await loadExerciseIntentState(null);
    expect(s.intents.size).toBe(0);
    expect(db.getExerciseIntents).not.toHaveBeenCalled();
  });

  test('a read failure fails OPEN: it must never invent a suppression', async () => {
    db.getExerciseIntents.mockRejectedValue(new Error('db gone'));
    const s = await loadExerciseIntentState('u1');
    expect(s.intents.size).toBe(0);
    expect(isEligible(s, 'anything')).toBe(true);
  });
});
