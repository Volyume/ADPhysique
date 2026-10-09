/**
 * The second logger bug audit (D220 addendum 37, founder order 2026-10-09:
 * "Search the entire logger for bugs"). Source-level pins for the fixes the
 * lead verified from the Opus read-only audit, written to FAIL if any is
 * undone:
 *   - the hardware back listener lives inside useFocusEffect (blocker 1);
 *   - the set draft saves typed work only, once the load has restored (D1);
 *   - the other well of the row being edited keeps the typed values (D2);
 *   - delete from the sheet on the row already being edited confirms
 *     directly (D3);
 *   - the entry reset is keyed on the exercise id and closes the row sheet,
 *     and a hold cancels the auto-advance (D4, D15);
 *   - the logged row carries its note and a saved note stays in the row (D5);
 *   - Finish folds a typed mini-set (D6);
 *   - the bar steps by the loadable step, down to the previous bell (D7);
 *   - the time well's keyboard is a number pad on Android (D8);
 *   - no "Set 4 of 3" past the target (D10);
 *   - Time Crunch's rest cut reaches the timer (D13);
 *   - Use past the target arms the extra set (D14);
 *   - amber is off the quiet-line buttons and glyphs (P2), at the label role (P3);
 *   - a delete is spoken (P5); the re-seed carries the last reps (P6);
 *   - a refused set keeps the keyboard (P10); tick-all never counts drop sets (P12);
 *   - the lock-screen Log finishes a cluster (unsure 2).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('screens/ActiveWorkoutScreen.js');
const ROW = read('components/workout/session/SetRow.js');
const TABLE = read('components/workout/session/SetTable.js');

describe('the second logger audit stays fixed', () => {
  test('blocker 1: the hardware back listener is focus-scoped', () => {
    expect(SRC).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*const sub = BackHandler\.addEventListener\('hardwareBackPress'/);
    expect(SRC).not.toMatch(/useEffect\(\(\) => \{\s*const sub = BackHandler\.addEventListener/);
  });

  test('D1: the draft saves typed work only, after the load', () => {
    expect(SRC).toContain('if (!draftArmedRef.current) return undefined;');
    expect(SRC).toContain('const hasValue = !currentSet?.isGhost && (noWeight');
    expect(SRC).toContain('if (!cancelled) draftArmedRef.current = true;');
    expect(SRC).toContain('draftArmedRef.current = false;\n    loadHistory();');
  });

  test('D2: the row being edited only moves its field', () => {
    expect(SRC).toMatch(/if \(set && editingSet && set\.id === editingSet\.id\) \{[\s\S]{0,400}?setEditField\(field\);\s*setEntryField\(null\);\s*\} else if \(set\) \{\s*openEditSet\(set\);/);
  });

  test('D3: delete from the sheet on the open row confirms directly', () => {
    expect(SRC).toMatch(/function openDeleteFromMenu\(set\) \{[\s\S]{0,400}?if \(editingSet && editingSet\.id === set\.id\) \{\s*menuDeleteTargetIdRef\.current = null;\s*handleDeleteEditedSet\(\);\s*return;/);
  });

  test('D4, D15: the reset is keyed on the exercise and closes the sheet; a hold cancels the advance', () => {
    expect(SRC).toMatch(/setExtraTargetSets\(0\);\s*setRowSheet\(null\);\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\}, \[currentExerciseIndex, exercise\?\.id\]\);/);
    expect(SRC).toContain("onLongPressRow: () => { cancelAutoAdvance(); setRowSheet({ kind: 'logged'");
  });

  test('D5: the logged row carries its note and a saved note stays in the row', () => {
    expect(SRC).toMatch(/rightReps: null,[\s\S]{0,300}?notes: effectiveNotes \?\? null,/);
    expect(SRC).toContain('setLoggedSets((prev) => prev.map((row) => (row.id === id ? { ...row, notes } : row)));');
  });

  test('D6: Finish folds a typed mini-set', () => {
    expect(SRC).toMatch(/async function finishCluster\(\) \{[\s\S]{0,500}?const pending = parseInt\(clusterReps, 10\);[\s\S]{0,200}?summariseCluster\(cluster\.setType, reps\)/);
  });

  test('D7: the bar steps by the loadable step, down to the previous bell', () => {
    expect(SRC).toContain("const weightStepKg = resolveBarLoadStep(barLoadBase, barLoadOpts, 'up');");
    expect(SRC).toContain("const weightStepDownKg = resolveBarLoadStep(barLoadBase, barLoadOpts, 'down');");
    expect(SRC).toContain("if (delta < 0 && setTableKind !== 'distance') delta = -weightStepDownKg;");
    expect((SRC.match(/stepDown=\{activeField === 'weight' && setTableKind !== 'distance' \? weightStepDownKg : undefined\}/g) || []).length).toBe(2);
  });

  test('D8: the time well is a number pad on Android', () => {
    expect(SRC).toContain("? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric')");
  });

  test('D10: past the target the position line says the target is met', () => {
    expect(SRC).toContain("return `All ${targetSets} sets done`;");
    expect(SRC).toContain('if (targetSets && workingLogged >= targetSets && !extraSetArmed) return orientationLabel;');
  });

  test('D13: the Time Crunch rest cut is written as the session rest choice', () => {
    expect(SRC).toMatch(/setRestOverrides\(\(prev\) => \{[\s\S]{0,500}?restSecondsForEntry\(entry\) \* \(1 - restReduction\)/);
  });

  test('D14, P8: Use arms the extra set past the target and never invents a weight', () => {
    expect(SRC).toMatch(/function handleUseHistorySet\(\{ weight, reps \}\) \{[\s\S]{0,600}?if \(targetComplete && !extraSetArmed\) \{ cancelAutoAdvance\(\); setExtraSetArmed\(true\); \}/);
    expect(SRC).toContain("weight: lastNoWeight ? '' : String(nextLast.set.weight ?? 0)");
  });

  test('P2, P3: the quiet-line buttons wear the border at the label role; the glyphs are ink', () => {
    expect(SRC).not.toMatch(/inlineActionPill: \{[^}]*withAlpha\(t\.colors\.primary/);
    expect(SRC).toContain("inlineActionPillText: { ...t.type.w(t.type.label, 'semibold'), color: t.colors.textPrimary },");
    expect(SRC).toContain('<Ionicons name="flash-outline" size={16} color={t.colors.textSecondary} />');
    expect(SRC).toContain('<Ionicons name="bulb-outline" size={16} color={t.colors.textSecondary}');
    expect(SRC).toContain('<Ionicons name="add" size={20} color={t.colors.textPrimary} />');
  });

  test('P4, P5, P6, P10, P12, unsure 2', () => {
    expect(SRC).toContain('accessibilityRole="button" accessibilityLabel="Cancel cluster"');
    expect(SRC).toContain("AccessibilityInfo.announceForAccessibility('Set deleted')");
    expect(SRC).toContain('const r = live.repsTarget != null ? live.repsTarget : (carriedReps ?? DEFAULT_SET.reps);');
    expect(SRC).toMatch(/function handleInputLog\(\) \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*if \(!cluster && !perSide && !validateSetEntryValue\(\{ value: currentSet, exercise, units \}\)\.ok\) \{/);
    expect(SRC).toContain('&& countProgressSets([{ setType: currentSet.setType }]) > 0');
    expect(SRC).toContain('handleCompleteSetPressRef.current = cluster ? finishCluster : handleCompleteSetPress;');
  });

  test('D9, unsure 4: the open well and the column labels keep the numeral cap', () => {
    expect(ROW).toMatch(/submitBehavior="submit"[\s\S]{0,400}?maxFontSizeMultiplier=\{fontScaleCaps\.numeral\}\s*\/>/);
    const columns = TABLE.slice(TABLE.indexOf('<View style={[styles.columns, live.columns]}>'), TABLE.indexOf('<View style={styles.colCheck}>'));
    expect((columns.match(/fontScaleCaps\.numeral/g) || []).length).toBe(3);
    expect(columns).not.toContain('fontScaleCaps.chrome');
  });
});
