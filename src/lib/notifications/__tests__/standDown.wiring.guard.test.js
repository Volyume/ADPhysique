/**
 * D215 wiring guards (founder order 2026-10-02: no repeat notifications once
 * the requirement is satisfied). The deed paths are fire-and-forget hooks
 * inside device-truth writes, which the executed suites reach only through
 * mocks, so the structure is locked at source:
 *   - database.logMorningWeight stands down the weigh-in prompts for the
 *     logged day, only when a weight was written, inside try/catch with the
 *     promise caught, before it returns;
 *   - the two workout completion writes (updateWorkout and the ended-early
 *     finalisation) stand down the training reminder for the session's own
 *     start day, only on isCompleted, never able to touch the write;
 *   - database.saveWeeklyCheckin stands down the check-in only for a real
 *     check-in (energy score present), never for a workout's sleep-only row;
 *   - food/db.logFoodEntry stands down the slot for a real entry only;
 *     the two planned-meal confirms also re-check the 20:00 confirm nudge;
 *   - handler.js keeps the ED-flag meal branch first and unchanged;
 *   - the schedulers skip today's prompt behind the "is it done" read and
 *     every dated request names its day (and a meal request its slot);
 *   - the barrel exports the stand-down surface.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\nexport (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('database.js deed hooks', () => {
  const SRC = read('lib/database.js');

  test('logMorningWeight: a written weight stands down the logged day\'s prompts, best-effort, before the return', () => {
    const body = fnBody(SRC, 'export async function logMorningWeight(');
    expect(body).toMatch(/if \(Number\(weightKg\) > 0\) \{\s*try \{[\s\S]*?require\('\.\/notifications\/standDown'\)\.standDownWeighIn\(loggedAt\)\.catch\(\(\) => \{\}\);[\s\S]*?\} catch \(_\)/);
    expect(body.indexOf('standDownWeighIn(loggedAt)')).toBeLessThan(body.lastIndexOf('return savedId;'));
  });

  test('_standDownTrainingOnCompletion: isCompleted only, the session\'s own start day, every failure swallowed', () => {
    const body = fnBody(SRC, 'function _standDownTrainingOnCompletion(');
    expect(body).toMatch(/if \(!\(data\?\.isCompleted === true \|\| data\?\.isCompleted === 1\)\) return;/);
    expect(body).toMatch(/SELECT started_at FROM workouts WHERE id = \?/);
    expect(body).toMatch(/standDownTraining\(Number\.isFinite\(startedAt\) && startedAt > 0 \? startedAt : Date\.now\(\)\)/);
    expect(body).toMatch(/\}\)\(\)\.catch\(\(\) => \{\}\);/);
  });

  test('updateWorkout and the ended-early finalisation both call the hook after their write', () => {
    const upd = fnBody(SRC, 'export async function updateWorkout(');
    expect(upd.indexOf('_updateWorkoutOnDb(d, id, data);')).toBeGreaterThan(-1);
    expect(upd.indexOf('_standDownTrainingOnCompletion(d, id, data);')).toBeGreaterThan(upd.indexOf('_updateWorkoutOnDb(d, id, data);'));
    const fin = fnBody(SRC, 'export async function finishWorkoutWithSessionResolution(');
    const hook = fin.indexOf('_standDownTrainingOnCompletion(d, workoutId, workoutData);');
    expect(hook).toBeGreaterThan(fin.indexOf('_scheduleSync();'));
    expect(hook).toBeLessThan(fin.lastIndexOf('return id;'));
  });

  test('saveWeeklyCheckin: a real check-in (energy score) stands down; a sleep-only row does not', () => {
    const body = fnBody(SRC, 'export async function saveWeeklyCheckin(');
    expect(body).toMatch(/if \(data\?\.energyScore != null\) \{\s*try \{[\s\S]*?require\('\.\/notifications\/standDown'\)\.standDownCheckin\(\)\.catch\(\(\) => \{\}\);/);
    expect(body.indexOf('standDownCheckin()')).toBeLessThan(body.lastIndexOf('return savedId;'));
  });
});

describe('food/db.js deed hooks', () => {
  const SRC = read('lib/food/db.js');

  test('logFoodEntry: a real entry stands down its slot; planned scaffolding does not', () => {
    const body = fnBody(SRC, 'export async function logFoodEntry(');
    expect(body).toMatch(/if \(!isPlanned\) _standDownMealReminders\(userId, entry\.entryDate, \[entry\.mealSlot\]\);/);
  });

  test('the planned-meal confirms stand down the confirmed slots and re-check the confirm nudge', () => {
    const day = fnBody(SRC, 'export async function confirmPlannedDay(');
    expect(day).toMatch(/if \(\(res\?\.changes \?\? 0\) > 0\) \{[\s\S]*?_standDownMealReminders\(userId, entryDate, \(confirmedIdentities \|\| \[\]\)\.map\(\(i\) => i\.meal_slot\), \{ plannedConfirm: true \}\);/);
    const entry = fnBody(SRC, 'export async function confirmPlannedEntry(');
    expect(entry).toMatch(/if \(\(res\?\.changes \?\? 0\) > 0\) \{[\s\S]*?_standDownMealReminders\(userId, existing\.entry_date, \[existing\.meal_slot\], \{ plannedConfirm: true \}\);/);
  });

  test('the helper: one re-lay per deed, the confirm nudge only on a confirm, everything swallowed', () => {
    const body = fnBody(SRC, 'function _standDownMealReminders(');
    expect(body).toMatch(/standDownMeal\(String\(slot\), entryDate\)\.catch\(\(\) => \{\}\);/);
    expect(body).toMatch(/if \(plannedConfirm\) \{[\s\S]*?schedulePlannedMealConfirm\(userId\)\.catch\(\(\) => \{\}\);/);
    expect((body.match(/standDownMeal\(/g) || []).length).toBe(1);
    expect(body).toMatch(/\} catch \(_\) \{/);
  });
});

describe('handler.js: the ED-flag meal branch stays first and unchanged', () => {
  const SRC = read('lib/notifications/handler.js');

  test('ED branch text intact, and before the logged-slot branch', () => {
    const ed = SRC.indexOf("dataType === 'meal_log_reminder' && await _edFlagOpen()");
    const logged = SRC.indexOf('&& await _mealLoggedToday(notification?.request?.content?.data?.slot)');
    expect(ed).toBeGreaterThan(-1);
    expect(logged).toBeGreaterThan(ed);
  });

  test('the logged-slot read goes through standDown.js and fails open', () => {
    const body = SRC.slice(SRC.indexOf('async function _mealLoggedToday('));
    expect(body).toMatch(/require\('\.\/standDown'\)/);
    expect(body).toMatch(/return await isMealSatisfiedToday\(slot\);/);
    expect(body).toMatch(/catch \(_\) \{ return false; \}/);
  });
});

describe('scheduler.js and trainingReminders.js: the lay-time skips', () => {
  const SCH = read('lib/notifications/scheduler.js');
  const TR = read('lib/notifications/trainingReminders.js');

  test('the morning and evening loops skip today behind the weigh-in read, and name each day', () => {
    expect((SCH.match(/if \(weighedToday && dayKey === todayKey\) continue;/g) || []).length).toBe(2);
    expect((SCH.match(/const weighedToday = await isWeighInSatisfiedToday\(\);/g) || []).length).toBe(2);
    expect(SCH).toMatch(/data: \{ type: 'morning_weight', dayKey \},/);
    expect(SCH).toMatch(/data: \{ type: 'evening_weight', dayKey \},/);
  });

  test('meal reminders: the read runs after the ED gate; the run is dated, from tomorrow, bounded', () => {
    const fn = fnBody(SCH, 'export async function scheduleMealReminders(');
    expect(fn.indexOf('getOpenEdPatternFlag')).toBeGreaterThan(-1);
    expect(fn.indexOf('isMealSatisfiedToday(String(r.id), now.getTime())')).toBeGreaterThan(fn.indexOf('getOpenEdPatternFlag'));
    expect(SCH).toMatch(/export const MEAL_STAND_DOWN_RUN_DAYS = 3;/);
    const lay = fnBody(SCH, 'async function layMealReminder(');
    expect(lay).toMatch(/for \(let i = 1; i <= MEAL_STAND_DOWN_RUN_DAYS; i \+= 1\)/);
    expect(lay).toMatch(/\$\{NOTIF_ID_MEAL_PREFIX\}\$\{slot\}_d\$\{i\}/);
    expect(lay).toMatch(/data: \{ type: CATEGORY\.MEAL_LOG_REMINDER, slot, dayKey: localDayKey\(when\.getTime\(\)\) \}/);
    expect(lay).toMatch(/data: \{ type: CATEGORY\.MEAL_LOG_REMINDER, slot \}/);
  });

  test('relayMealRemindersFromPrefs reads the one preference key and goes through scheduleMealReminders', () => {
    const fn = fnBody(SCH, 'export function relayMealRemindersFromPrefs(');
    expect(fn).toMatch(/MEAL_REMINDERS_KEY/);
    expect(fn).toMatch(/scheduleMealReminders\(reminders\)/);
    expect(fn).toMatch(/if \(Platform\.OS === 'web'\) return Promise\.resolve\(\);/);
  });

  test('the check-in reminder names its day', () => {
    expect(SCH).toMatch(/data: \{ type: 'weekly_checkin', dayKey: localDayKey\(shiftedDate\.getTime\(\)\) \},/);
  });

  test('training reminders: today filtered behind the training read, each request names its day', () => {
    expect(TR).toMatch(/const trainedToday = await isTrainingSatisfiedToday\(\);/);
    expect(TR).toMatch(/\.filter\(\(fireAt\) => !\(trainedToday && localDayKey\(fireAt\.getTime\(\)\) === todayKey\)\)/);
    expect(TR).toMatch(/data: \{ type: 'training_reminder', channelId: TRAINING_REMINDER_CHANNEL, dayKey \},/);
  });
});

describe('the barrel exports the stand-down surface', () => {
  test('index.js', () => {
    const IX = read('lib/notifications/index.js');
    for (const name of ['isWeighInSatisfiedToday', 'isTrainingSatisfiedToday', 'isMealSatisfiedToday', 'standDownWeighIn', 'standDownTraining', 'standDownMeal', 'standDownCheckin', 'relayMealRemindersFromPrefs', 'MEAL_STAND_DOWN_RUN_DAYS']) {
      expect(IX).toContain(name);
    }
    expect(IX).toMatch(/\} from '\.\/standDown';/);
  });
});
