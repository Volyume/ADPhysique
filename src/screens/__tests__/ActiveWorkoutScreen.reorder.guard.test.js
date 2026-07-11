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
// ProgressPhotoViewer.js hero-morph pattern). What stays pinned: no new
// dependency, no draggable-flatlist (or any other reorder) library, ever;
// and order persists through the same setWorkoutExercises ->
// _persistActiveWorkout path every other order-affecting action already
// uses.
//
// D43 S3 (blueprint 3.8, "overflow diet"): the overflow's one-step
// "Move exercise up/down" entries (handleMoveExercise, canMoveUp,
// canMoveDown) are DELETED, superseding D32's "additive" framing above --
// the reorder sheet (block-aware drag + its own accessible chevrons) is now
// the ONE reorder path. handleMoveExercise/canMoveUp/canMoveDown were
// grepped for other callers before deletion: none found, genuinely dead.
// The sheet's own move path (handleSheetMoveExercise) and its
// superset-adjacency guard (swapAdjacentBlocks) are what the tests below
// pin instead.
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('ActiveWorkoutScreen in-session exercise reorder (L07-F9, re-pinned D43 S3)', () => {
  test('D43 S3: handleMoveExercise/canMoveUp/canMoveDown (the old overflow one-step move) are gone -- the reorder sheet is the one path', () => {
    expect(ACTIVE_WORKOUT).not.toContain('function handleMoveExercise(direction)');
    expect(ACTIVE_WORKOUT).not.toContain('const canMoveUp = currentExerciseIndex > 0');
    expect(ACTIVE_WORKOUT).not.toContain('const canMoveDown = currentExerciseIndex < workoutExercises.length - 1');
    expect(ACTIVE_WORKOUT).not.toContain('accessibilityLabel="Move exercise up"');
    expect(ACTIVE_WORKOUT).not.toContain('accessibilityLabel="Move exercise down"');
  });

  test('D32: no new dependency -- the reorder sheet reuses DragReorderList (gesture-handler + Reanimated), never a reorder library', () => {
    expect(ACTIVE_WORKOUT).toContain("import DragReorderList from '../components/DragReorderList';");
    expect(ACTIVE_WORKOUT).toContain('<DragReorderList');
    expect(ACTIVE_WORKOUT).not.toMatch(/draggable-flatlist/i);
    expect(ACTIVE_WORKOUT).not.toMatch(/react-native-sortable/i);
  });

  test('the sheet move path persists through the same mechanism as every other session order change', () => {
    const moveWindow = ACTIVE_WORKOUT.match(/function handleSheetMoveExercise\(index, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('useAppStore.getState().setWorkoutExercises(updated);');
    expect(moveWindow).toContain('setCurrentExerciseIndex(newIndex);');
  });

  test('a sheet move is block-aware -- a superset pair moves and lands as a unit, via the shared swapAdjacentBlocks helper', () => {
    expect(ACTIVE_WORKOUT).toContain("import { swapAdjacentBlocks } from '../lib/reorder';");
    const moveWindow = ACTIVE_WORKOUT.match(/function handleSheetMoveExercise\(index, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain("swapAdjacentBlocks(workoutExercises, index, direction, (e) => e.supersetGroupId ?? null)");
  });

  test('D32: the overflow menu opens the reorder sheet (only when there is more than one exercise)', () => {
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
