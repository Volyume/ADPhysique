/**
 * Final audit 2026-10-17, C1 + C2 + C5 (part) on CoachOutputScreen.
 *
 * C1. In Coached mode the auto-apply effect re-fired on every applyingKey
 * change, so an apply that ends without marking its row applied (the floor
 * hold, a diet break at or above maintenance, a training "plan changed", a
 * preview refresh) looped for ever: database reads and the same notice
 * again and again. Pinned: one auto attempt per adjustment per reviewed
 * week, marked BEFORE the call; the handlers themselves never consult the
 * record, so a manual tap still works.
 *
 * C2. A same-week reopen read this week's own saved row back as the "last
 * output" (consecutiveOffTargetWeeks recomputed to 0 and persisted; the
 * cooldown counted 0 weeks and hid the proposed change), and the in-memory
 * output dropped the stored Applied / Declined records so Apply showed
 * again. Pinned: the engine's carried inputs come from week_start BEFORE
 * this week, and the stored records are merged into the shown output.
 *
 * C5 (part). The weigh-in count window ends at the next local Monday
 * (localWeekEndMs), not weekStart + 168h, which is wrong in a DST week.
 *
 * The screen cannot be required under Jest (see
 * CoachOutputScreen.d16Autonomy.guard.test.js), so this is source-pinned.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
const DB = fs.readFileSync(path.resolve(__dirname, '../../lib/database.js'), 'utf8');

function autoApplyEffect() {
  const match = SCREEN.match(
    /\/\/ Ultimate-Audit item 11 \(D16[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\n {2}\}, \[coachAutonomy, output, applyingKey, nextTrainingWeekId, user\?\.id\]\);/,
  );
  expect(match).toBeTruthy();
  return match[0];
}

describe('C1: the Coached walk attempts each adjustment once per reviewed week', () => {
  test('the attempt record is keyed by adjustment and the output week', () => {
    expect(SCREEN).toMatch(/const autoApplyAttemptedRef = useRef\(new Set\(\)\);/);
    const body = autoApplyEffect();
    expect(body).toMatch(/const attemptWeek = output\?\.weekStart \?\? weekStart;/);
    expect(body).toMatch(/autoApplyAttemptedRef\.current\.has\(`\$\{key\}:\$\{attemptWeek\}`\)/);
  });

  test('every auto call is skipped once attempted and marked BEFORE it runs', () => {
    const body = autoApplyEffect();
    for (const [key, handler] of [
      ['deload', 'handleApplyDeload();'],
      ['training', 'handleApplyTraining();'],
      ['calories', 'handleApplyCalories();'],
      ['dietBreak', 'handleApplyDietBreak();'],
    ]) {
      const guardAt = body.indexOf(`!autoAttempted('${key}')`);
      const markAt = body.indexOf(`markAutoAttempted('${key}');`);
      const callAt = body.indexOf(handler);
      expect(guardAt).toBeGreaterThan(-1);
      expect(markAt).toBeGreaterThan(guardAt);
      expect(callAt).toBeGreaterThan(markAt);
    }
  });

  test('a manual tap is never blocked by the auto record', () => {
    const handlers = SCREEN.slice(
      SCREEN.indexOf('async function handleApplyCalories()'),
      SCREEN.indexOf('useEffect(() => {\n    async function load()'),
    );
    expect(handlers.length).toBeGreaterThan(0);
    expect(handlers).not.toMatch(/autoApplyAttemptedRef|autoAttempted/);
  });
});

describe('C2: a same-week reopen feeds the engine what the first open did', () => {
  test('the carried inputs read the previous week, never this week own row', () => {
    expect(SCREEN).toMatch(/const lastOutput = await getLatestCoachOutput\(user\.id, \{ beforeWeekStart: weekStart \}\);/);
    expect(SCREEN).not.toMatch(/const lastOutput = await getLatestCoachOutput\(user\.id\);/);
  });

  test('database.js bounds the read strictly before the given week, additively', () => {
    expect(DB).toMatch(/export async function getLatestCoachOutput\(userId, \{ beforeWeekStart \} = \{\}\)/);
    expect(DB).toMatch(/WHERE user_id = \? AND week_start < \? ORDER BY week_start DESC LIMIT 1/);
    // Unbounded callers keep the original query.
    expect(DB).toMatch(/'SELECT \* FROM coach_outputs WHERE user_id = \? ORDER BY week_start DESC LIMIT 1'/);
  });

  test('the shown output carries the stored Applied and Declined records', () => {
    const saveAt = SCREEN.indexOf('await saveCoachOutput(user.id, { weekStart, ...persistedResult });');
    const end = SCREEN.indexOf('setOutput(persistedResult);', saveAt);
    expect(saveAt).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(saveAt);
    const block = SCREEN.slice(saveAt, end);
    expect(block).toMatch(/getLatestCoachOutput\(user\.id, \{ beforeWeekStart: weekStart \+ 1 \}\)/);
    expect(block).toMatch(/Number\(storedThisWeek\.weekStart\) === Number\(weekStart\)/);
    expect(block).toMatch(/\['appliedAdjustments', 'declinedAdjustments'\]/);
    expect(block).toMatch(/if \(!persistedResult\[key\] && storedThisWeek\[key\]\) persistedResult\[key\] = storedThisWeek\[key\];/);
  });

  test('the save itself is unchanged (still saves the fresh run)', () => {
    expect(SCREEN).toMatch(/await saveCoachOutput\(user\.id, \{ weekStart, \.\.\.persistedResult \}\);/);
  });
});

describe('C5 (part): the weigh-in window is DST-safe', () => {
  test('the week end is the next local Monday', () => {
    expect(SCREEN).toMatch(/const weekEnd = localWeekEndMs\(weekStart\);/);
    expect(SCREEN).not.toMatch(/const weekEnd = weekStart \+ 7 \* 86400000;/);
  });
});
