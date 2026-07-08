/**
 * Source guard for §15 item 8 (deep-link expansion,
 * docs/volyume-launch-audit-2026-07-08/00-full-audit.md), the diary-day
 * target.
 *
 * volyume://diary/:date? (RootNavigator.js `linking` config) and a future
 * `diary_day` notification (src/lib/notifications/notificationRoute.js) both
 * hand DiaryScreen an optional `route.params.date` local day-key (YYYY-MM-DD,
 * src/lib/dayKey.js). This pins that DiaryScreen actually reads it:
 *   - the initial `selectedDate` picks it up on first mount, falling back to
 *     today for a missing/malformed value (never a crash, never NaN-keyed).
 *   - because Diary is DiaryTab's root screen and stays mounted across tab
 *     switches, a link tapped while already on Diary updates route.params on
 *     the EXISTING instance rather than remounting it, so a separate effect
 *     re-syncs `selectedDate` when the param changes.
 *   - the same heavy-dependency-graph rationale as
 *     DiaryScreen.daySwipe.guard.test.js applies here: a full render pulls in
 *     SQLite/food-db/store, so this is a source-level regex guard, not a
 *     rendered-component test. `isValidDayKey`'s own format/NaN logic is
 *     exercised indirectly via routeForNotificationType's parallel guard in
 *     notificationRoute.test.js.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

describe('DiaryScreen deep-link/notification date param wiring', () => {
  test('route is destructured alongside navigation (was navigation-only before this lane)', () => {
    expect(SRC).toMatch(/export default function DiaryScreen\(\{ navigation, route \}\)/);
  });

  test('isValidDayKey validates the YYYY-MM-DD shape and rejects an Invalid Date', () => {
    expect(SRC).toMatch(
      /function isValidDayKey\(value\) \{\s*return typeof value === 'string'\s*\n\s*&& \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(value\)\s*\n\s*&& !Number\.isNaN\(parseLocalDay\(value\)\.getTime\(\)\);\s*\}/,
    );
  });

  test('the initial selectedDate uses a valid route.params.date, falling back to today otherwise', () => {
    expect(SRC).toMatch(
      /const \[selectedDate, setSelectedDate\] = useState\(\(\) => \{\s*const paramDate = route\?\.params\?\.date;\s*return isValidDayKey\(paramDate\) \? paramDate : isoDate\(new Date\(\)\);\s*\}\);/,
    );
  });

  test('a later param change (screen already mounted) re-syncs selectedDate without ever setting an invalid value', () => {
    const idx = SRC.indexOf('const [selectedDate, setSelectedDate] = useState');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toMatch(
      /useEffect\(\(\) => \{\s*const paramDate = route\?\.params\?\.date;\s*if \(isValidDayKey\(paramDate\) && paramDate !== selectedDate\) \{\s*setSelectedDate\(paramDate\);\s*\}/,
    );
  });
});
