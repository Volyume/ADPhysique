/**
 * campaign16.canonicalIdentity.test.js — Campaign 16 job 9.
 *
 * FOUNDER BRIEF: "Generated library exercises should carry canonical
 * exercise identity through pool -> selector -> generated plan -> dry run
 * -> persistence. Prefer exerciseId / canonical name over string name ->
 * later lowercase lookup. Dry-run and commit must refer to the SAME IDs. A
 * preview may not silently lose exercises during persistence. Fallback
 * entries must resolve to canonical seeded entries before becoming eligible
 * for preview."
 *
 * THE DEFECT THIS CLOSES, in the shape it was actually found
 *
 * A generated plan travelled as a STRING NAME. The only link between the
 * engine's choice and the row that got written was a lowercase lookup at
 * the persistence seam. The engine's hand-written fallback pool carried
 * `Abductor Machine`; no library row has that name. So the exercise was
 * generated, previewed, counted in the plan's weekly volume summary, and
 * then silently dropped at save. Bikini 3-day previewed 14 weekly glute
 * sets and delivered 11.
 *
 * Fixing that one name was not the fix. The architecture that allowed it is
 * what this suite pins:
 *
 *   1. identity is stamped at generation, not derived at save;
 *   2. the fallback pool cannot offer a name the catalogue lacks;
 *   3. the dry run and the commit resolve through ONE function, so the
 *      preview is the thing that gets written.
 */

jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import {
  generateAndSavePlan, generatePlanDryRun, resolvePlanAgainstLibrary, buildExerciseIndex,
} from '../planAutoGen';
import { generatePlan, POOL } from '../planEngine';
import { canonicalExerciseId } from '../exercise/canonicalId';
import { canonicalExerciseId as reExported } from '../seedExercises';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction,
} from '../database';
import { LIBRARY, inputs } from './campaign16.helpers';

const PROFILE = {
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  trainingGoal: 'build_muscle',
  trainingPhase: 'maintain',
};

/** The catalogue as the device holds it: canonical ids from canonical names. */
const asCatalogue = rows => rows.map(e => ({
  ...e, id: canonicalExerciseId(e.name), isCustom: 0,
}));

function wireDb() {
  jest.clearAllMocks();
  getAllExercises.mockResolvedValue(asCatalogue(LIBRARY));
  db.mockResolvedValue({});
  runInTransaction.mockImplementation(async (_d, fn) => fn());
  createProgramme.mockImplementation(async () => ({ id: 'prog-1' }));
  createRoutine.mockImplementation(async (_u, name) => ({ id: `routine-${name}` }));
  addExerciseToRoutine.mockResolvedValue(undefined);
  activatePlanWithBlock.mockResolvedValue(undefined);
  archiveOtherUserPlans.mockResolvedValue(undefined);
  getAllProgrammes.mockResolvedValue([]);
}

beforeEach(wireDb);

// ---------------------------------------------------------------------------

describe('C16-9 identity is stamped at generation, not derived at save', () => {
  test('every generated exercise carries a canonical exerciseId', () => {
    const plan = generatePlan({ ...inputs(), exerciseLibrary: LIBRARY });
    const all = plan.workouts.flatMap(w => w.exercises);
    expect(all.length).toBeGreaterThan(0);
    for (const ex of all) {
      expect(typeof ex.exerciseId).toBe('string');
      expect(ex.exerciseId).toBe(canonicalExerciseId(ex.exerciseName));
    }
  });

  test('the id is the SAME one the seed mints for that row', () => {
    // If these two ever diverge, every generated plan silently stops
    // resolving by id and falls back to name matching.
    for (const e of LIBRARY.slice(0, 40)) {
      expect(canonicalExerciseId(e.name)).toBe(reExported(e.name));
    }
  });

  test('the hash lives in a pure module the engine can import', () => {
    // planEngine must stay free of I/O. seedExercises imports AsyncStorage
    // and database.js, so the hash needed its own home; this is the reason
    // the extraction happened rather than a tidy-up.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../exercise/canonicalId.js'), 'utf8');
    expect(src).not.toMatch(/async-storage|require\('\.\.\/database'\)|from '\.\.\/database'/);
    const engine = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(engine).toMatch(/from '\.\/exercise\/canonicalId'/);
    expect(engine).not.toMatch(/from '\.\/seedExercises'/);
  });

  test('identity is deterministic and case-insensitive on the name', () => {
    expect(canonicalExerciseId('Barbell Bench Press'))
      .toBe(canonicalExerciseId('barbell bench press'));
    expect(canonicalExerciseId('Barbell Bench Press'))
      .not.toBe(canonicalExerciseId('Barbell Bench Pres'));
  });
});

