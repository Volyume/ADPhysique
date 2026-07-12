/**
 * LS-06 (Codex adversarial audit, 2026-07-12): localWeekEndMs must return the
 * NEXT local Monday 00:00 by calendar arithmetic, so a UK week containing a
 * BST/GMT transition is 167h (spring-forward) or 169h (fall-back), not a fixed
 * 168h. The weekly windows in database.js (check-in matching, weekly session
 * stats, weekly PR counts) used weekStart + 7 * 86400000, which landed the
 * boundary an hour off across the two transition weeks a year.
 *
 * Jest pins its sandbox timezone at startup (UTC in CI), so a runtime TZ change
 * does not reach the sandboxed Date. To exercise the real Europe/London DST
 * rules this runs the REAL dayKey module (by file path, never a copy) in a
 * child Node process with TZ=Europe/London and asserts on its JSON output.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const MODULE_URL = `file://${path.resolve(__dirname, '../dayKey.js')}`;

const CHILD_SCRIPT = `
const { localWeekStartMs, localWeekEndMs } = await import(${JSON.stringify(MODULE_URL)});
const HOUR = 3600000;

// Spring forward: clocks jump 01:00 GMT -> 02:00 BST on Sun 29 Mar 2026, so the
// week that starts Mon 23 Mar is only 167 hours long.
const springStart = localWeekStartMs(new Date(2026, 2, 25, 12, 0, 0).getTime()); // a Wed in that week
const springHours = (localWeekEndMs(springStart) - springStart) / HOUR;

// Fall back: clocks go 02:00 BST -> 01:00 GMT on Sun 25 Oct 2026, so the week
// that starts Mon 19 Oct is 169 hours long.
const autumnStart = localWeekStartMs(new Date(2026, 9, 21, 12, 0, 0).getTime()); // a Wed in that week
const autumnHours = (localWeekEndMs(autumnStart) - autumnStart) / HOUR;

// A plain week with no transition is exactly 168h.
const plainStart = localWeekStartMs(new Date(2026, 5, 3, 12, 0, 0).getTime());
const plainHours = (localWeekEndMs(plainStart) - plainStart) / HOUR;

// The end must be a genuine local Monday 00:00.
const endDate = new Date(localWeekEndMs(springStart));

console.log(JSON.stringify({
  offsetBefore: new Date(2026, 2, 25, 12, 0, 0).getTimezoneOffset(), // GMT before spring change
  offsetAfter: new Date(2026, 3, 1, 12, 0, 0).getTimezoneOffset(),   // BST after
  springHours, autumnHours, plainHours,
  endDay: endDate.getDay(), endHour: endDate.getHours(), endMin: endDate.getMinutes(),
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

describe('LS-06: localWeekEndMs is a DST-correct calendar week end', () => {
  const r = runInLondon();

  test('the child really runs Europe/London (fixture sanity)', () => {
    expect(r.offsetBefore).toBe(0);   // GMT
    expect(r.offsetAfter).toBe(-60);  // BST, UTC+1
  });

  test('a spring-forward week is 167 hours, not 168', () => {
    expect(r.springHours).toBe(167);
  });

  test('a fall-back week is 169 hours, not 168', () => {
    expect(r.autumnHours).toBe(169);
  });

  test('a week with no transition is exactly 168 hours', () => {
    expect(r.plainHours).toBe(168);
  });

  test('the end is always a local Monday at 00:00', () => {
    expect(r.endDay).toBe(1);   // Monday
    expect(r.endHour).toBe(0);
    expect(r.endMin).toBe(0);
  });
});
