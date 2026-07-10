/**
 * D36d ruling (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md,
 * "D36d RULING (lead-ruled under D33, 2026-07-10): fix the three photo-modal
 * inset gaps"): ProgressScanCompare, ProgressScanTrend and
 * ProgressPhotoCompare each only requested the SafeAreaView 'top' edge, so
 * their bottom-most interactive controls sat under the Android gesture-nav
 * strip on devices where the inset exceeds the static padding token.
 * ProgressScanMeaningMoment and ProgressPhotoViewer already request both
 * edges (the in-family precedent this ruling brings the other three in line
 * with).
 *
 * This is a SOURCE-LEVEL pin, not a render pin (each file's own suite already
 * mounts and exercises it), read straight from source with fs.readFileSync +
 * regex, matching the repo's existing source-guard convention (see
 * imagePolish.expoImage.guard.test.js / PhotoDetailsSheet.test.js). It locks:
 *   1. every SafeAreaView in the three touched files requests the 'bottom'
 *      edge alongside 'top' (seven instances total: two in
 *      ProgressScanCompare, three in ProgressScanTrend, two in
 *      ProgressPhotoCompare);
 *   2. ProgressPhotoCompare's scrollContent bottom padding is inset-aware via
 *      useSafeAreaInsets, using the established house idiom
 *      (Math.max(base, insets.bottom + spacing.*), the same pattern as
 *      ProgressPhotosScreen.js) rather than a static padding token, so the
 *      bottom photo-selection ribbon and mode bar clear the nav strip even
 *      inside the scroll content.
 * It deliberately does NOT touch the usePhotoSuppression call sites or the
 * suppressed-branch JSX/placeholder copy pinned by each file's own test
 * suite and by hooks/__tests__/usePhotoSuppression.test.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const TOUCHED = [
  'components/ProgressScanCompare.js',
  'components/ProgressScanTrend.js',
  'components/ProgressPhotoCompare.js',
];

const EXPECTED_SAFE_AREA_VIEW_COUNT = {
  'components/ProgressScanCompare.js': 2,
  'components/ProgressScanTrend.js': 3,
  'components/ProgressPhotoCompare.js': 2,
};

const sourceOf = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('D36d: photo-modal SafeAreaViews request the bottom edge', () => {
  test.each(TOUCHED)('%s carries no top-only SafeAreaView', (rel) => {
    const src = sourceOf(rel);
    // A top-only edges array (with nothing else in the brackets) would be the
    // regression this pin exists to catch.
    expect(src).not.toMatch(/edges=\{\s*\[\s*'top'\s*\]\s*\}/);
  });

  test.each(TOUCHED)('%s requests both top and bottom on every SafeAreaView', (rel) => {
    const src = sourceOf(rel);
    const matches = [...src.matchAll(/edges=\{\s*\[([^\]]*)\]\s*\}/g)].map((m) => m[1]);
    expect(matches.length).toBe(EXPECTED_SAFE_AREA_VIEW_COUNT[rel]);
    for (const edgeList of matches) {
      expect(edgeList).toMatch(/'top'/);
      expect(edgeList).toMatch(/'bottom'/);
    }
  });
});

describe('D36d: ProgressPhotoCompare scrollContent bottom padding is inset-aware', () => {
  test('imports and calls useSafeAreaInsets', () => {
    const src = sourceOf('components/ProgressPhotoCompare.js');
    expect(src).toMatch(/import\s*\{[^}]*useSafeAreaInsets[^}]*\}\s*from\s*'react-native-safe-area-context';/);
    expect(src).toMatch(/const\s+insets\s*=\s*useSafeAreaInsets\(\);/);
  });

  test('scrollContent bottom padding uses the house Math.max(base, insets.bottom + spacing.*) idiom', () => {
    const src = sourceOf('components/ProgressPhotoCompare.js');
    expect(src).toMatch(/paddingBottom:\s*Math\.max\(spacing\.\w+,\s*insets\.bottom\s*\+\s*spacing\.\w+\)/);
    // The old static-only padding token on scrollContent's contentContainerStyle
    // array must have gained the inset-aware override, not merely have one
    // sitting unused elsewhere in the file.
    expect(src).toMatch(/contentContainerStyle=\{\[\s*styles\.scrollContent,\s*\{\s*paddingBottom:\s*Math\.max\(/);
  });
});
