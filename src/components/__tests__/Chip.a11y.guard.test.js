/**
 * AX-05 (launch accessibility audit, 2026-07-12): Chip silently reintroduced
 * the app-wide 1.3x text-scaling cap EP-14 removed everywhere else, via a
 * default *function parameter* (`maxFontSizeMultiplier = 1.3`) rather than a
 * JSX prop -- the exact shape the blanket-cap guard
 * (src/__tests__/accessibilityDesign.guard.test.js, "no screen re-introduces
 * the blanket 1.3x text-scaling cap") does not scan for, since it only
 * matches `maxFontSizeMultiplier={1.3}`. Chip's base geometry (18px label
 * line + 8dp vertical padding) was also ~36dp tall, under the 44dp minimum
 * touch target, with no minHeight to bring it up.
 *
 * Fix: the default parameter is removed (Chip.js's destructured prop has no
 * default now, so RN's own uncapped scaling behaviour applies), and the base
 * `chip` style carries `minHeight: Platform.select({ android: 48, default:
 * 44 })`. Both pinned here at source level because Chip is used at ~49 call
 * sites and this primitive must never silently regress; render-level proof
 * (label not force-capped, actual minHeight) lives alongside Chip's other
 * behaviour tests in inputs.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'Chip.js'), 'utf8');

describe('Chip meets the 44dp minimum touch target and never reintroduces a default text-scaling cap (AX-05)', () => {
  test('maxFontSizeMultiplier has no default value (no blanket cap smuggled back in via a JS default param)', () => {
    // Matches "maxFontSizeMultiplier = <number>," but not a bare
    // "maxFontSizeMultiplier," (no default) or "maxFontSizeMultiplier,"
    // followed by another destructured prop.
    expect(src).not.toMatch(/maxFontSizeMultiplier\s*=\s*[\d.]+/);
    expect(src).toMatch(/^\s*maxFontSizeMultiplier,\s*$/m);
  });

  test('no blanket 1.3x JSX-prop cap either (belt and braces alongside the app-wide guard)', () => {
    expect(src).not.toMatch(/maxFontSizeMultiplier=\{1\.3\}/);
  });

  test('the base chip style carries a Platform-aware 44/48dp minHeight', () => {
    expect(src).toMatch(/minHeight:\s*Platform\.select\(\{\s*android:\s*48,\s*default:\s*44\s*\}\)/);
  });
});
