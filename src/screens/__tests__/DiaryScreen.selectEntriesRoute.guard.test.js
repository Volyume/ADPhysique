/**
 * Discoverability audit 2026-08-10 (docs/discoverability-audit-2026-08-10/
 * CONTROL-GAPS-EVIDENCE.md, Phase 10 finding #2): entering multi-select
 * (unlocking Move to another meal / Copy to today / Save as a meal,
 * :1856-1875) was reachable ONLY through an undisclosed long press
 * (onLongPressEntry={enterSelection}). This pins the visible route wired
 * from FoodDetailSheet's new "Select entries" action: it closes the edit
 * sheet and calls the SAME enterSelection the long press already used,
 * pre-selecting the entry the sheet was open on. No new state, no second
 * selection mechanism, enterSelection's own body is untouched (pinned
 * separately by DiaryScreen.holdHints.guard.test.js).
 *
 * Source-level guard, same idiom as the neighbouring DiaryScreen guard
 * suites (this screen has no existing full-render test harness).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

describe('DiaryScreen: visible route into selection mode via FoodDetailSheet', () => {
  test('FoodDetailSheet is given onSelectEntries, closing the sheet and entering selection with the same entry', () => {
    expect(SRC).toMatch(
      /onSelectEntries=\{\(\) => \{\s*const entry = editSheet\?\.entry;\s*setEditSheet\(null\);\s*if \(entry\) enterSelection\(entry\);\s*\}\}/,
    );
  });

  test('enterSelection itself is unchanged (still the long press-driven mechanism, pre-selecting one entry)', () => {
    expect(SRC).toMatch(
      /const enterSelection = useCallback\(\(entry\) => \{\s*setSelectionMode\(true\);\s*setSelectedIds\(new Set\(\[entry\.id\]\)\);\s*\}, \[\]\);/,
    );
  });

  test('the long press still wires straight to enterSelection (accelerator, not removed)', () => {
    expect(SRC).toMatch(/onLongPressEntry=\{enterSelection\}/);
  });
});
