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
    // RE-ANCHORED 2026-07-12 (R3 logger rebuild): the bar is now the
    // WorkoutBottomBar component; the screen passes safeBottom down and the
    // component applies the SAME padding contract. Both halves pinned so
    // neither side of the hand-off can drop the inset alone.
    expect(screen).toMatch(/<WorkoutBottomBar[\s\S]{0,900}?safeBottom=\{safeBottom\}/);
    const bar = read('components/workout/WorkoutBottomBar.js');
    expect(bar).toMatch(/paddingBottom:\s*Math\.max\(spacing\.md,\s*safeBottom\s*\+\s*spacing\.sm\)/);
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
  // Close (founder screenshot 2026-07-03).
  //
  // R2-5 (remediation 2026-07-11, founder device walk build 2684): the
  // STRUCTURAL fix of the footer/tab-bar system. The earlier design leaned
  // on SafeAreaView's frame-relative behaviour with edges=['top','bottom'],
  // assuming the bottom edge would resolve to 0 because the tab band sits
  // below. On the founder's device it did NOT: the SafeAreaView added the
  // system bottom inset as padding under the footer a SECOND time (the tab
  // band already owns it), which was the ~70dp dead band between the footer
  // and the tab bar. The layout model is now explicit: exactly one component
  // owns each system inset. On this screen the VolyumeTabBar band owns the
  // bottom inset, so the screen claims edges=['top'] only. The footer keeps
  // its flat spacing.lg token and sits flush on the band.
  test('WorkoutSummary owns only the top edge; the tab band owns the bottom inset', () => {
    const summary = read('screens/WorkoutSummaryScreen.js');
    expect(summary).toMatch(/styles\.stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*spacing\.lg\s*\}/);
    expect(summary).not.toMatch(/stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*Math\.max/);
    // R2-5: top edge only. The old ['top', 'bottom'] must stay gone (it was
    // the double-counted inset the founder photographed).
    expect(summary).toMatch(/<SafeAreaView style=\{\[styles\.safe, live\.safe\]\} edges=\{\['top'\]\}>/);
    expect(summary).not.toMatch(/edges=\{\['top', 'bottom'\]\}/);
    // R2-6 (remediation 2026-07-11): the sticky footer is a normal-flow
    // sibling BELOW the scroll, never an overlay, so the scroll content's
    // bottom padding is its OWN rhythm (styles.content -> spacing.xxxl) and
    // is independent of the footer's height. The phantom footerHeight
    // clearance (which left ~85-100dp of dead space above the buttons) and
    // the onLayout measurement plumbing are removed.
    expect(summary).toMatch(/contentContainerStyle=\{styles\.content\}/);
    // No footerHeight state or measurement remains (mentions in the
    // explanatory comments describing the removed plumbing are fine).
    expect(summary).not.toMatch(/\[footerHeight, setFooterHeight\]/);
    expect(summary).not.toMatch(/setFooterHeight\(/);
    expect(summary).not.toMatch(/onLayout=\{\(e\) => setFooterHeight/);
    // content's own rhythm ends on spacing.xxxl (the scroll's natural breath).
    expect(summary).toMatch(/content:\s*\{[^}]*paddingBottom:\s*spacing\.xxxl/);
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
