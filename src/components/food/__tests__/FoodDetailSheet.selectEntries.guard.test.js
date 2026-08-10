/**
 * Discoverability audit 2026-08-10 (docs/discoverability-audit-2026-08-10/
 * CONTROL-GAPS-EVIDENCE.md, Phase 10 finding #2): multi-select (move to
 * another meal / copy to today / save as a meal) was reachable ONLY through
 * an undisclosed long press on a diary row. FoodDetailSheet is the sheet a
 * normal TAP on an entry already opens (DiaryScreen's openEditSheet ->
 * EntryRow's onPress -> onEdit); this pins the visible route added there:
 * an edit-mode-only "Select entries" button that calls the caller-supplied
 * onSelectEntries, with no new selection mechanism of its own.
 *
 * Source-level guard, the same idiom FoodDetailSheet.eatenAt.guard.test.js
 * already uses for this file (a full mount pulls in store/network deps that
 * are expensive to stub reliably).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'FoodDetailSheet.js'), 'utf8');

describe('FoodDetailSheet: visible "Select entries" route (edit mode only)', () => {
  test('accepts an onSelectEntries prop', () => {
    expect(SRC).toMatch(/onSave, onDelete, onSelectEntries, onClose,/);
  });

  test('the button renders only in edit mode, and only when the caller supplied the callback', () => {
    expect(SRC).toMatch(/\{mode === 'edit' && onSelectEntries \? \(/);
  });

  test('pressing it calls onSelectEntries directly - no local selection state in the sheet', () => {
    expect(SRC).toMatch(
      /onPress=\{\(\) => \{ haptics\.selection\(\); onSelectEntries\(\); \}\}/,
    );
  });

  test('carries an accessible name and a hint describing what selecting unlocks', () => {
    expect(SRC).toMatch(/accessibilityLabel="Select entries"/);
    expect(SRC).toMatch(
      /accessibilityHint="Choose this and other entries to move to a meal, copy to today or save as a meal"/,
    );
  });

  test('the existing delete action is untouched (still its own Pressable, own handler)', () => {
    expect(SRC).toMatch(
      /\{mode === 'edit' && onDelete \? \(\s*<Pressable onPress=\{handleDelete\}/,
    );
  });
});
