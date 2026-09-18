/**
 * Source-level regression guard — F-13, the live logger's circuit language.
 *
 * Authority: `docs/final-certification-2026-09-05/07-FINDINGS.md` F-13
 * (P1, "The live logger speaks straight-set language on circuits"),
 * evidence A4, A5, A8, A13 and A15 in `04-TRAINING-STYLES.md`.
 *
 * What each block pins, and the defect it exists to stop coming back:
 *  (a) the pre-set heads-up announced a circuit as a "Giant set" with an
 *      Unlink button. Unlink is gone on a circuit (a circuit is changed in
 *      the plan, not broken apart mid-session) and the branch keys off the
 *      STORED group kind, never the group's size;
 *  (b) unlinking a group cleared supersetGroupId but left groupKind =
 *      'circuit', so the athlete then did straight sets that were still
 *      stamped evidence_class 'circuit' and still excluded from every
 *      learning consumer;
 *  (c) the orientation row, the outline, the reorder chip and the
 *      lock-screen text all counted SETS on a circuit;
 *  (d) "alternates with" describes a two-member pairing; a circuit rotates;
 *  (f) leaving the ranked slate for the full library was still filed
 *      causeOverride 'style', i.e. "not preference", though it is exactly
 *      the opposite.
 *
 * ActiveWorkoutScreen.js is impractical to mount (SQLite, store, haptics,
 * Live Activity), so this is a byte-level check against the source, matching
 * the established convention of this file's sibling guards
 * (ActiveWorkoutScreen.circuit.guard.test.js, supersetRest.guard,
 * groupFocusCue.guard, giantSet.guard).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('F-13 (a): the pre-set heads-up has a circuit branch, with no Unlink', () => {
  test('the branch is gated on the stored group KIND, not on the group size', () => {
    expect(SRC).toContain('isCircuit: isCircuitGroup,');
    expect(SRC).toContain('const headsUpIsCircuit = !!supersetHeadsUp?.isCircuit;');
  });

  test('the title says "Circuit coming up" and the icon is the circuit repeat, not the link', () => {
    expect(SRC).toContain("? 'Circuit coming up'");
    expect(SRC).toContain('<Ionicons name={headsUpIsCircuit ? \'repeat\' : \'link\'} size={24}');
  });

  test('the body names the stations, the absence of rest between them, the round rest and the rounds', () => {
    expect(SRC).toContain('stations done one after the other with no rest between them');
    expect(SRC).toContain('`, then rest ${headsUpRestWords} between rounds`');
    expect(SRC).toContain('rounds in all.');
  });

  test('the heads-up carries the circuit\'s own rounds and round rest, read from the prescription', () => {
    expect(SRC).toContain('rounds: routineExercise?.recommendedSets ?? null,');
    expect(SRC).toContain('roundRestSeconds: routineExercise?.roundRestSeconds ?? null,');
  });

  test('Unlink is withheld on a circuit and still offered on a superset or giant set', () => {
    expect(SRC).toContain('{headsUpIsCircuit ? null : (');
    expect(SRC).toContain('accessibilityLabel="Unlink the superset"');
  });

  test('the circuit tip never tells the athlete to unlink', () => {
    const tip = SRC.match(/'Tip: if a station is taken[^']*'/)?.[0] ?? '';
    expect(tip).toBeTruthy();
    expect(tip.toLowerCase()).not.toContain('unlink');
  });
});

describe('F-13 (b): unlinking a group clears the group KIND with the group id', () => {
  test('handleTogglePair nulls groupKind and roundRestSeconds on every member it unlinks', () => {
    const fn = SRC.match(/function handleTogglePair\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(fn).toBeTruthy();
    expect(fn).toContain('supersetGroupId: null,');
    expect(fn).toContain('? { ...re, groupKind: null, roundRestSeconds: null }');
  });

  test('evidence_class still derives from groupKind alone, so clearing it is what stops the stamp', () => {
    expect(SRC).toMatch(/const isCircuitGroup = routineExercise\?\.groupKind === 'circuit';/);
  });
});

describe('F-13 (c): rounds, not sets, wherever a circuit is described', () => {
  test('the orientation row reads "Round n of m - Circuit" from the shared derivation', () => {
    expect(SRC).toContain('`Round ${circuitRound.round} of ${circuitRound.targetRounds}`');
    expect(SRC).toContain('return `${pos} - Circuit`;');
  });

  test('the orientation row never falls through to "- Superset" on a circuit', () => {
    const label = SRC.match(/const orientationLabel = \(\) => \{[\s\S]*?\}\)\(\);/)
      ?? SRC.match(/const orientationLabel = \(\(\) => \{[\s\S]*?\}\)\(\);/);
    const src = label ? label[0] : '';
    expect(src).toBeTruthy();
    expect(src.indexOf('- Circuit')).toBeGreaterThan(-1);
    // The circuit branch returns BEFORE the Superset/Working mode line.
    expect(src.indexOf('- Circuit')).toBeLessThan(src.indexOf("? 'Superset'"));
  });

  test('the outline navigator labels a circuit station "Circuit"', () => {
    expect(SRC).toContain("entry.routineExercise?.groupKind === 'circuit'\n          ? 'Circuit'");
  });

  test('the reorder sheet chip labels a circuit station "Circuit", with the repeat icon', () => {
    expect(SRC).toContain("const rowIsCircuit = item.routineExercise?.groupKind === 'circuit';");
    expect(SRC).toContain("{rowIsCircuit ? 'Circuit' : (groupSize > 2 ? 'Giant set' : 'Superset')}");
  });

  test('the notification body counts rounds when the caller says it is a circuit', () => {
    const NOTIF = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'notifications', 'activeWorkout.js'),
      'utf8',
    );
    expect(NOTIF).toContain("const unit = isCircuit ? 'Round' : 'Set';");
    expect(NOTIF).toContain('`${unit} ${currentSetIndex} of ${totalSetsForExercise}`');
    // The old unconditional set language is gone.
    expect(NOTIF).not.toContain('`Set ${currentSetIndex} of ${totalSetsForExercise}`');
  });

  test('both lock-screen notification calls send the circuit round and the circuit flag', () => {
    const calls = SRC.match(/currentSetIndex: circuitRoundRef\.current\?\.round \?\? \(countProgressSets\(loggedSets\) \+ 1\),/g) || [];
    expect(calls.length).toBe(2);
    const flags = SRC.match(/isCircuit: !!circuitRoundRef\.current,/g) || [];
    expect(flags.length).toBe(2);
  });
});

describe('F-13 (d, e): the chip counts the CIRCUIT\'s round, and rotates rather than alternating', () => {
  test('the chip reads "Circuit · Round n of m · with <stations>"', () => {
    expect(SRC).toContain('Circuit · Round {roundNum} of {targetSets} · with {partnerNamesText}');
  });

  test('"alternates with" survives only on the superset chip, never on the circuit one', () => {
    const circuitChip = SRC.slice(SRC.indexOf("key: 'circuit',"), SRC.indexOf("key: 'superset',"));
    expect(circuitChip).not.toContain('alternates with');
    expect(SRC).toContain('Superset - alternates with {partnerNamesText}');
  });

  test('the round comes from the shared pure helper, not from this station\'s own set count', () => {
    expect(SRC).toContain("import {\n  circuitRoundState,");
    expect(SRC).toContain('const roundNum = circuitRound?.round ?? 1;');
    expect(SRC).not.toContain('const roundNum = Math.min(workingLogged + 1, targetSets || 1);');
  });

  test('a station that has missed a round says so in one short line under the chip', () => {
    expect(SRC).toContain('{circuitRound?.missedRound ? (');
    expect(SRC).toContain('{CIRCUIT_MISSED_ROUND_LINE}');
  });

  test('the derivation reads every station of the group, so the stations cannot disagree', () => {
    const memo = SRC.match(/const circuitRound = useMemo\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/)?.[0] ?? '';
    expect(memo).toContain("(entry?.supersetGroupId ?? null) === currentSGI");
    expect(memo).toContain('circuitRoundState({ stationLogged: workingLogged, groupLogged, targetRounds: targetSets })');
  });
});

describe('F-13 (f) / A15: a full-library swap is not filed as a style cause', () => {
  test('the "search the full library" escape relaxes the style pool before the picker opens', () => {
    const footer = SRC.slice(SRC.indexOf('ListFooterComponent={'), SRC.indexOf('accessibilityLabel="Search exercise library"'));
    expect(footer).toContain('setSwapStyleShowAll(true);');
    expect(footer).toContain("setPickerMode('swap');");
  });

  test('causeOverride still reads that same flag, so relaxing it is what drops the style cause', () => {
    expect(SRC).toContain("        causeOverride: workAroundSwapRef.current ? 'constraint'\n          : (swapStylePoolKey && !swapStyleShowAll) ? 'style'\n          : null,");
  });
});
