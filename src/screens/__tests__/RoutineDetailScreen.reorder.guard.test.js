// Campaign item 20 (D32, founder-delegated, lead-ruled 2026-07-10). This
// surface had NO prior reorder guard test; the original chevron move
// (handleMoveExercise) swapped plain adjacent indices with no awareness of
// superset/giant-set grouping -- a pre-existing gap the D32 authority names
// explicitly ("drag made BLOCK-AWARE too ... this closes that surface's
// pre-existing block gap"). This suite pins the fix (both the chevron path,
// now rebuilt on the shared src/lib/reorder.js block-move arithmetic, and
// the new drag path), the persistence shape (updateRoutineExerciseOrder),
// no new dependency / no reorder library, and that both move paths remain
// reachable side by side (drag is additive, chevrons never removed).
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen exercise reorder (D32)', () => {
  test('the chevron move is block-aware: built on the shared swapAdjacentBlocks helper, not a plain adjacent swap', () => {
    expect(ROUTINE_DETAIL).toContain("import { swapAdjacentBlocks } from '../lib/reorder';");
    const moveWindow = ROUTINE_DETAIL.match(/async function handleMoveExercise\(routineExerciseId, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('swapAdjacentBlocks(exercises, index, direction,');
    expect(moveWindow).not.toMatch(/const temp = updated\[index\]/);
  });

  test('a chevron move persists through updateRoutineExerciseOrder, reverting on failure', () => {
    const moveWindow = ROUTINE_DETAIL.match(/async function handleMoveExercise\(routineExerciseId, direction\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(moveWindow).toContain('await updateRoutineExerciseOrder(updated[i].routineExercise.id, i);');
    expect(moveWindow).toContain('setExercises(previous);');
  });

  test('D32: true drag is wired via the shared DragReorderList, no new dependency, no reorder library', () => {
    expect(ROUTINE_DETAIL).toContain("import DragReorderList from '../components/DragReorderList';");
    expect(ROUTINE_DETAIL).toContain('<DragReorderList');
    expect(ROUTINE_DETAIL).not.toMatch(/draggable-flatlist/i);
    expect(ROUTINE_DETAIL).not.toMatch(/react-native-sortable/i);
  });

  test('a drag reorder persists through the SAME updateRoutineExerciseOrder call as the chevron path', () => {
    const dragWindow = ROUTINE_DETAIL.match(/async function handleReorderExercises\(nextExercises\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(dragWindow).toContain('await updateRoutineExerciseOrder(nextExercises[i].routineExercise.id, i);');
    expect(dragWindow).toContain('setExercises(previous);');
  });

  test('drag is additive: the chevron up/down buttons stay reachable and keep their accessibility labels', () => {
    expect(ROUTINE_DETAIL).toContain("onPress={() => handleMoveExercise(routineExercise.id, 'up')}");
    expect(ROUTINE_DETAIL).toContain("onPress={() => handleMoveExercise(routineExercise.id, 'down')}");
    expect(ROUTINE_DETAIL).toContain('accessibilityLabel={`Move ${exercise.name} up`}');
    expect(ROUTINE_DETAIL).toContain('accessibilityLabel={`Move ${exercise.name} down`}');
  });

  test('reorder mode swaps FlashList for a plain ScrollView + DragReorderList; browsing mode keeps FlashList untouched', () => {
    expect(ROUTINE_DETAIL).toMatch(/isReordering \? \(\s*\/\/[\s\S]*?<ScrollView/);
    expect(ROUTINE_DETAIL).toContain('<FlashList');
  });
});
