/**
 * Source-level regression guard — EL-9 circuit live semantics
 * (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md).
 *
 * A circuit reuses the SAME group-advance mechanism a superset does (A -> B
 * -> C -> back to A). This pins the three behaviours that make it a
 * circuit rather than an ordinary superset:
 *  - no rest between stations (inherited for free: the forward jump never
 *    calls startRestTimer, for either group kind);
 *  - the rest that fires after the LAST station is the group's
 *    round_rest_seconds, never the per-exercise rest_seconds (which the
 *    builder always sets to 0 for a circuit) or the global default;
 *  - every set logged is stamped evidence_class from structure (circuit)
 *    and exercise metadata (ballistic), never chosen by the user.
 *
 * ActiveWorkoutScreen.js is impractical to mount (SQLite, store, haptics,
 * Live Activity - see the other guard files' own header comments), so this
 * is a byte-level check against the source, matching the established
 * convention (supersetRest.guard, groupFocusCue.guard, giantSet.guard).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

const handleCompleteSetWindow = SRC.match(
  /async function handleCompleteSet\(overrides = \{\}\) \{[\s\S]*?\n {2}\/\/ ─── Edit \/ delete an already-logged set/,
);
const fn = handleCompleteSetWindow ? handleCompleteSetWindow[0] : '';

describe('EL-9 circuit model: no rest between stations, round rest only after the last one', () => {
  test('handleCompleteSet is found and windowed for the assertions below', () => {
    expect(handleCompleteSetWindow).toBeTruthy();
  });

  test('isCircuitGroup is derived from the STORED prescription, never created live (unlike an ordinary superset pairing)', () => {
    expect(SRC).toMatch(/const isCircuitGroup = routineExercise\?\.groupKind === 'circuit';/);
  });

  test('the forward station jump (no rest between stations) is UNCONDITIONAL on group kind - inherited from the superset path, not a circuit-only branch', () => {
    // The same findIndex/setCurrentExerciseIndex jump the superset guard
    // pins runs for a circuit too: no isCircuitGroup check gates it.
    expect(fn).toMatch(
      /if \(pairIdx >= 0\) \{\s*\n\s*setCurrentExerciseIndex\(pairIdx\);/,
    );
  });

  test('the rest fired after the last station is the group round_rest_seconds for a circuit, never restSeconds/the default', () => {
    expect(fn).toMatch(
      /const fullRest = isCircuitGroup\s*\n\s*\? \(routineExercise\?\.roundRestSeconds \|\| defaultRestSeconds \|\| 90\)\s*\n\s*: \(routineExercise\?\.restSeconds \|\| defaultRestSeconds \|\| 90\);/,
    );
  });

  test('every logged set is stamped evidence_class from structure + exercise metadata, never a user choice', () => {
    expect(fn).toMatch(/evidenceClass: currentSet\.setType === 'warmup' \? null : currentEvidenceClass,/);
  });

  test('evidence class combines circuit (structural) and ballistic (exercise metadata) into the four EL-7 values', () => {
    expect(SRC).toMatch(
      /const currentEvidenceClass = isCircuitGroup && isBallisticExercise \? 'circuit_ballistic'\s*\n\s*: isCircuitGroup \? 'circuit'\s*\n\s*: isBallisticExercise \? 'ballistic'\s*\n\s*: null;/,
    );
  });

  test('loadCharacter is read defensively (camelCase then snake_case then null) - the column is owned by a separate campaign lane', () => {
    expect(SRC).toMatch(/exercise\?\.loadCharacter \?\? exercise\?\.load_character \?\? null/);
  });
});

describe('EL-11: circuit swap candidates keep the group compatible', () => {
  test('a circuit swap excludes candidates sharing a primary muscle with either immediate neighbour, wrapping the rotation', () => {
    expect(SRC).toMatch(/if \(isCircuitGroup && currentSGI != null\) \{/);
    expect(SRC).toMatch(
      /\[members\[\(selfIdx - 1 \+ members\.length\) % members\.length\], members\[\(selfIdx \+ 1\) % members\.length\]\]/,
    );
  });
});

describe('EL-10: no automatic load-step suggestion for a circuit station or ballistic exercise', () => {
  test('every resolveSetPrescription call for the current exercise carries evidenceClass', () => {
    const calls = SRC.match(/resolveSetPrescription\([^)]*\)/g) || [];
    // At least the four wired call sites - every one that decides what THIS
    // screen shows for the current exercise's next set carries evidenceClass.
    const withEvidenceClass = calls.filter((c) => c.includes('evidenceClass'));
    expect(withEvidenceClass.length).toBeGreaterThanOrEqual(4);
  });
});
