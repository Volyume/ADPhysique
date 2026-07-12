/**
 * Source-level regression guard — D44: superset/giant-set group-driven focus
 * changes get a cue.
 *
 * Founder report: "seems to swap exercise when there's still a set to do at
 * times without saying anything." Diagnosis (docs/ux-world-class-audit-
 * 2026-07-09/DECISIONS-2026-07-09.md, D44): the existing forward alternation
 * jump in handleCompleteSet (A1 -> B1) fired on any logged non-warmup set of
 * an earlier group member with ZERO cue - no haptic distinct from the
 * ordinary set-logged tick, no announcement, no visible sign. ALSO: nothing
 * returned focus to the group's first member once the last member's set was
 * logged, despite ActiveWorkoutScreen.giantSet.guard.test.js's own comment
 * asserting "next round from A" - the user was silently stranded on the
 * last member.
 *
 * RULING (D44): (a) every group-driven focus change - the forward jump AND
 * the new round-return - gets the cue treatment the target-reached advance
 * already had: a haptic distinct from setLogged (selection()), an
 * AccessibilityInfo.announceForAccessibility naming the destination
 * exercise, and a brief visible banner naming the destination; (b) logging
 * the last member's set moves focus back to the group's first member,
 * unless the exercise's own set target was JUST hit on that same set (the
 * existing next-exercise auto-advance still wins in that case - do not fight
 * it).
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface
 * (store, SQLite, notifications, Live Activity, haptics); mounting it is
 * impractical, so - matching this file's existing convention (reorder.guard,
 * supersetRest.guard, giantSet.guard, unilateral.guard, usability.guard,
 * nextExerciseButton.guard) - these are byte-level checks against the
 * source that pin the exact behaviour. The full on-device flow is in the
 * item's own checklist (component is not mounted, matching the other
 * guards' convention).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

// The whole handleCompleteSet body, from its declaration to the closing
// `}` that precedes the edit/delete section's comment header. Used to scope
// assertions below to this one function rather than matching anywhere in a
// ~4000-line file.
const handleCompleteSetWindow = SRC.match(
  /async function handleCompleteSet\(overrides = \{\}\) \{[\s\S]*?\n {2}\/\/ ─── Edit \/ delete an already-logged set/,
);

describe('D44: group-driven focus change gets a cue (source guard)', () => {
  test('handleCompleteSet is found and windowed for the assertions below', () => {
    expect(handleCompleteSetWindow).toBeTruthy();
  });
  const fn = handleCompleteSetWindow ? handleCompleteSetWindow[0] : '';

  test('a shared announceGroupFocusChange helper drives the cue (single source of truth for haptic + announce + banner, not duplicated per call site)', () => {
    expect(SRC).toContain('function announceGroupFocusChange(destIdx, sgi)');
    // Distinct from the ordinary set-logged tick (hapticsVocab.setLogged uses
    // _impact; selection() uses the separate _selection/selectionAsync
    // primitive) - see src/lib/haptics.js.
    expect(SRC).toMatch(/function announceGroupFocusChange\(destIdx, sgi\) \{[\s\S]*?hapticsVocab\.selection\(\)/);
    // Spoken cue, mirroring the existing "Set N logged" announce pattern.
    expect(SRC).toMatch(/function announceGroupFocusChange\(destIdx, sgi\) \{[\s\S]*?AccessibilityInfo\.announceForAccessibility\(message\)/);
    // Visible cue: a transient banner state, auto-cleared (not left stuck on
    // screen), same tracked-timeout idiom as logFlash/autoAdvance above it.
    expect(SRC).toMatch(/function announceGroupFocusChange\(destIdx, sgi\) \{[\s\S]*?setGroupFocusMessage\(message\)/);
    expect(SRC).toMatch(/function announceGroupFocusChange\(destIdx, sgi\) \{[\s\S]*?setTimeout\(\(\) => setGroupFocusMessage\(null\), 2500\)/);
  });

  test('the copy names the group kind (2 members: Superset, 3+: Giant set) and the destination exercise, no exclamation', () => {
    expect(SRC).toContain("const groupLabel = groupSize > 2 ? 'Giant set' : 'Superset';");
    expect(SRC).toContain('const message = `${groupLabel}: now ${destName}`;');
    expect(SRC).not.toMatch(/\$\{groupLabel\}: now \$\{destName\}!/);
  });

  test('the forward jump calls the cue helper with the destination it just jumped to, before returning', () => {
    expect(fn).toMatch(
      /setCurrentExerciseIndex\(pairIdx\);[\s\S]*?announceGroupFocusChange\(pairIdx, sgi\);\s*\n\s*return;/,
    );
  });

  test('warm-ups still never trigger the group jump (sgi/pairIdx stay gated on non-warmup)', () => {
    expect(fn).toMatch(
      /let sgi = null;\s*\n\s*let pairIdx = -1;\s*\n\s*if \(currentSet\.setType !== 'warmup'\) \{\s*\n\s*sgi = workoutExercises\[currentExerciseIndex\]\?\.supersetGroupId;/,
    );
  });

  test('the forward-only jump rule itself is unchanged (rest-parity source pin, same as supersetRest/giantSet guards)', () => {
    expect(fn).toMatch(
      /findIndex\(\(e, i\) => i > currentExerciseIndex && e\.supersetGroupId === sgi\)/,
    );
  });

  test('round-return: last member of the group (no later partner) moves focus to the FIRST member sharing the group id', () => {
    expect(fn).toMatch(
      /\} else if \(sgi != null && pairIdx < 0\) \{[\s\S]*?const firstIdx = workoutExercises\.findIndex\(e => e\.supersetGroupId === sgi\);/,
    );
    // Single-argument predicate (no index comparison at all) - distinct from
    // both the forward-only jump above and the banned order-agnostic match
    // the K-1 guard pins against, so this cannot regress the K-1 rest fix.
    expect(fn).not.toMatch(/findIndex\(\(e, i\) => i !== currentExerciseIndex && e\.supersetGroupId === sgi\)/);
    expect(fn).toMatch(
      /if \(firstIdx >= 0 && firstIdx !== currentExerciseIndex\) \{\s*\n\s*setCurrentExerciseIndex\(firstIdx\);[\s\S]*?announceGroupFocusChange\(firstIdx, sgi\);/,
    );
  });

  test('round-return sits in the else-if AFTER the justHitTarget auto-advance, so justHitTarget still wins when the group\'s own target completes on this set', () => {
    const justHitTargetIdx = fn.indexOf('if (justHitTarget && !isLastExercise) {');
    const roundReturnIdx = fn.indexOf('} else if (sgi != null && pairIdx < 0) {');
    expect(justHitTargetIdx).toBeGreaterThan(-1);
    expect(roundReturnIdx).toBeGreaterThan(justHitTargetIdx);
  });

  test('the K-1 rest timer call is untouched and still sits between the forward-jump return and the round-return branch', () => {
    const restIdx = fn.indexOf('startRestTimer(overrides.perSideCompound ? halfRestSeconds(fullRest) : fullRest);');
    const jumpReturnIdx = fn.indexOf('announceGroupFocusChange(pairIdx, sgi);');
    const roundReturnIdx = fn.indexOf('} else if (sgi != null && pairIdx < 0) {');
    expect(restIdx).toBeGreaterThan(jumpReturnIdx);
    expect(roundReturnIdx).toBeGreaterThan(restIdx);
  });

  test('the visible banner is rendered as the Now card context line and hidden from the accessibility tree (the spoken announcement already covers screen readers, so this avoids double narration)', () => {
    // RE-ANCHORED 2026-07-12 (R3 logger rebuild): the banner is now the Now
    // card's context line - the screen maps groupFocusMessage to the
    // top-priority context (kind 'group'), and NowCard applies the a11y
    // hiding for exactly that kind. Both halves pinned.
    expect(SRC).toMatch(/groupFocusMessage\s*\?\s*\{ kind: 'group', text: groupFocusMessage \}/);
    const fs = require('fs');
    const path = require('path');
    const NOWCARD = fs.readFileSync(path.resolve(__dirname, '../../components/workout/NowCard.js'), 'utf8');
    expect(NOWCARD).toMatch(/accessibilityElementsHidden=\{context\.kind === 'group'\}/);
    expect(NOWCARD).toMatch(/importantForAccessibility=\{context\.kind === 'group' \? 'no-hide-descendants' : 'auto'\}/);
  });

  test('finishPerSide (unilateral) has exactly one handleCompleteSet call site, so it inherits the cue with no separate wiring', () => {
    const calls = SRC.match(/handleCompleteSet\(\{/g) || [];
    // finishPerSide's own call plus the cluster-finish call (finishCluster);
    // neither duplicates the cue logic, both funnel through the one function.
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const finishPerSideWindow = SRC.match(/async function finishPerSide\(\) \{[\s\S]*?\n {2}\}/);
    expect(finishPerSideWindow).toBeTruthy();
    const finishPerSideCalls = (finishPerSideWindow[0].match(/handleCompleteSet\(/g) || []).length;
    expect(finishPerSideCalls).toBe(1);
  });
});
