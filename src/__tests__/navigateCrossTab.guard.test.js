/**
 * T3 (usability directive 2026-07-03): cross-tab navigation goes through
 * navigateCrossTab, nowhere else. The hand-rolled getParent()?.navigate
 * idiom fragmented across 16 call sites and each new one risked the F4
 * silent-dead-tap class (bare navigate) or the F6b lazy-tab strand
 * (missing initial: false). The helper hardcodes both rules; this guard
 * stops the raw idiom growing back.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

describe('navigateCrossTab is the only cross-tab navigator', () => {
  test('the helper hardcodes initial: false on nested navigates', () => {
    const helper = fs.readFileSync(path.join(ROOT, 'navigation', 'navigateCrossTab.js'), 'utf8');
    expect(helper).toMatch(/initial:\s*false/);
  });

  test('no raw getParent navigate remains in screens or components', () => {
    const offences = [...walk(path.join(ROOT, 'screens')), ...walk(path.join(ROOT, 'components'))]
      .filter((p) => /getParent\(\)\??\.navigate\(/.test(fs.readFileSync(p, 'utf8')))
      .map((p) => path.relative(ROOT, p));
    expect(offences).toEqual([]);
  });
});
