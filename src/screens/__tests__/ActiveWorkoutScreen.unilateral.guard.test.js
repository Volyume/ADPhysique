/**
 * Source-level regression guard — unilateral (per-side) logging.
 *
 * REWRITTEN for the D-founder unilateral reversal (2026-07-11): the founder
 * device-verdicted the original D9 "two-phase per-side" build as
 * ED-adverse. That design asked the user to type an INDEPENDENT rep count
 * for the second side (perSideReps), which normalises training one side
 * harder than the other. This is a founder REVERSAL of D9, not a tweak —
 * every pin below either survives unchanged (laterality gating, sticky-on
 * activation, rest-class behaviour, one-time walkthrough) or is rewritten to
 * assert the NEW contract: a unilateral exercise prescribes the SAME reps
 * for both sides; the interaction GUIDES side one -> a rest-class-governed
 * pause -> side two, with no second number ever typed; the pair still
 * commits as ONE workout_sets row. Terminology: this is SEQUENTIAL
 * (unilateral) logging — all reps on one side, then the other — not
 * "alternating" (switching sides every rep), and the copy in
 * ActiveWorkoutScreen.js is written accordingly.
 *
 * ActiveWorkoutScreen.js is a ~3,900-line screen with a huge live dependency
 * surface (store, SQLite, notifications, Live Activity, haptics); mounting
 * it is impractical, so — matching this file's existing convention
 * (reorder.guard, supersetRest.guard, usability.guard) — these are
 * byte-level checks against the source that pin the founder's exact ruling
 * so it cannot silently regress:
 *
 *   1. Laterality detection is metadata-driven and never forced: the
 *      suggestion reads exercise.laterality === 'unilateral' and is gated
 *      on it, so a bilateral exercise is never prompted or auto-enrolled.
 *      UNCHANGED by the reversal — still correct under the new contract.
 *   2. Rest-class behaviour (D9 amendment 2, UNCHANGED): a compound
 *      per-side set halves the exercise's normal rest BETWEEN sides and
 *      AFTER the pair; an isolation per-side set has no forced
 *      between-sides timer (a switch-sides prompt instead) and takes the
 *      FULL normal rest after the pair — both driven off
 *      exercise.compoundIsolation, never a user setting. Only WHERE the
 *      between-sides timer starts moves (side one -> side two, not on
 *      entry), because entering the guided sheet no longer means side one
 *      is already done.
 *   3. Storage invariant, REWRITTEN: the two-phase flow still commits
 *      through the SAME handleCompleteSet a normal set uses (one call, one
 *      workout_sets row), but actualReps is now the ONE prescribed reps
 *      value (perSide.reps) used for both sides — never a lower/higher
 *      comparison between two independently typed numbers (lowerSideReps
 *      is gone from this screen). The legacy left_reps/right_reps columns
 *      (migration 054) stay unwritten for every new set, exactly as
 *      before; formatPerSide remains the READ path for OLDER sets logged
 *      under the original divergent-count design (backward compatibility —
 *      those historic rows must still render).
 *   4. The one-time walkthrough fires once ever, gated by the same
 *      '@volyume_seen_*' AsyncStorage convention as the rest of the app.
 *      UNCHANGED gating mechanics; its copy is rewritten to describe the
 *      same-reps-both-sides model instead of "your lower side's reps".
 *   5. NEW: there is no per-side rep TextInput anywhere in the screen — the
 *      divergent ask the founder ruled against is fully removed, not hidden
 *      behind a toggle.
 */
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('unilateral logging: laterality detection never forces bilateral exercises', () => {
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

describe('D9 amendment 2: rest-class behaviour is derived, never user-set (unchanged by the reversal)', () => {
  test('R4 (D64): startPerSide derives and starts the between-sides pause itself - the Log set tap IS side one done', () => {
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

  test('R4 (D64): the between-sides banner names the rest-class difference (compound rest vs isolation switch prompt)', () => {
    expect(ACTIVE_WORKOUT).toContain("? 'Rest, switch sides, then tap Log other side.'");
    expect(ACTIVE_WORKOUT).toContain(': "Switch sides when you\'re ready, then tap Log other side."');
  });
});

describe('storage invariant, rewritten: one workout_sets row, actual_reps = the ONE prescribed reps, both sides', () => {
  test('startPerSide takes a SINGLE reps value from the set entry — no leftReps/rightReps split', () => {
    const fn = ACTIVE_WORKOUT.match(/function startPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('const reps = parseInt(currentSet.reps, 10);');
    expect(fn).not.toContain('leftReps');
  });

  test('finishPerSide commits actualReps as the ONE prescribed reps value, never lowerSideReps or a sum of two independently typed numbers', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('actualReps: perSide.reps,');
    expect(fn).not.toContain('lowerSideReps(');
    expect(fn).not.toMatch(/actualReps\s*=\s*perSide\.leftReps\s*\+\s*rightReps/);
    // lowerSideReps implied comparing two independently-entered counts —
    // that comparison, and the second count itself, no longer exist here.
    expect(ACTIVE_WORKOUT).not.toContain('lowerSideReps');
  });

  test('finishPerSide commits through the ONE shared handleCompleteSet path, exactly once', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(fn).toContain('await handleCompleteSet({');
  });

  test('there is no per-side rep TextInput left anywhere in the screen — the divergent ask is removed, not hidden', () => {
    expect(ACTIVE_WORKOUT).not.toContain('Other side reps');
    expect(ACTIVE_WORKOUT).not.toContain('setPerSideReps');
    expect(ACTIVE_WORKOUT).not.toContain('perSideReps');
  });

  test('the createWorkoutSet call still hard-codes leftReps/rightReps null — migration 054 columns stay unwritten for every new set', () => {
    expect(ACTIVE_WORKOUT).toContain('leftReps: null,');
    expect(ACTIVE_WORKOUT).toContain('rightReps: null,');
  });

  test('formatPerSide is no longer imported by the screen (new sets never produce a left/right breakdown) but stays the READ path for legacy rows elsewhere (LoggedSetRow.js)', () => {
    expect(ACTIVE_WORKOUT).not.toMatch(/import\s*\{[^}]*formatPerSide/);
    const loggedSetRow = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'workout', 'LoggedSetRow.js'),
      'utf8',
    );
    expect(loggedSetRow).toContain("import { formatPerSide } from '../../lib/unilateral';");
    expect(loggedSetRow).toContain('formatPerSide(set.leftReps, set.rightReps)');
  });
});

describe('guided two-phase interaction: side one -> rest-class pause -> side two -> one row', () => {
  test('R4 (D64): perSide state carries ONE rep count and enters side-two directly - pressing Log set is side one', () => {
    expect(ACTIVE_WORKOUT).toContain("const [perSide, setPerSide] = useState(null);");
    expect(ACTIVE_WORKOUT).toContain("phase: 'side2',");
    // The middle confirm tap is gone for good.
    expect(ACTIVE_WORKOUT).not.toContain('function advancePerSideToSideTwo');
    expect(ACTIVE_WORKOUT).not.toContain("phase: 'side1',");
  });

  test('R4 (D64): the permanent bar primary commits side two (Log other side) - no confirm sheet', () => {
    // Mid-pair, handleCompleteSetPress routes the same primary to finishPerSide.
    expect(ACTIVE_WORKOUT).toContain('if (perSide) return finishPerSide();');
    // The primary relabels in place; the spoken label matches.
    expect(ACTIVE_WORKOUT).toContain("perSide ? 'Log other side'");
    expect(ACTIVE_WORKOUT).toContain("perSide ? 'Other side done, log this set'");
    // The per-side WorkoutBottomSheet is retired; the between-sides state is
    // the inline banner (cluster-banner visual class, proper gap rhythm).
    expect(ACTIVE_WORKOUT).not.toContain('visible={!!perSide}');
    expect(ACTIVE_WORKOUT).toContain('Side one logged');
  });

  test('per-side pairs still count as ONE set toward whatever target resolves (finishPerSide -> one handleCompleteSet call, one row)', () => {
    const fn = ACTIVE_WORKOUT.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
  });
});

describe('one-time walkthrough fires once ever, same @volyume_seen_* convention (gating unchanged, copy rewritten)', () => {
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

  test('R4 (D64): the walkthrough teaches the two-tap flow and never promises a "lower side" comparison', () => {
    expect(ACTIVE_WORKOUT).not.toContain("using your lower side's reps");
    expect(ACTIVE_WORKOUT).toContain('Do your first side, then tap Log set.');
    expect(ACTIVE_WORKOUT).toContain('Tap Log other side - the same button, one more tap.');
  });
});
