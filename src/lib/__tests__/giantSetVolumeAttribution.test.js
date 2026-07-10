/**
 * Invariant: a giant set (3+ exercises sharing one supersetGroupId) must credit
 * each exercise's OWN muscles exactly as ungrouped logging would.
 *
 * Campaign item 21 (docs/ux-world-class-audit-2026-07-09/
 * CAMPAIGN-2026-07-10-APPROVED-SLATE.md) extends supersets to 3+ giant sets in
 * the builder and the live session. The ENGINE-ADJACENT hard requirement is
 * that volume attribution stays correct: grouping is a session/UI concern only,
 * so it must NOT change which muscle a logged set credits.
 *
 * This runs against the REAL attribution engine (algorithms.calculateWeeklyVolume
 * -> allocateExerciseVolume). It proves, per-muscle, that:
 *   1. each exercise's sets credit its own primaryMuscle (and its own
 *      secondaries), never a groupmate's; and
 *   2. the result is byte-identical whether or not the three exercises carry a
 *      shared supersetGroupId - because attribution keys off exerciseId only and
 *      never reads supersetGroupId.
 * If a future change ever routed volume through the group, this fails.
 */
import { calculateWeeklyVolume } from '../algorithms';

// Three exercises, three distinct primary muscles, that a user would plausibly
// build into one giant set. Two carry a secondary muscle so the test also pins
// that secondaries stay with their own exercise.
const EX_A = { id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [{ muscle: 'triceps', contribution: 0.5 }] };
const EX_B = { id: 'ex-b', name: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: [{ muscle: 'biceps', contribution: 0.5 }] };
const EX_C = { id: 'ex-c', name: 'Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [] };

// Three working sets logged against each exercise (a normal giant-set round x3).
function loggedSets() {
  const mk = (exerciseId, weight, reps) => ({ exerciseId, weight, reps, actualReps: reps, setType: 'straight' });
  return [
    mk('ex-a', 60, 8), mk('ex-a', 60, 8), mk('ex-a', 60, 8),
    mk('ex-b', 70, 8), mk('ex-b', 70, 8), mk('ex-b', 70, 8),
    mk('ex-c', 10, 12), mk('ex-c', 10, 12), mk('ex-c', 10, 12),
  ];
}

describe('giant-set volume attribution stays per-exercise', () => {
  test('each exercise credits its OWN muscles, never a groupmate\'s', () => {
    const sets = loggedSets();
    const map = { 'ex-a': EX_A, 'ex-b': EX_B, 'ex-c': EX_C };
    const vol = calculateWeeklyVolume(sets, map);

    // Primaries: 3 working sets each, on their own muscle only.
    expect(vol.chest.workingSets).toBe(3);
    expect(vol.back.workingSets).toBe(3);
    expect(vol.side_delts.workingSets).toBe(3);
    // Secondaries: 0.5 credit x3 sets = 1.5, attributed to each exercise's OWN
    // secondary (triceps from Bench, biceps from Row), never blended together.
    expect(vol.triceps.workingSets).toBeCloseTo(1.5);
    expect(vol.biceps.workingSets).toBeCloseTo(1.5);
    // Reps/tonnage credit only to the primary the load directly trains.
    expect(vol.chest.reps).toBe(24);
    expect(vol.chest.tonnage).toBe(60 * 8 * 3);
    // A groupmate's muscle is never credited from another exercise's sets:
    // side_delts (Lateral Raise) gets no chest/back load, and chest gets no
    // side-delt sets.
    expect(vol.side_delts.tonnage).toBe(10 * 12 * 3);
  });

  test('attaching a shared supersetGroupId changes NOTHING in attribution', () => {
    const sets = loggedSets();
    const gid = 'ss-giant-1';
    const ungrouped = { 'ex-a': EX_A, 'ex-b': EX_B, 'ex-c': EX_C };
    const grouped = {
      'ex-a': { ...EX_A, supersetGroupId: gid },
      'ex-b': { ...EX_B, supersetGroupId: gid },
      'ex-c': { ...EX_C, supersetGroupId: gid },
    };
    // Identical output whether the three are a giant set or three lone lifts.
    expect(calculateWeeklyVolume(sets, grouped)).toEqual(calculateWeeklyVolume(sets, ungrouped));
  });
});
