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
  // 2026-07-10 (D36a, item 17 modal tails): RoutineDetailScreen's
  // edit-exercise sheet and PlanLibraryScreen's quiz sheet migrated off
  // hand-rolled Modals onto the shared <BottomSheet>, whose own labelled,
  // roled backdrop (BottomSheet.js:112-117) IS the convention this suite
  // was pinning those hand-rolled copies against — so their backdrop pins
  // are superseded by construction. What this suite still guards: the two
  // screens must actually use BottomSheet (no hand-rolled backdrop can
  // silently return), plus the remaining hand-rolled backdrops below.
  test('RoutineDetailScreen.js edit sheet rides BottomSheet (labelled backdrop by construction)', () => {
    const source = read('screens/RoutineDetailScreen.js');
    expect(source).toMatch(/<BottomSheet[\s\S]*?keyboardAvoiding/);
    expect(source).not.toMatch(/styles\.editOverlay/);
  });

  test('PlanLibraryScreen.js quiz sheet rides BottomSheet (labelled backdrop by construction)', () => {
    const source = read('screens/PlanLibraryScreen.js');
    expect(source).toMatch(/<BottomSheet/);
    expect(source).not.toMatch(/onPress=\{dismissQuiz\}[\s\S]{0,80}styles\.backdrop/);
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

describe('AY-4: RoutineDetailScreen modal isolation', () => {
  const source = read('screens/RoutineDetailScreen.js');

  // 2026-07-10 (D36a): the edit-exercise sheet's phantom capture-layer
  // TouchableOpacity existed only to stop backdrop-press falling through
  // the hand-rolled Modal — the BottomSheet migration removed the whole
  // construction, so the node this pinned no longer exists (the a11y
  // problem it patched is gone by design, not unguarded).
  test('the phantom capture-layer construction has not returned', () => {
    expect(source).not.toMatch(/styles\.editSheet/);
    expect(source).not.toMatch(/styles\.editOverlay/);
  });

  test('the remaining raw Modal (swap sheet) marks its content accessibilityViewIsModal', () => {
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
