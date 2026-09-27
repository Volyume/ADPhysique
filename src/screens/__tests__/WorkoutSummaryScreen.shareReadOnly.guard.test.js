/**
 * WorkoutSummaryScreen.shareReadOnly.guard.test.js
 *
 * WAVE-D-FINDINGS.md IA_DEFECT (:1811, lead ruling item 3): a past session
 * opened from WorkoutHistoryScreen (readOnly view) had NO share affordance
 * at all, permanently -- unlike every other progress surface in the app,
 * which treats "share your own evidence" as a standing capability. The
 * sticky footer's Share button was gated `!readOnly && displayWorkingSets >
 * 0`, and handleShareCard read `exerciseData` (the live-only route param,
 * always [] in readOnly since WorkoutHistoryScreen's navigate call never
 * supplies it).
 *
 * THE FIX: handleShareCard now reads `readOnlyExerciseData` (the SAME
 * shape topSetFromExerciseData expects, [{ name, loggedSets }], already
 * loaded for the on-screen exercise list at :1369) when `readOnly` is true,
 * and the `!readOnly` guard is dropped from the footer button. `detectedPRs`
 * stays at its route-params default ([]) in readOnly -- a degrade, not a
 * crash (topSetFromExerciseData([]) returns null; detectedPRs.length is
 * naturally 0), matching the findings' own confirmation of this shape.
 * GDPR posture is unaffected: this is the training-session share card
 * (sessionData/readOnlyExerciseData carry no body data), and the same
 * navigate('ShareCard', { sessionData, ... }) 'session' path opens in both
 * readOnly and live mode -- no new or ambiguous share path.
 *
 * 2026-09-27, founder, of a workout shared from history: "add back in PRs",
 * and the comparison lines were missing too. The degrade above is replaced:
 * a history open works the workout's own records out again with the
 * logger's rules (pastWorkoutPRs, against each exercise's sets from before
 * the workout) and its comparison against the 4 weeks before it, for the
 * share only; the history summary itself shows neither, as before.
 *
 * Source guards, matching this file's own established convention
 * (WorkoutSummaryScreen.cohesionLinks.guard.test.js): the screen's real
 * data loads make a full render harness fragile.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('WorkoutSummaryScreen Share is reachable from a read-only (history) session (WAVE-D IA_DEFECT)', () => {
  test('the sticky-footer Share button no longer excludes readOnly', () => {
    expect(SOURCE).toMatch(/\{displayWorkingSets > 0 && \(/);
    expect(SOURCE).not.toMatch(/\{!readOnly && displayWorkingSets > 0 && \(/);
  });

  test('handleShareCard reads readOnlyExerciseData in readOnly mode, exerciseData in live mode', () => {
    expect(SOURCE).toMatch(
      /const shareExerciseData = readOnly \? readOnlyExerciseData : exerciseData;/,
    );
    expect(SOURCE).toMatch(/const topSet = topSetFromExerciseData\(shareExerciseData\);/);
    // The old defect: reading the live-only param unconditionally.
    expect(SOURCE).not.toMatch(/const topSet = topSetFromExerciseData\(exerciseData\);/);
  });

  test('the same session ShareCard path is used in both modes -- no new or ambiguous share destination', () => {
    // Community entry point 7 (social-discovery blueprint section 1,
    // 2026-09-06) added `workoutId` to this ONE call so ShareCard can offer
    // "Post to Community" for the same session. The pin's subject is
    // unchanged: there is still exactly one navigate('ShareCard', ...) here,
    // it still carries sessionData/prData/prList, and readOnly and live mode
    // still share it. ShareCard's own card build never reads workoutId.
    expect(SOURCE).toMatch(
      /navigation\.navigate\('ShareCard', \{ sessionData, workoutId, prData, prList: sharePRs \}\);/,
    );
  });

  test("a history share carries the workout's own records and comparison, worked out as at the finish", () => {
    expect(SOURCE).toMatch(/const sharePRs = readOnly \? historyPRs : detectedPRs;/);
    expect(SOURCE).toMatch(/const shareComp = readOnly \? shareComparison : comparison;/);
    expect(SOURCE).toMatch(/prCount: sharePRs\.length,/);
    expect(SOURCE).toMatch(/const prData = sharePRs\.length > 0 \? sharePRs\[0\] : null;/);
    expect(SOURCE).toMatch(/highlightOptions: shareHighlightOptions\(\{ comparison: shareComp,/);
    // The old degrade: a history share offered no comparison at all.
    expect(SOURCE).not.toMatch(/highlightOptions: readOnly \? \[\]/);
    // The records: the logger's rules, against each exercise's sets from
    // before the workout's first set.
    expect(SOURCE).toMatch(/setHistoryPRs\(pastWorkoutPRs\(\{/);
    expect(SOURCE).toMatch(/\.filter\(\(r\) => Number\(r\.createdAt \?\? r\.created_at\) < cutoff\)/);
    // The comparison: only sessions that started before this one.
    expect(SOURCE).toMatch(/const prior = readOnly \? rows\.filter\(\(r\) => Number\(r\.startedAt\) < refMs\) : rows;/);
    expect(SOURCE).toMatch(/const store = readOnly \? setShareComparison : setComparison;/);
  });

  test('readOnlyExerciseData is loaded for the read-only view before Share can be tapped (same source as the on-screen exercise list)', () => {
    expect(SOURCE).toMatch(/const \[readOnlyExerciseData, setReadOnlyExerciseData\] = useState\(\[\]\);/);
    expect(SOURCE).toMatch(/setReadOnlyExerciseData\(grouped\);/);
    // The on-screen exercise list's existing readOnly fallback (:1369-ish),
    // the precedent this fix mirrors.
    expect(SOURCE).toMatch(/const display = readOnly\s*\n\s*\? readOnlyExerciseData/);
  });
});
