/**
 * campaign6.longTerm.test.js — the Campaign 6 long-term product-law
 * matrix (order Phase 61). Grown phase by phase alongside the campaign;
 * the six-block athlete and the longitudinal engine characterisations
 * live in their own suites (campaign6.sixBlock.test.js,
 * campaign6.longitudinal.test.js).
 *
 * Laws pinned here: memory must help never trap; no personalisation
 * without provenance; lapse is not failure.
 */
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('PHASE 7: stale history is never called recent (D97)', () => {
  test('the readiness baseline label does not claim recency the row-limited query cannot promise', () => {
    const src = stripComments(read('lib/blockAdvisor.js'));
    expect(src).toContain('Readiness a bit below your personal baseline');
    expect(src).not.toContain('below your recent average');
  });

  test('the goal-setup weight note states the last logged weight, not a recent trend', () => {
    const src = stripComments(read('screens/ProGoalSetupScreen.js'));
    expect(src).toContain('Targets use your last logged weight');
    expect(src).not.toContain('your recent weight trend');
  });

  test('the surfaces that DO say "recent" are genuinely date-windowed', () => {
    // The habit-derived reminder claim ("your recent workouts") rests on a
    // 6-week trailing calendar window; the check-in comparative verdicts
    // ("your usual") rest on the CALENDAR prior week, so a lapse return
    // refuses them (hasPriorWeek false). Pinned so a refactor that swaps
    // either to a row-limited read fails here.
    expect(read('lib/notifications/trainingHabitSchedule.js'))
      .toMatch(/HABIT_WINDOW_WEEKS = 6/);
    const checkin = read('screens/WeeklyCheckInScreen.js');
    expect(checkin).toMatch(/const hasPriorWeek = Number\.isFinite\(volLastWeek\) && volLastWeek > 0;/);
    // The workload card hides rather than comparing against nothing.
    expect(read('components/ProgressSections.js'))
      .toMatch(/if \(!data \|\| data\.ratio === null\) return null;/);
  });

  test('"your last block" and "set by how your last block went" remain temporal identity, not recency claims', () => {
    // These stay legal at any age: the last block IS the last block.
    expect(read('lib/blockExplain.js')).toContain("seed_ledger: 'set by how your last block went'");
  });
});

describe('PHASE 2 finding: the adaptive bands read the genuinely most recent sessions (D97)', () => {
  test('the landmark history feeder returns oldest-first so slice(-8) is the last 8, not the oldest 8', () => {
    // The query is ORDER BY started_at DESC; without the reverse, a
    // mature user\'s adapted MAV was computed from the OLDEST eight
    // sessions inside the 200-row window and barely moved as new
    // evidence arrived - the opposite of the function\'s own "last 8
    // data points" contract.
    const src = read('lib/database.js');
    const fn = src.slice(src.indexOf('export async function getAdaptiveLandmarkHistory'));
    const ret = fn.slice(0, fn.indexOf('export async function', 10));
    expect(ret).toMatch(/\}\)\)\.reverse\(\);/);
    expect(ret).toMatch(/ORDER BY w\.started_at DESC/);
  });
});

describe('D91-24 / D91-25 remain deferred, not implemented (D97)', () => {
  test('no freshness/decay algorithm exists in the learned range', () => {
    const src = stripComments(read('lib/learnedRange.js'));
    expect(src).not.toMatch(/decay|freshness|ageFactor|halfLife|staleAfter/i);
  });

  test('the accumulation-week list still excludes only the planned deload week (D91-24 unchanged)', () => {
    const src = read('lib/blockLedgerGather.js');
    expect(src).toMatch(/if \(w !== deloadWeekIndex\) weeks\.push\(w\);/);
  });
});
