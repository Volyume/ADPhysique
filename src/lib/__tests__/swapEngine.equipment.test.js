/**
 * A swap must never offer kit the athlete does not have.
 *
 * FOUNDER REPORT 2026-08-19: "I swapped to cables and machines and still got
 * barbell squat, this is on the latest build too."
 *
 * TWO compounding defects produced that, and this suite pins both.
 *
 * 1. NO swap surface passed the athlete's equipment. RoutineDetailScreen (the
 *    builder), ActiveWorkoutScreen (mid-session) and ExerciseDetailScreen all
 *    called rankSwaps without it, and rankSwaps defaults to `equipment = null`
 *    which short-circuits the filter to "keep everything". So the whole
 *    library was on offer, barbell included.
 *
 * 2. Even passing it would not have worked, and would have been WORSE. The
 *    filter compared against `ex.equipment`, the raw seed column ('barbell',
 *    'cable', 'machine'), while what a caller holds is the athlete's PROFILE
 *    ('machines_cables', 'full_gym'). Two different vocabularies, so the
 *    comparison could never be true and the swap list would have come back
 *    empty rather than filtered. ExerciseDetailScreen's `equipment: []` was
 *    already hitting exactly that: the array branch rejected every row, so
 *    its substitutes section could only ever have been empty.
 *
 * The filter now reads equipmentProfiles through the same parser
 * planEngine's filterPool uses, so a swap and a generated plan cannot
 * disagree about what the athlete can actually do.
 */
import { rankSwaps } from '../swapEngine';

// Shaped like real library rows: equipmentProfiles is the profile vocabulary,
// `equipment` is the raw seed column. The two differ on purpose here, because
// conflating them is the bug.
const barbellSquat = {
  id: 'ex_bb_squat',
  name: 'Barbell Back Squat',
  primaryMuscle: 'quads',
  equipment: 'barbell',
  equipmentProfiles: ['full_gym', 'barbell_plates'],
  movementPattern: 'squat',
  isCompound: true,
};
const hackSquat = {
  id: 'ex_hack_squat',
  name: 'Hack Squat Machine',
  primaryMuscle: 'quads',
  equipment: 'machine',
  equipmentProfiles: ['full_gym', 'machines_cables'],
  movementPattern: 'squat',
  isCompound: true,
};
const legPress = {
  id: 'ex_leg_press',
  name: 'Leg Press',
  primaryMuscle: 'quads',
  equipment: 'machine',
  equipmentProfiles: ['full_gym', 'machines_cables'],
  movementPattern: 'squat',
  isCompound: true,
};
const LIB = [barbellSquat, hackSquat, legPress];

const names = (ranked) => ranked.map(r => r.exercise.name);

describe('rankSwaps equipment filter: the founder-reported case', () => {
  test('machines and cables never offers a barbell lift', () => {
    const out = names(rankSwaps(hackSquat, LIB, { equipment: 'machines_cables', numResults: 10 }));
    expect(out).not.toContain('Barbell Back Squat');
    expect(out).toContain('Leg Press');
  });

  test('and the list is filtered, not emptied', () => {
    // The pre-fix vocabulary mismatch would have returned [] here, which is
    // its own defect: an empty swap sheet reads as "no alternatives exist".
    const out = rankSwaps(hackSquat, LIB, { equipment: 'machines_cables', numResults: 10 });
    expect(out.length).toBeGreaterThan(0);
  });

  test('barbell and plates offers the barbell lift and not the machines', () => {
    const out = names(rankSwaps(hackSquat, LIB, { equipment: 'barbell_plates', numResults: 10 }));
    expect(out).toContain('Barbell Back Squat');
    expect(out).not.toContain('Leg Press');
  });

  test('a full gym offers everything', () => {
    const out = names(rankSwaps(hackSquat, LIB, { equipment: 'full_gym', numResults: 10 }));
    expect(out).toContain('Barbell Back Squat');
    expect(out).toContain('Leg Press');
  });
});

describe('rankSwaps equipment filter: the shapes that must not regress', () => {
  test('null equipment keeps the pre-fix behaviour and filters nothing', () => {
    const out = names(rankSwaps(hackSquat, LIB, { equipment: null, numResults: 10 }));
    expect(out).toContain('Barbell Back Squat');
    expect(out).toContain('Leg Press');
  });

  test('omitting equipment entirely still filters nothing', () => {
    const out = names(rankSwaps(hackSquat, LIB, { numResults: 10 }));
    expect(out).toContain('Barbell Back Squat');
  });

  test('an array is still matched against the raw column (the picker chips)', () => {
    // The exercise picker's equipment chips pass raw seed values, so that
    // legacy shape has to keep working alongside the profile string.
    const out = names(rankSwaps(hackSquat, LIB, { equipment: ['machine'], numResults: 10 }));
    expect(out).toContain('Leg Press');
    expect(out).not.toContain('Barbell Back Squat');
  });

  test("an untagged custom exercise is never hidden by an equipment filter", () => {
    // Hiding someone's own exercise on an absence of metadata is a worse
    // failure than showing one they cannot currently do.
    const custom = {
      id: 'ex_custom', name: 'My Own Leg Thing', primaryMuscle: 'quads',
      equipment: 'machine', movementPattern: 'squat', isCompound: true,
    };
    const out = names(rankSwaps(hackSquat, [...LIB, custom], { equipment: 'machines_cables', numResults: 10 }));
    expect(out).toContain('My Own Leg Thing');
  });
});
