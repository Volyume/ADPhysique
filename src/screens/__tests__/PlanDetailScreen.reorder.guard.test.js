// Day-level plan reorder (old founder-GO item, verified unbuilt). Founder
// direction: reuse the EXISTING no-new-dependency reorder pattern already
// shipped for RoutineDetailScreen (exercise-level swap-adjacent-indices, no
// drag library) one level up, for the days/routines within a plan. This
// suite pins the reuse (no drag library import) and that a move persists via
// updateRoutinePosition for both swapped rows, the same two-write shape
// RoutineDetailScreen.handleMoveExercise uses for updateRoutineExerciseOrder.
import fs from 'fs';
import path from 'path';

const PLAN_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'PlanDetailScreen.js'),
  'utf8',
);

describe('PlanDetailScreen day-level reorder', () => {
  test('reuses the existing no-dependency swap-adjacent pattern, no new drag library', () => {
    expect(PLAN_DETAIL).toContain("async function handleMoveDay(routineId, direction) {");
    expect(PLAN_DETAIL).toContain("const swapIndex = direction === 'up' ? index - 1 : index + 1;");
    expect(PLAN_DETAIL).not.toMatch(/draggable-flatlist/i);
    expect(PLAN_DETAIL).not.toContain('PanResponder.create');
    expect(PLAN_DETAIL).not.toContain('runOnJS');
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
