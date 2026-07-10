/**
 * FoodDetailSheet.eatenAt.guard.test.js
 *
 * Ultimate-Audit item 15 (D22 15b, timeline food logging): pins the edit
 * sheet's optional "eaten at" field wiring at the source level.
 * FoodDetailSheet pulls in MicronutrientDetail (Ultimate-Audit item 16,
 * built concurrently in the same file) and several store/network
 * dependencies that make a full mount expensive to stub reliably while
 * that neighbouring work is still landing; a source-level guard (the same
 * fs.readFileSync + regex idiom DiaryScreen's guard suite already uses for
 * exactly this reason) pins the real contract without that coupling:
 *
 *   - the field renders ONLY in edit mode (add mode keeps the fast 3-tap
 *     log path unchanged, per DiaryScreen.foodLogTapCount.guard.test.js).
 *   - eatenAt is threaded into the onSave payload, undefined in add mode.
 *   - EatenTimePicker (the existing date-picker idiom, mode="time") is
 *     wired to open/close/commit a chosen time.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'FoodDetailSheet.js'), 'utf8');

describe('FoodDetailSheet: eaten-at field (edit mode only)', () => {
  test('imports EatenTimePicker, the existing time-picker idiom (mode="time"), no new dependency', () => {
    expect(SRC).toMatch(/import EatenTimePicker from '\.\/EatenTimePicker';/);
  });

  test('the "Eaten at" field is gated to edit mode only, keeping the add-mode fast path untouched', () => {
    expect(SRC).toMatch(/\{mode === 'edit' \? \(\s*<>\s*<Text style=\{styles\.fieldLabel\}>Eaten at<\/Text>/);
  });

  test('a bulk-confirmed entry (no eaten_at) opens with "No time set", never a false timestamp', () => {
    expect(SRC).toMatch(/'No time set'/);
  });

  test('a clear action returns an entry to the honest untimed state', () => {
    expect(SRC).toMatch(/accessibilityLabel="Clear the eaten time"/);
    // Haptics completion pass (2026-07-10): a haptics.selection() call was
    // added alongside the clear; the regex tolerates that one extra
    // leading statement without loosening the real pin (setEatenAt(null)).
    expect(SRC).toMatch(/onPress=\{\(\) => \{ (?:haptics\.selection\(\); )?setEatenAt\(null\); \}\}/);
  });

  test('handleSave sends eatenAt only in edit mode; add mode sends undefined (db layer\'s own "log now" default applies)', () => {
    expect(SRC).toMatch(/eatenAt: mode === 'edit' \? eatenAt : undefined,/);
  });

  test('initialEatenAt seeds the field only in edit mode', () => {
    expect(SRC).toMatch(
      /useState\(mode === 'edit' \? \(Number\.isFinite\(initialEatenAt\) \? initialEatenAt : null\) : null\)/,
    );
  });
});
