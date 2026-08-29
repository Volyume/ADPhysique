/**
 * CC33 review round 3 (R3-1) - DRIVEN through the real entry point, as
 * the round-3 reviewer demanded ("or round 4 will find round 3's edges
 * the same way").
 *
 * The defect this suite keeps closed: withContinuity's "still reachable"
 * set (currentLibraryIds) was built from filterLibraryForGeneration's
 * OUTPUT, which also drops capability-blocked rows. A user's own custom
 * lift carries NULL demand columns (CAP-8), so under any demand rule it
 * is a rank-4 UNKNOWN - correctly dropped from generation's own picks,
 * and therefore absent from the filtered library. On a REBUILD the
 * incumbent custom lift then read `equipmentLost: true` and slotVerdict
 * REPLACED it, with the receipt claiming "This needs equipment you no
 * longer have." - false on both halves. The round-2 definite-only
 * capability fields all passed correctly and the slot still fell to the
 * equipment trap one rank later, which is exactly why this pin drives
 * generatePlanDryRun end to end instead of pinning any one expression.
 *
 * Mocks carry the REAL producer shapes (the {routineExercise, exercise}
 * row literal; a capability state from the real resolver) - the F8
 * lesson: a fixture the producer never emits proves nothing.
 */
jest.mock('../database', () => ({
  getAllExercises: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getActiveBlock: jest.fn().mockResolvedValue(null),
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn().mockResolvedValue([]),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));
// The name-based canonicality gate (obscure lifts are not auto-carried)
// is deliberate, pre-existing design and not the seam under test - a
// custom name would trip it and mask the R3-1 verdict. Neutralised so
// the pin isolates the equipment/capability seam alone.
jest.mock('../exercise/canonicality', () => {
  const actual = jest.requireActual('../exercise/canonicality');
  return { ...actual, isAutoEligible: jest.fn(() => true) };
});
jest.mock('../exercise/intent', () => {
  const actual = jest.requireActual('../exercise/intent');
  return {
    ...actual,
    loadExerciseIntentState: jest.fn(),
    // Preference lane says yes to everything; capability answers come
    // from the REAL resolver state below.
    isEligible: jest.fn(() => true),
    isFamilyBlocked: jest.fn(() => false),
    exerciseEvidence: jest.fn(() => ({
      sessions: 0, progression: null, plateau: false, maturity: 'insufficient',
    })),
    swappedAwayCount: jest.fn(() => 0),
  };
});

import { generatePlanDryRun } from '../planAutoGen';
import { POOL } from '../planEngine';
import {
  getAllExercises, getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails,
} from '../database';
import { loadExerciseIntentState } from '../exercise/intent';
import { buildCapabilityResolveState } from '../capability/resolve';
import { canonicalExerciseId } from '../exercise/canonicalId';

const NOW = 1_750_000_000_000;

// The engine's own pool, so generation resolves (mirrors a seeded
// device), plus the user's custom lift: chest, NO demand columns, NO
// equipment profiles (custom creation leaves both NULL).
// subregion 'flat' is the stored family tag (movementFamily trusts a
// valid tag), so this incumbent genuinely contests the generated bench
// slot - an UNTAGGED custom name resolves no family and never reaches a
// continuity verdict at all (recorded separately as its own finding).
const CUSTOM = {
  id: 'ex-custom-press', name: 'My Custom Bench Press', primaryMuscle: 'chest',
  subregion: 'flat', equipmentProfiles: null,
};
const LIBRARY = [
  // Every pool row carries its CANONICAL deterministic id (the engine
  // emits canonicalExerciseId(name), and withContinuity's familyOf
  // resolves generated slots against the library by exactly that id) and
  // is DEFINITELY compatible with the axial rule (axialLoad: 0), so
  // generation itself proceeds and the only unknown in the fixture is
  // the custom lift - the case under test.
  ...Object.entries(POOL).flatMap(([muscle, list]) => list.map((e) => ({
    id: canonicalExerciseId(e.n), name: e.n, primaryMuscle: muscle,
    subregion: e.sub ?? null, axialLoad: 0,
  }))),
  CUSTOM,
];

const axialRule = () => buildCapabilityResolveState([{
  id: 'c-axial', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
  ruleValue: 'axial_load', laterality: null, startsAt: NOW - 1000, endsAt: null,
  state: 'active', endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
}], { atMs: NOW });

const PROFILE = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
  equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

beforeEach(() => {
  jest.clearAllMocks();
  getAllExercises.mockResolvedValue(LIBRARY);
  getActivePlan.mockResolvedValue({ id: 'plan1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Push A' }]);
  // The REAL row shape (database.js:4516): { routineExercise, exercise },
  // the embedded exercise literal demandless.
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're-custom' }, exercise: { id: CUSTOM.id, name: CUSTOM.name, primaryMuscle: 'chest', subregion: 'flat' } },
  ]);
  loadExerciseIntentState.mockResolvedValue({
    capability: axialRule(), unavailable: false,
  });
});

test('a rebuild RETAINS the custom lift under a demand rule - never equipment-lost, never capability-excluded', async () => {
  const res = await generatePlanDryRun('u1', PROFILE);
  if (!res.ok) throw new Error(`DRYRUN FAILED: ${res.error}`);
  expect(res.ok).toBe(true);
  expect(res.continuity.isRebuild).toBe(true);
  const aboutCustom = (res.continuity.decisions ?? [])
    .filter((d) => d.exerciseName === CUSTOM.name
      || d.previousExerciseName === CUSTOM.name);
  // The incumbent is judged like any other slot and retained on neutral
  // evidence - it is never REPLACED, and no receipt line about it may
  // carry the equipment or capability reasons.
  expect(aboutCustom.length).toBeGreaterThan(0);
  for (const d of aboutCustom) {
    expect(d.outcome).not.toBe('replaced');
    expect(d.reason).not.toBe('equipment_lost');
    expect(d.reason).not.toBe('capability_excluded');
  }
  // And the retained lift is genuinely in the plan the preview shows.
  const names = res.plan.workouts.flatMap((w) => (w.exercises ?? []).map((e) => e.exerciseName));
  expect(names).toContain(CUSTOM.name);
});

test('the control: a DEFINITE capability block on the incumbent still replaces it with the capability reason', async () => {
  // Same rebuild, but the incumbent resolves to a full library row that
  // definitely loads the spine - the capability lane speaks through its
  // own field and its own words, proving the retained-custom case above
  // is the unknown gate, not a disabled verdict.
  const SQUATTY = {
    id: 'ex-axial', name: 'Heavy Bench Press', primaryMuscle: 'chest',
    subregion: 'flat', axialLoad: 1, equipmentProfiles: null,
  };
  getAllExercises.mockResolvedValue([...LIBRARY, SQUATTY]);
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're-axial' }, exercise: { id: SQUATTY.id, name: SQUATTY.name, primaryMuscle: 'chest', subregion: 'flat' } },
  ]);
  const res = await generatePlanDryRun('u1', PROFILE);
  expect(res.ok).toBe(true);
  const aboutAxial = (res.continuity.decisions ?? [])
    .filter((d) => d.previousExerciseName === SQUATTY.name || d.exerciseName === SQUATTY.name);
  expect(aboutAxial.some((d) => d.reason === 'capability_excluded')).toBe(true);
  expect(aboutAxial.some((d) => d.reason === 'equipment_lost')).toBe(false);
});
