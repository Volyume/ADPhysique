/**
 * CC33 W3 (D112 R5, closes audit finding T2-08).
 *
 * T2-08 (S2-T2-LIVE-TRACE.md): "Both ranked swap sheets filter blocked
 * candidates inside rankPersonalised and render no count, no reason, no
 * toggle (ActiveWorkoutScreen.js:5062-5090, RoutineDetailScreen.js:1138).
 * Empty state: 'No close matches yet / Search the full library instead.'
 * nearMissCandidates (resolve.js:336) is consumed only by
 * planAutoGen.js:702, never by a swap surface."
 *
 * This suite pins, in BOTH swap sheets (ActiveWorkoutScreen.js and
 * RoutineDetailScreen.js - the two surfaces the finding names):
 *  1. The narrowed count is computed over the STRUCTURAL candidate list
 *     (`ranked`, before rankPersonalised narrows it into `ordered`), via
 *     capabilityBlockReason - never over the already-narrowed list (that
 *     would always read zero, the exact silent-narrowing defect).
 *  2. The count is declared with a safe zero default OUTSIDE the try block
 *     (matching the file's own ordered/proposal resilience pattern), so a
 *     personalisation failure cannot leave a stale count from a previous
 *     open.
 *  3. The quiet line renders whenever narrowedCount > 0, independent of
 *     whether the visible list is empty.
 *  4. The empty state is overridden ONLY when the emptiness is capability-
 *     caused, and the existing "Search the full library instead." escape
 *     hatch is preserved beneath it (ActiveWorkoutScreen; RoutineDetail has
 *     no such subtitle to preserve - its footer button is unconditional).
 *  5. Ranking and filtering themselves are untouched (visibility only): the
 *     ranked/ordered/rankPersonalised call sites are byte-identical to
 *     before this change.
 *
 * Both screens are huge with live dependency surfaces (SQLite, navigation,
 * FlashList); matching each file's own existing guard-test convention,
 * these are byte-level checks against the real source.
 */
const fs = require('fs');
const path = require('path');

const ACTIVE_WORKOUT = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
const ROUTINE_DETAIL = fs.readFileSync(path.join(__dirname, '..', 'RoutineDetailScreen.js'), 'utf8');

function slice(src, startMarker, endMarker, fromIndex = 0) {
  const start = src.indexOf(startMarker, fromIndex);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end + endMarker.length);
}

describe.each([
  ['ActiveWorkoutScreen', ACTIVE_WORKOUT, 'async function handleOpenSwap() {', 'setShowSwapModal(true);\n  }'],
  ['RoutineDetailScreen', ROUTINE_DETAIL, 'async function handleOpenSwap(routineExercise, exercise) {', 'setSwapState({ routineExerciseId: routineExercise.id, exercise });\n  }'],
])('%s handleOpenSwap: narrowed count computed over the STRUCTURAL list', (name, SRC, startMarker, endMarker) => {
  const FN = slice(SRC, startMarker, endMarker);

  test('narrowedCount declared before the try, defaulting to 0 (safe-default pattern, matching ordered/proposal)', () => {
    const declIdx = FN.indexOf('let narrowedCount = 0;');
    const tryIdx = FN.indexOf('try {');
    expect(declIdx).toBeGreaterThan(-1);
    expect(tryIdx).toBeGreaterThan(declIdx);
  });

  test('counted with capabilityBlockReason over `ranked` (the pre-personalisation list), never `ordered`', () => {
    expect(FN).toContain("const { capabilityBlockReason } = require('../lib/capability/resolve');");
    expect(FN).toContain('narrowedCount = ranked.filter((c) => capabilityBlockReason(state.capability, c.exercise) !== null).length;');
    // The count line must read `ranked`, not the already-personalised `ordered`.
    const countLine = FN.slice(FN.indexOf('narrowedCount = ranked.filter'));
    expect(countLine.slice(0, 120)).not.toContain('ordered.filter');
  });

  test('guarded on a present, non-empty capability state - never runs against an empty/unavailable one', () => {
    expect(FN).toContain('if (state?.capability && !state.capability.empty) {');
  });

  test('setSwapNarrowedCount is called unconditionally after the try/catch, alongside setSwapCandidates', () => {
    const setCandidatesIdx = FN.lastIndexOf('setSwapCandidates(');
    const setNarrowedIdx = FN.indexOf('setSwapNarrowedCount(narrowedCount);');
    const catchIdx = FN.indexOf('} catch (_)');
    expect(setNarrowedIdx).toBeGreaterThan(catchIdx);
    expect(setNarrowedIdx).toBeGreaterThan(setCandidatesIdx);
  });
});

