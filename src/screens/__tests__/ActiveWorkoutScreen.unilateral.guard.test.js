/**
 * Source-level regression guard — D9 unilateral (per-side) logging.
 *
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, D9 + its
 * two amendments, built against docs/exercise-planning-2026-07-09/
 * plan-C-unilateral-logging.md (Option 2). ActiveWorkoutScreen.js is a
 * ~3,900-line screen with a huge live dependency surface (store, SQLite,
 * notifications, Live Activity, haptics); mounting it is impractical, so —
 * matching this file's existing convention (reorder.guard,
 * supersetRest.guard, usability.guard) — these are byte-level checks
 * against the source that pin the founder's exact ruling so it cannot
 * silently regress:
 *
 *   1. Laterality detection is metadata-driven and never forced: the
 *      suggestion reads exercise.laterality === 'unilateral' (finally
 *      reading exerciseMetadata.js's deriveLaterality — plan-C found it was
 *      computed and stored but never consulted anywhere) and is gated on it,
 *      so a bilateral exercise is never prompted or auto-enrolled.
 *   2. Rest-class behaviour (D9 amendment 2): a compound per-side set halves
 *      the exercise's normal rest BETWEEN sides and AFTER the pair; an
 *      isolation per-side set has no forced between-sides timer (a
 *      switch-sides prompt instead) and takes the FULL normal rest after
 *      the pair — both driven off exercise.compoundIsolation, never a user
 *      setting.
 *   3. Storage invariant: the two-phase flow commits through the SAME
 *      handleCompleteSet a normal set uses (one call, one workout_sets row),
 *      with actualReps computed via lowerSideReps (the lower side, never
 *      the higher) and the breakdown riding in notes — never resurrecting
 *      the legacy left_reps/right_reps columns (migration 054).
 *   4. The one-time walkthrough fires once ever, gated by the same
 *      '@volyume_seen_*' AsyncStorage convention as the rest of the app.
 */
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('D9 unilateral logging: laterality detection never forces bilateral exercises', () => {
  test('the suggestion effect gates strictly on exercise.laterality === \'unilateral\'', () => {
    expect(ACTIVE_WORKOUT).toContain("if (exercise.laterality !== 'unilateral') return;");
  });

  test('per-side mode only ever activates via the sticky ON set, never unconditionally', () => {
    expect(ACTIVE_WORKOUT).toContain('const uni = exercise ? unilateralExercises.has(exercise.id) : false;');
    expect(ACTIVE_WORKOUT).toContain('if (uni) return startPerSide();');
  });

  test('the manual overflow toggle is scoped to unilateral-flagged exercises only', () => {
    expect(ACTIVE_WORKOUT).toContain("exercise?.laterality === 'unilateral' && (");
  });

  test('the suggestion never repeats once an exercise has been asked about', () => {
    expect(ACTIVE_WORKOUT).toContain('if (unilateralAsked.has(exercise.id)) return;');
  });
});

describe('D9 amendment 2: rest-class behaviour is derived, never user-set', () => {
  test('startPerSide derives the between-sides pause from perSideRestPlan(compoundIsolation, restSeconds)', () => {
    const fn = ACTIVE_WORKOUT.match(/function startPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('const restPlan = perSideRestPlan(exercise?.compoundIsolation, routineExercise?.restSeconds || defaultRestSeconds || 90);');
    expect(fn).toContain('if (restPlan.betweenSeconds != null) startRestTimer(restPlan.betweenSeconds);');
  });

  test('the post-pair rest halves for a compound per-side set, stays full for isolation', () => {
    expect(ACTIVE_WORKOUT).toContain('startRestTimer(overrides.perSideCompound ? halfRestSeconds(fullRest) : fullRest);');
  });

  test('finishPerSide flags perSideCompound off exercise.compoundIsolation, not a toggle/setting', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain("perSideCompound: exercise?.compoundIsolation === 'compound',");
  });

  test('the per-side banner names the rest-class difference (compound timer vs isolation switch prompt)', () => {
    expect(ACTIVE_WORKOUT).toContain("exercise?.compoundIsolation === 'compound' ? 'Other side, after your rest' : 'Switch sides'");
    expect(ACTIVE_WORKOUT).toContain("exercise?.compoundIsolation !== 'compound' && (");
  });
});

describe('D9 storage invariant: one workout_sets row, actual_reps = the lower side', () => {
  test('finishPerSide computes actualReps via lowerSideReps (the conservative floor), not a sum or the higher side', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('const actualReps = lowerSideReps(perSide.leftReps, rightReps);');
    expect(fn).not.toMatch(/actualReps\s*=\s*perSide\.leftReps\s*\+\s*rightReps/);
  });

  test('finishPerSide commits through the ONE shared handleCompleteSet path, exactly once', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(fn).toContain('await handleCompleteSet({');
  });

  test('the per-side breakdown rides in notes (formatPerSide), never the legacy left_reps/right_reps columns', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('const notes = mergeClusterNote(noteText, formatPerSide(perSide.leftReps, rightReps));');
    expect(fn).not.toContain('leftReps: perSide.leftReps');
    expect(fn).not.toContain('rightReps: rightReps');
  });

  test('the createWorkoutSet call still hard-codes leftReps/rightReps null — migration 054 columns stay unwritten', () => {
    expect(ACTIVE_WORKOUT).toContain('leftReps: null,');
    expect(ACTIVE_WORKOUT).toContain('rightReps: null,');
  });
});

describe('D9 one-time walkthrough fires once ever, same @volyume_seen_* convention', () => {
  test('a dedicated once-ever AsyncStorage key gates the full walkthrough', () => {
    expect(ACTIVE_WORKOUT).toContain("const UNILATERAL_WALKTHROUGH_SEEN_KEY = '@volyume_seen_unilateral_walkthrough';");
  });

  test('the walkthrough-seen flag is read once at load and written on either answer', () => {
    expect(ACTIVE_WORKOUT).toContain('AsyncStorage.getItem(UNILATERAL_WALKTHROUGH_SEEN_KEY).catch(() => null),');
    expect(ACTIVE_WORKOUT).toContain("AsyncStorage.setItem(UNILATERAL_WALKTHROUGH_SEEN_KEY, 'true').catch(() => {});");
  });

  test('later exercises get a quick confirm only once the walkthrough has been seen', () => {
    expect(ACTIVE_WORKOUT).toContain('if (unilateralWalkthroughSeenRef.current) {');
    expect(ACTIVE_WORKOUT).toContain("appAlert(\n        'Log this one side at a time?',");
  });
});
