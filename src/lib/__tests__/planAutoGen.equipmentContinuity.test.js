/**
 * Equipment loss must survive the continuity/rebuild layer.
 *
 * FOUNDER REPORT 2026-08-18: "I've selected machines and cables for example
 * and it's giving me barbell squads and other free weight things."
 *
 * WHAT WAS ACTUALLY WRONG. planEngine's equipment filter was never at fault:
 * a fresh generatePlan() with equipment 'machines_cables' has always been
 * incapable of emitting a barbell exercise (planEngine.js filterPool runs
 * before every never-starve fallback, and none of those fallbacks re-admit
 * equipment-incompatible work). The defect lived one layer up, in
 * planAutoGen's withContinuity, which runs AFTER the engine and carries the
 * athlete's incumbent exercises forward.
 *
 * Its "is this still reachable" set, currentLibraryIds, was built from
 * filterLibraryForGeneration's output. That function filters ONLY on
 * Campaign-9 exclusion/avoidance intent and contains no equipment logic at
 * all, so the set held every exercise in the catalogue whatever equipment the
 * athlete had just chosen. buildSlotEvidence's `equipmentLost` was therefore a
 * permanent false negative, programmeEpoch.slotVerdict never reached its
 * EQUIPMENT_LOST branch, and applyContinuity spliced the old barbell
 * incumbents back into a plan the engine had already correctly excluded them
 * from. It only reproduced on a REBUILD (Update Your Plan, or any regenerate
 * on an account with an active programme), never on first onboarding, which is
 * why it survived: no test anywhere exercised "has a plan, changes equipment,
 * regenerates".
 *
 * This suite pins the predicate that fixes it, including both deliberate
 * fail-open cases. A regression here means barbell work returns to a
 * machines-and-cables athlete's rebuilt plan.
 */
import { equipmentReachable } from '../planAutoGen';

const barbellSquat = {
  id: 'ex_bb_squat',
  name: 'Barbell Back Squat',
  equipmentProfiles: ['full_gym', 'barbell_plates'],
};
const cableRow = {
  id: 'ex_cable_row',
  name: 'Cable Row',
  equipmentProfiles: ['full_gym', 'machines_cables'],
};

describe('equipmentReachable: the founder-reported case', () => {
  test('a barbell lift is NOT reachable on machines and cables', () => {
    expect(equipmentReachable(barbellSquat, 'machines_cables')).toBe(false);
  });

  test('a cable lift IS reachable on machines and cables', () => {
    expect(equipmentReachable(cableRow, 'machines_cables')).toBe(true);
  });

  test('both are reachable in a full gym', () => {
    expect(equipmentReachable(barbellSquat, 'full_gym')).toBe(true);
    expect(equipmentReachable(cableRow, 'full_gym')).toBe(true);
  });

  test('a barbell lift is not reachable on dumbbells only or bodyweight', () => {
    expect(equipmentReachable(barbellSquat, 'dumbbells_only')).toBe(false);
    expect(equipmentReachable(barbellSquat, 'bodyweight')).toBe(false);
  });

  test('a cable lift is not reachable on barbell and plates', () => {
    expect(equipmentReachable(cableRow, 'barbell_plates')).toBe(false);
  });
});

describe('equipmentReachable: the two deliberate fail-open cases', () => {
  test('no equipment known: nothing is treated as lost', () => {
    // We have no basis to claim a loss, so this must behave exactly as it did
    // before the fix rather than replacing the athlete's whole plan.
    expect(equipmentReachable(barbellSquat, null)).toBe(true);
    expect(equipmentReachable(barbellSquat, undefined)).toBe(true);
    expect(equipmentReachable(barbellSquat, '')).toBe(true);
  });

  test("an untagged row (an athlete's own custom exercise) is never called lost", () => {
    // Silently replacing someone's own exercise is a worse failure than
    // carrying one forward, and an untagged row is not evidence of loss.
    const custom = { id: 'ex_custom', name: 'My Own Machine Thing' };
    expect(equipmentReachable(custom, 'machines_cables')).toBe(true);
    expect(equipmentReachable({ ...custom, equipmentProfiles: [] }, 'machines_cables')).toBe(true);
    expect(equipmentReachable({ ...custom, equipmentProfiles: null }, 'machines_cables')).toBe(true);
  });

  test('a malformed profiles value never throws and never claims loss', () => {
    expect(equipmentReachable({ id: 'x', equipmentProfiles: 'not json' }, 'machines_cables')).toBe(true);
    expect(equipmentReachable(null, 'machines_cables')).toBe(true);
    expect(equipmentReachable(undefined, 'machines_cables')).toBe(true);
  });
});

describe('equipmentReachable: reads the same stored shape the database returns', () => {
  test('a JSON string from getAllExercises is parsed, not treated as untagged', () => {
    // rowToCamel leaves equipment_profiles as the raw JSON string, so a
    // reachability check that only handled arrays would silently fail open on
    // every real row and reintroduce the entire bug.
    const fromDb = { id: 'ex_bb_squat', equipmentProfiles: '["full_gym","barbell_plates"]' };
    expect(equipmentReachable(fromDb, 'machines_cables')).toBe(false);
    expect(equipmentReachable(fromDb, 'barbell_plates')).toBe(true);
  });
});
