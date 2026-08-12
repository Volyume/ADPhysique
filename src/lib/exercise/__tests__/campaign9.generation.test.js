/**
 * campaign9.generation.test.js — the founder's laws for NEW plan generation.
 *
 * What these pin (product laws, not implementation details):
 *
 *   - "NEW PLAN GENERATION MAY AVOID AN EXCLUDED EXERCISE. This is not an
 *     automatic exercise CHANGE because no existing exercise has yet been
 *     replaced." So an indefinitely excluded exercise is never seeded into a
 *     new plan when a valid alternative exists, and no confirmation is asked.
 *   - "Avoid for this block" holds only while that block is the current one,
 *     and the exercise comes back by itself afterwards. No timer.
 *   - The hand-written POOL fallback in planEngine cannot smuggle an excluded
 *     exercise back in BY NAME. Filtering by id is not enough on its own, and
 *     that hole is the thing this suite exists to keep shut.
 *   - "NO ELIGIBLE ALTERNATIVE ... DO NOT ignore the exclusion. DO NOT
 *     silently restore an exercise. Say the slot needs the user's choice."
 *   - A user with no exclusions generates EXACTLY what they generated before
 *     Campaign 9: the same library array, by reference, and the same writes.
 *
 * These run against the REAL planEngine and the REAL planAutoGen. Only the
 * database is stubbed, so what is being tested is the actual generation path
 * a device runs.
 */
