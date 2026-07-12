/**
 * Volyume Marketing HQ — carousel PNG renderer.
 *
 * Renders each slide of a carousel content JSON file to a pixel-perfect
 * 1080x1350 PNG using carousel-template.html + carousel.css (the coded
 * design system locked by MARKETING-VISUAL-IDENTITY-LOCKED.md), via
 * Playwright + headless Chromium. This is the production path for social
 * carousel assets, replacing Canva for anything needing exact fonts or
 * drawn shapes (Canva's API cannot set fonts or draw shapes).
 *
 * Usage:
 *   node render-carousel.cjs <content.json> <outDir>
 *
 * <content.json> is an array of slide objects (see carousel-1.json for the
 * shape) or an object with a "slides" array. Output is <outDir>/slide-01.png,
 * slide-02.png, ... in slide order.
 *
 * Playwright is a global install in this environment (not a repo
 * dependency, per CLAUDE.md's "never add dependencies without asking");
 * PLAYWRIGHT_BROWSERS_PATH points at the preinstalled Chromium.
 */
const fs = require('fs');
const path = require('path');

function resolvePlaywright() {
  // Prefer a repo-local install if one ever exists; otherwise fall back to
  // the global install used elsewhere in this environment.
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

async function main() {
  const [, , contentPath, outDirArg] = process.argv;
  if (!contentPath) {
    console.error('Usage: node render-carousel.cjs <content.json> <outDir>');
    process.exit(1);
  }
  const outDir = outDirArg || path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const raw = JSON.parse(fs.readFileSync(path.resolve(contentPath), 'utf8'));
  const slides = Array.isArray(raw) ? raw : raw.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error(`No slides found in ${contentPath}`);
  }

  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    const templateUrl = 'file://' + path.join(__dirname, 'carousel-template.html');
    await page.goto(templateUrl);
    // Wait for the locally hosted @font-face files to actually load, so the
    // screenshot never silently falls back to a system font.
    await page.evaluate(() => document.fonts.ready);

    for (let i = 0; i < slides.length; i++) {
      const slide = { ...slides[i], index: i + 1, total: slides.length };
      await page.evaluate((s) => window.__renderSlide(s), slide);
      await page.evaluate(() => document.fonts.ready);
      const num = String(i + 1).padStart(2, '0');
      const outPath = path.join(outDir, `slide-${num}.png`);
      await page.screenshot({ path: outPath });
      console.log(`slide-${num}.png`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\nWrote ${slides.length} slide(s) to ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
