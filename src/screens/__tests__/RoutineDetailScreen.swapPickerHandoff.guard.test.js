// iOS swap-picker handoff fix (2026-07-19, founder-reported on the first iOS
// build). The plan-level "Swap exercise" sheet and the full-library
// ExercisePickerModal are BOTH raw RN <Modal>s. iOS silently refuses to
// present a second native modal while the first is still up, so tapping
// "Search all exercises or create your own" did nothing, and the picker only
// appeared LATER — when the next tap (selecting a ranked substitute) dismissed
// the swap sheet and freed the presenter. Android has no such limit.
//
// The fix hands off instead of stacking: on iOS a `pendingSwapPicker` latch
// dismisses the ranked sheet first, and the sheet's onDismiss then presents
// the picker. Android presents the picker directly (and never fires
// Modal.onDismiss). This suite pins that wiring so it cannot regress into a
// stacked-modal present.
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen swap-picker handoff (iOS no stacked modals)', () => {
  test('a pendingSwapPicker latch exists and gates the ranked sheet visibility', () => {
    expect(ROUTINE_DETAIL).toContain('const [pendingSwapPicker, setPendingSwapPicker] = useState(false);');
    expect(ROUTINE_DETAIL).toContain('visible={swapState != null && !pendingSwapPicker}');
  });

  test('the swap sheet presents the picker from its onDismiss, not on the button tap', () => {
    // onDismiss (iOS) opens the picker only after the sheet is fully gone.
    expect(ROUTINE_DETAIL).toMatch(/onDismiss=\{\(\)\s*=>\s*\{[\s\S]*?if \(pendingSwapPicker\) setShowSwapPicker\(true\);/);
  });

  test('the Search-all button dismisses first on iOS, presents directly on Android', () => {
    const btn = ROUTINE_DETAIL.match(/title="Search all exercises or create your own"[\s\S]*?onPress=\{\(\)\s*=>\s*\{[\s\S]*?\}\}/)?.[0] ?? '';
    expect(btn).toContain("if (Platform.OS === 'ios') setPendingSwapPicker(true);");
    expect(btn).toContain('else setShowSwapPicker(true);');
    // It must NOT stack by presenting the picker unconditionally on the tap.
    expect(btn).not.toMatch(/onPress=\{\(\)\s*=>\s*setShowSwapPicker\(true\)\}/);
  });

  test('every swap-exit path clears the latch so no state gets stuck hidden', () => {
    // handleConfirmSwap, the header close, onRequestClose, and picker cancel
    // all reset pendingSwapPicker.
    const resets = ROUTINE_DETAIL.match(/setPendingSwapPicker\(false\)/g) ?? [];
    expect(resets.length).toBeGreaterThanOrEqual(4);
  });

  test('Platform is imported for the branch', () => {
    expect(ROUTINE_DETAIL).toMatch(/import \{[^}]*\bPlatform\b[^}]*\} from 'react-native';/);
  });
});
