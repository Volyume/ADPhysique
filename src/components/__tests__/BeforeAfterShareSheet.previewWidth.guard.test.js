/**
 * Source guard for EP-11/UI-03 (Codex end-user-polish audit, native app
 * only) on BeforeAfterShareSheet.js.
 *
 * Before this fix, the preview hard-coded `PREVIEW_DISPLAY_W = 300` inside
 * the sheet's 16dp horizontal ScrollView padding (`content: { padding:
 * spacing.lg, ... }`), overflowing a 320dp-wide phone: 300 + 2*16 = 332dp >
 * 320dp available. This pins that the display width is now derived from the
 * real window width via useWindowDimensions, capped at the design width, and
 * that the height is derived from THAT width (preserving aspect ratio).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'BeforeAfterShareSheet.js'), 'utf8');

describe('BeforeAfterShareSheet EP-11/UI-03 responsive preview width guard', () => {
  test('imports useWindowDimensions from react-native', () => {
    const rnImport = SRC.match(/import \{[\s\S]*?\} from 'react-native';/)?.[0] || '';
    expect(rnImport).toMatch(/useWindowDimensions/);
  });

  test('useWindowDimensions is read unconditionally, before the component\'s early return', () => {
    const hookIdx = SRC.indexOf('const { width: windowWidth } = useWindowDimensions();');
    const earlyReturnIdx = SRC.indexOf("if (!visible || suppressed || tier !== 'pro') return null;");
    expect(hookIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeGreaterThan(hookIdx);
  });

  test('the preview width is capped at the design width but never exceeds the available window width', () => {
    expect(SRC).toMatch(/const previewW = Math\.min\(PREVIEW_DISPLAY_W, windowWidth - 2 \* spacing\.lg\);/);
  });

  test('the preview height is derived from the responsive width, not the fixed constant', () => {
    expect(SRC).toMatch(/const previewH = cardHeight\(previewW, isSquare, aspect\);/);
    expect(SRC).not.toMatch(/cardHeight\(PREVIEW_DISPLAY_W, isSquare, aspect\)/);
  });

  test('the rendered preview Image and placeholders all size off the responsive width', () => {
    expect(SRC).toMatch(/style=\{\{ width: previewW, height: previewH, borderRadius: radius\.lg \}\}/);
    expect(SRC).not.toMatch(/width: PREVIEW_DISPLAY_W/);
  });
});

describe('BeforeAfterShareSheet P-16 device-specific unavailable copy guard', () => {
  test('missing-native-module copy reads as a device limitation, not an incomplete build', () => {
    expect(SRC).toMatch(/Progress image sharing isn't available on your device\./);
    expect(SRC).toMatch(/Sharing isn't available on your device\./);
    expect(SRC).toMatch(/Saving to your gallery isn't available on your device\./);
    expect(SRC).not.toMatch(/isn't available in this version/);
  });
});
