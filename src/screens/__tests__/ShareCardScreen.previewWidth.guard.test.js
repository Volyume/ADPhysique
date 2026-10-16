/**
 * Source guard for EP-11/UI-03 (Codex end-user-polish audit, native app
 * only) on ShareCardScreen.js.
 *
 * Before this fix, the preview hard-coded `PREVIEW_DISPLAY_W = 300` inside
 * the screen's 16dp horizontal ScrollView padding (`content: { padding:
 * spacing.lg, ... }`), overflowing a 320dp-wide phone: 300 + 2*16 = 332dp >
 * 320dp available. This pins that the display width is now derived from the
 * real window width via useWindowDimensions, capped at the design width, and
 * that the height is derived from THAT width (so the card's aspect ratio is
 * preserved, never a fixed height paired with a shrunk width).
 *
 * Also covers P-16 (a missing native module reads as a device limitation,
 * never "you're on an incomplete build").
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');

describe('ShareCardScreen EP-11/UI-03 responsive preview width guard', () => {
  test('imports useWindowDimensions from react-native', () => {
    expect(SRC).toMatch(/useWindowDimensions/);
    const rnImport = SRC.match(/import \{[\s\S]*?\} from 'react-native';/)?.[0] || '';
    expect(rnImport).toMatch(/useWindowDimensions/);
  });

  test('the preview width is capped at the design width but never exceeds the available window width', () => {
    // RE-POINTED 2026-10-15 (D229 addendum 6, Full screen): the one window
    // read now takes the height too, for the phone's own shape; the width
    // is still the real window width.
    expect(SRC).toMatch(/const \{ width: windowWidth, height: windowHeight \} = useWindowDimensions\(\);/);
    expect(SRC).toMatch(/const previewW = Math\.min\(PREVIEW_DISPLAY_W, windowWidth - 2 \* spacing\.lg\);/);
  });

  test('the preview height is derived from the responsive width, not the fixed constant', () => {
    // Re-pinned for Campaign 30 (D108 pillar 3): the height expression grew
    // a sticker branch and the aspect preset argument, but the LAW is
    // unchanged - every branch derives from the responsive previewW, never
    // the fixed design constant.
    // RE-POINTED 2026-10-15 (D229 addendum 6): Full screen's shape is the
    // fourth argument; the height still derives from previewW.
    expect(SRC).toMatch(/const previewH = isSticker \? stickerHeight\(previewW\) : cardHeight\(previewW, isSquare, cardAspect, fullAspect\);/);
    expect(SRC).not.toMatch(/cardHeight\(PREVIEW_DISPLAY_W/);
    expect(SRC).not.toMatch(/stickerHeight\(PREVIEW_DISPLAY_W\)/);
  });

  test('the rendered preview Image and placeholder both size off the responsive width', () => {
    expect(SRC).toMatch(/style=\{\{ width: previewW, height: previewH, borderRadius: radius\.lg \}\}/);
    expect(SRC).toMatch(/\{ width: previewW, height: previewH \}\]\}/);
    expect(SRC).not.toMatch(/width: PREVIEW_DISPLAY_W/);
  });
});

describe('ShareCardScreen P-16 device-specific unavailable copy guard', () => {
  test('missing-native-module copy reads as a device limitation, not an incomplete build', () => {
    expect(SRC).toMatch(/Photo backgrounds aren't available on your device\./);
    expect(SRC).toMatch(/Saving to your gallery isn't available on your device\./);
    expect(SRC).toMatch(/Story sharing isn't available on your device\./);
    expect(SRC).not.toMatch(/isn't available in this version/);
    expect(SRC).not.toMatch(/aren't available in this version/);
  });
});
