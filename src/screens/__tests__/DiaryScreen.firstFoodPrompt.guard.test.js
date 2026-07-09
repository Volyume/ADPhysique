/**
 * Regression guard for L05-D2 (design-usability audit 2026-07-09,
 * docs/design-usability-audit-2026-07-09/05-eat-meal-builder.md:142-149):
 * progressive disclosure for new accounts.
 *
 * The finding calls MacroRings itself well-organised, adherence-neutral and
 * LOCKED -- "not a finding to change" -- so the fix is additive at the
 * DiaryScreen level only: a brand-new account (no food logged anywhere yet)
 * sees a calm FirstFoodPrompt instead of MacroRings at the top of the day;
 * everyone else (any account with history, even on an empty day) sees the
 * full MacroRings exactly as before.
 *
 * Source-level guard (regex), matching the existing pattern in
 * DiaryScreen.foodLogTapCount.guard.test.js. Pins:
 *  - the account-wide `hasAnyFoodEntries` check (not a per-day check) drives
 *    the swap, and fails OPEN to full MacroRings on a read error;
 *  - the full MacroRings call site is byte-for-byte the same props it always
 *    had (rollup/targets/planned/dayTypeLabel/onPress);
 *  - MacroRings.js itself (the locked, adherence-neutral component) is not
 *    modified to know about any of this.
 */
import fs from 'fs';
import path from 'path';

const DIARY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

const MACRO_RINGS_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'food', 'MacroRings.js'),
  'utf8',
);

describe('DiaryScreen top-of-day: new-account calm prompt vs full MacroRings (L05-D2)', () => {
  test('imports hasAnyFoodEntries (account-wide, not the per-day rollup) and FirstFoodPrompt', () => {
    expect(DIARY_SRC).toMatch(/hasAnyFoodEntries/);
    expect(DIARY_SRC).toMatch(/import FirstFoodPrompt from '..\/components\/food\/FirstFoodPrompt'/);
  });

  test('the everLoggedFood state defaults to true and fails OPEN to true on a read error', () => {
    expect(DIARY_SRC).toMatch(/const \[everLoggedFood, setEverLoggedFood\] = useState\(true\)/);
    expect(DIARY_SRC).toMatch(/hasAnyFoodEntries\(userId\)\.catch\(\(\) => true\)/);
  });

  test('showFirstFoodPrompt requires loaded, non-read-only, and a confirmed empty account', () => {
    expect(DIARY_SRC).toMatch(
      /const showFirstFoodPrompt = loaded && !readOnly && !everLoggedFood;/,
    );
  });

  test('the simple prompt and the full MacroRings are mutually exclusive branches of one condition', () => {
    expect(DIARY_SRC).toMatch(
      /\{showFirstFoodPrompt \? \(\s*<FirstFoodPrompt targetKcal=\{effectiveTargets\?\.targetKcal\} energyUnit=\{energyUnit\} \/>\s*\) : \(/,
    );
  });

  test('the full MacroRings call site keeps its original props unchanged', () => {
    expect(DIARY_SRC).toMatch(
      /<MacroRings\s*rollup=\{rollup\}\s*targets=\{effectiveTargets\}\s*planned=\{plannedTotals\}\s*dayTypeLabel=\{dayTypeChip\}\s*onPress=\{viewEntries\.length \? \(\) => setBreakdownVisible\(true\) : undefined\}\s*\/>/,
    );
  });

  test('MacroRings.js (the locked, adherence-neutral component) is untouched by this feature: no reference to the new prompt/state anywhere in it', () => {
    expect(MACRO_RINGS_SRC).not.toMatch(/FirstFoodPrompt/);
    expect(MACRO_RINGS_SRC).not.toMatch(/everLoggedFood/);
    expect(MACRO_RINGS_SRC).not.toMatch(/hasAnyFoodEntries/);
  });

  test('a read-only lapse view (E10, only reachable with logged history) never shows the new-account prompt', () => {
    // showFirstFoodPrompt is gated on !readOnly, so a read-only diary can
    // never render FirstFoodPrompt regardless of everLoggedFood.
    expect(DIARY_SRC).toMatch(/showFirstFoodPrompt = loaded && !readOnly/);
  });
});
