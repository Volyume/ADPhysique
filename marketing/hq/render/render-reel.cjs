/**
 * Volyume Marketing HQ — Reels (9:16 motion) renderer.
 *
 * The MOTION counterpart to render-carousel.cjs. It turns a carousel content
 * JSON file (the exact same shape as carousel-1.json) into a Reels-ready
 * 1080x1920, 30fps, H.264 MP4 that animates the six slides as one calm
 * sequence, per MARKETING-VISUAL-IDENTITY-LOCKED.md §8 (kinetic typography
 * over near-black, calm build, same palette and fonts as the still pipeline).
 *
 * Approach: DETERMINISTIC frame-by-frame. reel-template.html exposes
 * window.__seek(tMs), which sets every animated element's state purely from
 * time t. This script screenshots each frame at a fixed frame rate with
 * Playwright + headless Chromium (the same invocation as render-carousel.cjs),
 * then assembles the frames into H.264 with a bundled static ffmpeg binary.
 * Same input every run gives the same output — no wall-clock animation.
 *
 * The video is SILENT by default. Platform audio (music/voice) is added at
 * post/upload time, not baked in here — see README.md.
 *
 * Usage:
 *   node render-reel.cjs <content.json> <out.mp4>
 *
 * <out.mp4> defaults to ./out/reel.mp4 if omitted.
 *
 * Neither Playwright nor ffmpeg is a repo dependency (per CLAUDE.md's "never
 * add dependencies without asking"). Playwright is the global install used by
 * render-carousel.cjs; ffmpeg is a static binary auto-downloaded on first run
 * to ./bin/ffmpeg (gitignored) — see ensureFfmpeg() and README.md.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync, spawnSync } = require('child_process');

const FPS = 30;
const BIN_DIR = path.join(__dirname, 'bin');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg');
// Static linux-x64 build (gpl, includes libx264). Not a repo dependency.
const FFMPEG_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';

function resolvePlaywright() {
  // Prefer a repo-local install if one ever exists; otherwise fall back to
  // the global install used by render-carousel.cjs.
  const candidates = [
    () => require('playwright'),
    () => require('/opt/node22/lib/node_modules/playwright'),
  ];
  for (const load of candidates) {
    try {
      return load();
    } catch (e) {
      // try next
    }
  }
  throw new Error('Could not resolve the playwright module from any known location.');
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u, redirects) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects <= 0) return reject(new Error('Too many redirects'));
          res.resume();
          return get(res.headers.location, redirects - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed: HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    get(url, 5);
  });
}

// Materialise a working static ffmpeg at ./bin/ffmpeg on first run, sanity
// checking it with `ffmpeg -version`. This is NOT an npm dependency — it is a
// downloaded static binary, which CLAUDE.md's dependency rule permits.
async function ensureFfmpeg() {
  if (fs.existsSync(FFMPEG_PATH)) {
    try {
      execFileSync(FFMPEG_PATH, ['-version'], { stdio: 'ignore' });
      return FFMPEG_PATH;
    } catch (e) {
      console.log('Existing bin/ffmpeg failed its version check — re-downloading.');
      try { fs.unlinkSync(FFMPEG_PATH); } catch (_) {}
    }
  }
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const tarPath = path.join(BIN_DIR, 'ffmpeg-download.tar.xz');
  console.log(`ffmpeg not found — downloading a static build from ${FFMPEG_URL} ...`);
  await download(FFMPEG_URL, tarPath);
  console.log('Extracting ffmpeg ...');
  execFileSync('tar', ['-xf', tarPath], { cwd: BIN_DIR });
  const dir = fs.readdirSync(BIN_DIR).find((n) => /^ffmpeg-.*-static$/.test(n) || /^ffmpeg-\d/.test(n));
  if (!dir) throw new Error('Could not find the extracted ffmpeg directory.');
  fs.copyFileSync(path.join(BIN_DIR, dir, 'ffmpeg'), FFMPEG_PATH);
  fs.chmodSync(FFMPEG_PATH, 0o755);
  // Clean up the tarball and extracted tree; keep only bin/ffmpeg.
  fs.rmSync(tarPath, { force: true });
  fs.rmSync(path.join(BIN_DIR, dir), { recursive: true, force: true });
  // Sanity check.
  execFileSync(FFMPEG_PATH, ['-version'], { stdio: 'ignore' });
  console.log(`ffmpeg ready at ${FFMPEG_PATH}`);
  return FFMPEG_PATH;
}

async function main() {
  const [, , contentPath, outArg] = process.argv;
  if (!contentPath) {
    console.error('Usage: node render-reel.cjs <content.json> <out.mp4>');
    process.exit(1);
  }
  const outPath = path.resolve(outArg || path.join(__dirname, 'out', 'reel.mp4'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const raw = JSON.parse(fs.readFileSync(path.resolve(contentPath), 'utf8'));
  const slides = Array.isArray(raw) ? raw : raw.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error(`No slides found in ${contentPath}`);
  }

  const ffmpeg = await ensureFfmpeg();

  // Frames land in a temp dir alongside the output, cleaned up afterwards.
  const framesDir = fs.mkdtempSync(path.join(path.dirname(outPath), '.reel-frames-'));

  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch();
  let totalFrames = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    const templateUrl = 'file://' + path.join(__dirname, 'reel-template.html');
    await page.goto(templateUrl);
    // Wait for the locally hosted @font-face files, so no frame silently falls
    // back to a system font.
    await page.evaluate(() => document.fonts.ready);

    const durationMs = await page.evaluate((s) => window.__loadReel(s), slides);
    await page.evaluate(() => document.fonts.ready);
    totalFrames = Math.round((durationMs / 1000) * FPS);
    console.log(`Rendering ${totalFrames} frames (${(durationMs / 1000).toFixed(1)}s at ${FPS}fps) ...`);

    for (let f = 0; f < totalFrames; f++) {
      const t = (f / FPS) * 1000;
      await page.evaluate((tMs) => window.__seek(tMs), t);
      const num = String(f).padStart(5, '0');
      await page.screenshot({ path: path.join(framesDir, `frame-${num}.png`) });
      if (f % 60 === 0) console.log(`  frame ${f}/${totalFrames}`);
    }
  } finally {
    await browser.close();
  }

  console.log('Assembling H.264 MP4 with ffmpeg ...');
  const args = [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(framesDir, 'frame-%05d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '20',
    '-preset', 'medium',
    '-movflags', '+faststart',
    outPath,
  ];
  const res = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with status ${res.status}`);
  }

  // Clean up frames.
  fs.rmSync(framesDir, { recursive: true, force: true });

  const bytes = fs.statSync(outPath).size;
  console.log(`\nWrote ${outPath} (${(bytes / (1024 * 1024)).toFixed(2)} MB, ${totalFrames} frames).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
