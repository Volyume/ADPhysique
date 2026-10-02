/**
 * D16 (NAV-2, weigh-in edit/delete/history) source guard.
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; spec docs/audit/
 * progress-recovery-consistency-audit-2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md
 * section 3 item 8, section 6 table: `BodyMetricsScreen.*` guards (editDelete),
 * BM-1 and BM-2). The old file pinned two defects as contract:
 *   - `updateMorningWeightById(user.id, targetId, { weightKg: data.body_weight })`
 *     (BM-1: the validator returns `data.weightKg`, so every edit of a Home
 *     weigh-in threw on an undefined weight and read "Couldn't save"); and
 *   - a delete that tombstoned only the `body_metric_log` row (BM-2: the day's
 *     morning weight stayed, the merge re-listed the day, and "Entry deleted."
 *     was followed by the same weigh-in).
 * It also pinned the bordered pencil-and-bin pair on every row (BM-49), which
 * is now one tappable row opening the entry in place.
 *
 * Still pinned, because they are easy to silently regress:
 *   - edit/delete are real, wired to the repository functions (not stubs);
 *   - the confirm is the app's existing calm delete-confirm idiom (appAlert,
 *     Cancel/Delete with style: 'destructive'), never a native Alert.alert;
 *   - the copy is plain and factual, never celebratory or judging;
 *   - no haptics anywhere on this weight-adjacent screen;
 *   - edit/delete always render (Volyume is fully free, 2026-09-03);
 *   - the History renders from a single entry, not only once there are 2+.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n  (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('BodyMetricsScreen edit/delete (D16 NAV-2) source guard', () => {
  test('imports the real update/delete functions of both tables', () => {
    const importBlock = source.match(/import \{[^}]*\} from '\.\.\/lib\/database';/)[0];
    for (const name of [
      'logBodyMetric', 'updateBodyMetric', 'deleteBodyMetric', 'getBodyMetricLog',
      'getMorningWeights', 'updateMorningWeightById', 'deleteMorningWeightById', 'logMorningWeight',
    ]) {
      expect(importBlock).toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(source).toMatch(/await updateBodyMetric\(user\.id, entry\.id, data\)/);
  });

  test('BM-1: a Home weigh-in saves with the validator\'s own key, never `data.body_weight`', () => {
    const edit = fnBody(source, 'async function saveEdit(');
    expect(edit).toMatch(/updateMorningWeightById\(user\.id, entry\.id, \{\s*weightKg: data\.weightKg,/);
    expect(source).not.toMatch(/data\.body_weight/);
    // the date, the note and the move of a Home row are handled, not dropped
    expect(edit).toMatch(/logMorningWeight\(user\.id, \{/);
    expect(edit).toMatch(/noteChanged/);
  });

  test('BM-2: a delete retracts the day\'s weigh-in from the history AND from the trend', () => {
    const del = fnBody(source, 'async function deleteEntry(');
    // the log rows are tombstoned (so the delete syncs) ...
    expect(del).toMatch(/for \(const id of entry\.logIds\) \{[\s\S]*?await deleteBodyMetric\(user\.id, id\)/);
    // ... and so is the day's morning_weights row, through the existing function
    expect(del).toMatch(/for \(const id of entry\.morningIds\) \{[\s\S]*?await deleteMorningWeightById\(user\.id, id\)/);
  });

  test('the confirm says exactly what a delete does', () => {
    expect(source).toMatch(/This removes the weigh-in from your history and your trend\./);
    expect(source).toMatch(/This removes the weigh-in and the measurements logged that day from your history, and the weigh-in from your trend\./);
    expect(source).toMatch(/This removes the measurements logged that day from your history\./);
  });

  test('delete uses the appAlert workout-delete idiom: Cancel + destructive Delete, no native Alert', () => {
    expect(source).toMatch(/import \{ appAlert \} from '\.\.\/components\/AppAlert';/);
    expect(source).toMatch(
      /appAlert\(\s*'Delete this entry\?',[\s\S]*?\{ text: 'Cancel', style: 'cancel' \},[\s\S]*?text: 'Delete', style: 'destructive'/,
    );
    expect(source).not.toMatch(/\bAlert\.alert\(/);
  });

  test('no haptics anywhere on this weight-adjacent screen', () => {
    // Checks for an actual haptics call/import, not the word "haptics".
    expect(source).not.toMatch(/from ['"]expo-haptics['"]/);
    expect(source).not.toMatch(/Haptics\.\w+\(/);
    expect(source).not.toMatch(/triggerHaptic\(/);
  });

  test('copy is plain and factual, never celebratory or judging the values', () => {
    expect(source).not.toMatch(/great progress|well done|great job|amazing|fantastic|awesome|crush(ed)?|smash(ed)?|keep it up/i);
  });

  test('BM-49: one tappable row opens the entry; no bordered icon pair on any row', () => {
    expect(source).toMatch(/onPress=\{\(\) => openEdit\(entry\)\}/);
    expect(source).not.toMatch(/pencil-outline|trash-outline|historyActionBtn|historyActions/);
    // edit and delete live inside the entry, in place of the row
    expect(source).toMatch(/formMode === 'edit' && editingEntry\?\.id === entry\.id/);
    expect(source).toMatch(/onPress=\{\(\) => confirmDelete\(editingEntry\)\}/);
  });

  test('edit/delete controls always render, with no tier-based read-only gate', () => {
    expect(source).not.toMatch(/readOnly/);
    expect(source).not.toMatch(/\btier\b/);
  });

  test('History shows from a single entry, not gated to 2+', () => {
    expect(source).toMatch(/groupEntriesByWeek\(entries, \{ nowMs: clock, weeks: historyWeeks \}\)/);
    expect(source).not.toMatch(/history\.length > 1/);
    expect(source).not.toMatch(/\.slice\(0, 12\)/);
  });

  test('"Show earlier weeks" pages the history eight weeks at a time', () => {
    expect(source).toMatch(/title="Show earlier weeks"/);
    expect(source).toMatch(/historyWeeks \+ HISTORY_PAGE_WEEKS/);
  });
});
