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

  test('the section headers tap into handleJumpToExercise; the overflow sheet opens the existing reorder sheet', () => {
    // RE-PINNED for the logger rebuild stage A (D220): the navigator is the
    // session sheet's collapsed ExerciseSection headers; their tap is the
    // jump handler, and the one order-changing path is the overflow sheet's
    // Reorder exercises row.
    expect(SRC).toContain('onPressHeader={() => handleJumpToExercise(i)}');
    expect(SRC).toContain('onPress={() => { setShowOverflow(false); setShowReorderSheet(true); }}');
    expect(SRC).not.toContain('<WorkoutOutline');
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
  test('every exercise is a section of the one session sheet: collapsed headers above and below the active one', () => {
    // RE-PINNED for the logger rebuild stage A (D220): the outline strip is
    // retired; the session sheet renders every exercise as an
    // ExerciseSection, collapsed to its 56 dp header unless active, so each
    // is one tap away without a separate navigator.
    expect(SRC).toContain("import ExerciseSection from '../components/workout/session/ExerciseSection';");
    expect(SRC).not.toContain("import WorkoutOutline from");
    const scrollIdx = SRC.indexOf('<ScrollView\n          ref={scrollRef}');
    const beforeIdx = SRC.indexOf('{collapsedSectionsBefore}');
    const activeIdx = SRC.indexOf('<ExerciseSection\n            index={currentExerciseIndex + 1}');
    const afterIdx = SRC.indexOf('{collapsedSectionsAfter}');
    expect(scrollIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeGreaterThan(scrollIdx);
    expect(activeIdx).toBeGreaterThan(beforeIdx);
    expect(afterIdx).toBeGreaterThan(activeIdx);
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
    // Superset members carry the same 2-vs-3+ naming. F-13
    // (docs/final-certification-2026-09-05/07-FINDINGS.md, evidence A5): a
    // CIRCUIT station is named by its stored group kind instead, since the
    // 2-vs-3+ split describes supersets and giant sets, not circuits.
    expect(fn).toContain("(groupSize > 2 ? 'Giant set' : 'Superset')");
    expect(fn).toContain("? (entry.routineExercise?.groupKind === 'circuit'");
    expect(fn).toContain("? 'Circuit'");
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
    // Campaign 20 Phase 2 (live set prescription resolver): the readiness-
    // trimmed computeSetTargets snapshot (displaySetTargets) is retired.
    // Upcoming previews now read the SAME reactive resolver-derived
    // `prescriptions` array the NowCard range uses - position n renders
    // prescriptions[n - 1].repsBand, which already carries the readiness
    // trim (applied INSIDE resolveSetPrescription, never re-applied by the
    // screen - the double-trim guard in livePrescription.js's own tests).
    expect(SRC).toContain('const tgt = prescriptions[n - 1];');
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
