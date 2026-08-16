/**
 * Source-level regression guard — the vertical workout list + continuous
 * set sequence (logger redesign phase 2, founder-accepted architecture).
 *
 * What this suite pins and why:
 *
 *   1. JUMPING != REORDERING != SKIPPING (permanent law). Tapping a
 *      workout-list row routes through handleJumpToExercise, which does
 *      nothing but audit + setCurrentExerciseIndex - it never writes
 *      _timeCrunchSkipped, never mutates workoutExercises order, never
 *      touches programme state. Reordering has its own distinct entry
 *      points (row long-press and the overflow row, both opening the
 *      existing block-aware reorder sheet), and skipping remains exclusive
 *      to the time-crunch machinery.
 *   2. Every exercise stays visible/reachable on ONE vertical surface:
 *      compact rows before the current exercise, the current one expanded
 *      inline, compact rows after - the horizontal ExerciseNav strip is
 *      retired.
 *   3. The continuous set sequence: completed sets (LoggedSetRow) render
 *      ABOVE the active entry (NowCard), upcoming prescribed sets render
 *      below it, all inside the expanded exercise - no detached "This
 *      workout" history heading, no second mental model.
 *   4. The reorder engine itself is untouched: DragReorderList +
 *      swapAdjacentBlocks (block-aware supersets), same
 *      setWorkoutExercises persistence, currentExerciseIndex re-pointed.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('jump is jump: tapping another exercise never skips, reorders or advances programme state', () => {
  test('handleJumpToExercise only audits and moves focus', () => {
    const fn = SRC.match(/function handleJumpToExercise\(i\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('setCurrentExerciseIndex(i);');
    expect(fn).toContain("audit('workout.exercise.jump'");
    // Nothing else: no skip flag, no order mutation, no set writes.
    expect(fn).not.toContain('_timeCrunchSkipped');
    expect(fn).not.toContain('setWorkoutExercises');
    expect(fn).not.toContain('handleCompleteSet');
    expect(fn).not.toContain('handleNextExercise');
  });

  test('the outline taps into handleJumpToExercise; long-press opens the existing reorder sheet', () => {
    // Phase 2B: the navigator is WorkoutOutline; its onSelect is the jump
    // handler and its onReorder is the one order-changing path.
    expect(SRC).toContain('onSelect={handleJumpToExercise}');
    expect(SRC).toContain('onReorder={workoutExercises.length > 1 ? () => setShowReorderSheet(true) : undefined}');
  });

  test('an armed auto-advance countdown cannot outlive a jump: the index-change backstop cancels it', () => {
    expect(SRC).toMatch(/return \(\) => cancelAutoAdvance\(\);\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\}, \[currentExerciseIndex\]\);/);
  });

  test('_timeCrunchSkipped is written ONLY by the time-crunch/starter machinery, never by navigation', () => {
    const writes = SRC.match(/_timeCrunchSkipped: true/g) ?? [];
    // Exactly the two existing write sites: applyStarterSession and
    // handleTimeCrunch. A third write means navigation grew a skip
    // side-effect - the exact defect the law forbids.
    expect(writes.length).toBe(2);
  });
});

describe('one workout surface: the outline navigator keeps every exercise reachable (phase 2B)', () => {
  test('the outline renders FIXED between header and workspace, never buried under the logger', () => {
    // Failure 5 (founder screenshots): forward exercises must not require
    // scrolling through the whole active logger. The outline is a sibling of
    // the ScrollView, not content inside it.
    const outlineIdx = SRC.indexOf('<WorkoutOutline');
    const scrollIdx = SRC.indexOf('<ScrollView\n          ref={scrollRef}');
    expect(outlineIdx).toBeGreaterThan(-1);
    expect(scrollIdx).toBeGreaterThan(outlineIdx);
    expect(SRC).toContain("import WorkoutOutline from '../components/workout/WorkoutOutline';");
    // The horizontal pill strip stays retired, and so does the phase-2
    // card-per-exercise list.
    expect(SRC).not.toContain('<ExerciseNav');
    expect(SRC).not.toContain('WorkoutExerciseRow');
  });

  test('outline totals use the same derivation the pill strip used (adjusted current, freeform fallback)', () => {
    const fn = SRC.match(/const outlineItems = workoutExercises\.map\(\(entry, i\) => \{[\s\S]*?\n  \}\);/)?.[0] ?? '';
    expect(fn).toContain('done: countProgressSets(entry.sets ?? [])');
    expect(fn).toContain('? adjustedSetCount');
    expect(fn).toContain(': entry.routineExercise?.recommendedSets) || DEFAULT_FREEFORM_TARGET_SETS');
    expect(fn).toContain('skipped: !!entry._timeCrunchSkipped');
    // Superset members carry the same 2-vs-3+ naming.
    expect(fn).toContain("groupLabel: gid != null ? (groupSize > 2 ? 'Giant set' : 'Superset') : null");
  });
});

describe('the continuous set sequence: completed above, active entry, upcoming below - one list', () => {
  test('logged rows render ABOVE the NowCard entry, inside the expanded exercise, with no separate history heading', () => {
    const loggedIdx = SRC.indexOf('{loggedSets.length > 0 && (');
    const nowCardIdx = SRC.indexOf('<NowCard');
    const upcomingIdx = SRC.indexOf('style={styles.upcomingSection}');
    expect(loggedIdx).toBeGreaterThan(-1);
    expect(nowCardIdx).toBeGreaterThan(loggedIdx);
    expect(upcomingIdx).toBeGreaterThan(nowCardIdx);
    // The old two-mental-models heading is gone.
    expect(SRC).not.toContain('>This workout</Text>');
  });

  test('in-place edit, long-press delete and PR re-evaluation survive the move verbatim', () => {
    expect(SRC).toContain('onEdit={openEditSet}');
    expect(SRC).toContain('onDelete={openDeleteFromMenu}');
    expect(SRC).toContain('onDeleteEdit={handleDeleteEditedSet}');
    expect(SRC).toContain('onSaveEdit={handleSaveEditedSet}');
  });

  test('upcoming rows are read-only previews of the remaining prescribed working sets', () => {
    expect(SRC).toContain('for (let n = workingLogged + 2; n <= targetSets; n += 1) {');
    // They derive from the readiness-trimmed display targets, so a reduced
    // day never previews more sets than the session actually prescribes.
    expect(SRC).toContain('const tgt = displaySetTargets[n - 1];');
    // No handlers: previews cannot log, edit or navigate.
    const upcoming = SRC.match(/for \(let n = workingLogged \+ 2[\s\S]*?return rows\.length/)?.[0] ?? '';
    expect(upcoming).not.toContain('onPress');
  });
});

describe('the reorder engine is the untouched block-aware sheet', () => {
  test('DragReorderList + swapAdjacentBlocks + index re-pointing all remain', () => {
    expect(SRC).toContain('<DragReorderList');
    expect(SRC).toContain('onReorder={handleReorderWorkoutExercises}');
    expect(SRC).toContain('getGroupId={(e) => e.supersetGroupId ?? null}');
    const fn = SRC.match(/function handleReorderWorkoutExercises\(nextExercises\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('const movedEntry = workoutExercises[currentExerciseIndex];');
    expect(fn).toContain('const newIndex = nextExercises.indexOf(movedEntry);');
  });
});
