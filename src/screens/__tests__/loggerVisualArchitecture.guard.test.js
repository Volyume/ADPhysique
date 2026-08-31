/**
 * Logger phase 2B — physical-device corrective redesign, pinned as law.
 *
 * The founder's real-Android screenshots failed the phase-2 logger on
 * information architecture, not behaviour: the active set drifted down the
 * page as sets were logged, the rest timer was one of the largest elements
 * on screen, completed work was louder than current work, and forward
 * exercise navigation was buried beneath the active logger. This suite pins
 * the corrective architecture so none of those regressions can quietly
 * return. Behaviour is pinned by the existing logger suites; this one pins
 * STRUCTURE.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
const REST = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'RestTimer.js'), 'utf8');
const LOGGED_ROW = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'workout', 'LoggedSetRow.js'), 'utf8');
// Absence laws are about RENDERED copy; components' own comments naming what
// they removed are history, not surface. Strip before asserting.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const NOW_CARD = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'workout', 'NowCard.js'), 'utf8');

describe('active-set stability: completing work never pushes the input away (hard law)', () => {
  test('3+ logged sets fold behind one constant-height line; only the last stays expanded', () => {
    expect(SRC).toContain('const collapsed = loggedSets.length >= 3 && !historyExpanded;');
    expect(SRC).toContain('const visible = collapsed ? loggedSets.slice(-1) : loggedSets;');
    // The fold is a toggle the athlete controls, spoken to screen readers.
    expect(SRC).toMatch(/accessibilityLabel=\{collapsed\s*\n?\s*\? `Show \$\{hiddenCount\} earlier logged set/);
    // It re-collapses on every exercise change, so a long session's history
    // never greets the next exercise pre-expanded.
    expect(SRC).toMatch(/useEffect\(\(\) => \{ setHistoryExpanded\(false\); \}, \[currentExerciseIndex\]\);/);
  });

  test('the workspace scroll hosts ONLY the active exercise - no other exercise content to push through', () => {
    expect(SRC).not.toContain('renderWorkoutListRow');
    expect(SRC).not.toContain('expandedExercise');
  });
});

describe('rest is a compact strip docked outside the workspace scroll (failure 2)', () => {
  test('the strip renders between the ScrollView and the bottom bar, never inside the scroll', () => {
    const scrollClose = SRC.indexOf('</ScrollView>');
    const restIdx = SRC.indexOf('<RestTimer />');
    const barIdx = SRC.indexOf('{cluster ? null : (');
    expect(scrollClose).toBeGreaterThan(-1);
    expect(restIdx).toBeGreaterThan(scrollClose);
    expect(barIdx).toBeGreaterThan(restIdx);
    // Exactly one render site.
    expect(SRC.match(/<RestTimer \/>/g)?.length).toBe(1);
  });

  test('the compact strip IS the default and only variant: no card chrome, one 44dp row', () => {
    // The old bordered-card shell (surface fill + border + radius + outer
    // margins + 64dp row + hero numeral) must not return.
    expect(REST).not.toMatch(/container: \{[^}]*borderRadius/s);
    expect(REST).not.toMatch(/minHeight: 64/);
    expect(REST).not.toMatch(/fontSize: 26/);
    expect(REST).toMatch(/row: \{[\s\S]{0,200}?minHeight: touchTarget\.minimum/);
    // The drain indication survives as a 2dp line.
    expect(REST).toMatch(/drainTrack: \{\s*\n?\s*height: 2,/);
    // Every control keeps its behaviour and labels.
    for (const label of ['Remove 15 seconds', 'Add 15 seconds', 'Skip rest timer']) {
      expect(REST).toContain(label);
    }
    expect(REST).toContain('startRepeat(delta)');
    expect(REST).toContain('clampRestDelta');
  });
});

describe('one continuous set sequence (failure 3)', () => {
  test('logged rows sit above the entry row, upcoming previews below, in one section order', () => {
    const loggedIdx = SRC.indexOf('{loggedSets.length > 0 && (() => {');
    const nowIdx = SRC.indexOf('<NowCard');
    const upcomingIdx = SRC.indexOf('style={styles.upcomingSection}');
    expect(loggedIdx).toBeGreaterThan(-1);
    expect(nowIdx).toBeGreaterThan(loggedIdx);
    expect(upcomingIdx).toBeGreaterThan(nowIdx);
  });

  test('the active entry is a ROW of the sequence, not a detached house Card', () => {
    expect(NOW_CARD).not.toContain("from '../Card'");
    // Founder device order 2026-08-17: the coloured left accent stripe is
    // retired - the row keeps a uniform 1px border on all four sides.
    expect(NOW_CARD).not.toContain('borderLeftWidth');
    expect(NOW_CARD).not.toContain('borderLeftColor');
    // Its position line and note row keep their pinned testIDs.
    expect(NOW_CARD).toContain('testID="volyume-set-type-btn"');
    expect(NOW_CARD).toContain('testID="volyume-note-row"');
  });

  test('completed rows are quiet lines: no per-row card chrome, no routine est-max copy', () => {
    expect(strip(LOGGED_ROW)).not.toContain('Est. max');
    expect(LOGGED_ROW).not.toContain('calculate1RM');
    const rowBlock = LOGGED_ROW.match(/loggedSetRow: \{[^}]*\}/s)?.[0] ?? '';
    expect(rowBlock).not.toContain('borderWidth');
    expect(rowBlock).not.toContain('backgroundColor: colors.surface,');
  });

  test('upcoming previews are light lines, never dashed cards with the mass of the active set', () => {
    expect(SRC).not.toContain("borderStyle: 'dashed'");
    const upcomingBlock = SRC.match(/upcomingSetRow: \{[^}]*\}/s)?.[0] ?? '';
    expect(upcomingBlock).not.toContain('borderWidth');
  });
});

describe('estimated-max/PR split (failure 7): record system intact, routine copy gone', () => {
  test('no logger surface renders routine est-max copy', () => {
    const SET_ENTRY = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'SetEntry.js'), 'utf8');
    for (const src of [SET_ENTRY, LOGGED_ROW]) {
      expect(strip(src)).not.toContain('Est. max ~');
    }
  });

  test('PR detection, the record line and the trophy commitment cue all survive', () => {
    expect(SRC).toContain('detectPR');
    expect(SRC).toContain('buildRecordLine');
    expect(SRC).toContain("primaryIcon={recordLine?.isRecord ? 'trophy' : null}");
    expect(SRC).toContain('showPRCelebration');
  });
});

describe('Android input-focus fix survives the restructure', () => {
  test('the workspace ScrollView keeps keyboardDismissMode none on Android', () => {
    expect(SRC).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}");
    expect(SRC).not.toContain("'on-drag'}");
  });
});

describe('the single-CTA state machine is untouched by the visual pass', () => {
  test('the bar wiring is byte-for-byte the accepted contract', () => {
    expect(SRC).toContain('advance={(targetComplete && !extraSetArmed && !perSide)');
    expect(SRC).toContain('countdownActive={autoAdvanceArmed && targetComplete && !extraSetArmed}');
    expect(SRC).toContain('onExtraSet={armExtraSet}');
    expect(SRC).toMatch(/\{cluster \? null : \(\s*<WorkoutBottomBar/);
  });
});
