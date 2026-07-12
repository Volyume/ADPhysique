/**
 * EP-23/UI-11 (end-user-polish audit, 2026-07-12): SessionCard's meta line
 * called `format(new Date(at), 'EEE d MMM')` whenever `at` was truthy, with
 * no validity check. `at` is `workout.startedAt ?? workout.createdAt ??
 * workout.created_at ?? 0` -- a raw DB value that can be a malformed
 * legacy/restored timestamp (a non-empty, non-parseable string), which
 * would throw `RangeError: Invalid time value` and crash the whole
 * Analytics screen (every session card renders from the same list).
 *
 * Source guard, not a full render test: this screen is a large, actively
 * co-edited surface (AnalyticsScreen.cohesion.guard.test.js already pins
 * its cohesion census, and load/empty-state code here is owned by a
 * concurrent workstream per this fix's brief), and SessionCard is a
 * module-private function, not exported, so a real-render harness would
 * mean standing up the screen's full load/empty-state machinery for one
 * line. This pins the exact corrected source at the call site instead,
 * matching this screen's own established source-guard convention.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('AnalyticsScreen SessionCard date guard (EP-23/UI-11)', () => {
  test('imports the shared safeDate/safeFormatDate helpers', () => {
    expect(SRC).toMatch(/import \{ safeDate, safeFormatDate \} from '\.\.\/lib\/safeFormat';/);
  });

  test('the session meta date is validated before formatting, never a raw format(new Date(at), ...)', () => {
    expect(SRC).toContain("{at && safeDate(at) ? safeFormatDate(at, 'EEE d MMM') : ''}");
    // The exact unguarded call this replaces must not still be present.
    expect(SRC).not.toMatch(/\{at \? format\(new Date\(at\), 'EEE d MMM'\) : ''\}/);
  });

  test('safeFormatDate/safeDate never throw for the malformed values a restored/legacy workout row can carry', () => {
    // eslint-disable-next-line global-require
    const { safeDate, safeFormatDate } = require('../../lib/safeFormat');
    const badValues = ['not-a-real-date', 'garbage', NaN, {}, []];
    for (const at of badValues) {
      expect(() => (at && safeDate(at) ? safeFormatDate(at, 'EEE d MMM') : '')).not.toThrow();
      expect(at && safeDate(at) ? safeFormatDate(at, 'EEE d MMM') : '').not.toMatch(/NaN/);
    }
  });
});
