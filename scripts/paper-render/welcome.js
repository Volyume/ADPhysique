/**
 * welcome.js -- the Welcome screen's three product captures (register D145:
 * Today, a set being logged, the day's nutrition), rendered from the current
 * app. Founder, 2026-09-26: the captures were rendered by Claude Code, not
 * taken by hand, so they are regenerated here whenever the app changes.
 *
 * paper-render.test.js's Welcome pass writes one phone-sized HTML page per
 * capture (REPORT.welcome in report-data.json). This step shoots each at 412
 * CSS pixels wide and twice the density with headless Chromium (as shoot.js
 * does), scales it to the Welcome assets' own size, and encodes it as JPEG
 * with CanvasKit (the library the share-card renderer already runs), into
 * `<out>/welcome/{today,workout,nutrition}.jpg`. It never writes into
 * assets/: replacing assets/welcome/*.jpg is a reviewed step of its own.
 *
 * Plain Node, no Jest; run by run.sh after shoot.js.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRATCH = process.env.PAPER_RENDER_SCRATCH
  || '/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad';
const WORK_DIR = path.join(SCRATCH, 'paper-render-work');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');
const OUT_DIR = path.join(process.env.PAPER_RENDER_OUT_DIR || path.join(SCRATCH, 'paper-renders'), 'welcome');
const CHROME = process.env.PAPER_RENDER_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// The Welcome assets' own size (src/screens/WelcomeScreen.js SHOTS).
const WIDTH = 480;
const HEIGHT = 940;
const JPEG_QUALITY = 86;
// Headless Chromium leaves the bottom of the window unpainted (about 86 CSS
// pixels in practice), so the window is shot taller than the phone and the
// phone's own height is cropped from the top.
const WINDOW_SLACK_CSS = 200;
const DEVICE_SCALE = 2;

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
  const captures = Array.isArray(report.welcome) ? report.welcome : [];
  if (!captures.length) {
    console.log('[paper-render:welcome] no Welcome pass in the report; nothing to do');
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json', { paths: [REPO_ROOT] }));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });

  for (const capture of captures) {
    if (!capture.mounted || !capture.htmlPath || !fs.existsSync(capture.htmlPath)) {
      console.log(`[paper-render:welcome] SKIP ${capture.file}: ${capture.error || 'not mounted'}`);
      continue;
    }
    const png = path.join(OUT_DIR, `${capture.file}-raw.png`);
    try { fs.unlinkSync(png); } catch (_) { /* none yet */ }
    const res = spawnSync(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
      `--force-device-scale-factor=${DEVICE_SCALE}`, `--window-size=412,${capture.cssHeight + WINDOW_SLACK_CSS}`, `--screenshot=${png}`,
      `file://${capture.htmlPath}`,
    ], { timeout: 30000, encoding: 'utf8' });
    if (!fs.existsSync(png)) {
      console.log(`[paper-render:welcome] FAIL ${capture.file}: chromium exit ${res.status}`);
      continue;
    }
    const image = CK.MakeImageFromEncoded(fs.readFileSync(png));
    const cropHeight = Math.min(image.height(), capture.cssHeight * DEVICE_SCALE);
    const surface = CK.MakeSurface(WIDTH, HEIGHT);
    const paint = new CK.Paint();
    paint.setAntiAlias(true);
    surface.getCanvas().drawImageRectOptions(
      image, CK.XYWHRect(0, 0, image.width(), cropHeight), CK.XYWHRect(0, 0, WIDTH, HEIGHT),
      CK.FilterMode.Linear, CK.MipmapMode.Linear, paint,
    );
    const jpg = surface.makeImageSnapshot().encodeToBytes(CK.ImageFormat.JPEG, JPEG_QUALITY);
    fs.writeFileSync(path.join(OUT_DIR, `${capture.file}.jpg`), Buffer.from(jpg));
    console.log(`[paper-render:welcome] OK   ${capture.file}.jpg  (${image.width()}x${cropHeight} -> ${WIDTH}x${HEIGHT}, ${jpg.length} bytes)`);
  }
}

main().catch((e) => {
  console.error('[paper-render:welcome] failed:', e);
  process.exit(1);
});