jest.mock('../../database', () => ({
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block' },
  getExerciseIntents: jest.fn(async () => []),
  getExerciseSwaps: jest.fn(async () => []),
  getExerciseSlotDefaults: jest.fn(async () => []),
  getExerciseUsageStats: jest.fn(async () => []),
  getActiveBlock: jest.fn(async () => null),
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(async () => []),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { filterLibraryForGeneration, generationBlockFor, GENERATION_BLOCK } from '../generation';
import { generateAndSavePlan, generatePlanDryRun } from '../../planAutoGen';
import { POOL } from '../../planEngine';
import {
  getExerciseIntents, getActiveBlock, getAllExercises, createProgramme, createRoutine,
  addExerciseToRoutine, activatePlanWithBlock, archiveOtherUserPlans, db, runInTransaction,
  deleteProgrammeCascade, deleteProgrammeCascadeInTx,
} from '../../database';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MUSCLE_OF = new Map();
for (const [muscle, entries] of Object.entries(POOL)) {
  for (const e of entries) MUSCLE_OF.set(e.n, muscle);
}

/**
 * A library with real metadata, so poolGenerator builds a usable pool per
 * muscle and planEngine selects from the LIBRARY rather than from its
 * hand-written POOL. This is the seeded-device shape.
 */
const RICH_LIBRARY = Object.entries(POOL).flatMap(([muscle, entries]) => entries.map((e) => ({
  id: `ex-${e.n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name: e.n,
  primaryMuscle: muscle,
  subregion: e.sub,
  equipmentCategory: e.p === 'heavy_compound' ? 'barbell'
    : e.p === 'machine' ? 'machine_selectorised' : 'dumbbell',
  compoundIsolation: e.p === 'isolation' ? 'isolation' : 'compound',
  equipmentProfiles: e.eq,
  secondaryMuscles: e.secondary ?? [],
  isCustom: 0,
})));

/**
 * The same names with NO metadata. poolGenerator can build nothing from
 * this, so planEngine falls back to its hand-written POOL for every muscle:
 * the exact conditions under which an excluded exercise can be re-emitted by
 * NAME after being filtered out by id.
 */
const NAME_ONLY_LIBRARY = RICH_LIBRARY.map((e) => ({ id: e.id, name: e.name }));

const PROFILE = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
  equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

const idOf = (name) => RICH_LIBRARY.find((e) => e.name === name).id;
const nameOfId = (id) => RICH_LIBRARY.find((e) => e.id === id)?.name ?? null;

function stubWrites() {
  db.mockResolvedValue({});
  runInTransaction.mockImplementation(async (_connection, task) => task());
  createProgramme.mockResolvedValue({ id: 'programme-1' });
  let routineIndex = 0;
  createRoutine.mockImplementation(async () => ({ id: `routine-${routineIndex++}` }));
  addExerciseToRoutine.mockResolvedValue({ id: 'routine-exercise-1' });
  activatePlanWithBlock.mockResolvedValue('mesocycle-1');
  archiveOtherUserPlans.mockResolvedValue(undefined);
  deleteProgrammeCascade.mockResolvedValue(undefined);
  deleteProgrammeCascadeInTx.mockResolvedValue(undefined);
}

/** Every exercise NAME actually written into the generated plan. */
const writtenNames = () => addExerciseToRoutine.mock.calls.map((c) => nameOfId(c[1]));

/** Run a full generation and report what it wrote. */
async function generate({ library = RICH_LIBRARY, intents = [], activeBlockId = null } = {}) {
  jest.clearAllMocks();
  stubWrites();
  getAllExercises.mockResolvedValue(library);
  getExerciseIntents.mockResolvedValue(intents);
  getActiveBlock.mockResolvedValue(activeBlockId ? { id: activeBlockId } : null);
  const result = await generateAndSavePlan('u1', PROFILE);
  return { result, names: writtenNames(), calls: addExerciseToRoutine.mock.calls };
}

const excludeRow = (exerciseId) => ({ exerciseId, kind: 'excluded' });
const avoidRow = (exerciseId, scopeMesocycleId) => ({ exerciseId, kind: 'avoided_block', scopeMesocycleId });

// ─── The pure filter ─────────────────────────────────────────────────────────

describe('filterLibraryForGeneration (pure)', () => {
  const state = (rows, activeMesocycleId = 'block-1') => ({
    intents: new Map(rows.map((r) => [r.exerciseId, r])),
    swaps: [], defaults: [], usage: new Map(), activeMesocycleId,
  });

  test('no stored intent returns the SAME array, by reference', () => {
    const lib = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    for (const s of [null, undefined, state([])]) {
      const out = filterLibraryForGeneration(lib, s);
      expect(out.library).toBe(lib);          // identity, not equality
      expect(out.droppedIds).toEqual([]);
      expect(out.droppedNames).toEqual([]);
    }
  });

  test('intent that drops nothing still returns the same array', () => {
    const lib = [{ id: 'a', name: 'A' }];
    const out = filterLibraryForGeneration(lib, state([excludeRow('somethingElse')]));
    expect(out.library).toBe(lib);
  });

  test('an excluded exercise is removed, and reported by id AND by name', () => {
    const lib = [{ id: 'a', name: 'Barbell Back Squat' }, { id: 'b', name: 'Leg Press' }];
    const out = filterLibraryForGeneration(lib, state([excludeRow('a')]));
    expect(out.library.map((e) => e.id)).toEqual(['b']);
    expect(out.droppedIds).toEqual(['a']);
    expect(out.droppedNames).toEqual(['barbell back squat']);
    expect(out.dropped[0].reason).toBe(GENERATION_BLOCK.EXCLUDED);
  });

  test('block-scoped avoidance only bites while that block is current', () => {
    const lib = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const current = filterLibraryForGeneration(lib, state([avoidRow('a', 'block-1')], 'block-1'));
    expect(current.library.map((e) => e.id)).toEqual(['b']);
    expect(current.dropped[0].reason).toBe(GENERATION_BLOCK.AVOIDED_BLOCK);

    const later = filterLibraryForGeneration(lib, state([avoidRow('a', 'block-1')], 'block-2'));
    expect(later.library).toBe(lib);          // back, untouched, no timer involved
  });

  test('a malformed state fails OPEN rather than emptying the library', () => {
    const lib = [{ id: 'a', name: 'A' }];
    const broken = { intents: { size: 1, get() { throw new Error('boom'); } } };
    expect(filterLibraryForGeneration(lib, broken).library).toBe(lib);
  });

  test('generationBlockFor catches a name the id filter never saw', () => {
    const lib = [{ id: 'a', name: 'Barbell Back Squat' }, { id: 'b', name: 'Leg Press' }];
    const out = filterLibraryForGeneration(lib, state([excludeRow('a')]));
    // A row the engine resolved by name, arriving with a different id.
    expect(generationBlockFor(out, { id: 'other', name: 'BARBELL BACK SQUAT' })).toBe('excluded');
    expect(generationBlockFor(out, null, 'Barbell Back Squat')).toBe('excluded');
    expect(generationBlockFor(out, { id: 'b', name: 'Leg Press' })).toBeNull();
  });
});

// ─── The no-op case: a user with no exclusions ───────────────────────────────

describe('a user with no exclusions generates exactly what they generated before', () => {
  test('the engine receives the identical library array and writes identical rows', async () => {
    // Baseline: the intent layer finds nothing at all (a fresh device).
    const before = await generate({ intents: [] });
    // And again with the intent read failing outright, which is the closest
    // thing to "Campaign 9 is not there": the filter must be a no-op both
    // times, so both runs must be identical write-for-write.
    jest.clearAllMocks();
    stubWrites();
    getAllExercises.mockResolvedValue(RICH_LIBRARY);
    getExerciseIntents.mockRejectedValue(new Error('no such table'));
    getActiveBlock.mockRejectedValue(new Error('no such table'));
    const after = await generateAndSavePlan('u1', PROFILE);

    expect(before.result.ok).toBe(true);
    expect(after.ok).toBe(true);
    expect(before.result).toEqual(after);
    expect(addExerciseToRoutine.mock.calls).toEqual(before.calls);
    expect(before.names.length).toBeGreaterThan(0);

    // Nothing blocked, nothing invented on the result.
    expect(before.result.blockedByIntent).toBeUndefined();
    expect(before.result.blockedSlots).toBeUndefined();
    expect(before.result.needsChoice).toBeUndefined();
  });

  test('the filter hands the engine the very same array object', () => {
    const out = filterLibraryForGeneration(RICH_LIBRARY, {
      intents: new Map(), swaps: [], defaults: [], usage: new Map(), activeMesocycleId: null,
    });
    expect(out.library).toBe(RICH_LIBRARY);
  });
});

// ─── Indefinite exclusion ────────────────────────────────────────────────────

describe('an indefinitely excluded exercise is never seeded into a new plan', () => {
  test('the generator picks an alternative instead, with no confirmation asked', async () => {
    const base = await generate({});
    expect(base.result.ok).toBe(true);
    // Pick something the generator really did choose, from a muscle with
    // enough library depth that a valid alternative certainly exists.
    const target = base.names.find((n) => n && POOL[MUSCLE_OF.get(n)].length >= 5);
    expect(target).toBeTruthy();

    const run = await generate({ intents: [excludeRow(idOf(target))] });

    expect(run.result.ok).toBe(true);
    expect(run.names).not.toContain(target);
    expect(run.names.length).toBeGreaterThan(0);
    // A valid alternative existed, so nothing needs the user's choice.
    expect(run.result.blockedByIntent).toBeUndefined();
  });

  test('the dry-run preview avoids it too, so the preview cannot lie', async () => {
    jest.clearAllMocks();
    stubWrites();
    getAllExercises.mockResolvedValue(RICH_LIBRARY);
    getExerciseIntents.mockResolvedValue([]);
    getActiveBlock.mockResolvedValue(null);
    const base = await generatePlanDryRun('u1', PROFILE);
    const baseNames = base.plan.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseName));
    const target = baseNames.find((n) => POOL[MUSCLE_OF.get(n)]?.length >= 5);

    getExerciseIntents.mockResolvedValue([excludeRow(idOf(target))]);
    const run = await generatePlanDryRun('u1', PROFILE);
    const names = run.plan.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseName));

    expect(run.ok).toBe(true);
    expect(names).not.toContain(target);
  });
});

// ─── Block-scoped avoidance ──────────────────────────────────────────────────

describe('"avoid for this block" expires with the block, not on a timer', () => {
  test('excluded while its block is current, back on its own afterwards', async () => {
    const base = await generate({ activeBlockId: 'block-1' });
    const target = base.names.find((n) => n && POOL[MUSCLE_OF.get(n)].length >= 5);
    expect(target).toBeTruthy();
    const intents = [avoidRow(idOf(target), 'block-1')];

    const during = await generate({ intents, activeBlockId: 'block-1' });
    expect(during.result.ok).toBe(true);
    expect(during.names).not.toContain(target);

    // Same stored row, next block. Nothing was rewritten or restored; the
    // row is simply spent, so generation is byte-identical to the baseline.
    const after = await generate({ intents, activeBlockId: 'block-2' });
    expect(after.names).toContain(target);
    expect(after.calls).toEqual(base.calls);
  });
});

// ─── The POOL-fallback-by-name hole ──────────────────────────────────────────

describe("planEngine's hand-written POOL fallback cannot reintroduce an exclusion", () => {
  test('a name the fallback emits is refused, and the slot is reported', async () => {
    // NAME_ONLY_LIBRARY generates no pool, so every muscle falls back to
    // POOL: the engine picks by NAME and never sees the id filter at all.
    const base = await generate({ library: NAME_ONLY_LIBRARY });
    expect(base.result.ok).toBe(true);
    const target = base.names.find(Boolean);
    expect(target).toBeTruthy();

    const run = await generate({
      library: NAME_ONLY_LIBRARY,
      intents: [excludeRow(idOf(target))],
    });

    // Not written, under any id.
    expect(run.names).not.toContain(target);
    // And not silently dropped either: the slot is reported.
    expect(run.result.blockedByIntent).toBe(true);
    expect(run.result.needsChoice).toBe(true);
    expect(run.result.blockedCount).toBeGreaterThan(0);
    expect(run.result.blockedSlots.every((s) => s.exerciseName === target)).toBe(true);
    expect(run.result.blockedSlots[0]).toMatchObject({
      exerciseId: idOf(target),
      exerciseName: target,
      reason: 'excluded',
    });
    expect(typeof run.result.blockedSlots[0].workoutName).toBe('string');
    expect(typeof run.result.blockedSlots[0].position).toBe('number');
    // The equipment shortfall fields keep their own meaning and are not
    // borrowed to describe an exclusion.
    expect(run.result.missedExercises ?? []).not.toContain(target);
  });
});

// ─── No eligible alternative ─────────────────────────────────────────────────

describe('when exclusions leave a slot unfillable, the plan says so', () => {
  test('every slot blocked: nothing is saved, nothing is silently restored', async () => {
    const intents = NAME_ONLY_LIBRARY.map((e) => excludeRow(e.id));
    const run = await generate({ library: NAME_ONLY_LIBRARY, intents });

    expect(run.result.ok).toBe(false);
    // Not the "no exercises matched the library" lie: the library matched
    // fine, the user's own intent is why the slot is empty.
    expect(run.result.error).toBe('plan_blocked_by_exclusions');
    expect(run.result.blockedByIntent).toBe(true);
    expect(run.result.needsChoice).toBe(true);
    expect(run.result.blockedCount).toBeGreaterThan(0);
    expect(run.result.blockedSlots.length).toBe(run.result.blockedCount);
    expect(run.result.blockedSlots.every((s) => s.reason === 'excluded')).toBe(true);

    // Nothing written, and the empty programme rolled back in-transaction.
    expect(addExerciseToRoutine).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
    expect(deleteProgrammeCascadeInTx).toHaveBeenCalled();
  });

  test('the dry-run reports the same blocked slots as the commit would', async () => {
    jest.clearAllMocks();
    stubWrites();
    getAllExercises.mockResolvedValue(NAME_ONLY_LIBRARY);
    getExerciseIntents.mockResolvedValue(NAME_ONLY_LIBRARY.map((e) => excludeRow(e.id)));
    getActiveBlock.mockResolvedValue(null);

    const dry = await generatePlanDryRun('u1', PROFILE);
    expect(dry.ok).toBe(false);
    expect(dry.error).toBe('plan_blocked_by_exclusions');
    expect(dry.blockedByIntent).toBe(true);
    expect(dry.needsChoice).toBe(true);
    expect(dry.blockedSlots.length).toBeGreaterThan(0);
    expect(createProgramme).not.toHaveBeenCalled();
  });

  test('an empty library is still the equipment error, not an exclusion error', async () => {
    // The two failures must stay distinguishable: this one is not the user's
    // intent and must not be reported as if it were.
    const run = await generate({ library: [], intents: [] });
    expect(run.result).toEqual({
      ok: false, error: 'Plan created but no exercises matched the library',
    });
  });
});
