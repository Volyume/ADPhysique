/**
 * X5 (cross-surface consistency audit 2026-07-30,
 * docs/audit/cross-surface-consistency-audit-2026-07-30.md): HomeScreen's
 * "Sessions this week" stat (loadWeekStats, "Progress at a glance" card) used
 * a rolling trailing-7-day window (Date.now() - 7 * 24 * 60 * 60 * 1000),
 * while the free coach line on the SAME screen (loadFreeCoachLine ->
 * coachResponse.js) used the Monday-anchored localWeekStartMs(). Sun + Mon +
 * Tue with today Wednesday could show "3" and "2" on one screen.
 *
 * X11 (same audit): the trial-value banner's and the coach-runway ledger's
 * weigh-in/session counts (loadTrialBanner, loadCoachRunway) had the same
 * rolling-7-day shape, feeding buildCoachLedger's "N of 3 morning weigh-ins
 * THIS WEEK" label off a boundary that wasn't actually the calendar week.
 *
 * Ruled: every "this week" count goes through the shared Monday-anchored
 * dayKey.js helpers (localWeekStartMs/localWeekEndMs); no surface computes
 * its own boundary. This is a source guard (repo convention for screen-level
 * date-window fixes not easily unit-tested without a full DB, see
 * database.writeGuards.test.js / checkinCoachAudit.guard.test.js): it pins
 * that the OLD rolling-window literal is gone from loadWeekStats and that the
 * shared helpers are used for both loadWeekStats and loadCoachRunway.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n {2}(async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('X5/X11: HomeScreen "this week" counts are Monday-anchored, not rolling', () => {
  test('dayKey.js Monday-anchored helpers are imported', () => {
    expect(HOME).toMatch(/import \{ localWeekStartMs, localWeekEndMs, localDayKey \} from '\.\.\/lib\/dayKey';/);
  });

  test('loadWeekStats (the "Sessions this week" glance card) uses the Monday-anchored window', () => {
    const body = fnBody(HOME, 'async function loadWeekStats()');
    expect(body).toMatch(/const weekStartMs = localWeekStartMs\(\);/);
    expect(body).toMatch(/const weekEndMs = localWeekEndMs\(weekStartMs\);/);
    expect(body).toMatch(/w\.startedAt >= weekStartMs && w\.startedAt < weekEndMs/);
    // The old rolling-7-day literal must be gone from this function.
    expect(body).not.toMatch(/Date\.now\(\) - 7 \* 24 \* 60 \* 60 \* 1000/);
  });

  test('loadCoachRunway\'s weigh-in/session counts use the Monday-anchored window, not a rolling one', () => {
    const body = fnBody(HOME, 'async function loadCoachRunway()');
    expect(body).toMatch(/const weekAgo = localWeekStartMs\(\);/);
    expect(body).not.toMatch(/Date\.now\(\) - 7 \* 86400000/);
  });

  test('loadTrialBanner\'s weigh-in count uses the Monday-anchored window, not a rolling one', () => {
    const body = fnBody(HOME, 'async function loadTrialBanner()');
    expect(body).toMatch(/const weekAgoMondayMs = localWeekStartMs\(\);/);
    expect(body).not.toMatch(/Date\.now\(\) - 7 \* 86400000/);
  });

  test('loadFreeCoachLine (the free-tier "this week" line) already used the Monday-anchored helper', () => {
    const body = fnBody(HOME, 'async function loadFreeCoachLine()');
    expect(body).toMatch(/const weekStartMs = localWeekStartMs\(\);/);
  });
});
