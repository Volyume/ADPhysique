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
 */
import fs from 'fs';
import path from 'path';

const SCREEN = fs.readFileSync(
  path.resolve(__dirname, '..', 'screens', 'ActiveWorkoutScreen.js'),
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
    const opens = [...SCREEN.matchAll(/setShowWarmupRamp\(true\)/g)];
    expect(opens.length).toBeGreaterThanOrEqual(1);
    for (const m of opens) {
      // Walk back a short window and require an onPress binding — an open
      // inside an effect or render path has no such binding nearby. (The
      // window comfortably spans the warm-up anchor lines inside the handler.)
      const windowBefore = SCREEN.slice(Math.max(0, m.index - 400), m.index);
      expect(windowBefore).toMatch(/onPress=\{/);
      expect(windowBefore).not.toMatch(/useEffect\s*\(/);
    }
  });

  test('warm-up choices only prefill the entry as a warm-up; nothing is logged for the user', () => {
    // The row handler marks the entry setType 'warmup' via setCurrentSet…
    expect(SCREEN).toMatch(/setCurrentSet\(s => \(\{ \.\.\.s, weight: row\.weight, reps: row\.reps, setType: 'warmup', isGhost: false \}\)\)/);
    // …and the warm-up helper never calls the set-logging pipeline itself.
    const sheetStart = SCREEN.indexOf('B8: warm-up set helper');
    const sheetEnd = SCREEN.indexOf('Exercise overflow sheet');
    expect(sheetStart).toBeGreaterThanOrEqual(0);
    expect(sheetEnd).toBeGreaterThan(sheetStart);
    const sheet = SCREEN.slice(sheetStart, sheetEnd);
    expect(sheet).not.toMatch(/handleCompleteSetPress|createWorkoutSet|addSetToCurrentExercise/);
  });

  test('the active logger does not surface a plate calculator utility', () => {
    expect(SCREEN).not.toContain('Plate calculator');
    expect(SCREEN).not.toContain('showPlates');
    expect(SCREEN).not.toContain('calculatePlates');
  });
});
