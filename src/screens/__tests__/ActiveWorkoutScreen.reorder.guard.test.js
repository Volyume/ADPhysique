// L07-F9 (docs/design-usability-audit-2026-07-09, D6): in-session
// drag-reorder of exercises was missing (nav-strip tap-to-jump only). Founder
// approved it on the HARD CONSTRAINT of reusing the EXISTING no-new-dependency
// reorder pattern already shipped for RoutineDetailScreen (swap-adjacent
// indices, no PanResponder/library). This suite pins: the reuse (no drag
// library import), the superset-adjacency guard (moving a paired exercise
// would break isPairedWithNext's adjacency assumption), and that order
// persists through the same setWorkoutExercises -> _persistActiveWorkout path
// every other order-affecting action (add/remove exercise) already uses.
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('ActiveWorkoutScreen in-session exercise reorder (L07-F9)', () => {
  test('reuses the existing no-dependency swap-adjacent pattern, no new drag library', () => {
    expect(ACTIVE_WORKOUT).toContain('function handleMoveExercise(direction)');
    expect(ACTIVE_WORKOUT).toContain("const swapIndex = direction === 'up' ? currentExerciseIndex - 1 : currentExerciseIndex + 1;");
    expect(ACTIVE_WORKOUT).not.toMatch(/draggable-flatlist/i);
    expect(ACTIVE_WORKOUT).not.toContain('PanResponder.create');
    expect(ACTIVE_WORKOUT).not.toContain('runOnJS');
  });

  test('move persists through the same mechanism as every other session order change', () => {
    const moveWindow = ACTIVE_WORKOUT.match(/function handleMoveExercise\(direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('useAppStore.getState().setWorkoutExercises(updated);');
    expect(moveWindow).toContain('setCurrentExerciseIndex(swapIndex);');
    expect(moveWindow).toContain('hapticsVocab.selection();');
  });

  test('a move is blocked when it would separate an adjacent superset pair', () => {
    const moveWindow = ACTIVE_WORKOUT.match(/function handleMoveExercise\(direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('if (currentSGI != null || (workoutExercises[swapIndex]?.supersetGroupId ?? null) != null) return;');
    expect(ACTIVE_WORKOUT).toContain('const canMoveUp = currentExerciseIndex > 0 && currentSGI == null && prevSGI == null;');
    expect(ACTIVE_WORKOUT).toContain('const canMoveDown = currentExerciseIndex < workoutExercises.length - 1 && currentSGI == null && nextSGI == null;');
  });

  test('exercise overflow sheet exposes Move exercise up/down, guarded by canMoveUp/canMoveDown', () => {
    expect(ACTIVE_WORKOUT).toContain('{canMoveUp && (');
    expect(ACTIVE_WORKOUT).toContain("onPress={() => { setShowOverflow(false); handleMoveExercise('up'); }}");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Move exercise up"');
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.sheetOptionLabel}>Move exercise up</Text>');
    expect(ACTIVE_WORKOUT).toContain('{canMoveDown && (');
    expect(ACTIVE_WORKOUT).toContain("onPress={() => { setShowOverflow(false); handleMoveExercise('down'); }}");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Move exercise down"');
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.sheetOptionLabel}>Move exercise down</Text>');
  });
});
