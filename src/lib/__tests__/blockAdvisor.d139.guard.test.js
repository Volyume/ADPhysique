/**
 * D139 (programme creation and planning masterpass, 2026-09-03), findings:
 * "two block-boundary labels ('Build a new plan', 'Review with coach')
 * named one destination ('Adjust training')" and the dead free-tier gating
 * on buildNextBlockOptions' adjust option.
 *
 * Ruling 5: block-boundary secondaries say "Change my training setup"; the
 * dead free-tier option copy goes. Engine logic untouched -- label strings
 * only.
 */
const fs = require('fs');
const path = require('path');
const { buildNextBlockOptions } = require('../blockAdvisor');

const source = fs.readFileSync(path.join(__dirname, '..', 'blockAdvisor.js'), 'utf8');

describe('D139: block-boundary secondaries name one destination', () => {
  test('every secondaryLabel says "Change my training setup"; the old two names are gone', () => {
    const matches = source.match(/secondaryLabel: '[^']*'/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
    expect(matches.every((m) => m === "secondaryLabel: 'Change my training setup'")).toBe(true);
    expect(source).not.toContain('Build a new plan');
    expect(source).not.toContain('Review with coach');
  });

  test('the dead free-tier detail string is gone; the Pro detail is the only one', () => {
    // Comments stripped: a retirement note may name the retired copy in
    // prose (as this file's own comment does) without that counting as it
    // surviving in code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('Part of Pro');
    const [, adjust] = buildNextBlockOptions({ recommendation: null, isPro: false });
    expect(adjust.detail).toBe(
      "Same workouts, with next block's weekly set targets starting from what this block showed, muscle by muscle.",
    );
  });

  test('requiresPro/locked fields survive (shape unchanged) but are always false now', () => {
    for (const isPro of [true, false]) {
      const options = buildNextBlockOptions({ recommendation: null, isPro });
      for (const o of options) {
        expect(o).toHaveProperty('requiresPro', false);
        expect(o).toHaveProperty('locked', false);
      }
    }
  });
});
