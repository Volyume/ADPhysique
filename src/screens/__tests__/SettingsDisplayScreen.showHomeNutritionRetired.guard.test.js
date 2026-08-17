/**
 * Campaign 24 Wave F, LEAD RULING (D33) on the showHomeNutrition dead
 * toggle: WAVE-F-FINDINGS.md found "Show nutrition on Home" fully wired
 * end-to-end (store write, AsyncStorage persist, cloud pref push) but
 * completely inert -- no component anywhere in src/ read
 * accessibility.showHomeNutrition to gate anything. A toggle wired to
 * nothing fails the truth law, and building the unbuilt "gap #17" Home
 * nutrition-glance feature would be sprawl this campaign forbids. Ruling:
 * RETIRE the toggle. Remove the Settings row and the store default field;
 * tolerate any already-persisted value silently (ignored, not migrated).
 *
 * This suite pins the retirement so the row and the field cannot silently
 * come back without a deliberate decision. SettingsDisplayScreen pulls in
 * theme/store context providers this suite doesn't want to stand up, so
 * (matching this repo's convention for hard-to-mount screens, e.g.
 * SettingsAboutScreen.debugGate.guard.test.js) this pins the source text
 * directly rather than rendering.
 */
import fs from 'fs';
import path from 'path';

const SCREEN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'SettingsDisplayScreen.js'),
  'utf8',
);
const STORE_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'store', 'useAppStore.js'),
  'utf8',
);

// Strips both `{/* JSX block comments */}` and `//` line comments so the
// "nothing LIVE references this any more" assertions below don't trip over
// the removal-site comment itself, which deliberately quotes the retired
// label and field name so the ruling is traceable (see the last test in
// each describe block, which pins that the explanatory comment exists).
function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n');
}

describe('SettingsDisplayScreen: the "Show nutrition on Home" row is retired', () => {
  test('no rendered label, sub-copy, or SettingRow references it', () => {
    const codeOnly = stripComments(SCREEN_SRC);
    expect(codeOnly).not.toMatch(/Show nutrition on Home/);
    expect(codeOnly).not.toMatch(/A remaining-calories glance and a quick way into your diary/);
  });

  test('no live (non-comment) reference to accessibility.showHomeNutrition remains', () => {
    expect(stripComments(SCREEN_SRC)).not.toMatch(/showHomeNutrition/);
  });

  test('no setAccessibilityPref call writes the retired key', () => {
    expect(stripComments(SCREEN_SRC)).not.toMatch(/setAccessibilityPref\('showHomeNutrition'/);
  });

  test('the removal site names the ruling and the return-if-rebuilt condition', () => {
    expect(SCREEN_SRC).toMatch(/LEAD\s+RULING D33/);
    expect(SCREEN_SRC).toMatch(/returns with it/);
  });
});

describe('useAppStore: the accessibility default no longer exposes showHomeNutrition', () => {
  test('no live (non-comment) default field sets showHomeNutrition', () => {
    expect(stripComments(STORE_SRC)).not.toMatch(/showHomeNutrition:/);
  });

  test('the removal site records the ruling and the silent-tolerance note', () => {
    expect(STORE_SRC).toMatch(/showHomeNutrition removed from the default shape \(Campaign 24 Wave F,/);
    expect(STORE_SRC).toMatch(/tolerated silently via the `\.\.\.parsed` spread/);
  });
});
