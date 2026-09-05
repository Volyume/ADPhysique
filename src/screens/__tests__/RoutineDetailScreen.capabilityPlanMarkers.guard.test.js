/**
 * CC33 W3 (D112 R5, closes audit finding T2-32).
 *
 * T2-32 (S2-T2-LIVE-TRACE.md): "section 14 step 3 requires declined slots
 * 'visibly conflicted with swap shortcuts' - exists only in-session (status
 * strip, ActiveWorkoutScreen.js:3660-3684). RoutineDetailScreen.js has NO
 * capability rendering (grep: two hits, both comments). Plan view and
 * session view disagree with no explanation."
 *
 * This suite pins:
 *  1. capabilityPlanCaption's copy and precedence: episode conflicts
 *     checked before baseline; the episode branch further splits on
 *     whether every driving rule is 'applied' (matches effective.js's own
 *     `conflicts.every((c) => c.row?.effectiveChoice === 'applied')` law).
 *  2. The row resolves the FULL library exercise by id (routine rows carry
 *     partial exercise objects without demand columns), reusing the same
 *     byId-map pattern handleOpenSwap already uses, not a fresh fetch.
 *  3. The capability lane's own vocabulary is used - NEVER the preference
 *     lane's "set aside" (T1-19/T2-33's exact regression: the two lanes
 *     sharing one verb for opposite meanings).
 *  4. No new button: the marker is plain text; the row's existing Swap
 *     icon (already wired to handleOpenSwap) is the only action path.
 *  5. capState prefers the screen's own intentState.capability and only
 *     lazy-loads its own fallback when that has not resolved yet.
 *
 * RoutineDetailScreen.js is a huge screen with a live dependency surface
 * (SQLite, navigation, DragReorderList); matching this file's own existing
 * convention (RoutineDetailScreen.swapPickerHandoff.guard.test.js and
 * siblings), these are byte-level checks against the real source.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

function extractFunction(src, signature) {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n}\n', start) + 2;
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('capabilityPlanCaption: copy and precedence (T2-32)', () => {
  const FN = extractFunction(SRC, 'function capabilityPlanCaption(capState, exercise, serveOutcome = null) {');

  test('fails safe: no capState, an empty state, or no exercise all return null before touching the resolver', () => {
    expect(FN).toContain('if (!capState || capState.empty || !exercise) return null;');
  });

  test('reads the decision layer via a lazy require of capability/effective.js', () => {
    expect(FN).toContain("const { episodeConflicts, baselineConflicts, constraintNoticeKind } = require('../lib/capability/effective');");
  });

  test('R16-1: the RANKING is constraintNoticeKind - one driven answer shared with the in-session notice', () => {
    // The round-15 extraction did not reach this caption, so its inline
    // chain kept the pre-round-15 order: a held-only episode set
    // outranked a definite BASELINE conflict here ("Held as-is at your
    // request." with the standing permanent conflict never spoken on
    // the very surface built to resolve it) while the session strip
    // said the opposite about the same row. A source-ORDER pin sat
    // here and passed over that; the ranking's truth table is driven
    // in capabilityAdherence.test.js, and this asserts only the
    // consumption.
    expect(FN).toContain('const { kind, drivingEpisode } = constraintNoticeKind({');
    expect(FN).toContain('hasMarker: false, episodeConflicts: episode, baselineConflicts: baseline,');
    expect(FN).not.toMatch(/definiteEpisode\.every/);
  });

  test('episode: the applied test runs over the DRIVING rows - serve\'s own gate, via the helper', () => {
    // F4 (adversarial review): the caption speaks only from established
    // conflicts. Round 4 (F-3): AND the applied test excludes held
    // rules, exactly as serve does - since R16-1 that list IS the
    // helper's drivingEpisode, so the two surfaces cannot diverge on
    // what counts as actionable.
    expect(FN).toContain("const allApplied = drivingEpisode.every((c) => c.row?.effectiveChoice === 'applied');");
    expect(FN).toContain("if (!allApplied) return 'Sits outside your temporary change.';");
  });

  test('R5-7: the applied caption speaks SERVE\'s answer - swapped, left out, or the no-promise line - never a blanket promise', () => {
    // Round 5: "Swapped in sessions" used to be returned off the applied
    // test alone, on rows serve would OMIT (no eligible substitute) or
    // serve untouched (the fully-omitted fail-safe). The caption now
    // branches on the serve outcome the screen's memo computed, and a
    // null/unresolved outcome falls to the honest middle line rather
    // than a promise.
    expect(FN).toContain("if (serveOutcome === 'substituted') return 'Swapped in sessions while your change lasts.';");
    expect(FN).toContain("if (serveOutcome === 'omitted') return 'Left out of sessions while your change lasts, with nothing forced in its place.';");
    expect(FN).toContain("return 'Sits outside your temporary change.';");
    // The promise is never unconditional: no bare ternary hands
    // "Swapped" to every applied row any more.
    expect(FN).not.toMatch(/allApplied\s*\?\s*'Swapped in sessions/);
  });

  test('baseline conflicts get the limitation line only when DEFINITE; unknown-only rows get the honest not-known line', () => {
    expect(FN).toContain('if (kind === \'baseline\') return "Clashes with an injury or limitation you\'ve set.";');
    expect(FN).toContain('"Volyume couldn\'t check this against your limitations yet."');
  });

  test('a resolver throw is caught and answered with null, never a crash', () => {
    expect(FN).toMatch(/catch \(_e\) \{\s*return null;\s*\}/);
  });

  test('NEVER uses the preference lane\'s "set aside" vocabulary (closes T1-19/T2-33 on this surface)', () => {
    expect(FN.toLowerCase()).not.toContain('set aside');
  });
});

describe('the row resolves the FULL library exercise by id, not the partial routine row (T2-32)', () => {
  test('an allExercisesById map exists at component scope, built from the allExercises state the screen already loads', () => {
    expect(SRC).toMatch(
      /const allExercisesById = useMemo\(\s*\(\) => new Map\(allExercises\.map\(\(e\) => \[e\.id, e\]\)\),\s*\[allExercises\],\s*\);/,
    );
  });

  test('the row caption resolves through that map before calling capabilityPlanCaption', () => {
    // Lead tighten (W3 review): the original `?? exercise` fallback let a
    // row the library could not resolve be judged from its PARTIAL
    // embedded object - no demand columns, so every axis reads
    // unknown-conflict and an unresolved row earned a caption it could
    // not honestly carry. Only a full library row is judged now; a miss
    // renders no marker at all. Same pinned intent, stricter shape.
    expect(SRC).toContain('const fullRow = allExercisesById.get(exercise.id);');
    expect(SRC).toContain('capabilityServeOutcomes?.get(routineExercise.id) ?? null,');
    expect(SRC).not.toMatch(/capabilityPlanCaption\(planCapState, [^)]*\?\? exercise\)/);
  });

  test('R5-7/I4: the serve outcomes come from ONE hoisted memo running serve\'s own computation, never per row', () => {
    // bestEligibleSubstitute scans the library, so the substitute
    // question may not be asked inline in a list row (I4). The memo runs
    // computeEffectiveSession - taken-set and all - under the EXPORTED
    // composed senior question (one answer, five consumers), and mirrors
    // serve's never-served-empty fail-safe so a fully-omitted session's
    // rows read as served, not "left out".
    expect(SRC).toContain('const capabilityServeOutcomes = useMemo(() => {');
    expect(SRC).toContain("const { computeEffectiveSession, EFFECTIVE_EFFECT } = require('../lib/capability/effective');");
    expect(SRC).toContain("const { substituteSeniorQuestion } = require('../lib/sessionEffective');");
    expect(SRC).toContain('substituteSeniorQuestion(planCapState, intentState),');
    expect(SRC).toContain('const failSafe = view.lines.length > 0');
    expect(SRC).toContain('&& view.lines.every((l) => l.effect === EFFECTIVE_EFFECT.OMITTED);');
    expect(SRC).toContain("if (failSafe) { out.set(reId, 'served'); return; }");
    // Serve's own gate: no applied episode rule, no outcomes (and so no
    // swapped/left-out claims) at all.
    expect(SRC).toContain(".some((r) => r.role === 'episode' && r.effectiveChoice === 'applied');");
    expect(SRC).toContain('}, [planCapState, intentState, exercises, allExercises, allExercisesById]);');
  });

  test('R6-2 (round 6): the plan view re-reads on FOCUS, so captions never speak a pre-capture answer', () => {
    // The screen stays mounted in the Plans stack while the user trains
    // in another tab; an episode captured mid-session left the caption
    // memo speaking a stale answer with no refresh path short of
    // popping the screen. The focus listener re-runs both loaders; the
    // memo recompute costs under a millisecond (round-6 review
    // measurement).
    const fn = SRC.match(/navigation\.addListener\('focus'[\s\S]{0,500}/)?.[0] ?? '';
    expect(fn).toContain('loadRoutine()');
    expect(fn).toContain('refreshIntentState()');
  });

  test('B3 (round 8): the mount-adjacent focus is deduped by a burst window - a genuine return ALWAYS reloads', () => {
    // Round 7's isFocused() arming misfired both ways (the round-8
    // review read the navigation source): on a push the state already
    // names the route focused when effects run, so the mount
    // double-load survived; mounted unfocused, the first genuine focus
    // was swallowed - the exact staleness R6-2 closed. The burst
    // window's failure mode is one extra load, never staleness.
    expect(SRC).toContain('lastMountLoadAtRef.current = Date.now();');
    expect(SRC).toContain('if (Date.now() - lastMountLoadAtRef.current < 800) return;');
    expect(SRC).not.toContain('navigation.isFocused()');
  });
});

describe('capState source: the screen\'s own intent state first, a lazy fallback only until that resolves', () => {
  test('planCapState prefers intentState.capability, falls back to a locally-loaded state, else null', () => {
    expect(SRC).toContain('const planCapState = intentState?.capability ?? fallbackCapState ?? null;');
  });

  test('the fallback effect loads nothing once intentState.capability is already present', () => {
    expect(SRC).toContain('if (intentState?.capability || !user?.id) return undefined;');
  });

  test('the fallback loader is capability/resolve.js loadCapabilityResolveState, lazily required', () => {
    expect(SRC).toMatch(
      /const \{ loadCapabilityResolveState \} = require\('\.\.\/lib\/capability\/resolve'\);\s*\n\s*const state = await loadCapabilityResolveState\(user\.id, \{\}\);/,
    );
  });
});

describe('rendered as plain text under the row; the existing Swap icon stays the only action (no new button)', () => {
  const rowStart = SRC.indexOf('const renderExerciseRow = ({ item: { routineExercise, exercise }, index }) => (');
  const rowEnd = SRC.indexOf('\n  );\n\n  const addExerciseFooter', rowStart);
  const rowBlock = (rowStart >= 0 && rowEnd > rowStart) ? SRC.slice(rowStart, rowEnd) : '';

  test('the row block was actually located', () => {
    expect(rowBlock.length).toBeGreaterThan(0);
  });

  test('the caption renders as a Text using exerciseCapabilityNote, right after the why-line, inside exerciseInfo', () => {
    const whyIdx = rowBlock.indexOf('styles.exerciseWhy');
    const noteIdx = rowBlock.indexOf('styles.exerciseCapabilityNote');
    expect(whyIdx).toBeGreaterThan(-1);
    expect(noteIdx).toBeGreaterThan(whyIdx);
  });

  test('exactly one Swap affordance in the row (handleOpenSwap), no second capability-specific button added', () => {
    const swapCalls = rowBlock.match(/onPress=\{\(\) => handleOpenSwap\(routineExercise, exercise\)\}/g) ?? [];
    expect(swapCalls.length).toBe(1);
    // The new marker block itself (bounded to just its own IIFE, not
    // everything after it in the row) carries no onPress/TouchableOpacity.
    const noteStart = rowBlock.indexOf('T2-32 (D112 R5, closes audit T2-32): the plan-view marker');
    const noteEnd = rowBlock.indexOf('})()}', noteStart) + '})()}'.length;
    expect(noteStart).toBeGreaterThan(-1);
    expect(noteEnd).toBeGreaterThan(noteStart);
    const noteBlock = rowBlock.slice(noteStart, noteEnd);
    expect(noteBlock).not.toContain('onPress');
    expect(noteBlock).not.toContain('TouchableOpacity');
  });
});

describe('style: a plain quiet caption, distinct from the italic "why" rationale voice', () => {
  test('exerciseCapabilityNote is captionTight + textMuted with no italic (a status fact, not a rationale)', () => {
    expect(SRC).toContain(
      'exerciseCapabilityNote: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },',
    );
    expect(SRC).toContain('exerciseCapabilityNote: { ...t.type.captionTight, color: t.colors.textMuted },');
  });

  test('exerciseWhy keeps its own italic styling, unchanged', () => {
    expect(SRC).toContain(
      "exerciseWhy: { ...type.captionTight, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xxs },",
    );
  });
});
