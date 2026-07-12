/**
 * EP-06/UI-01 (end-user-polish audit, 2026-07-12): the pre-workout readiness
 * sheet (heading, readiness rows, three intent options, Skip, opt-out) is
 * taller than a 320x640/360x640 viewport. HomeScreen had already migrated
 * this sheet onto the shared BottomSheet (R9/D70), which bounds its own
 * height via `maxDynamicContentSize` (~92% of window height,
 * src/components/BottomSheet.js), but the sheet was mounted without the
 * `scroll` prop, so BottomSheet rendered a plain BottomSheetView with no
 * internal scroll: content past the height cap was clipped, not reachable.
 *
 * The fix is a one-prop change, `scroll`, which BottomSheet's own contract
 * (see src/components/__tests__/bottomsheet.test.js "scrolling sheets render
 * BottomSheetScrollView ... shrinking instead of overflowing") turns into a
 * BottomSheetScrollView bounded by a numeric maxHeight. This suite pins that
 * the specific intent-prompt call site opts into that contract and keeps its
 * accessibility label and dismiss semantics unchanged.
 *
 * Source guard: HomeScreen has no colocated render-test harness light enough
 * to mount this sheet in isolation (see the sibling planGenErrorCopy guard
 * test's own note), so this pins the fixed source directly.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);

function intentSheetWindow() {
  const start = src.indexOf("accessibilityLabel=\"How are you feeling today\"");
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('</BottomSheet>', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(Math.max(0, start - 400), end + '</BottomSheet>'.length);
}

describe('HomeScreen pre-workout readiness sheet scrolls within a bounded height (EP-06/UI-01)', () => {
  test('the intent BottomSheet opts into the scrollable body contract', () => {
    const win = intentSheetWindow();
    expect(win).toMatch(/<BottomSheet[\s\S]*visible=\{showIntentPrompt\}[\s\S]*scroll[\s\S]*>/);
  });

  test('dismiss and accessibility semantics are unchanged', () => {
    const win = intentSheetWindow();
    expect(win).toContain('onClose={() => { setShowIntentPrompt(false); pendingStartRef.current = null; }}');
    expect(win).toContain('accessibilityLabel="How are you feeling today"');
  });

  test('every choice is still present inside the (now scrollable) sheet: heading, readiness rows, three intent options, Skip, opt-out', () => {
    const win = intentSheetWindow();
    expect(win).toContain('How are you feeling today?');
    expect(win).toContain('Readiness (optional)');
    expect(win).toContain("label: 'Sharp'");
    expect(win).toContain("label: 'Average'");
    expect(win).toContain("label: 'Below par'");
    expect(win).toContain('accessibilityLabel="Skip and start without answering"');
    expect(win).toContain("accessibilityLabel=\"Don't ask before each session\"");
  });
});
