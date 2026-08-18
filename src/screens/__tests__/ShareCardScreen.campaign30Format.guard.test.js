/**
 * ShareCardScreen Campaign 30 format-system guards (D108 pillar 3/5,
 * D109-1). Source pins for the founder-ruled share UX laws:
 *
 *   1. Story-first default (D109-1): the format state initialises to
 *      'story', never square-first.
 *   2. The sticker export draws through drawSticker with the SAME params
 *      object the full card would receive - the suppression law (calm mode /
 *      open ED flag strips content upstream) inherits with no second path.
 *   3. The photo background offers the user's existing photos (gallery
 *      picker), not camera capture alone (pillar 1: the photo is the
 *      canvas).
 *   4. The background row hides on the sticker format - a transparent
 *      export has no background to choose.
 *   5. The template strip announces selection state (the AY-6 contract the
 *      segmented control carried moves onto the thumbnails).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ShareCardScreen.js'),
  'utf8',
);

describe('Campaign 30 format system (D108/D109-1)', () => {
  test('story is the default format (D109-1)', () => {
    expect(SRC).toMatch(/useState\('story'\)/);
    expect(SRC).not.toMatch(/const \[format, setFormat\] = useState\('square'\)/);
  });

  test('the sticker draws via drawSticker with the shared buildParams output (suppression inherits)', () => {
    expect(SRC).toMatch(/const params = buildParams\(\);/);
    expect(SRC).toMatch(/drawSticker\(surface\.getCanvas\(\), \{ Skia, width, params, typefaces, wordmark \}\)/);
    // No separate params construction for the sticker: exactly one
    // buildParams() call inside renderCardBase64 feeds both paths.
    const renderFn = SRC.slice(SRC.indexOf('const renderCardBase64'), SRC.indexOf('// Template-strip thumbnails'));
    expect((renderFn.match(/buildParams\(\)/g) || []).length).toBe(1);
  });

  test('backgrounds offer the gallery picker, not camera capture alone', () => {
    expect(SRC).toMatch(/launchImageLibraryAsync/);
    expect(SRC).toMatch(/requestMediaLibraryPermissionsAsync/);
  });

  test('the background row hides for the transparent sticker', () => {
    expect(SRC).toMatch(/\{ImagePicker && !isSticker \? \(/);
  });

  test('template-strip tiles announce selection to screen readers (AY-6 carried forward)', () => {
    const strip = SRC.slice(SRC.indexOf('templateStrip'), SRC.indexOf('Format:'));
    expect(strip).toContain('accessibilityState={{ selected: active }}');
  });
});