describe('ranking and filtering are byte-identical: visibility only, no behaviour change', () => {
  test('ActiveWorkoutScreen: rankSwaps/rankPersonalised call sites unchanged', () => {
    expect(ACTIVE_WORKOUT).toContain(
      "const ranked = rankSwaps(exercise, allExercises, { excludeIds: alreadyInWorkout, numResults: 20, excludeAssisted: !isBeginner, equipment: swapEquipment });",
    );
    expect(ACTIVE_WORKOUT).toContain('let ordered = ranked.slice(0, 8);');
    expect(ACTIVE_WORKOUT).toMatch(
      /ordered = rankPersonalised\(state, ranked, \{\s*fromExerciseId: exercise\?\.id,\s*routineId: activeWorkout\?\.routineId \?\? null,\s*\}\)\.slice\(0, 8\);/,
    );
  });

  test('RoutineDetailScreen: rankSwaps/rankPersonalised call sites unchanged', () => {
    expect(ROUTINE_DETAIL).toContain('let ordered = ranked.slice(0, 12);');
    expect(ROUTINE_DETAIL).toMatch(
      /ordered = rankPersonalised\(state, ranked, \{\s*fromExerciseId: exercise\?\.id, routineId,\s*\}\)\.slice\(0, 12\);/,
    );
  });
});

describe('the recovery-narrow full-library path (RoutineDetailScreen unresolved rows) reports zero narrowing', () => {
  test('setSwapNarrowedCount(0) accompanies the unfiltered full-library candidate set', () => {
    const block = slice(
      ROUTINE_DETAIL,
      'setSwapCandidates(allExercises.map(e => ({ exercise: e })));',
      'return;',
    );
    expect(block).toContain('setSwapNarrowedCount(0);');
  });
});

describe('ActiveWorkoutScreen swap sheet: quiet line + capability-aware empty state', () => {
  const modalBlock = slice(
    ACTIVE_WORKOUT,
    "Choose a close match for today. Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume.",
    'ListFooterComponent={',
  );

  test('the count line renders only when swapNarrowedCount > 0, singular/plural handled', () => {
    expect(modalBlock).toContain('{swapNarrowedCount > 0 ? (');
    expect(modalBlock).toContain("{swapNarrowedCount} movement{swapNarrowedCount === 1 ? '' : 's'} left out for how you train.");
  });

  test('the empty-state title swaps to the capability-aware line, with "Search the full library instead." kept beneath', () => {
    expect(modalBlock).toContain("{swapNarrowedCount > 0 ? 'No close matches inside how you train.' : 'No close matches yet'}");
    expect(modalBlock).toContain('Search the full library instead.');
  });
});

describe('RoutineDetailScreen swap sheet: quiet line + capability-aware empty state', () => {
  const modalBlock = slice(
    ROUTINE_DETAIL,
    'Choose a substitute. Your routine will be updated. Your set, rep and rest targets stay the same.',
    'ListFooterComponent={',
  );

  test('the count line renders only when swapNarrowedCount > 0, singular/plural handled', () => {
    expect(modalBlock).toContain('{swapNarrowedCount > 0 ? (');
    expect(modalBlock).toContain("{swapNarrowedCount} movement{swapNarrowedCount === 1 ? '' : 's'} left out for how you train.");
  });

  test('the empty-state text swaps to the capability-aware line when the narrowing caused it', () => {
    expect(modalBlock).toContain("{swapNarrowedCount > 0 ? 'No close matches inside how you train.' : 'No close matches yet.'}");
  });
});
