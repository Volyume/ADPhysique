/**
 * UI-15 (Codex end-user-polish audit): the label scanner's alignment guide
 * was a fixed 280x360 box (styles.frame), which on a 320dp-wide screen left
 * only 20dp of margin per side. Purely decorative overlay, no scanning/
 * camera-logic change, so this is a sizing fix only.
 *
 * Same responsive shape as ShareCardScreen's preview width fix (EP-11/UI-03,
 * see ShareCardScreen.previewWidth.guard.test.js): cap at the current design
 * width, shrink to fit the available window width first, derive height from
 * that width so the aspect ratio never distorts.
 *
 * Source-scan guard (not a render test), following the same precedent as
 * ShareCardScreen's guard: a direct read of the fixed call site is a
 * stronger, cheaper pin than mocking useWindowDimensions through a full
 * camera-screen mount.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'ScanLabelScreen.js'), 'utf8');

describe('ScanLabelScreen UI-15 responsive alignment-guide sizing guard', () => {
  test('imports useWindowDimensions from react-native', () => {
    const rnImport = src.match(/import \{[\s\S]*?\} from 'react-native';/)?.[0] || '';
    expect(rnImport).toMatch(/useWindowDimensions/);
  });

  test('the guide width is capped at the design width but never exceeds the available window width', () => {
    expect(src).toMatch(/export const FRAME_DESIGN_W = 280;/);
    expect(src).toMatch(/const \{ width: windowWidth \} = useWindowDimensions\(\);/);
    expect(src).toMatch(/const frameW = Math\.min\(FRAME_DESIGN_W, windowWidth - 2 \* spacing\.xl\);/);
  });

  test('the guide height is derived from the responsive width, preserving the original aspect ratio', () => {
    expect(src).toMatch(/export const FRAME_ASPECT = 280 \/ 360;/);
    expect(src).toMatch(/const frameH = frameW \/ FRAME_ASPECT;/);
  });

  test('the rendered guide sizes off the responsive width/height, not the fixed styles.frame constant', () => {
    expect(src).toMatch(/style=\{\[styles\.frame, live\.frame, \{ width: frameW, height: frameH \}\]\}/);
  });

  test('scanning/camera logic is untouched: no change to OCR recognition or barcode handling near the fix', () => {
    expect(src).toMatch(/recogniseText|recogniseBlocks/);
    // The guide is inside the pointerEvents="none" decorative overlay, never
    // wired to onCapture/recognise calls.
    expect(src).toMatch(/pointerEvents="none">\s*\n\s*<View style=\{\[styles\.frame, live\.frame, \{ width: frameW, height: frameH \}\]\} \/>/);
  });
});
