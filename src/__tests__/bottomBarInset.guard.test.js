/**
 * Issue 1a (founder defect pass 2026-07-03): ActiveWorkout's bottom-pinned
 * action bar must respect the system bottom inset. E15's VolyumeTabBar
 * returns null while ActiveWorkout is focused, so nothing else absorbs the
 * inset — a flat spacing token left the Log set button half behind the
 * Android gesture pill. Pins the padding expression and the tab-bar hide it
 * compensates for, so neither side of the contract moves alone.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('ActiveWorkout bottom bar vs the hidden tab band', () => {
  test('the bottom bar padding includes the safe-area inset', () => {
    const screen = read('screens/ActiveWorkoutScreen.js');
    // R2 (remediation 2026-07-11): the founder's device walk found the bar
    // under the Android navigation buttons DESPITE the old insets.bottom
    // padding - the SafeAreaProvider was mounted with a misnamed prop
    // (initialWindowMetrics=, ignored) so insets could read 0. The contract
    // is now STRONGER: the bar pads by safeBottom, which is insets.bottom
    // floored at 48 on Android when the inset misreports 0 (Expo SDK 54
    // Android is always edge-to-edge, so a 0 bottom inset is never real).
    expect(screen).toMatch(
      /const safeBottom = insets\.bottom > 0 \? insets\.bottom : \(Platform\.OS === 'android' \? 48 : 0\)/
    );
    expect(screen).toMatch(
      /styles\.bottomBar,\s*live\.bottomBar,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.md,\s*safeBottom\s*\+\s*spacing\.sm\)/
    );
  });

  test('the SafeAreaProvider actually receives initial metrics (R2 root cause)', () => {
    const app = read('../App.js');
    // The prop is initialMetrics; the old initialWindowMetrics={...} was an
    // unrecognised prop the provider silently ignored, so every inset
    // consumer started at 0. This pin stops the misnamed prop coming back.
    expect(app).toMatch(/<SafeAreaProvider initialMetrics=\{initialWindowMetrics\}>/);
    expect(app).not.toMatch(/<SafeAreaProvider initialWindowMetrics=/);
  });

  test('VolyumeTabBar still hides on ActiveWorkout (the reason the inset is needed)', () => {
    const bar = read('components/VolyumeTabBar.js');
    expect(bar).toMatch(/nested === 'ActiveWorkout'.*return null/);
  });

  // The inverse rule: on screens where the tab band IS visible it absorbs
  // the system inset, so a sticky footer there must use a flat token —
  // adding insets.bottom again doubled the gap under WorkoutSummary's
  // Close (founder screenshot 2026-07-03). Re-affirmed at the 2026-07-11
  // review (founder defect, build 2608): the flat-token +
  // edges=['top','bottom'] design is frame-relative and context-adaptive,
  // so it stays; the photo's real defect was scroll clearance, pinned
  // below via the measured footerHeight.
  test('WorkoutSummary sticky footer uses a flat token, never the inset again', () => {
    const summary = read('screens/WorkoutSummaryScreen.js');
    expect(summary).toMatch(/styles\.stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*spacing\.lg\s*\}/);
    expect(summary).not.toMatch(/stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*Math\.max/);
    expect(summary).toMatch(/<SafeAreaView style=\{\[styles\.safe, live\.safe\]\} edges=\{\['top', 'bottom'\]\}>/);
    // 2026-07-11 (founder defect, build 2608): the scroll content's bottom
    // padding must clear the footer's real rendered height (measured via
    // onLayout, since it varies with the save-error card and dynamic
    // type), not just a static token — the founder's photo showed the
    // exercise breakdown crowding the footer.
    expect(summary).toMatch(/paddingBottom:\s*Math\.max\(spacing\.xxxl,\s*footerHeight\s*\+\s*spacing\.lg\)/);
    expect(summary).toMatch(/onLayout=\{\(e\) => setFooterHeight\(e\.nativeEvent\.layout\.height\)\}/);
  });

  // Bottom-anchored Modals overlay the tab band and touch the physical
  // screen edge, so each absorbs the inset itself. Pins the edge-to-edge
  // sweep (2026-07-03): hand-rolled sheets own the inset expression directly;
  // migrated sheets must use the shared BottomSheet chrome, which owns it.
  //
  // D36b (2026-07-10): FeedbackSheet.js and PeekMenu.js migrated off their
  // hand-rolled Modal onto the shared BottomSheet, exactly the "migrated
  // sheets" case this comment already anticipated -- they no longer own an
  // `insets.bottom + spacing.*` expression themselves, BottomSheet.js does,
  // so they are removed from this loop (still asserted for BottomSheet.js
  // below) and pinned as BottomSheet consumers instead.
  test('bottom-anchored modal sheets absorb the system inset', () => {
    for (const rel of [
      'components/BottomSheet.js',
    ]) {
      expect(read(rel)).toMatch(/insets\.bottom \+ spacing\.(lg|sm)/);
    }
    for (const rel of ['components/FeedbackSheet.js', 'components/PeekMenu.js']) {
      expect(read(rel)).toMatch(/<BottomSheet/);
      expect(read(rel)).not.toMatch(/insets\.bottom/);
    }
    const foodSearch = read('screens/FoodSearchScreen.js');
    expect(foodSearch).toMatch(/<BottomSheet[\s\S]*visible=\{showPlate\}/);
    // The plate sheet itself takes its inset handling from shared BottomSheet
    // chrome (asserted above), never manual math in this file. Batch 1
    // lane-03 (design-usability sweep, 2026-07-09) legitimately added
    // useSafeAreaInsets back to this file for a DIFFERENT element: the
    // sticky plateBar footer, which (like ActiveWorkoutScreen's bottomBar
    // above) sits on a screen outside the tab navigator with nothing else to
    // absorb the bottom inset. It follows the same
    // Math.max(spacing.*, insets.bottom + spacing.*) contract pinned above.
    // CP-10 batch E (2026-07-10): FoodSearchScreen now reads a live theme
    // (src/hooks/useTheme.js); styles.plateBar gained a live.plateBar
    // override ahead of the inline paddingBottom object, matching the
    // ActiveWorkoutScreen/WorkoutSummaryScreen precedent above. The pinned
    // contract itself is unchanged -- widened only to allow the insertion.
    expect(foodSearch).toMatch(/styles\.plateBar,\s*live\.plateBar,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.md,\s*insets\.bottom\s*\+\s*spacing\.sm\)/);
    expect(read('components/ProGate.js')).toMatch(/<BottomSheet/);
  });
});
