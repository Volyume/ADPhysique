// L07-F9 (docs/design-usability-audit-2026-07-09, D6): in-session
// drag-reorder of exercises was missing (nav-strip tap-to-jump only). Founder
// originally approved a chevron-only fix reusing RoutineDetailScreen's swap-
// adjacent-indices pattern (no PanResponder/library). That chevron-only
// ruling (D5/D6, 2026-07-09) is SUPERSEDED by D32 (founder-delegated,
// lead-ruled 2026-07-10, campaign item 20): the founder's GO ("replace
// chevron-only reorder with true drag") plus the lead ruling that the
// SESSION gets a purpose-built reorder sheet rather than in-view drag (the
// single-exercise view is a deliberate focus design; in-view drag mid-
// training is ergonomically risky). PanResponder and runOnJS are no longer
// banned strings (runOnJS is exactly how DragReorderList, used inside the
// new sheet, dispatches its worklet state changes -- the established
// ProgressPhotoViewer.js hero-morph pattern). What stays pinned from the
// original suite: no new dependency, no draggable-flatlist (or any other
// reorder) library, ever; handleMoveExercise (the main view's one-step
// overflow move) is completely UNTOUCHED, including its superset-adjacency
// guard and its persistence path; and order persists through the same
// setWorkoutExercises -> _persistActiveWorkout path every other order-
// affecting action already uses. New: the reorder SHEET (whole-workout
// drag + its own accessible chevrons, block-aware) is additive, opened from
// the existing overflow menu, and keeps currentExerciseIndex pointed at the
// same exercise after either of its move paths.
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('ActiveWorkoutScreen in-session exercise reorder (L07-F9)', () => {
  test('handleMoveExercise (the overflow one-step move) is untouched', () => {
    expect(ACTIVE_WORKOUT).toContain('function handleMoveExercise(direction)');
    expect(ACTIVE_WORKOUT).toContain("const swapIndex = direction === 'up' ? currentExerciseIndex - 1 : currentExerciseIndex + 1;");
  });

  test('D32: no new dependency -- the reorder sheet reuses DragReorderList (gesture-handler + Reanimated), never a reorder library', () => {
    expect(ACTIVE_WORKOUT).toContain("import DragReorderList from '../components/DragReorderList';");
    expect(ACTIVE_WORKOUT).toContain('<DragReorderList');
    expect(ACTIVE_WORKOUT).not.toMatch(/draggable-flatlist/i);
    expect(ACTIVE_WORKOUT).not.toMatch(/react-native-sortable/i);
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
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): ActiveWorkoutScreen now
    // reads a live theme (src/hooks/useTheme.js); sheetOptionLabel gained a
    // live.sheetOptionLabel override in its style array. Frozen `styles`
    // block (asserted elsewhere) is byte-identical -- mechanical only.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Move exercise up</Text>');
    expect(ACTIVE_WORKOUT).toContain('{canMoveDown && (');
    expect(ACTIVE_WORKOUT).toContain("onPress={() => { setShowOverflow(false); handleMoveExercise('down'); }}");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Move exercise down"');
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Move exercise down</Text>');
  });

  test('D32: the overflow menu opens the new reorder sheet, additive to Move exercise up/down (only when there is more than one exercise)', () => {
    expect(ACTIVE_WORKOUT).toContain('const [showReorderSheet, setShowReorderSheet] = useState(false);');
    expect(ACTIVE_WORKOUT).toContain('{workoutExercises.length > 1 && (');
    expect(ACTIVE_WORKOUT).toContain('onPress={() => { setShowOverflow(false); setShowReorderSheet(true); }}');
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Reorder exercises"');
  });

  test('D32: the sheet is block-aware -- a paired exercise moves and lands as a unit, via the shared reorder helper', () => {
    expect(ACTIVE_WORKOUT).toContain("import { swapAdjacentBlocks } from '../lib/reorder';");
    const sheetHandlerWindow = ACTIVE_WORKOUT.match(/function handleSheetMoveExercise\(index, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(sheetHandlerWindow).toContain("swapAdjacentBlocks(workoutExercises, index, direction, (e) => e.supersetGroupId ?? null)");
  });

  test('D32: both sheet move paths persist through setWorkoutExercises (the SAME _persistActiveWorkout flow) and re-point currentExerciseIndex at the same exercise', () => {
    const dragHandlerWindow = ACTIVE_WORKOUT.match(/function handleReorderWorkoutExercises\(nextExercises\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(dragHandlerWindow).toContain('useAppStore.getState().setWorkoutExercises(nextExercises);');
    expect(dragHandlerWindow).toContain('const newIndex = nextExercises.indexOf(movedEntry);');
    expect(dragHandlerWindow).toContain('setCurrentExerciseIndex(newIndex);');

    const sheetHandlerWindow = ACTIVE_WORKOUT.match(/function handleSheetMoveExercise\(index, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(sheetHandlerWindow).toContain('useAppStore.getState().setWorkoutExercises(updated);');
    expect(sheetHandlerWindow).toContain('setCurrentExerciseIndex(newIndex);');
  });

  test('D32: completed/in-progress sets are never touched by either sheet move path (order metadata only)', () => {
    const dragHandlerWindow = ACTIVE_WORKOUT.match(/function handleReorderWorkoutExercises\(nextExercises\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const sheetHandlerWindow = ACTIVE_WORKOUT.match(/function handleSheetMoveExercise\(index, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(dragHandlerWindow).not.toMatch(/\.sets\b/);
    expect(sheetHandlerWindow).not.toMatch(/\.sets\b/);
  });

  test('D32: the sheet is tier-blind (no tier reference anywhere in its render block)', () => {
    const sheetWindow = ACTIVE_WORKOUT.match(/\{\/\* Reorder sheet \(D32[\s\S]*?<\/WorkoutBottomSheet>/)?.[0] ?? '';
    expect(sheetWindow.length).toBeGreaterThan(0);
    expect(sheetWindow).not.toMatch(/\btier\b/);
  });
});
