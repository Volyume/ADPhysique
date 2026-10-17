/**
 * Source guards for the 2026-10-17 final-audit fixes (rendering these screens
 * is impractical, so each pins the mechanism in the source):
 *   A1/A3/A6  ActiveWorkoutScreen: pending deletes, Finish anyway, Undo toast
 *   A4/A5     HomeScreen: one request id, pulled-data reload only when focused
 *   A2        Community conversation + group chat: merge outside the updater
 *   C5        week ends use localWeekEndMs (DST safe)
 *   C6        History + Exercise detail reload on focus
 *   C4        Nutrition targets: energy unit
 */
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const body = (src, startMarker, endMarker) => {
  const a = src.indexOf(startMarker);
  expect(a).toBeGreaterThan(-1);
  const b = endMarker ? src.indexOf(endMarker, a + startMarker.length) : src.length;
  return src.slice(a, b);
};

describe('ActiveWorkoutScreen (A1, A3, A6)', () => {
  const src = read('ActiveWorkoutScreen.js');

  test('A1: changing a set type commits pending deletes before anything else', () => {
    const fn = body(src, 'async function handleChangeLoggedSetType', 'const oldType');
    expect(fn).toContain('await flushPendingDeletes()');
  });

  test('A1: logging a set commits pending deletes once the new set is stored, never before the save', () => {
    const before = body(src, 'async function handleCompleteSet', 'await createWorkoutSet({');
    expect(before).not.toContain('flushPendingDeletes');
    const after = body(src, 'setPersisted = true;', 'const setData = {');
    expect(after).toContain('await flushPendingDeletes()');
  });

  test('A3: Finish anyway is read and cleared only after the saving and finishing guards', () => {
    const fn = body(src, 'async function handleFinishWorkout', 'await flushPendingDeletes()');
    const saving = fn.indexOf('if (saving) return;');
    const finishing = fn.indexOf('if (finishingRef.current) return;');
    const read1 = fn.indexOf('skipEndedEarlyConfirmRef.current;');
    const clear = fn.indexOf('skipEndedEarlyConfirmRef.current = false');
    expect(saving).toBeGreaterThan(-1);
    expect(finishing).toBeGreaterThan(saving);
    expect(read1).toBeGreaterThan(finishing);
    expect(clear).toBeGreaterThan(read1);
  });

  test('A6: the Undo toast is keyed and hidden when anything but its timeout commits the delete', () => {
    expect(src).toMatch(/key: `set-delete-\$\{target\.id\}`/);
    const commit = body(src, 'async function commitPendingDelete', 'await deleteWorkoutSet');
    expect(commit).toMatch(/fromToast = false/);
    expect(commit).toMatch(/if \(!fromToast\)[\s\S]*toast\.hide\?\.\(`set-delete-\$\{setId\}`\)/);
    expect(src).toContain('commitPendingDelete(target.id, true)');
  });
});

describe('HomeScreen (A4, A5)', () => {
  const src = read('HomeScreen.js');

  test('A4: logging a weight takes one request id and hands it to both reads', () => {
    const fn = body(src, 'async function handleLogWeight', 'toast.show(');
    expect(fn).toMatch(/const weighReqId = \+\+loadReqRef\.current/);
    expect(fn).toContain('loadTodayWeight(weighReqId)');
    expect(fn).toContain('loadFirstReviewFacts(weighReqId)');
    expect(fn).not.toMatch(/loadTodayWeight\(\)/);
    expect(fn).not.toMatch(/loadFirstReviewFacts\(\)/);
  });

  test('A5: the pulled-data effect skips its first run and only reloads while focused', () => {
    const fx = body(src, 'if (pulledFirstRunRef.current)', '[dataPulledVersion]');
    expect(fx).toContain('pulledFirstRunRef.current = false');
    expect(fx).toMatch(/if \(!homeFocusedRef\.current\) \{ pulledWhileAwayRef\.current = true; return; \}/);
    expect(fx.indexOf('homeFocusedRef')).toBeLessThan(fx.indexOf('loadDataRef.current'));
    // The focus effect sets and clears the flag, and a focus reload covers a pull that landed away.
    expect(src).toMatch(/homeFocusedRef\.current = true;\s*return \(\) => \{ homeFocusedRef\.current = false; \};/);
    expect(src).toContain('pulledWhileAwayRef.current = false;');
  });
});

describe('Community conversation and group chat (A2)', () => {
  for (const file of ['CommunityConversationScreen.js', 'CommunityGroupChatScreen.js']) {
    test(`${file}: no state updater writes the cursor, and merges read the messages ref`, () => {
      const src = read(file);
      // No setMessages(updater) whose body touches the cursor.
      const updaters = src.match(/setMessages\(\(prev\) => \{[\s\S]*?\n\s*\}\);/g) ?? [];
      for (const u of updaters) expect(u).not.toMatch(/setCursor|cursorRef/);
      expect(src).toContain('mergeNewestPage(messagesRef.current, cursorRef.current');
      expect(src).not.toMatch(/mergeNewestPage\(prev,/);
      // setMessages is the ref-synced wrapper over the state setter.
      expect(src).toMatch(/\[messages, setMessagesState\] = useState/);
    });
  }
});

describe('Week ends (C5)', () => {
  test('WorkoutSummaryScreen and WeeklyCheckInScreen use localWeekEndMs, not start + 7 x 24 h', () => {
    const summary = read('WorkoutSummaryScreen.js');
    expect(summary).toContain('localWeekEndMs(sessionWeekStart)');
    expect(summary).not.toMatch(/sessionWeekStart \+ weekMs/);
    const checkin = read('WeeklyCheckInScreen.js');
    expect(checkin).toContain('getWeeklyVolumeByMuscle(user.id, 2, localWeekEndMs(weekStartMs))');
    expect(checkin).not.toMatch(/weekStartMs \+ 7 \* 86400000/);
  });
});

describe('Reload on focus (C6)', () => {
  test('WorkoutHistoryScreen and ExerciseDetailScreen load through useFocusEffect', () => {
    const hist = read('WorkoutHistoryScreen.js');
    expect(hist).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*loadWorkouts\(\{ quiet: loadedOnceRef\.current \}\)/);
    const ex = read('ExerciseDetailScreen.js');
    expect(ex).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*if \(exerciseId\) \{\s*loadData\(\{ quiet: loadedOnceRef\.current \}\)/);
  });

  test('a later (quiet) load never shows the spinner or wipes the screen on failure', () => {
    const hist = body(read('WorkoutHistoryScreen.js'), 'async function loadWorkouts', 'async function');
    expect(hist).toMatch(/if \(!quiet\) \{\s*setLoading\(true\)/);
    expect(hist).toMatch(/if \(!quiet\) setLoadError\(true\)/);
    const ex = body(read('ExerciseDetailScreen.js'), 'async function loadData', 'function showCongratsBanner');
    expect(ex).toMatch(/if \(!quiet\) \{\s*setLoadingExercise\(true\)/);
    expect(ex).toMatch(/if \(!quiet\) \{\s*setExercise\(null\);\s*setLoadError\('read_failed'\)/);
  });
});

describe('Energy unit on the nutrition targets screen (C4)', () => {
  test('carb-kcal prose and the macro percent line use the person\'s unit', () => {
    const src = read('NutritionTargetsScreen.js');
    expect(src).not.toMatch(/\$\{carbKcal\} kcal/);
    expect(src).not.toContain('% of kcal`');
    expect(src).toContain('% of ${energyUnitLabel(energyUnit)}`');
    expect(src).toContain('${formatEnergy(carbKcal, energyUnit)} ${energyUnitLabel(energyUnit)}');
  });
});
