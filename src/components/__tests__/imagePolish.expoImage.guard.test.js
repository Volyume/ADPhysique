/**
 * D24 item 3 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
 * image polish via expo-image across the progress-photo surfaces. Every local
 * photo render in these files (device-local files: progress photos, saved
 * avatar photos, in-app-rendered previews) was moved from react-native's
 * Image to expo-image so it can carry `contentFit`, a `transition`, and (on
 * the surfaces that recycle cells, i.e. the ProgressPhotosScreen FlashList
 * grid) a `recyclingKey` so a reused cell never flashes the previous photo.
 *
 * This is a SOURCE-LEVEL pin, not a render pin (each file's own test suite
 * already mounts and exercises it): it locks three things per touched file,
 * read straight from source with fs.readFileSync + regex, matching the
 * repo's existing source-guard convention (see PhotoDetailsSheet.test.js):
 *   1. the file imports Image from 'expo-image', not react-native's Image;
 *   2. every `transition=` on an Image is wired through the shared
 *      `reduceMotion ? 0 : motion.*` idiom, never a bare literal, so Reduce
 *      Motion always zeroes it;
 *   3. no hardcoded hex colour literal was introduced (colours come from
 *      styles/theme tokens only, per docs/rules/styling.md).
 * ProgressPhotosScreen.js additionally carries `recyclingKey` on its
 * FlashList grid cell image, the real recycling surface this item targets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Every file this task touched to move local-photo Image usages onto
// expo-image. Read once; each check below asserts on the matched source.
const TOUCHED = [
  'screens/ProgressPhotosScreen.js',
  'components/ProgressPhotoViewer.js',
  'components/ProgressPhotoCompare.js',
  'components/ProgressScanHistoryCard.js',
  'components/ProgressScanCompare.js',
  'components/BeforeAfterShareSheet.js',
  'components/PhotoDetailsSheet.js',
  'components/ProgressGhostCapture.js',
  'components/ProfileAvatarMark.js',
];

const sourceOf = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('image polish: expo-image import, not react-native Image', () => {
  test.each(TOUCHED)('%s imports Image from expo-image', (rel) => {
    const src = sourceOf(rel);
    expect(src).toMatch(/import\s*\{\s*Image\s*\}\s*from\s*'expo-image';/);
    // Guard against a stray second import re-introducing the RN Image.
    expect(src).not.toMatch(/\bImage\b[^\n]*\}\s*from\s*'react-native';/);
  });
});

describe('image polish: every transition zeroes under Reduce Motion', () => {
  test.each(TOUCHED)('%s wires transition through reduceMotion ? 0 : motion.*', (rel) => {
    const src = sourceOf(rel);
    const transitions = [...src.matchAll(/transition=\{([^}]*)\}/g)].map((m) => m[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const expr of transitions) {
      expect(expr).toMatch(/reduceMotion\s*\?\s*0\s*:\s*motion\.\w+/);
    }
  });
});

describe('image polish: recyclingKey on the FlashList grid cell', () => {
  test('ProgressPhotosScreen check-in cover image carries a per-photo recyclingKey', () => {
    const src = sourceOf('screens/ProgressPhotosScreen.js');
    // The FlashList grid cell (the real recycling surface): recyclingKey is
    // keyed on the cover photo's own filename, not the list index, so a
    // reused cell resets instead of crossfading from the previous photo.
    expect(src).toMatch(/recyclingKey=\{cover\.name\}/);
  });

  test('ProgressPhotoViewer keys its single reused Image on the current photo', () => {
    const src = sourceOf('components/ProgressPhotoViewer.js');
    expect(src).toMatch(/recyclingKey=\{current\.name\}/);
  });
});

describe('image polish: no hardcoded hex introduced', () => {
  test.each(TOUCHED)('%s carries no hardcoded hex colour literal', (rel) => {
    const src = sourceOf(rel);
    // Matches a quoted hex literal (e.g. '#1a1a1a' / "#FFF"), the shape a
    // hardcoded colour would take; theme tokens are identifiers, never hex
    // strings, so this stays zero for every file this task touched.
    expect(src).not.toMatch(/['"]#[0-9a-fA-F]{3,8}['"]/);
  });
});
