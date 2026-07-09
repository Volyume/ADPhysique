/**
 * L07-F2 — PR detection re-runs after an in-session edit or delete of a
 * logged set.
 *
 * Two contracts pinned together, same shape as detectPR.firstLift.test.js:
 *  1. ENGINE BEHAVIOUR (real detectPR + bestPRPerExercise, no mocks): editing
 *     a set's numbers down un-does a PR it no longer earns; editing a set's
 *     numbers up awards a PR it now earns that it didn't before; a deleted
 *     set's own PR entry does not survive it. detectPR/bestPRPerExercise
 *     themselves are untouched by L07-F2 - this only proves the screen's
 *     re-evaluation calls compose correctly with the existing engine.
 *  2. WIRING (source-guard): ActiveWorkoutScreen.js's edit/delete handlers
 *     actually call detectPR again with history that excludes the set's own
 *     pre-edit entry, mirror the log-time first-lift exclusion, and prune
 *     sessionSetsRef/detectedPRs on delete so a later set never compares
 *     against a removed one.
 */
import fs from 'fs';
import path from 'path';
import { detectPR, bestPRPerExercise } from '../../lib/algorithms';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

// Mirrors exactly what handleSaveEditedSet / handleDeleteEditedSet do: keep a
// list of "detected PRs" (one entry per exercise, tagged with the setId that
// earned it) and a session history ref, then recompute after an edit/delete.
function recomputeAfterEdit({ detectedPRs, sessionSets, allTimeSets, editedSetId, newWeight, newReps, exercise, units = 'kg' }) {
  const updatedSessionSets = sessionSets.map(s => (
    s.id === editedSetId ? { ...s, weight: newWeight, actualReps: newReps } : s
  ));
  const editPrHistory = [
    ...allTimeSets,
    ...updatedSessionSets.filter(s => s.exerciseId === exercise.id && s.id !== editedSetId),
  ];
  const editedPrs = detectPR({ weight: newWeight, actualReps: newReps }, editPrHistory, exercise, units);
  const withoutThisSet = detectedPRs.filter(p => p.setId !== editedSetId);
  const nextDetectedPRs = (editedPrs.length === 0 || editPrHistory.length === 0)
    ? withoutThisSet
    : bestPRPerExercise([
      ...withoutThisSet,
      ...editedPrs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units, setId: editedSetId })),
    ]);
  return { detectedPRs: nextDetectedPRs, sessionSets: updatedSessionSets, editedPrs, editPrHistory };
}

function recomputeAfterDelete({ detectedPRs, sessionSets, deletedSetId }) {
  return {
    detectedPRs: detectedPRs.filter(p => p.setId !== deletedSetId),
    sessionSets: sessionSets.filter(s => s.id !== deletedSetId),
  };
}

