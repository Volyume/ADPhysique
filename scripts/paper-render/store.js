/**
 * store.js -- the Play Store and App Store listing screenshots, rendered
 * from the current app (register D211's own "Open, founder-side" note:
 * "The Play and App Store listing screenshots are separate uploads in the
 * consoles and still show the July screens; the same harness can render a
 * full store set on request." This is that request).
 *
 * paper-render.test.js's store pass writes TWO phone-sized HTML pages per
 * capture -- one per target aspect ratio, Play (1080x1920) and App Store
 * (1290x2796) -- into REPORT.store in report-data.json. This step shoots
 * each at 412 CSS pixels wide and the device scale that puts that
 * platform's target width in physical pixels (1080/412 for Play, 1290/412
 * for App Store), crops Chromium's own unpainted window tail exactly as
 * welcome.js does, then draws the result onto a CanvasKit surface sized to
 * the EXACT target pixel dimensions. That last step is what absorbs the
 * sub-pixel rounding a non-integer device-scale-factor leaves in
 * Chromium's own screenshot (drawImageRectOptions stretches whatever
 * Chromium actually produced onto the exact destination rect), so the file
 * written is always precisely 1080x1920 or 1290x2796, never off by a
 * pixel. Writes PNG, not JPEG (unlike welcome.js's product captures --
 * store listings are lossless uploads, not in-app assets). It never writes
 * into the repo.
 *
 * Plain Node, no Jest; run by run.sh after welcome.js.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRATCH = process.env.PAPER_RENDER_SCRATCH
  || '/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad';
const WORK_DIR = path.join(SCRATCH, 'paper-render-work');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');
const OUT_DIR = path.join(process.env.PAPER_RENDER_OUT_DIR || path.join(SCRATCH, 'paper-renders'), 'store');
const CHROME = process.env.PAPER_RENDER_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const CSS_WIDTH = 412;
// Headless Chromium leaves the bottom of the window unpainted (see
// welcome.js's own header comment for the measured amount), so the window
// is shot taller than the phone and the phone's own height is cropped from
// the top. Same constant as welcome.js -- same Chromium binary and flags,
// so the same unpainted margin applies regardless of target height.
const WINDOW_SLACK_CSS = 200;
const SHOOT_TIMEOUT_MS = 30000;

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
  const captures = Array.isArray(report.store) ? report.store : [];
  if (!captures.length) {
    console.log('[paper-render:store] no store pass in the report; nothing to do');
    return;
  }
  fs.mkdirSync(path.join(OUT_DIR, 'play'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'appstore'), { recursive: true });

  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json', { paths: [REPO_ROOT] }));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });

  for (const capture of captures) {
    const dirName = capture.platform === 'play' ? 'play' : 'appstore';
    const outName = `${capture.n}-${capture.file}.png`;
    const outPath = path.join(OUT_DIR, dirName, outName);
    if (!capture.mounted || !capture.htmlPath || !fs.existsSync(capture.htmlPath)) {
      console.log(`[paper-render:store] SKIP ${dirName}/${outName}: ${capture.error || 'not mounted'}`);
      continue;
    }

    const deviceScale = capture.targetWidth / CSS_WIDTH;
    const rawPng = path.join(OUT_DIR, `${dirName}-${capture.n}-${capture.file}-raw.png`);
    try { fs.unlinkSync(rawPng); } catch (_) { /* none yet */ }
    const res = spawnSync(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
      `--force-device-scale-factor=${deviceScale}`, `--window-size=${CSS_WIDTH},${capture.cssHeight + WINDOW_SLACK_CSS}`, `--screenshot=${rawPng}`,
      `file://${capture.htmlPath}`,
    ], { timeout: SHOOT_TIMEOUT_MS, encoding: 'utf8' });
    if (!fs.existsSync(rawPng)) {
      console.log(`[paper-render:store] FAIL ${dirName}/${outName}: chromium exit ${res.status}`);
      continue;
    }

    const image = CK.MakeImageFromEncoded(fs.readFileSync(rawPng));
    const cropHeight = Math.min(image.height(), Math.round(capture.cssHeight * deviceScale));
    const surface = CK.MakeSurface(capture.targetWidth, capture.targetHeight);
    const paint = new CK.Paint();
    paint.setAntiAlias(true);
    surface.getCanvas().drawImageRectOptions(
      image, CK.XYWHRect(0, 0, image.width(), cropHeight), CK.XYWHRect(0, 0, capture.targetWidth, capture.targetHeight),
      CK.FilterMode.Linear, CK.MipmapMode.Linear, paint,
    );
    const png = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.PNG);
    fs.writeFileSync(outPath, Buffer.from(png));
    console.log(`[paper-render:store] OK   ${dirName}/${outName}  (${image.width()}x${cropHeight} -> ${capture.targetWidth}x${capture.targetHeight}, ${png.length} bytes)`);
  }
}

main().catch((e) => {
  console.error('[paper-render:store] failed:', e);
  process.exit(1);
});
