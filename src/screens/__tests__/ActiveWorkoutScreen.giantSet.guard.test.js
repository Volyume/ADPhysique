/**
 * Guard: the live session runs a 3+ giant set (campaign item 21) correctly.
 *
 * Campaign item 21 (docs/ux-world-class-audit-2026-07-09/
 * CAMPAIGN-2026-07-10-APPROVED-SLATE.md) extends supersets to giant sets. The
 * live session already keys off a shared supersetGroupId; the auto-jump finds
 * the NEXT LATER member (K-1 fix, pinned by
 * ActiveWorkoutScreen.supersetRest.guard.test.js), which for a group of N gives
 * A -> B -> C -> (no later member -> rest -> next round from A). This suite pins:
 * (dated note, 2026-07-11: "next round from A" was aspirational when this
 * comment was first written - nothing actually returned focus to A at the
 * time. D44 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md)
 * built the round-return, pinned by ActiveWorkoutScreen.groupFocusCue.guard
 * .test.js; the comment is now literally true.)
 *   1. the cycling ORDER for a 3-exercise group, by re-deriving the exact rule
 *      the screen uses (independent re-derivation, NOT a re-export) over a
 *      3-member fixture; and
 *   2. rest PARITY: rest fires only after the LAST member of the group, exactly
 *      as for a pair (the forward-only jump means the last member has no later
 *      partner, so the code falls through to the rest timer); and
 *   3. the display generalised to a group: the chip lists ALL partners and the
 *      heads-up renders one numbered row per member, not a hardcoded two.
 * The full on-device flow is in the item-21 checklist (component is not mounted,
 * matching the supersetRest guard's convention).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

// Independent re-derivation of the screen's superset auto-jump rule
// (ActiveWorkoutScreen.js: findIndex((e, i) => i > currentExerciseIndex &&
// e.supersetGroupId === sgi)). Returns the next index to jump to, or -1 when the
// current exercise is the last member of its group (which is when rest fires).
function nextGroupMember(exercises, currentIndex) {
  const sgi = exercises[currentIndex]?.supersetGroupId;
  if (sgi == null) return -1;
  return exercises.findIndex((e, i) => i > currentIndex && e.supersetGroupId === sgi);
}

describe('giant-set session cycling order and rest parity', () => {
  const gid = 'ss-giant';
  // A 3-exercise giant set laid out adjacently, as the builder persists it.
  const giantSet = [
    { supersetGroupId: gid }, // A @0
    { supersetGroupId: gid }, // B @1
    { supersetGroupId: gid }, // C @2
    { supersetGroupId: null }, // an unrelated later exercise
  ];

  test('a round cycles A -> B -> C in order', () => {
    expect(nextGroupMember(giantSet, 0)).toBe(1); // A -> B
    expect(nextGroupMember(giantSet, 1)).toBe(2); // B -> C
  });

  test('rest fires only after the LAST member (parity with a pair)', () => {
    // C is the last member: no later partner, so the screen falls through to the
    // rest timer rather than jumping - the between-round rest, same as a pair.
    expect(nextGroupMember(giantSet, 2)).toBe(-1);
  });

  test('an earlier member never rests mid-round (forward jump, no rest)', () => {
    // A and B both have a later partner, so they jump WITHOUT resting.
    expect(nextGroupMember(giantSet, 0)).toBeGreaterThan(-1);
    expect(nextGroupMember(giantSet, 1)).toBeGreaterThan(-1);
  });

  test('the forward-only jump rule the screen uses is intact (rest parity source pin)', () => {
    expect(SRC).toMatch(
      /findIndex\(\(e, i\) => i > currentExerciseIndex && e\.supersetGroupId === sgi\)/,
    );
  });

  test('the in-session chip lists ALL partners, not a single name', () => {
    expect(SRC).toContain('alternates with {partnerNamesText}');
    // partnerNames collects every OTHER member of the group.
    expect(SRC).toContain('.filter((e, i) => i !== currentExerciseIndex && e.supersetGroupId === currentSGI)');
  });

  test('the heads-up renders one numbered row per member (not a hardcoded pair)', () => {
    expect(SRC).toContain('(supersetHeadsUp?.memberNames ?? []).map((memberName, memberIdx) =>');
    // The old two-name-only fields must be gone.
    expect(SRC).not.toContain('exerciseAName');
    expect(SRC).not.toContain('exerciseBName');
  });
});
