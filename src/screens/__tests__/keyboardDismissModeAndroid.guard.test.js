/**
 * Source-level regression guard — Android keyboard dismissal on typing
 * (founder device report, pre-gym build defect pass).
 *
 * THE DEFECT. On Android, every character typed into the active workout
 * logger's Weight field dismissed the keyboard, making numeric entry
 * unusable. Traced to `keyboardDismissMode="on-drag"` on the screen's main
 * ScrollView: this card's layout height changes mid-typing (the Est. max
 * caption line and the record-flag row both mount/unmount as weight/reps
 * cross zero or a record threshold), and RN's built-in scroll-into-view for
 * the focused input fires a native scroll event to compensate. Android's
 * ScrollView implementation of keyboardDismissMode cannot distinguish that
 * PROGRAMMATIC scroll from a user drag gesture the way iOS's 'interactive'
 * mode can (iOS already had, and was fixed for, the identical symptom on
 * 2026-07-13 - see the comment this guard re-anchors), so 'on-drag'
 * dismissed the keyboard after every single keystroke.
 *
 * THE FIX. `keyboardDismissMode="none"` on Android for every ScrollView that
 * hosts numeric TextInput entry, deterministically removing the
 * scroll-triggers-dismiss mechanism rather than compensating after the
 * fact (no setTimeout, no refocus, no swallowed blur - matching the
 * founder's explicit "fix the actual lifecycle cause" instruction). iOS is
 * unaffected and keeps 'interactive'.
 *
 * Bounded scan result: these three screens are the ONLY production
 * ScrollViews that ever set keyboardDismissMode explicitly (grepped
 * app-wide); every other screen already defaults to RN's own 'none' and was
 * never reachable by this defect.
 */
const fs = require('fs');
const path = require('path');

const SITES = [
  { file: 'HomeScreen.js', dir: ['..'] },
  { file: 'NutritionTargetsScreen.js', dir: ['..'] },
];

describe('Android keyboardDismissMode is deterministically "none", never "on-drag"', () => {
  for (const site of SITES) {
    test(`${site.file}: iOS keeps 'interactive', Android is 'none'`, () => {
      const src = fs.readFileSync(path.join(__dirname, ...site.dir, site.file), 'utf8');
      expect(src).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}");
      expect(src).not.toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}");
    });
  }

  // The logger's list never drags the keyboard on either platform (founder
  // report 2026-10-11, Sentry VOLYUME-3J: a drag-dismiss on iOS froze the
  // app in UIKit layout), and never scrolls itself while a finger moves it.
  test("ActiveWorkoutScreen.js: 'none' on both platforms, and no programmatic scroll during a drag", () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
    expect(src).toContain('keyboardDismissMode="none"');
    expect(src).not.toMatch(/keyboardDismissMode=\{Platform\.OS === 'ios' \? 'interactive'/);
    expect(src).toContain('onScrollBeginDrag={() => { userDraggingRef.current = true; }}');
    expect(src).toContain('onScrollEndDrag={() => { userDraggingRef.current = false; }}');
    expect(src).toMatch(/function scrollRowAboveBar\(rowId, padHeight\) \{\s*if \(userDraggingRef\.current\) return;/);
  });

  test('no production screen anywhere still sets Android to on-drag', () => {
    const screensDir = path.join(__dirname, '..');
    const files = fs.readdirSync(screensDir).filter((f) => f.endsWith('.js'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(screensDir, f), 'utf8');
      expect(src).not.toMatch(/keyboardDismissMode=\{Platform\.OS === 'ios' \? '\w+' : 'on-drag'\}/);
    }
  });
});
