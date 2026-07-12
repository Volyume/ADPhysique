/**
 * UI-12/UI-13 (end-user-polish audit, 2026-07-12): ProLocked's SafeAreaView
 * only absorbs top/left/right (deliberately, so the CTA stack doesn't get
 * an extra bottom gap on devices without a home indicator), but its scroll
 * content had a flat `padding: spacing.xl` with no account for the bottom
 * safe area, so the final control (Restore purchases) could finish under
 * an iPhone home indicator. That control was also `minHeight: 40` with no
 * hitSlop, below the project's 44dp touch-target contract.
 *
 * Fix: the scroll's contentContainerStyle now adds
 * `Math.max(spacing.xl, insets.bottom + spacing.sm)` bottom padding (the
 * exact formula used elsewhere in the codebase, e.g. FoodSearchScreen.js,
 * ProgressPhotosScreen.js), and the restore control gets a 6dp hitSlop on
 * every side (40 + 6 + 6 = 52dp effective height), reaching the 44dp
 * minimum without growing the visual pill. Free/Pro gating logic (the
 * `tier === 'pro'` check, ProLocked's render decision) is completely
 * untouched by this change.
 *
 * Source guard: no colocated render-test harness exercises ProLocked's
 * exact pixel layout, matching the project's convention of pinning fixed
 * layout source directly (see the sibling ProGate.featureCopy.guard.test.js,
 * which already pins this same lockedRestore block's colour tokens).
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ProGate.js'),
  'utf8',
);

describe('ProGate.ProLocked absorbs the bottom safe area and meets the touch-target minimum (UI-12/UI-13)', () => {
  test('useSafeAreaInsets is read and applied as bottom padding on the scroll content', () => {
    expect(src).toContain("import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';");
    expect(src).toContain('const insets = useSafeAreaInsets();');
    expect(src).toContain(
      "contentContainerStyle={[styles.lockedScroll, { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.sm) }]}",
    );
  });

  test('the SafeAreaView edges are unchanged (top/left/right only)', () => {
    expect(src).toContain("edges={['top', 'left', 'right']}");
  });

  test('Restore purchases gets a hitSlop reaching the 44dp touch-target minimum, without changing its visual size', () => {
    expect(src).toMatch(
      /accessibilityLabel="Restore purchases"\s*\n\s*hitSlop=\{\{ top: 6, bottom: 6, left: 6, right: 6 \}\}/,
    );
    // minHeight stays 40 in the frozen style: the touch area is reached via
    // hitSlop (40 + 6 + 6 = 52), matching ProGate.featureCopy.guard.test.js's
    // existing pin of this same block.
    expect(src).toMatch(/lockedRestore: \{[\s\S]*minHeight: 40,/);
  });

  test('free/Pro gating is untouched: ProLocked takes no tier prop and the tier check still lives only in withProGuard/withReadOnlyProGuard', () => {
    expect(src).toContain("if (tier !== 'pro') return <ProLocked feature={feature} />;");
    expect(src).toContain("export function ProLocked({ feature = 'This' }) {");
  });
});
