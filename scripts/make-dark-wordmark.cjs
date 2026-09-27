/**
 * Makes assets/volyume-wordmark-dark.png from assets/volyume-wordmark.png: the
 * wordmark for the share image's light theme (founder, 2026-09-27: "maybe
 * different share themes (light and dark)"). The silver chrome (the V's right
 * arm and "olyume") nearly vanishes on a light ground, so every neutral
 * (unsaturated) pixel becomes dark gunmetal with the same shading, 0.3 of its
 * brightness, while every gold pixel and all transparency stay exactly as they
 * are. The original asset is never changed.
 *
 *   node scripts/make-dark-wordmark.cjs
 */
const fs = require('fs');
const path = require('path');

// Below this saturation a pixel is chrome, not gold.
const NEUTRAL_SATURATION = 0.12;
// How bright the gunmetal is, as a share of the chrome's brightness.
const GUNMETAL = 0.3;

async function main() {
  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json'));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
  const src = path.join(__dirname, '../assets/volyume-wordmark.png');
  const out = path.join(__dirname, '../assets/volyume-wordmark-dark.png');
  const img = CK.MakeImageFromEncoded(fs.readFileSync(src));
  const w = img.width();
  const h = img.height();
  const info = { width: w, height: h, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB };
  const px = img.readPixels(0, 0, info);
  let changed = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i]; const g = px[i + 1]; const b = px[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat >= NEUTRAL_SATURATION) continue;
    const v = Math.round(max * GUNMETAL);
    px[i] = v; px[i + 1] = v; px[i + 2] = v;
    changed += 1;
  }
  const dark = CK.MakeImage(info, px, w * 4);
  fs.writeFileSync(out, Buffer.from(dark.encodeToBytes()));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(process.cwd(), out)} (${w}x${h}, ${changed} chrome pixels darkened)`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