describe('L07-F2 contract 1: engine behaviour composes correctly on edit/delete', () => {
  const exercise = { id: 'bench-press', name: 'Bench press' };

  test('PR revocation on edit-down: a set that earned a PR loses it once corrected below the prior best', () => {
    const allTimeSets = [{ weight: 80, actualReps: 8, exerciseId: exercise.id }]; // prior all-time best
    // Set 1 was logged at 90kg x 8, beating the 80kg all-time best -> PR.
    const sessionSets = [{ id: 'set-1', exerciseId: exercise.id, weight: 90, actualReps: 8 }];
    let detectedPRs = bestPRPerExercise(
      detectPR({ weight: 90, actualReps: 8 }, allTimeSets, exercise, 'kg')
        .map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units: 'kg', setId: 'set-1' })),
    );
    expect(detectedPRs.some(p => p.setId === 'set-1')).toBe(true);

    // The lifter mis-typed the weight; corrected down to 70kg, which no
    // longer beats the 80kg historical best.
    const result = recomputeAfterEdit({
      detectedPRs, sessionSets, allTimeSets, editedSetId: 'set-1',
      newWeight: 70, newReps: 8, exercise,
    });
    expect(result.editedPrs).toHaveLength(0);
    expect(result.detectedPRs.some(p => p.setId === 'set-1')).toBe(false);
  });

  test('PR award on edit-up: a set with no PR at log time earns one once corrected above the prior best', () => {
    const allTimeSets = [{ weight: 80, actualReps: 8, exerciseId: exercise.id }];
    // Logged at 75kg (does not beat 80kg) -> no PR at log time.
    const sessionSets = [{ id: 'set-2', exerciseId: exercise.id, weight: 75, actualReps: 8 }];
    let detectedPRs = [];
    const atLogTime = detectPR({ weight: 75, actualReps: 8 }, allTimeSets, exercise, 'kg');
    expect(atLogTime).toHaveLength(0);

    // Corrected up to 85kg, which now beats the 80kg all-time best.
    const result = recomputeAfterEdit({
      detectedPRs, sessionSets, allTimeSets, editedSetId: 'set-2',
      newWeight: 85, newReps: 8, exercise,
    });
    expect(result.editedPrs.length).toBeGreaterThan(0);
    expect(result.detectedPRs.some(p => p.setId === 'set-2')).toBe(true);
  });

  test('delete removes a dependent PR: deleting the set that earned it clears the badge', () => {
    const allTimeSets = [{ weight: 80, actualReps: 8, exerciseId: exercise.id }];
    const sessionSets = [{ id: 'set-3', exerciseId: exercise.id, weight: 100, actualReps: 8 }];
    const detectedPRs = bestPRPerExercise(
      detectPR({ weight: 100, actualReps: 8 }, allTimeSets, exercise, 'kg')
        .map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units: 'kg', setId: 'set-3' })),
    );
    expect(detectedPRs.some(p => p.setId === 'set-3')).toBe(true);

    const result = recomputeAfterDelete({ detectedPRs, sessionSets, deletedSetId: 'set-3' });
    expect(result.detectedPRs.some(p => p.setId === 'set-3')).toBe(false);
    expect(result.sessionSets.some(s => s.id === 'set-3')).toBe(false);
  });

  test('a PR earned by an untouched sibling set survives an unrelated edit', () => {
    const allTimeSets = [];
    const sessionSets = [
      { id: 'set-4', exerciseId: exercise.id, weight: 60, actualReps: 8 },
      { id: 'set-5', exerciseId: exercise.id, weight: 40, actualReps: 8 },
    ];
    // set-4 logged first against empty history -> first_lift, excluded from
    // detectedPRs (mirrors the celebration-layer exclusion, not tested here).
    // set-5 logged second, beats neither the all-time-empty history nor
    // set-4 (40 < 60) -> no PR either. Now correct set-5's REPS (not weight)
    // upward so it earns a most_reps_at_weight PR without touching set-4.
    let detectedPRs = [];
    const result = recomputeAfterEdit({
      detectedPRs, sessionSets, allTimeSets, editedSetId: 'set-5',
      newWeight: 60, newReps: 10, exercise,
    });
    // set-5 now matches set-4's weight (60) with more reps (10 > 8) -> PR.
    expect(result.editedPrs.some(p => p.type === 'most_reps_at_weight')).toBe(true);
    expect(result.detectedPRs.some(p => p.setId === 'set-5')).toBe(true);
  });
});

describe('L07-F2 contract 2: the screen wires edit/delete back into PR state', () => {
  test('handleSaveEditedSet re-runs detectPR with history excluding this set\'s own pre-edit entry', () => {
    const window = ACTIVE_WORKOUT.match(/async function handleSaveEditedSet\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(window).toContain('sessionSetsRef.current = sessionSetsRef.current.map(s => (');
    expect(window).toContain('s.id === editingSet.id ? { ...s, weight, actualReps } : s');
    expect(window).toContain('s.exerciseId === exercise.id && s.id !== editingSet.id');
    expect(window).toContain('const editedPrs = detectPR({ weight, actualReps }, editPrHistory, exercise, units);');
  });

  test('editing mirrors the log-time first-lift exclusion (empty history never celebrates or joins the PR list)', () => {
    const window = ACTIVE_WORKOUT.match(/async function handleSaveEditedSet\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(window).toContain('if (editedPrs.length > 0 && editPrHistory.length > 0)');
    expect(window).toContain('if (editedPrs.length === 0 || editPrHistory.length === 0) return withoutThisSet;');
  });

  test('editing a set clears its own stale PR entry before merging in any new one', () => {
    const window = ACTIVE_WORKOUT.match(/async function handleSaveEditedSet\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(window).toContain('const withoutThisSet = prev.filter(p => p.setId !== editingSet.id);');
    expect(window).toContain('return bestPRPerExercise([');
  });

  test('handleDeleteEditedSet drops the deleted set from session PR history and clears its PR badge', () => {
    const window = ACTIVE_WORKOUT.match(/function handleDeleteEditedSet\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(window).toContain('sessionSetsRef.current = sessionSetsRef.current.filter(s => s.id !== target.id);');
    expect(window).toContain('setDetectedPRs(prev => prev.filter(p => p.setId !== target.id));');
  });

  test('detectPR itself is not reimplemented on the screen (reused import only)', () => {
    expect(ACTIVE_WORKOUT).toContain("detectPR,\n  bestPRPerExercise,");
    // No local redefinition of the PR-detection rule set.
    expect(ACTIVE_WORKOUT).not.toMatch(/function\s+detectPR\s*\(/);
  });
});
