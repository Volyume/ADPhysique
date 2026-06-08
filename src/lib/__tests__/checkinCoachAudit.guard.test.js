/**
 * Regression guards for the check-in/coach audit fixes whose logic lives in
 * SQLite queries (database.js) or screen load effects (CoachOutputScreen,
 * WeeklyCheckInScreen). Per the repo convention those paths are exercised on
 * device, not under jest (no SQL engine, no native screen mounts here), so
 * these are scoped source guards in the same style as database.writeGuards and
 * the consent-routing guards. Each guard fails if its fix is reverted.
 *
 * The behavioural signal/parsing layer (stress, joint pain, note flags,
 * adherence vocabulary) is covered directly in weeklyCoach.signals.audit.test.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const DB = read('../database.js');
const COACH = read('../../screens/CoachOutputScreen.js');
const CHECKIN = read('../../screens/WeeklyCheckInScreen.js');

// Slice a single function body from `export ... function NAME` to the next
// top-level `export` declaration, so a regex can't match an unrelated function.
function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const next = src.indexOf('\nexport ', start + decl.length);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('ALGO-001: weekly volume anchors to the check-in week', () => {
  const body = fnBody(DB, 'export async function getWeeklyVolumeByMuscle');
  test('takes an anchorMs param and uses it as the window anchor', () => {
    expect(body).toMatch(/getWeeklyVolumeByMuscle\(userId, weeksBack = 4, anchorMs = Date\.now\(\)\)/);
    expect(body).toMatch(/const now = Number\.isFinite\(anchorMs\) \? anchorMs : Date\.now\(\)/);
  });
  test('the check-in screen passes the end of the Monday-anchored week', () => {
    expect(CHECKIN).toMatch(/getWeeklyVolumeByMuscle\(user\.id, 2, weekStartMs \+ 7 \* 86400000\)/);
  });
});

describe('ALGO-002: planned sessions come from the active plan', () => {
  const body = fnBody(DB, 'export async function getWeeklySessionStats');
  test('reads the active plan routine count, falls back to the average', () => {
    expect(body).toMatch(/getActivePlan\(userId\)/);
    expect(body).toMatch(/getRoutinesForPlan\(plan\.id\)/);
    expect(body).toMatch(/plannedFromPlan/);
    // The trailing-average must now be a fallback, not the sole source.
    expect(body).toMatch(/plannedFromPlan != null/);
  });
});

describe('ALGO-003: PR detection uses estimated 1RM', () => {
  const body = fnBody(DB, 'export async function getWeeklyPRCount');
  test('compares Epley e1RM, not just heavier load', () => {
    expect(body).toMatch(/wk_e1rm/);
    // Epley: weight * (1 + reps/30), using actual_reps.
    expect(body).toMatch(/actual_reps/);
    expect(body).toMatch(/1\.0 \+ COALESCE\(ws\.actual_reps, 1\) \/ 30\.0/);
    // The old weight-only distinct-exercise count must be gone.
    expect(body).not.toMatch(/COUNT\(DISTINCT ws\.exercise_id\) AS pr_count/);
  });
});

describe('ALGO-005: real elapsed weeks since the last calorie change', () => {
  test('computes weeks from the carried week-start, not a binary 1/99', () => {
    expect(COACH).toMatch(/prevCalAdjustmentWeekStart = lastOutput\?\.lastCalAdjustmentWeekStart/);
    expect(COACH).toMatch(/Math\.round\(\(weekStart - prevCalAdjustmentWeekStart\) \/ \(7 \* 86400000\)\)/);
    expect(COACH).not.toMatch(/lastCalAdjustmentWeeksAgo = lastCalAdjustmentDirection \? 1 : 99/);
  });
  test('carries lastCalAdjustmentWeekStart into the saved output', () => {
    expect(COACH).toMatch(/const lastCalAdjustmentWeekStart = result\.adjustments\?\.calories\?\.change/);
    expect(COACH).toMatch(/saveCoachOutput\(user\.id, \{ weekStart, \.\.\.result, lastCalAdjustmentWeekStart \}\)/);
  });
});

describe('PIPE-005: historical calorie adherence keeps its direction', () => {
  test('reads each past week own intake average and maps with it', () => {
    expect(COACH).toMatch(/localDayKey\(ci\.weekStart \+ 6 \* 86400000\)/);
    expect(COACH).toMatch(/getRecentIntakeSummary\(user\.id, weekEndKey\)/);
    expect(COACH).toMatch(/adherence: mapCals\(ci\.calsAdherence, weekAvg\)/);
  });
});

describe('PIPE-006: the check-in loader does not fail open', () => {
  test('a load failure routes to a recoverable error, not the form', () => {
    expect(CHECKIN).toMatch(/setGateState\('load_error'\)/);
    // The old unconditional fail-open must be gone.
    expect(CHECKIN).not.toMatch(/fail open so users aren't permanently blocked/);
  });
  test('the load_error state is recoverable via a retry', () => {
    expect(CHECKIN).toMatch(/gateState === 'load_error'/);
    expect(CHECKIN).toMatch(/setReloadKey\(k => k \+ 1\)/);
  });
});
