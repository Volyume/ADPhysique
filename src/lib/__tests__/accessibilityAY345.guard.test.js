/**
 * accessibilityAY345.guard.test.js — source guards for the coverage-audit
 * findings AY-3/AY-4/AY-5 (docs/design-usability-audit-2026-07-09/
 * coverage-04-accessibility.md). Pins the mechanical fixes so they cannot
 * silently regress:
 *  - AY-3: the five hand-rolled modal backdrops each carry
 *    accessibilityLabel="Close", matching BottomSheet.js:112-117's
 *    established convention (a labelled, roled backdrop, not a bare
 *    unlabelled "button").
 *  - AY-4: RoutineDetailScreen's edit-exercise sheet's inner capture-layer
 *    TouchableOpacity (the phantom node right before the Sets field) is
 *    accessible={false} so TalkBack/VoiceOver skips it, and both raw
 *    `Modal`s in that file mark their content accessibilityViewIsModal
 *    (matching AppAlert.js/BottomSheet.js/FeedbackSheet.js/PeekMenu.js).
 *  - AY-5: EngineLog's collapsible header announces accessibilityState=
 *    {{ expanded }}, matching CollapsibleSection.js's convention.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

describe('AY-3: modal backdrops label themselves "Close"', () => {
  test('RoutineDetailScreen.js editOverlay backdrop', () => {
    const source = read('screens/RoutineDetailScreen.js');
    expect(source).toMatch(
      /<TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style=\{styles\.editOverlay\}/,
    );
  });

  test('PlanLibraryScreen.js quiz-sheet backdrop', () => {
    const source = read('screens/PlanLibraryScreen.js');
    expect(source).toMatch(
      /<Pressable accessibilityRole="button" accessibilityLabel="Close" style=\{styles\.backdrop\} onPress=\{dismissQuiz\}/,
    );
  });

  test('PlansScreen.js folder-rename prompt backdrop', () => {
    const source = read('screens/PlansScreen.js');
    expect(source).toMatch(
      /<Pressable accessibilityRole="button" accessibilityLabel="Close" style=\{styles\.backdrop\}/,
    );
  });

  test('FeedbackSheet.js backdrop', () => {
    const source = read('components/FeedbackSheet.js');
    expect(source).toMatch(
      /<Pressable accessibilityRole="button" accessibilityLabel="Close" style=\{StyleSheet\.absoluteFillObject\}/,
    );
  });

  test('PeekMenu.js backdrop', () => {
    const source = read('components/PeekMenu.js');
    expect(source).toMatch(
      /<Pressable accessibilityRole="button" accessibilityLabel="Close" style=\{StyleSheet\.absoluteFillObject\}/,
    );
  });
});

describe('AY-4: RoutineDetailScreen edit-exercise sheet isolation', () => {
  const source = read('screens/RoutineDetailScreen.js');

  test('the inner capture-layer TouchableOpacity (phantom node) is hidden from screen readers', () => {
    expect(source).toMatch(
      /<TouchableOpacity accessibilityRole="button" style=\{styles\.editSheet\} activeOpacity=\{1\} accessible=\{false\} accessibilityViewIsModal>/,
    );
  });

  test('both raw Modals in the file mark their content accessibilityViewIsModal', () => {
    // Edit-exercise sheet's content (the editSheet TouchableOpacity, above).
    expect(source).toMatch(/styles\.editSheet[\s\S]*accessibilityViewIsModal/);
    // Swap-exercise sheet's content (the swapSafe SafeAreaView).
    expect(source).toMatch(
      /<SafeAreaView style=\{styles\.swapSafe\} edges=\{\['top', 'bottom'\]\} accessibilityViewIsModal>/,
    );
  });
});

describe('AY-5: EngineLog announces expanded/collapsed state', () => {
  test('the collapsible header carries accessibilityState={{ expanded }}', () => {
    const source = read('components/EngineLog.js');
    expect(source).toMatch(
      /<TouchableOpacity accessibilityRole="button" accessibilityState=\{\{ expanded: open \}\} style=\{styles\.header\}/,
    );
  });
});