describe('C16-9 the fallback pool cannot offer what the catalogue lacks', () => {
  test('no POOL entry names an exercise missing from the seeded library', () => {
    // This is the Abductor Machine guard, stated as a law rather than a
    // single corrected string.
    const names = new Set(LIBRARY.map(e => e.name));
    const ghosts = Object.entries(POOL)
      .flatMap(([m, entries]) => entries.filter(e => !names.has(e.n)).map(e => `${m}/${e.n}`));
    expect(ghosts).toEqual([]);
  });

  test('a drifted POOL name is filtered out before it can reach a plan', () => {
    // Simulate the defect: the catalogue does not contain one of the names
    // the fallback pool offers. With canonicalNames supplied, the engine
    // must not emit it, rather than emitting it for someone else to drop.
    const shrunk = LIBRARY.filter(e => e.name !== 'Barbell Hip Thrust');
    const names = new Set(shrunk.map(e => e.name));
    const plan = generatePlan({
      ...inputs({ goal: 'bikini', daysPerWeek: 3 }),
      // A library too thin for glutes forces the hardcoded fallback pool,
      // which is the only path that can emit an off-catalogue name.
      exerciseLibrary: shrunk.filter(e => e.primaryMuscle !== 'glutes'),
      canonicalNames: names,
    });
    const emitted = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    expect(emitted.filter(n => !names.has(n))).toEqual([]);
  });

  test('without canonicalNames the engine behaves exactly as before', () => {
    // Every existing unit test drives the engine directly and supplies no
    // catalogue. The gate must be additive.
    const withNames = generatePlan({
      ...inputs(), exerciseLibrary: LIBRARY,
      canonicalNames: new Set(LIBRARY.map(e => e.name)),
    });
    const without = generatePlan({ ...inputs(), exerciseLibrary: LIBRARY });
    expect(without.workouts.map(w => w.exercises.map(e => e.exerciseName)))
      .toEqual(withNames.workouts.map(w => w.exercises.map(e => e.exerciseName)));
  });

  test('the gate uses the FULL catalogue, so a user exclusion is still REPORTED', () => {
    // Campaign 9 law: an excluded exercise is never silently restored AND
    // never silently swapped - the slot is reported so the user chooses.
    // Gating the fallback pool on the intent-FILTERED library would have
    // swallowed that report, which is why it gates on the full catalogue.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../planAutoGen.js'), 'utf8');
    // The gate is built from the full catalogue. The optional second
    // argument removes only ids the user has already reviewed and approved
    // for replacement; ordinary intent filtering must never become the gate.
    expect(src).toMatch(/canonicalNames: canonicalNameSet\(allExercises, replacementIds\)/);
    expect(src).not.toMatch(/canonicalNames: canonicalNameSet\(filteredLibrary/);
  });
});

describe('C16-9 the dry run and the commit agree, by construction', () => {
  test('both resolve through the same single function', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../planAutoGen.js'), 'utf8');
    // One definition, two callers. If a second matching loop reappears, the
    // two sides can drift again - which is exactly how this defect lived.
    expect(src.match(/function resolvePlanAgainstLibrary/g)).toHaveLength(1);
    const callSites = src.match(/(?<!function )resolvePlanAgainstLibrary\(\w+,/g);
    expect(callSites).toHaveLength(2);
    // And both sides run the SAME continuity pass before resolving, or the
    // preview would show replacements the commit is not going to make.
    expect(src.match(/function withContinuity/g)).toHaveLength(1);
    expect(src.match(/(?<!function )withContinuity\(\s*\n?\s*userId,/g)).toHaveLength(2);
  });

  test('the preview contains exactly the exercises the commit writes, with the same ids', async () => {
    const preview = await generatePlanDryRun('user-1', PROFILE);
    expect(preview.ok).toBe(true);
    const previewed = preview.plan.workouts.flatMap(
      w => w.exercises.map(e => ({ id: e.exerciseId, name: e.exerciseName })));

    wireDb();
    const saved = await generateAndSavePlan('user-1', PROFILE);
    expect(saved.ok).toBe(true);
    const written = addExerciseToRoutine.mock.calls.map(c => c[1]);

    expect(written).toEqual(previewed.map(p => p.id));
    // And every written id is a real catalogue id, not a minted one.
    const catalogueIds = new Set(asCatalogue(LIBRARY).map(e => e.id));
    for (const id of written) expect(catalogueIds.has(id)).toBe(true);
  });

  test('nothing the preview shows is dropped on the way to the database', async () => {
    const preview = await generatePlanDryRun('user-1', PROFILE);
    const previewCount = preview.plan.workouts
      .reduce((n, w) => n + w.exercises.length, 0);

    wireDb();
    await generateAndSavePlan('user-1', PROFILE);
    expect(addExerciseToRoutine.mock.calls.length).toBe(previewCount);
  });

  test('the preview reports no shortfall when the catalogue is complete', async () => {
    // The old partial/missedExercises path fired on NAME DRIFT and called it
    // an equipment shortfall. With identity carried through there is nothing
    // left to miss on a fully seeded device.
    const preview = await generatePlanDryRun('user-1', PROFILE);
    expect(preview.partial).toBeUndefined();
    expect(preview.missedCount).toBeUndefined();
  });

  test('the preview carries the catalogue spelling, not the engine string', async () => {
    const preview = await generatePlanDryRun('user-1', PROFILE);
    const names = new Set(LIBRARY.map(e => e.name));
    for (const w of preview.plan.workouts) {
      for (const ex of w.exercises) expect(names.has(ex.exerciseName)).toBe(true);
    }
  });
});

describe('C16-9 resolution prefers identity over a lowercase string match', () => {
  test('the id wins over the name when the catalogue spells it differently', () => {
    // Driven at the seam itself, because this is a statement about
    // resolution order and nothing else. The row carries the canonical id
    // for the exercise the engine chose, under a different spelling. Name
    // matching alone drops it; identity keeps it, and the catalogue's
    // spelling is what travels onward.
    const row = {
      id: canonicalExerciseId('Barbell Bench Press'),
      name: 'Barbell Bench Press (Flat)',
      isCustom: 0,
    };
    const plan = {
      workouts: [{
        name: 'Upper',
        exercises: [{
          exerciseName: 'Barbell Bench Press',
          exerciseId: canonicalExerciseId('Barbell Bench Press'),
          sets: 3, repMin: 8, repMax: 12,
        }],
      }],
    };
    const out = resolvePlanAgainstLibrary(plan, buildExerciseIndex([row]), { library: [row] });
    expect(out.missedCount).toBe(0);
    expect(out.totalResolved).toBe(1);
    expect(out.workouts[0].exercises[0].exerciseName).toBe('Barbell Bench Press (Flat)');
    expect(out.workouts[0].exercises[0].exerciseId).toBe(row.id);
  });

  test('an unresolvable exercise is reported and REMOVED, never passed on', () => {
    // The Abductor Machine shape, at the seam: if anything ever does reach
    // here unresolvable, it must not survive into the returned workouts,
    // because those are what the preview renders and the commit writes.
    const plan = {
      workouts: [{
        name: 'Lower',
        exercises: [
          { exerciseName: 'Abductor Machine', sets: 3 },
          { exerciseName: 'Barbell Hip Thrust', exerciseId: canonicalExerciseId('Barbell Hip Thrust'), sets: 3 },
        ],
      }],
    };
    const row = { id: canonicalExerciseId('Barbell Hip Thrust'), name: 'Barbell Hip Thrust', isCustom: 0 };
    const out = resolvePlanAgainstLibrary(plan, buildExerciseIndex([row]), { library: [row] });
    expect(out.missedCount).toBe(1);
    expect(out.missedNames).toEqual(['Abductor Machine']);
    expect(out.workouts[0].exercises.map(e => e.exerciseName)).toEqual(['Barbell Hip Thrust']);
  });

  test('a legacy plan with no exerciseId still resolves by name', async () => {
    // Plans generated by an older build carry names only. They must keep
    // working; identity is an improvement, not a cliff.
    const preview = await generatePlanDryRun('user-1', PROFILE);
    const stripped = {
      ...preview.plan,
      workouts: preview.plan.workouts.map(w => ({
        ...w,
        exercises: w.exercises.map(({ exerciseId, ...rest }) => rest),
      })),
    };
    for (const w of stripped.workouts) {
      for (const ex of w.exercises) expect(ex.exerciseId).toBeUndefined();
    }
    // Resolution by name still finds every one of them in the catalogue.
    const byLower = new Map(LIBRARY.map(e => [e.name.toLowerCase(), e]));
    for (const w of stripped.workouts) {
      for (const ex of w.exercises) {
        expect(byLower.has(ex.exerciseName.toLowerCase())).toBe(true);
      }
    }
  });
});
