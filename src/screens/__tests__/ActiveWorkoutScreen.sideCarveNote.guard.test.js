/**
 * CC33 W3 (D112 R5, closes audit findings T2-20/T1-24).
 *
 * T2-20 (S2-T2-LIVE-TRACE.md): "carvedForOneSide (ActiveWorkoutScreen.js:
 * 768-776) suppresses the per-side logging prompt (:1450) and says
 * nothing. section 16 says explanations name the side. The one-limb user
 * is never told why."
 * T1-24 (S2-T1-GENERATION-TRACE.md): "Side-carving never named outside the
 * logger (isSideCarvedAvailable sole caller ActiveWorkoutScreen.js:772);
 * one-arm users seeded bilateral-capable movements with no note; section 16
 * explanations absent at A/C."
 *
 * This suite pins:
 *  1. The note renders exactly when the EXISTING carvedForOneSide
 *     derivation is true - no new state, no re-derivation of the carve
 *     itself (only ActiveWorkoutScreen may call isSideCarvedAvailable per
 *     T1-24's own citation: "sole caller").
 *  2. The generic line ships (never a side-specific "left/right" line),
 *     because isSideCarvedAvailable, read to the end, returns a plain
 *     boolean from a `.some()` - the matching restriction row's laterality
 *     is never threaded back to the caller. This suite pins BOTH halves of
 *     that evidence: the mechanism's real shape in resolve.js, and the
 *     screen's honest choice not to invent a side it cannot honestly know.
 *  3. Always visible (plain quiet Text), not folded into the StatusStrip's
 *     tap-to-expand chip mechanism - there is no action to take on this
 *     note, so it must not require a tap to discover.
 *  4. Positioned near the same strip area the constraint notices use.
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface;
 * matching this file's own existing convention
 * (ActiveWorkoutScreen.nextExerciseButton.guard.test.js), these are byte-
 * level checks against the real source, cross-checked against the real
 * resolve.js mechanism (not mocked/assumed).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const RESOLVE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'capability', 'resolve.js'),
  'utf8',
);

describe('isSideCarvedAvailable, read to the end, exposes ONLY a boolean (the evidence for shipping the generic line)', () => {
  const start = RESOLVE.indexOf('export function isSideCarvedAvailable(state, exercise) {');
  const end = RESOLVE.indexOf('\n}\n', start) + 2;
  const FN = RESOLVE.slice(start, end);

  test('the function was actually located', () => {
    expect(start).toBeGreaterThan(-1);
    expect(FN.length).toBeGreaterThan(0);
  });

  test('returns the result of .some(...) - a boolean, never the matched row', () => {
    expect(FN).toMatch(/return \(state\.restrictions \?\? \[\]\)\.some\(\(r\) => \(/);
    // No branch anywhere returns `r` or `r.laterality` - only true/false.
    expect(FN).not.toMatch(/return r(\.|\s|;)/);
    expect(FN).not.toContain('.laterality;');
  });

  test('the matching rule\'s laterality is read only inside the predicate, never surfaced to the caller', () => {
    expect(FN).toContain('r.laterality');
    // It gates the match (truthy check), it is not part of what comes back.
    expect(FN).toMatch(/&& r\.laterality\s*\n\s*&& SIDE_CARVEABLE\.has/);
  });
});

describe('carvedForOneSide stays the ONLY consumer of isSideCarvedAvailable (T1-24: "sole caller")', () => {
  test('exactly one call site in this screen, feeding carvedForOneSide off the RESOLVED row', () => {
    const calls = SRC.match(/isSideCarvedAvailable\(/g) ?? [];
    expect(calls.length).toBe(1);
    // F1 (adversarial review): the entry's own exercise object has no
    // demand columns, so `tri(undefined) !== true` returned false for
    // EVERY planned row and the note could never fire. The call now
    // judges the library-resolved row.
    expect(SRC).toContain('return isSideCarvedAvailable(intentState.capability, judgedExercise);');
  });

  test('no other file gains a new caller (this screen\'s own lane cannot re-derive the side independently)', () => {
    const otherCallers = fs.readFileSync(path.join(__dirname, '..', 'RoutineDetailScreen.js'), 'utf8');
    expect(otherCallers).not.toContain('isSideCarvedAvailable');
  });
});

describe('F8 (adversarial review): the mechanism is DRIVEN, not only read - production shape vs resolved row', () => {
  // The suite's earlier drafts pinned the source without ever invoking
  // it, so "the note can never fire" survived a green run. This drives
  // the real function with both shapes.
  // eslint-disable-next-line global-require
  const { isSideCarvedAvailable, buildCapabilityResolveState } = require('../../lib/capability/resolve');
  const NOW = 1_750_000_000_000;
  const sidedGripRule = buildCapabilityResolveState([{
    id: 'c-grip', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'grip_bar', laterality: 'left', startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  }], { atMs: NOW });
  const FULL_ROW = {
    id: 'ex-db-row', name: 'Single-Arm Dumbbell Row', primaryMuscle: 'back',
    unilateralLoadable: 1, gripDemand: 'bar',
  };

  test('a resolved row with the demand columns answers TRUE', () => {
    expect(isSideCarvedAvailable(sidedGripRule, FULL_ROW)).toBe(true);
  });

  test('the production (demandless) shape answers FALSE - which is why the screen must resolve first', () => {
    const partial = { id: FULL_ROW.id, name: FULL_ROW.name, primaryMuscle: FULL_ROW.primaryMuscle };
    expect(isSideCarvedAvailable(sidedGripRule, partial)).toBe(false);
  });
});

describe('the rendered note: generic line, always visible, positioned near the constraint-notice strip (T2-20/T1-24)', () => {
  const stripEnd = SRC.indexOf('return <StatusStrip items={items} />;\n          })()}');
  const noteIdx = SRC.indexOf('{carvedForOneSide ? (', stripEnd);
  const noteEnd = SRC.indexOf(') : null}', noteIdx) + ') : null}'.length;
  const noteBlock = (noteIdx >= 0 && noteEnd > noteIdx) ? SRC.slice(noteIdx, noteEnd) : '';

  test('the note sits after the StatusStrip render, before the continuous set sequence', () => {
    expect(stripEnd).toBeGreaterThan(-1);
    expect(noteIdx).toBeGreaterThan(stripEnd);
    const setSequenceIdx = SRC.indexOf('ONE continuous set sequence (phase 2B)', noteEnd);
    expect(setSequenceIdx).toBeGreaterThan(noteEnd);
  });

  test('gated on the existing carvedForOneSide derivation, no new state introduced for the gate itself', () => {
    expect(noteBlock).toContain('{carvedForOneSide ? (');
    expect(noteBlock).not.toMatch(/useState|useEffect/);
  });

  test('exact generic copy - never a left/right-specific line', () => {
    expect(noteBlock).toContain('Volyume counts this one side at a time, matching how you train.');
    // Never "your left/right side", and never a template interpolation
    // (${...}) naming a side inside the copy string itself.
    expect(noteBlock.toLowerCase()).not.toMatch(/\byour left side\b|\byour right side\b/);
    expect(noteBlock).not.toMatch(/\$\{[^}]*side[^}]*\}/i);
  });

  test('plain <Text>, not routed through the StatusStrip items array (always visible, no tap required)', () => {
    expect(noteBlock).toContain('<Text style={[styles.sideCarveNote, live.sideCarveNote]}>');
    expect(noteBlock).not.toContain('items.push');
  });
});

describe('style: quiet caption + textMuted (swapNote\'s register), never a banner', () => {
  test('sideCarveNote carries no background/border - it is text, not a chip or a banner', () => {
    expect(SRC).toContain(
      "sideCarveNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxs },",
    );
    expect(SRC).toContain('sideCarveNote: { ...t.type.caption, color: t.colors.textMuted },');
    const styleLine = SRC.split('\n').find((l) => l.trim().startsWith('sideCarveNote: { ...type.caption'));
    expect(styleLine).not.toMatch(/backgroundColor|borderColor|borderWidth/);
  });
});

describe('Q-1 (round 5): the in-session episode notice never asserts an adaptation it is not making', () => {
  test('the generic conflicted line states the conflict, mirroring the baseline branch, and the false claims are gone', () => {
    // A row showing the constraintNotice is, by construction, being
    // served as planned: a substituted row shows the _capabilityTemp
    // line and an omitted row is absent. So "Today this works around
    // your temporary change" (app as subject, claiming adaptation) was
    // false in every reachable case - most of all for declined and
    // undecided rules, where the app is doing nothing to the row.
    expect(SRC).toContain(
      `{ kind: 'episode', copy: "This one sits outside your temporary change. Swap it when you're ready." }`,
    );
    expect(SRC).not.toContain('Today this works around your temporary change');
    expect(SRC).not.toContain("This is one you're working around at the moment");
  });

  test('the substituted row keeps its own truthful marker (the adaptation IS happening there)', () => {
    expect(SRC).toContain('Temporarily in for ${currentEntry._capabilityTemp.fromName} while your change lasts');
  });

  test('R6-4 (round 6): the NAMED episode line states the conflict too - the dominant branch, not just the generics', () => {
    // Round 5 replaced the two generics; the named variant one line
    // above them still claimed a workaround in progress - and the named
    // branch is the one that fires for every demand and family rule
    // (subjectPhrase names those), so the false claim survived on the
    // dominant path. It now mirrors the baseline named line: state the
    // conflict, offer the action.
    expect(SRC).toContain('This one involves ${named}, which sits outside your temporary change. Swap it when you\'re ready.');
    expect(SRC).not.toContain("working around at the moment");
  });
});

// Round 10 (R10-1/R10-2/R10-3): the screen's three writer sites key the
// effects record to the planned slot, the manual swap corrects the
// slot's record instead of inheriting the app's marker, and completion
// reconciles performed omissions. The mechanism halves are driven in
// capabilityAdherence.test.js and sessionEffective.serveGuard.test.js;
// these pin the screen wiring per this suite's own convention.
describe('R10: slot-keyed record wiring and the swap correction', () => {
  test('serve is fed each slot\'s stable planned-row id', () => {
    expect(SRC).toContain("const rowIds = workoutExercises.map((e) => e?.routineExercise?.id ?? null);");
    expect(SRC).toContain('applyEffectiveViewToSession(user.id, activeWorkout.id, baseRows, { rowIds })');
  });

  test('the removal hook stamps its entry with the slot\'s planned-row id', () => {
    expect(SRC).toContain("rowId: removedEntry?.routineExercise?.id ?? null,");
  });

  test('R10-2/R11-4: EVERY manual swap makes the row the user\'s own; a substitute swap also clears the marker and amends the entry', () => {
    // The spread used to carry _capabilityTemp forward, so the quiet
    // line claimed "Temporarily in for X" over the user's own pick and
    // the record kept naming a substitute the user never trained.
    // Round 11: the _userAdded marking is UNCONDITIONAL - the round-10
    // conditional left an ordinary swapped row unmarked, and the
    // reachable second serve pass substituted over the user's pick.
    const site = SRC.indexOf('const prevTemp = updatedExercises[currentExerciseIndex]?._capabilityTemp;');
    expect(site).toBeGreaterThan(-1);
    const block = SRC.slice(site, site + 700);
    expect(block).toContain('_userAdded: true,');
    expect(block).toContain('...(prevTemp ? { _capabilityTemp: undefined } : {}),');
    expect(block).not.toMatch(/prevTemp \? \{[^}]*_userAdded/);
    expect(SRC).toContain("amendSessionConstraintSubstitution(user.id, activeWorkout.id, {");
    expect(SRC).toContain('exerciseFrom: prevTemp.fromId,');
    expect(SRC).toContain('rowId: prevTemp.rowId ?? null,');
    expect(SRC).toContain('exerciseTo: newExercise.id,');
  });

  test('R11-1/R12-1: removal converts the SLOT\'s substitution entry, keyed on the record, not only the marker', () => {
    // Round 11 keyed the conversion on _capabilityTemp - which a manual
    // swap clears, so a swap-then-remove chain left the entry standing
    // stale (round 12, R12-1). The conversion now falls back to the
    // slot's own stable id; rowId-only matching is exact in the helper.
    expect(SRC).toContain("const removedTemp = removedEntry?._capabilityTemp;");
    expect(SRC).toContain("const removedRowId = removedTemp?.rowId ?? removedEntry?.routineExercise?.id ?? null;");
    expect(SRC).toContain('convertSessionConstraintSubstitutionToOmission(user.id, activeWorkout.id, {');
    expect(SRC).toContain('exerciseFrom: removedTemp?.fromId ?? null,');
    expect(SRC).toContain('rowId: removedRowId,');
  });

  test('R12-2: the removal excusal gates on the SHARED definite-only answer, and never fires for a substituted or user-chosen slot', () => {
    // The old inline gate had no certainty term, so removing a custom
    // lift with null demand columns recorded a constraint omission off
    // an UNKNOWN conflict - while the same row's own notice said
    // "Volyume doesn't know yet". The gate now consumes
    // removalExcusalConflicts (capability/effective.js), the same
    // certainty and choice gates the completion writer applies.
    expect(SRC).toContain("const { removalExcusalConflicts } = require('../lib/capability/effective');");
    expect(SRC).toContain('const removalDefinite = removalExcusalConflicts(constraintConflicts);');
    expect(SRC).toContain("if (!removedTemp && !removedEntry?._userAdded && removalDefinite.length");
    expect(SRC).toContain('constraintIds: removalDefinite.map(c => c.constraintId),');
    // The old unfiltered gate is gone.
    expect(SRC).not.toContain("if (constraintConflicts.length\n              && constraintConflicts.every(c => c.row?.effectiveChoice === 'applied'");
  });

  test('R13-2: the completion projection carries the user-chosen marker, so both writers share one refusal', () => {
    // The removal writer refused _userAdded rows since round 12; the
    // completion projection dropped the marker, so the same row was
    // excused if merely left unlogged instead of deleted - fabricated
    // CONSTRAINED evidence off the user's own add-anyway choice.
    expect(SRC).toContain('userChosen: !!e?._userAdded,');
  });

  test('R13/R14 (B5): only conflicts with LIVE automation outrank the marker line', () => {
    // Round 13: the marker branch returned before any conflict
    // evaluation, so a rule captured mid-session against the SUBSTITUTE
    // was never spoken on the row it bears on. Round 14 corrected the
    // gate's class: the principle is "conflicts that DRIVE nothing
    // leave the marker" - unknowns AND held rules (D120 ruling 2, D112
    // R8) - and round 13 enumerated only unknowns, so a held-only
    // definite set killed the marker and let the held line claim
    // "Volyume changes nothing" over a row Volyume substituted in.
    const site = SRC.indexOf("if (currentEntry?._capabilityTemp?.fromName");
    expect(site).toBeGreaterThan(-1);
    const block = SRC.slice(site, site + 300);
    expect(block).toContain('&& !drivingEpisode.length && !definiteBaseline.length)');
    // The driving list drops held rules from the definite list, and
    // both are computed BEFORE the marker branch.
    const drvSite = SRC.indexOf("const drivingEpisode = definiteEpisode.filter((c) => c.row?.adaptationMode !== 'hold');");
    const defSite = SRC.indexOf('const definiteEpisode = constraintConflicts.filter((c) => !c.unknown);');
    expect(defSite).toBeGreaterThan(-1);
    expect(drvSite).toBeGreaterThan(defSite);
    expect(drvSite).toBeLessThan(site);
  });

  test('R14-2: the intent state reloads on focus, burst-window deduped, sequence-guarded', () => {
    // The round-13 B5 ruling exists for a rule captured mid-session
    // through "Work around this" - which navigates away and back - yet
    // intentState only reloaded on exercise change or swap-sheet open,
    // so the freshly captured rule stayed invisible on the very row it
    // was captured from (the staleness class R6-2 closed on
    // RoutineDetailScreen).
    expect(SRC).toContain("const unsub = navigation.addListener('focus', () => {");
    expect(SRC).toContain('if (Date.now() - intentLoadAtRef.current < 800) return;');
    expect(SRC).toContain('reloadIntentState();');
    expect(SRC).toContain('const seq = ++intentLoadSeqRef.current;');
    expect(SRC).toContain('if (seq === intentLoadSeqRef.current) setIntentState(state);');
  });

  test('R10-3: completion passes the session\'s performed ids, outside the capState gate', () => {
    const site = SRC.indexOf('const performedIds = snapshotExercises');
    expect(site).toBeGreaterThan(-1);
    // The reconcile call fires when EITHER new entries or performed ids
    // exist - a session whose rules ended mid-way still reconciles.
    expect(SRC).toContain('if (entries.length || performedIds.length) {');
    expect(SRC).toContain('appendSessionConstraintEffects(user.id, activeWorkout.id, entries, { performedIds })');
    // And the completion snapshot threads each slot's planned-row id.
    expect(SRC).toContain("rowId: e?.routineExercise?.id ?? null,");
  });
});
