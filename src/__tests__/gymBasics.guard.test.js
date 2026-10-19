/**
 * gymBasics.guard.test.js — source guards for B8 (keep-awake, warm-up
 * helper) in ActiveWorkoutScreen.
 *
 * What this suite pins and why:
 *
 * 1. Keep-awake is FOCUS-scoped and tagged. Mount-scoped keep-awake would
 *    pin the display on while the user browses another tab mid-session
 *    (the Train stack keeps this screen mounted); an untagged deactivate
 *    could release a hold some other surface owns. Both are the kind of
 *    regression a refactor makes silently and no unit test of behaviour
 *    can see in the node environment, so the wiring itself is pinned.
 *
 * 2. The warm-up helper is PULL, never push. A recorded product decision
 *    (see the comment at the set-entry card) removed the old auto-suggest
 *    chip because it appeared uninvited on every first set and made no
 *    sense inside supersets. B8 deliberately ships the helper behind an
 *    explicit tap in the exercise overflow sheet. If setShowWarmupRamp(true)
 *    ever appears outside an onPress handler, the decision has been
 *    quietly reversed and this fails.
 *
 * 3. Founder decision 2026-10-19 overturns B8 for compound exercises only:
 *    an "Add warm-up sets" chip on the card lines up the whole ramp as
 *    warm-up rows ahead of the working sets. It is still a tap, never an
 *    automatic suggestion, and still logs nothing: each warm-up is logged by
 *    its own tick, and the working entry comes back after the last one. It
 *    never shows in a superset, a cluster or per-side work (why the old chip
 *    was removed), and it is gone once anything is logged on the exercise.
 */
import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.resolve(__dirname, '..', 'screens', 'ActiveWorkoutScreen.js'),
  'utf8'
);

// D228 item 9 (monolith first cut): the warm-up sheet and the overflow row that
// opens it moved to SessionSheets.js; the screen keeps the handlers.
const SHEETS = fs.readFileSync(
  path.resolve(__dirname, '..', 'components', 'workout', 'session', 'SessionSheets.js'),
  'utf8'
);

