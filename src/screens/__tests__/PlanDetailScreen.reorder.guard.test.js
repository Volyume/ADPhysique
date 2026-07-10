// Day-level plan reorder (old founder-GO item, verified unbuilt). Original
// founder direction: reuse the EXISTING no-new-dependency reorder pattern
// already shipped for RoutineDetailScreen (exercise-level swap-adjacent-
// indices, no drag library) one level up, for the days/routines within a
// plan. That chevron-only ruling (D5/D6, 2026-07-09) is SUPERSEDED by D32
// (founder-delegated, lead-ruled 2026-07-10, campaign item 20): true
// long-press drag now ships here too, built on gesture-handler + Reanimated
// (already in the tree) via the shared DragReorderList component --
// PanResponder and runOnJS are no longer banned strings (runOnJS is exactly
// how DragReorderList dispatches its worklet state changes, matching the
// established ProgressPhotoViewer.js hero-morph pattern). What stays pinned
// from the original suite: no new dependency, no draggable-flatlist (or any
// other reorder) library, ever; the chevron move persists via
// updateRoutinePosition for both swapped rows (same two-write shape
// RoutineDetailScreen.handleMoveExercise uses for updateRoutineExerciseOrder);
// the optimistic-revert-and-toast failure shape; and tier-blindness. New:
// the drag path is additive (chevrons remain, DragReorderList is imported
// and wired, and a drag-completed reorder persists through the SAME
// updateRoutinePosition call, generalised to however many days moved).
import fs from 'fs';
import path from 'path';

const PLAN_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'PlanDetailScreen.js'),
  'utf8',
);

describe('PlanDetailScreen day-level reorder', () => {
  test('the chevron swap-adjacent path is untouched and still reachable', () => {
    expect(PLAN_DETAIL).toContain("async function handleMoveDay(routineId, direction) {");
    expect(PLAN_DETAIL).toContain("const swapIndex = direction === 'up' ? index - 1 : index + 1;");
  });

  test('D32: no new dependency -- drag reuses DragReorderList (gesture-handler + Reanimated), never a reorder library', () => {
    expect(PLAN_DETAIL).toContain("import DragReorderList from '../components/DragReorderList';");
    expect(PLAN_DETAIL).toContain('<DragReorderList');
    expect(PLAN_DETAIL).not.toMatch(/draggable-flatlist/i);
    expect(PLAN_DETAIL).not.toMatch(/react-native-sortable/i);
  });

  test('D32: a drag reorder persists through the same updateRoutinePosition call', () => {
    const dragMoveWindow = PLAN_DETAIL.match(/async function handleReorderWorkouts\(nextWorkouts\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(dragMoveWindow).toContain('await updateRoutinePosition(nextWorkouts[i].id, i);');
    expect(dragMoveWindow).toContain('setWorkouts(previous);');
    expect(dragMoveWindow).toContain("toast.show(\"Couldn't reorder, try again\", { variant: 'error' });");
  });

  test('a move persists both swapped positions via updateRoutinePosition', () => {
    const moveWindow = PLAN_DETAIL.match(/async function handleMoveDay\(routineId, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('await updateRoutinePosition(updated[index].id, index);');
    expect(moveWindow).toContain('await updateRoutinePosition(updated[swapIndex].id, swapIndex);');
    expect(moveWindow).toContain('haptics.selection();');
  });

  test('a failed persist reverts the optimistic reorder and toasts, matching every other write-failure path', () => {
    const moveWindow = PLAN_DETAIL.match(/async function handleMoveDay\(routineId, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('setWorkouts(workouts);');
    expect(moveWindow).toContain("toast.show(\"Couldn't reorder, try again\", { variant: 'error' });");
  });

  test('the reorder affordance is tier-blind: gated on isLibrary only, not tier', () => {
    expect(PLAN_DETAIL).toContain('{!isLibrary && workouts.length > 1 && (');
    // The reorder toggle/actions must not reference `tier` at all -- unlike
    // the "Manage" section below them, which is deliberately free-tier only.
    const toggleWindow = PLAN_DETAIL.slice(
      PLAN_DETAIL.indexOf('{!isLibrary && workouts.length > 1 && ('),
      PLAN_DETAIL.indexOf('{!isLibrary && workouts.length > 1 && (') + 600,
    );
    expect(toggleWindow).not.toContain('tier');
  });
});
