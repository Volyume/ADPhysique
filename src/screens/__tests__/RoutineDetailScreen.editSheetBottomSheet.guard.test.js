// D36a (item 17 modal tails, lead-ruled under D33, 2026-07-10). The
// edit-exercise modal was a hand-rolled bottom-anchored RN Modal with a
// GENUINE inset bug (fixed padding, no safe-area inset) wrapped in its own
// KeyboardAvoidingView. This suite pins the migration onto the shared
// BottomSheet chrome (src/components/BottomSheet.js): the old Modal/
// KeyboardAvoidingView/backdrop/handle scaffolding is gone, BottomSheet owns
// insets and reduce-motion itself, `keyboardAvoiding` replaces the manual
// KeyboardAvoidingView wrap (matching the QuickAddSheet/FoodDetailSheet
// precedent), and the sheet keeps its Save action and TextFields reachable.
// The untouched plan-level swap modal (still a raw Modal by design, out of
// this build's scope) is pinned as a negative control so a future edit here
// does not accidentally fold it into the same migration.
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen edit-exercise sheet (D36a)', () => {
  test('the edit-exercise modal is built on the shared BottomSheet, not a hand-rolled Modal', () => {
    expect(ROUTINE_DETAIL).toContain("import BottomSheet from '../components/BottomSheet';");
    const editWindow = ROUTINE_DETAIL.match(/\{\/\* Edit exercise modal\.[\s\S]*?<\/BottomSheet>/)?.[0] ?? '';
    expect(editWindow).toContain('<BottomSheet');
    expect(editWindow).toContain('visible={!!editingExercise}');
    expect(editWindow).toContain('onClose={() => setEditingExercise(null)}');
    expect(editWindow).toContain('keyboardAvoiding');
    expect(editWindow).not.toContain('<KeyboardAvoidingView');
    expect(editWindow).not.toContain('styles.editOverlay');
    expect(editWindow).not.toContain('styles.editModalKeyboard');
  });

  test('the Save action and its TextFields stay reachable inside the migrated sheet', () => {
    const editWindow = ROUTINE_DETAIL.match(/\{\/\* Edit exercise modal\.[\s\S]*?<\/BottomSheet>/)?.[0] ?? '';
    expect(editWindow).toContain('accessibilityLabel="Save exercise targets"');
    expect(editWindow).toContain('onPress={saveEdit}');
    // F-17: the first field is "Rounds" on a circuit and "Sets" otherwise,
    // and the per-station rest field is replaced by "Rest between rounds (s)"
    // on a circuit. The ORDER this pins is unchanged.
    expect(editWindow).toMatch(/label=\{editingIsCircuit \? 'Rounds' : 'Sets'\}[\s\S]*label="Reps min"[\s\S]*label="Reps max"[\s\S]*label="Rest between rounds \(s\)"[\s\S]*label="Rest \(s\)"[\s\S]*label="Start weight"/);
  });

  test('the plan-level swap modal stays a raw Modal (not folded into BottomSheet)', () => {
    // Negative control: this modal is deliberately a raw RN Modal, not the
    // shared BottomSheet. Its visibility now also gates on !pendingSwapPicker
    // (the iOS modal-handoff fix, pinned in its own guard suite) — still a raw
    // Modal, so the BottomSheet-migration control holds.
    const swapWindow = ROUTINE_DETAIL.match(/\{\/\* Plan-level swap modal \*\/\}[\s\S]{0,300}/)?.[0] ?? '';
    expect(swapWindow).toContain('<Modal');
    expect(swapWindow).toContain('visible={swapState != null && !pendingSwapPicker}');
  });
});
