/**
 * Progress photo local-day grouping across DST (scoring-accuracy-and-
 * validation-blueprint.md §11 "Timestamp" row; phase-1-evidence-gaps.md §5
 * "Timezone/DST edges for photo local-day grouping"), wave 5.
 *
 * progressPhotoTimeline.js's day/month bucketing reads local calendar
 * fields straight off `new Date(ms)` (getFullYear/getMonth/getDate) — unlike
 * mesocycle.js's F10 bug (EN-11, see mesocycle.f10.dst.test.js), it never
 * does elapsed-time/floor-division arithmetic across a day boundary, so
 * there is no obvious equivalent defect to fix. This suite exists to PROVE
 * that, not assume it: it exercises the real module across the UK 2026
 * DST boundaries (spring-forward 29 March, fall-back 25 October) and pins
 * the current (correct) behaviour so a future refactor that introduces
 * elapsed-time arithmetic here would be caught.
 *
 * Jest pins its sandbox timezone at startup (UTC in CI); a runtime
 * process.env.TZ change does not reach the already-sandboxed Date. This
 * suite follows the house pattern (mesocycle.f10.dst.test.js): run the REAL
 * module (imported by file path, never a copy) in a child Node process with
 * TZ=Europe/London and assert on its JSON output.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const MODULE_URL = `file://${path.resolve(__dirname, '../progressPhotoTimeline.js')}`;

const CHILD_SCRIPT = `
// progressPhotoTimeline.js (unlike mesocycle.js) has a relative import
// ('./progressPhotoDates') with no extension, which Node's native ESM
// resolver refuses (it never guesses .js). Register a tiny resolve hook
// (Node built-ins only, no dependency, no repo file) that retries an
// extensionless relative specifier with '.js' appended, so the REAL,
// unmodified source file can still be imported by path in a fresh process.
import { register } from 'node:module';
const hookSource = [
  'export async function resolve(specifier, context, nextResolve) {',
  '  try { return await nextResolve(specifier, context); }',
  '  catch (err) {',
  '    if (specifier.startsWith(".") && !specifier.endsWith(".js")) {',
  '      return nextResolve(specifier + ".js", context);',
  '    }',
  '    throw err;',
  '  }',
  '}',
].join('\\n');
register('data:text/javascript,' + encodeURIComponent(hookSource), import.meta.url);

const { buildCheckInTimeline, buildTimeline } = await import(${JSON.stringify(MODULE_URL)});

const d = (y, m, day, h = 12, mi = 0) => new Date(y, m - 1, day, h, mi, 0).getTime();

function checkinRows(photos) {
  return buildCheckInTimeline(photos).filter((row) => row.type === 'checkin');
}

function dayKeyFor(ms) {
  return checkinRows([{ takenAt: ms, pose: 'front' }])[0].dayKey;
}

// Fall-back: Sunday 25 Oct 2026, clocks go back 02:00 BST -> 01:00 GMT.
const fallBackPhotos = [
  { name: 'a_0030_bst', takenAt: d(2026, 10, 25, 0, 30), pose: 'front' },
  { name: 'b_0130_ambiguous', takenAt: d(2026, 10, 25, 1, 30), pose: 'back' },
  { name: 'c_2300_gmt', takenAt: d(2026, 10, 25, 23, 0), pose: 'side' },
  { name: 'd_next_day', takenAt: d(2026, 10, 26, 0, 30), pose: 'front' },
];
const fallBackRows = checkinRows(fallBackPhotos);

// Spring-forward: Sunday 29 Mar 2026, clocks go forward 01:00 GMT -> 02:00 BST.
const springFwdPhotos = [
  { name: 'e_0030_gmt', takenAt: d(2026, 3, 29, 0, 30), pose: 'front' },
  { name: 'f_2300_bst', takenAt: d(2026, 3, 29, 23, 0), pose: 'back' },
  { name: 'g_next_day', takenAt: d(2026, 3, 30, 0, 30), pose: 'front' },
];
const springFwdRows = checkinRows(springFwdPhotos);

// Month-header grouping (buildTimeline) across the same fall-back window:
// getFullYear/getMonth only, so all four October photos should stay in one
// October header bucket.
const monthRows = buildTimeline(fallBackPhotos);

// Fine-grained sweep across both boundary windows: the day-key must change
// if and only if the LOCAL calendar date changes, at 30-minute steps. This
// is the DST-boundary-covering equivalent of the mesocycle F10 sweep.
function sweep(fromMs, toMs) {
  let steps = 0;
  let mismatches = 0;
  let prevKey = null;
  let prevDate = null;
  for (let t = fromMs; t <= toMs; t += 30 * 60000) {
    steps += 1;
    const key = dayKeyFor(t);
    const localDate = new Date(t).getDate();
    if (prevDate !== null) {
      const sameCalendarDay = localDate === prevDate;
      const sameKey = key === prevKey;
      if (sameCalendarDay !== sameKey) mismatches += 1;
    }
    prevKey = key;
    prevDate = localDate;
  }
  return { steps, mismatches };
}
const fallBackSweep = sweep(d(2026, 10, 24, 0, 0), d(2026, 10, 27, 0, 0));
const springFwdSweep = sweep(d(2026, 3, 28, 0, 0), d(2026, 3, 31, 0, 0));

console.log(JSON.stringify({
  // Timezone sanity, mirroring mesocycle.f10.dst.test.js's fixture check.
  offsetBeforeFallBack: new Date(2026, 9, 24, 12, 0, 0).getTimezoneOffset(),
  offsetAfterFallBack: new Date(2026, 9, 26, 12, 0, 0).getTimezoneOffset(),
  offsetBeforeSpringFwd: new Date(2026, 2, 28, 12, 0, 0).getTimezoneOffset(),
  offsetAfterSpringFwd: new Date(2026, 2, 30, 12, 0, 0).getTimezoneOffset(),
  fallBackDayKeys: fallBackRows.map((r) => ({ dayKey: r.dayKey, names: r.photos.map((p) => p.name) })),
  springFwdDayKeys: springFwdRows.map((r) => ({ dayKey: r.dayKey, names: r.photos.map((p) => p.name) })),
  monthHeaderCount: monthRows.filter((r) => r.type === 'header').length,
  monthHeaderLabel: monthRows.find((r) => r.type === 'header')?.label,
  monthRowPhotoCount: monthRows.filter((r) => r.type === 'row').reduce((n, r) => n + r.photos.length, 0),
  fallBackSweep,
  springFwdSweep,
}));
`;

function runInLondon() {
  const stdout = execFileSync(
    process.execPath,
    ['--no-warnings', '--input-type=module', '-e', CHILD_SCRIPT],
    { env: { ...process.env, TZ: 'Europe/London' }, encoding: 'utf8' },
  );
  return JSON.parse(stdout);
}

describe('progress photo local-day grouping across the UK 2026 DST boundaries', () => {
  const result = runInLondon();

  test('the child process really runs Europe/London around both boundaries (fixture sanity)', () => {
    expect(result.offsetBeforeFallBack).toBe(-60); // BST, UTC+1
    expect(result.offsetAfterFallBack).toBe(0); // GMT
    expect(result.offsetBeforeSpringFwd).toBe(0); // GMT
    expect(result.offsetAfterSpringFwd).toBe(-60); // BST
  });

  test('the fall-back day (25 Oct, 25 real hours long) buckets into exactly two check-ins, same-day photos together', () => {
    expect(result.fallBackDayKeys).toHaveLength(2);
    const [firstDay, secondDay] = result.fallBackDayKeys;
    expect(firstDay.names.sort()).toEqual(['a_0030_bst', 'b_0130_ambiguous', 'c_2300_gmt'].sort());
    expect(secondDay.names).toEqual(['d_next_day']);
    expect(firstDay.dayKey).not.toBe(secondDay.dayKey);
  });

  test('the spring-forward day (29 Mar, 23 real hours long) buckets into exactly two check-ins, same-day photos together', () => {
    expect(result.springFwdDayKeys).toHaveLength(2);
    const [firstDay, secondDay] = result.springFwdDayKeys;
    expect(firstDay.names.sort()).toEqual(['e_0030_gmt', 'f_2300_bst'].sort());
    expect(secondDay.names).toEqual(['g_next_day']);
    expect(firstDay.dayKey).not.toBe(secondDay.dayKey);
  });

  test('buildTimeline keeps all four fall-back-window photos in one October month header', () => {
    expect(result.monthHeaderCount).toBe(1);
    expect(result.monthHeaderLabel).toBe('October 2026');
    expect(result.monthRowPhotoCount).toBe(4);
  });

  test('the day-key changes if and only if the local calendar date changes, at every 30-minute step across both boundaries', () => {
    expect(result.fallBackSweep.steps).toBeGreaterThan(100);
    expect(result.fallBackSweep.mismatches).toBe(0);
    expect(result.springFwdSweep.steps).toBeGreaterThan(100);
    expect(result.springFwdSweep.mismatches).toBe(0);
  });
});