describe('B8 keep-awake wiring', () => {
  test('activation lives inside useFocusEffect, not a mount effect', () => {
    const focusIdx = SCREEN.indexOf('useFocusEffect(');
    expect(focusIdx).toBeGreaterThanOrEqual(0);
    const activateIdx = SCREEN.indexOf('activateKeepAwakeAsync(');
    expect(activateIdx).toBeGreaterThan(focusIdx);
    // The activate call sits within the focus effect's callback, before
    // the next top-level hook after it.
    const nextHook = SCREEN.indexOf('useEffect(', focusIdx);
    expect(activateIdx).toBeLessThan(nextHook === -1 ? SCREEN.length : nextHook);
  });

  test('activate and deactivate both carry the per-instance tag', () => {
    // The screen is registered in three stacks; expo-keep-awake tags are a
    // set, not ref-counted, so each mounted instance needs its OWN tag or
    // one instance's blur can release another's hold.
    expect(SCREEN).toMatch(/keepAwakeTagRef\.current = `\$\{KEEP_AWAKE_TAG\}-\$\{keepAwakeSeq\}`/);
    expect(SCREEN).toMatch(/activateKeepAwakeAsync\(tag\)/);
    expect(SCREEN).toMatch(/deactivateKeepAwake\(tag\)/);
    expect(SCREEN).not.toMatch(/activateKeepAwakeAsync\(\s*\)/);
    expect(SCREEN).not.toMatch(/deactivateKeepAwake\(\s*\)/);
  });

  test('activation is best-effort (a refusing device must not crash the logger)', () => {
    expect(SCREEN).toMatch(/activateKeepAwakeAsync\(tag\)\.catch\(\(\) => \{\}\)/);
  });

  test('the always-on useKeepAwake hook form is not used', () => {
    // useKeepAwake() is mount-scoped with no tag — exactly the two
    // properties this guard exists to keep out.
    expect(SCREEN).not.toMatch(/\buseKeepAwake\s*\(/);
  });
});

describe('B8 warm-up helper stays pull-only', () => {
  test('the recorded no-auto-suggest decision comment is still present', () => {
    expect(SCREEN).toMatch(/Warm-ups are no longer auto-suggested/);
  });

  test('the warm-up helper opens only from explicit onPress handlers', () => {
    const opens = [...SCREEN.matchAll(/setShowWarmupRamp\(true\)/g)].map((m) => [SCREEN, m])
      .concat([...SHEETS.matchAll(/setShowWarmupRamp\(true\)/g)].map((m) => [SHEETS, m]));
    expect(opens.length).toBeGreaterThanOrEqual(1);
    for (const [SRCTEXT, m] of opens) {
      // Walk back a short window and require an onPress binding — an open
      // inside an effect or render path has no such binding nearby. (The
      // window comfortably spans the warm-up anchor lines inside the handler.)
      const windowBefore = SRCTEXT.slice(Math.max(0, m.index - 400), m.index);
      expect(windowBefore).toMatch(/onPress=\{/);
      expect(windowBefore).not.toMatch(/useEffect\s*\(/);
    }
  });

  test('warm-up choices only prefill the entry as a warm-up; nothing is logged for the user', () => {
    // The row handler marks the entry setType 'warmup' via setCurrentSet…
    expect(SHEETS).toMatch(/setCurrentSet\(s => \(\{ \.\.\.s, weight: row\.weight, reps: row\.reps, setType: 'warmup', isGhost: false \}\)\)/);
    // …and the warm-up helper never calls the set-logging pipeline itself.
    const sheetStart = SHEETS.indexOf('B8: warm-up set helper');
    const sheetEnd = SHEETS.indexOf('Exercise overflow sheet');
    expect(sheetStart).toBeGreaterThanOrEqual(0);
    expect(sheetEnd).toBeGreaterThan(sheetStart);
    const sheet = SHEETS.slice(sheetStart, sheetEnd);
    expect(sheet).not.toMatch(/handleCompleteSetPress|createWorkoutSet|addSetToCurrentExercise/);
  });

  test('the active logger does not surface a plate calculator utility', () => {
    expect(SCREEN).not.toContain('Plate calculator');
    expect(SCREEN).not.toContain('showPlates');
    expect(SCREEN).not.toContain('calculatePlates');
  });
});

describe('Add warm-up sets chip (founder decision 2026-10-19)', () => {
  const at = SCREEN.indexOf('const canAddWarmups =');
  const gate = SCREEN.slice(at, SCREEN.indexOf(';', at));
  const handler = SCREEN.slice(SCREEN.indexOf('function handleAddWarmups()'), SCREEN.indexOf('// The bar\'s last action on the next row'));
  const advance = SCREEN.slice(SCREEN.indexOf("} else if (warmupQueue && warmupQueue.exerciseId"), SCREEN.indexOf('} catch (postSaveError)'));

  test('compound weighted work only, before anything is logged on the exercise', () => {
    expect(gate).toMatch(/exercise\.compoundIsolation === 'compound'/);
    expect(gate).toMatch(/setTableKind === 'weight_reps'/);
    expect(gate).toMatch(/loggedSets\.length === 0/);
  });

  test('never in a superset, a cluster or per-side work', () => {
    expect(gate).toMatch(/currentSGI == null && !cluster && !perSide/);
    expect(gate).toMatch(/!isClusterType\(currentSet\.setType\)/);
    expect(gate).toMatch(/!unilateralExercises\.has\(exercise\.id\)/);
  });

  test('it opens only from a tap', () => {
    expect(SCREEN).toMatch(/<Chip\s+label="Add warm-up sets"[\s\S]{0,80}onPress=\{handleAddWarmups\}/);
    expect(SCREEN.match(/handleAddWarmups\(\)/g)).toHaveLength(1); // its definition; no other caller
  });

  test('the chip and each step only fill the entry as a warm-up; nothing is logged for the user', () => {
    expect(handler).toMatch(/setType: 'warmup'/);
    expect(handler).not.toMatch(/handleCompleteSetPress|createWorkoutSet|addSetToCurrentExercise/);
    expect(advance).toMatch(/setType: 'warmup'/);
    expect(advance).not.toMatch(/handleCompleteSetPress|createWorkoutSet|addSetToCurrentExercise/);
  });

  test('after the last warm-up the working entry returns as it was seeded', () => {
    expect(advance).toMatch(/setType: 'straight', isGhost: resume\.isGhost/);
  });

  test('a working set or a new exercise clears the lined-up warm-ups', () => {
    expect(SCREEN).toMatch(/if \(currentSet\.setType !== 'warmup'\) \{\s*\/\/[^\n]*\n\s*if \(warmupQueue\) setWarmupQueue\(null\);/);
    expect(SCREEN).toMatch(/rampAnchorRef\.current = null;\s*setWarmupQueue\(null\);\s*\}, \[currentExerciseIndex\]\);/);
  });
});
