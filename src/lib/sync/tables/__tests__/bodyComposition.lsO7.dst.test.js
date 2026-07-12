/**
 * LS-07 (codex-adversarial-audit-triage-2026-07-12.md) -- body_composition
 * sync stamped `metric_date` via `new Date(ms).toISOString().split('T')[0]`
 * (the UTC calendar day). During BST (UK summer time, UTC+1) an
 * early-morning weigh-in -- e.g. 00:30 local -- is 23:30 UTC the PREVIOUS
 * day, so the cloud row landed on the wrong day. The fix routes
 * `msToDate` (sync/tables/bodyComposition.js) through the shared
 * `localDayKey` helper (dayKey.js), the same local-calendar-day bucketing
 * weight/workouts already use.
 *
 * Jest pins its sandbox timezone at startup (UTC in CI); a runtime
 * `process.env.TZ` change inside a test does NOT reach the sandboxed Date
 * (see mesocycle.f10.dst.test.js). To genuinely exercise the Europe/London
 * BST rule this suite runs `localDayKey` -- the exact function
 * `msToDate` now delegates to, and dayKey.js has no external imports, so
 * it loads cleanly outside Jest -- in a real Node child process started
 * with TZ=Europe/London, and contrasts it with the OLD buggy UTC-slice
 * formula on the identical timestamp. This suite fails if `localDayKey`
 * (or the old formula, for the contrast assertion) stops behaving as
 * described.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const MODULE_URL = `file://${path.resolve(__dirname, '../../../dayKey.js')}`;

const CHILD_SCRIPT = `
const { localDayKey } = await import(${JSON.stringify(MODULE_URL)});

// 00:30 local on 15 July 2026 (BST). Local constructor so the child's
// Europe/London TZ applies when computing the epoch.
const ms = new Date(2026, 6, 15, 0, 30, 0).getTime();

// The OLD, buggy formula bodyComposition.js's msToDate used to use.
const oldUtcSliceDay = new Date(ms).toISOString().split('T')[0];

console.log(JSON.stringify({
  offset: new Date(2026, 6, 15, 12, 0, 0).getTimezoneOffset(), // sanity: BST = -60
  ms,
  fixedLocalDay: localDayKey(ms),
  oldUtcSliceDay,
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

describe('LS-07: a 00:30 BST weigh-in stamps the correct local day, not the UTC day', () => {
  const result = runInLondon();

  test('the child process really runs Europe/London in BST (fixture sanity)', () => {
    expect(result.offset).toBe(-60); // BST, UTC+1
  });

  test('the OLD UTC-slice formula shifts the weigh-in back a day (the bug)', () => {
    expect(result.oldUtcSliceDay).toBe('2026-07-14');
  });

  test('the fixed localDayKey keeps the weigh-in on the SAME (correct) local day', () => {
    expect(result.fixedLocalDay).toBe('2026-07-15');
  });

  test('the fixed day differs from the old UTC-slice day for this instant (proves the fix changes behaviour)', () => {
    expect(result.fixedLocalDay).not.toBe(result.oldUtcSliceDay);
  });
});
