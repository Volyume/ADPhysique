/**
 * Logger architecture, pinned as law.
 *
 * Phase 2B (the founder's real-Android screenshots) fixed the logger's
 * information architecture: the active set must not drift down the page as
 * sets are logged, rest must stay a compact strip, completed work must not be
 * louder than current work, and forward navigation must not be buried.
 *
 * RE-PINNED for the logger rebuild (register D220, 12-BUILD-SPEC.md section
 * 6, stages A to C): the session sheet hosts every exercise as a section and
 * only the active section mounts rows; the row's check is the ONE control
 * that logs a set (the bottom bar is gone); the fold of three or more logged
 * rows lives inside the set table; the keypad replaces the steppers and the
 * system keyboard; no plate readout and no RPE or RIR input in any session
 * component. Kept as they were: the rest strip docked outside the scroll,
 * compact, one render site; no routine est-max copy; PR detection and the
 * record line present; the celebration present; no trophy on a log control
 * (D150); Android keyboardDismissMode none; icon-only Finish.
 *
 * Behaviour is pinned by the logger's behaviour suites; this one pins
 * STRUCTURE, byte-level against the real source (the file's convention).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
const REST = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'RestTimer.js'), 'utf8');
const SESSION_DIR = path.join(__dirname, '..', '..', 'components', 'workout', 'session');
const SET_TABLE = fs.readFileSync(path.join(SESSION_DIR, 'SetTable.js'), 'utf8');
const SET_ROW = fs.readFileSync(path.join(SESSION_DIR, 'SetRow.js'), 'utf8');
const SECTION = fs.readFileSync(path.join(SESSION_DIR, 'ExerciseSection.js'), 'utf8');
const TOOLBAR = fs.readFileSync(path.join(SESSION_DIR, 'SessionToolbar.js'), 'utf8');
// Absence laws are about RENDERED copy and code; components' own comments
// naming what they left out are history, not surface. Strip before asserting.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the session sheet: every exercise a section, only the active one mounts rows', () => {
  test('one ScrollView hosts the title and the sections; collapsed headers above and below the active section', () => {
    const scrollIdx = SRC.indexOf('<ScrollView\n          ref={scrollRef}');
    const headerIdx = SRC.indexOf('<SessionHeader');
    const beforeIdx = SRC.indexOf('{collapsedSectionsBefore}');
    const activeIdx = SRC.indexOf('<ExerciseSection\n            index={currentExerciseIndex + 1}');
    const tableIdx = SRC.indexOf('<SetTable');
    const afterIdx = SRC.indexOf('{collapsedSectionsAfter}');
    expect(scrollIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeGreaterThan(scrollIdx);
    expect(beforeIdx).toBeGreaterThan(headerIdx);
    expect(activeIdx).toBeGreaterThan(beforeIdx);
    expect(tableIdx).toBeGreaterThan(activeIdx);
    expect(afterIdx).toBeGreaterThan(tableIdx);
    // Exactly one table: the active section's.
    expect(SRC.match(/<SetTable/g)?.length).toBe(1);
    // Only the active section mounts children.
    expect(SECTION).toContain('{isActive ? children : null}');
  });

  test('the old navigators stay retired', () => {
    expect(SRC).not.toContain('<WorkoutOutline');
    expect(SRC).not.toContain('renderWorkoutListRow');
    expect(SRC).not.toContain('expandedExercise');
    expect(SRC).not.toContain('<ExerciseNav');
    expect(SRC).not.toContain('WorkoutExerciseRow');
  });
});

describe('active-set stability: completing work never pushes the input away (hard law)', () => {
  test('3+ logged rows fold behind one constant-height line inside the table; only the last stays expanded', () => {
    expect(SET_TABLE).toContain('const FOLD_AT = 3;');
    expect(SET_TABLE).toContain('const foldable = loggedAt.length >= FOLD_AT;');
    expect(SET_TABLE).toMatch(/const hidden = collapsed\s*&& row && row\.check === 'logged'\s*&& i !== lastLogged/);
    // The fold is a toggle the athlete controls, spoken to screen readers.
    expect(SET_TABLE).toContain("? `Show ${hiddenCount} earlier logged ${plural(hiddenCount, 'set', 'sets')}`");
    expect(SET_TABLE).toContain("'Hide earlier logged sets'");
    // The screen keeps no fold state of its own: the table remounts with the
    // active section, so a long session's history never greets the next
    // exercise pre-expanded.
    expect(SRC).not.toContain('historyExpanded');
  });

  test('the next row keeps its place: logged rows above it, pending rows below it, in one table', () => {
    const loggedIdx = SRC.indexOf('loggedSets.forEach((s, i) => {');
    const nextIdx = SRC.indexOf("id: 'next',");
    const pendingIdx = SRC.indexOf('id: `pending-${n}`,');
    expect(loggedIdx).toBeGreaterThan(-1);
    expect(nextIdx).toBeGreaterThan(loggedIdx);
    expect(pendingIdx).toBeGreaterThan(nextIdx);
    expect(SRC).toContain('rows={setTableRows}');
  });
});

describe('rest is a compact strip docked outside the workspace scroll (failure 2)', () => {
  test('the strip renders after the ScrollView, before the keypad, never inside the scroll', () => {
    const scrollClose = SRC.indexOf('</ScrollView>');
    const restIdx = SRC.indexOf('<RestTimer />');
    const keypadIdx = SRC.indexOf('<Keypad');
    expect(scrollClose).toBeGreaterThan(-1);
    expect(restIdx).toBeGreaterThan(scrollClose);
    expect(keypadIdx).toBeGreaterThan(restIdx);
    // Exactly one render site.
    expect(SRC.match(/<RestTimer \/>/g)?.length).toBe(1);
  });

  test('the compact strip IS the default and only variant: no card chrome, one 44dp row', () => {
    expect(REST).not.toMatch(/container: \{[^}]*borderRadius/s);
    expect(REST).not.toMatch(/minHeight: 64/);
    expect(REST).not.toMatch(/fontSize: 26/);
    expect(REST).toMatch(/row: \{[\s\S]{0,360}?minHeight: touchTarget\.minimum/);
    expect(REST).toMatch(/drainTrack: \{\s*\n?\s*height: 2,/);
    for (const label of ['Remove 15 seconds', 'Add 15 seconds', 'Skip rest timer']) {
      expect(REST).toContain(label);
    }
    expect(REST).toContain('startRepeat(delta)');
    expect(REST).toContain('clampRestDelta');
  });
});

describe('the check is the one control that logs a set; the bar is gone', () => {
  test('the next row\'s check calls the existing press handler; mid-cluster it finishes the cluster', () => {
    expect(SRC).toContain('onCheck: cluster ? finishCluster : handleCompleteSetPress,');
    expect(SRC).not.toContain('<WorkoutBottomBar');
    expect(SRC).not.toContain("from '../components/workout/WorkoutBottomBar'");
    // The logging primary keeps its test id through the row.
    expect(SET_ROW).toContain("const COMPLETE_SET_TEST_ID = 'volyume-btn-complete-set';");
  });

  test('the retired bar\'s other jobs have homes: Add set in the footer, Finish in the toolbar, the countdown on the footer line', () => {
    expect(SRC).toContain('onAddSet={armExtraSet}');
    expect(SECTION).toContain('testID="volyume-btn-extra-set"');
    expect(SRC).toContain('onFinish={handleFinishWorkout}');
    expect(TOOLBAR).toContain('testID="volyume-workout-finish"');
    expect(SRC).toContain('countdown={{ active: !!(autoAdvanceArmed && targetComplete && !extraSetArmed), ms: 1800, reduceMotion: !!reduceMotion }}');
  });

  test('a quiet row: no per-row card chrome', () => {
    const rowBlock = SET_ROW.match(/\n  row: \{[^}]*\}/s)?.[0] ?? '';
    expect(rowBlock).toBeTruthy();
    expect(rowBlock).not.toContain('borderWidth');
    expect(rowBlock).not.toContain('borderRadius');
    expect(rowBlock).not.toContain('backgroundColor');
  });
});

describe('the keypad replaces the steppers and the system keyboard (stage C)', () => {
  test('the entry and the in-place edit write through the existing handlers', () => {
    expect(SRC).toMatch(/function writeKeypadField\(field, next\) \{\s*if \(editingSet\) setEditValue/);
    expect(SRC).toContain('else handleCurrentSetChange({ ...currentSet, [field]: next, isGhost: false });');
    expect(SRC).toContain('if (changed) handleSaveEditedSet(); else closeEditSet();');
    // The keyboard toggle restores a TextInput path for this one edit only.
    expect(SRC).toContain('onSystemKeyboard={() => setSystemKeyboard(true)}');
    expect(SRC).toContain('const keypadOpen = keypadField != null && !systemKeyboard;');
    expect(SET_ROW).toContain('<TextInput');
  });

  test('the keypad can never produce a number the typed fields refused', () => {
    expect(SRC).toContain("from '../lib/keypadEntry'");
    expect(SRC).toContain('const next = applyKey(base, key, keypadRules);');
  });
});

describe('estimated-max/PR split (failure 7): record system intact, routine copy gone', () => {
  test('no logger surface renders routine est-max copy', () => {
    for (const src of [SET_ROW, SET_TABLE, SECTION]) {
      expect(strip(src)).not.toContain('Est. max');
      expect(src).not.toContain('calculate1RM');
    }
  });

  test('PR detection survives; a record marks its row and nothing else about records sits on the table; no trophy on a log control (D150)', () => {
    expect(SRC).toContain('detectPR');
    // D220 addendum 9 (founder render verdict): no record threshold line,
    // no Target cell, no coach sentence on the logger. A record is the small
    // mark under the set number; the records sheet carries the bests.
    expect(SRC).not.toContain('prTarget');
    expect(SRC).not.toContain('const coachLine');
    expect(SRC).not.toContain('volyume-coach-line');
    expect(SRC).not.toContain("from '../lib/workoutRecordLine'");
    expect(SRC).not.toContain('target:');
    expect(SRC).toContain("record: detectedPRs.some((pr) => pr.setId === s.id),");
    expect(SRC).not.toMatch(/primaryIcon=\{[^}]*trophy/);
    expect(strip(SET_ROW)).not.toMatch(/trophy/);
    expect(SRC).toContain('showPRCelebration');
  });
});

describe('the bans hold in every session component (source guard)', () => {
  test('no plate readout, no RPE or RIR input, no hex colour, no fontSize literal', () => {
    const files = fs.readdirSync(SESSION_DIR).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const code = strip(fs.readFileSync(path.join(SESSION_DIR, f), 'utf8'));
      expect(code).not.toMatch(/\bplates?\b/i);
      expect(code).not.toMatch(/\bRPE\b|\bRIR\b/);
      expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code).not.toMatch(/fontSize:\s*\d/);
    }
  });
});

describe('Android input-focus fix survives the restructure', () => {
  test('the workspace ScrollView keeps keyboardDismissMode none on Android', () => {
    expect(SRC).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}");
    expect(SRC).not.toContain("'on-drag'}");
  });
});
