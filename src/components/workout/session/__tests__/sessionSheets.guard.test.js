/**
 * sessionSheets.guard.test.js (workout logger rebuild, lane B2, 12-BUILD-SPEC
 * sections 2, 3 and 6, register D220).
 *
 * Source-level guard for the four session sheets: RestSheet,
 * SessionNotesSheet, ExerciseRestSheet and HistorySheet. It pins the rules the brief gives
 * every new logger component, so a later edit cannot loosen them quietly:
 *   - tokens only: no hex or rgb literal, no fontSize, fontWeight or
 *     letterSpacing property at all (type roles carry them), no em dash;
 *   - Ionicons only, and no import outside React, React Native, the shallow
 *     selector helper and the app's own files (no new dependency);
 *   - function components, with StyleSheet.create as the last statement;
 *   - the sheets own no persistence and reach no engine, sync, database or
 *     notification module, so no ED-safety surface is touched;
 *   - none of the words the spec section 6 bans from session components
 *     (plate readout, RPE or RIR input, estimated max, trophy);
 *   - the rest sheet is the strip's twin, not a second clock: the same
 *     actions, the same labels, the same floor, no tick, no live region.
 *     The strip's own source is read (never edited) so a change to a label or
 *     an action there fails here until the sheet follows.
 */
const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(SESSION_DIR, file), 'utf8');
const FILES = ['RestSheet.js', 'SessionNotesSheet.js', 'ExerciseRestSheet.js', 'HistorySheet.js'];
const SOURCES = FILES.map((file) => [file, read(file)]);
const STRIP = fs.readFileSync(path.join(SESSION_DIR, '..', '..', 'RestTimer.js'), 'utf8');

const ALLOWED_IMPORT = /^(\.{1,2}\/|react$|react-native$|zustand\/react\/shallow$|@expo\/vector-icons\/Ionicons$)/;

function importSpecifiers(src) {
  const re = /^import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

describe.each(SOURCES)('%s, tokens only', (file, src) => {
  test('no hex or rgb colour literal', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/\brgba?\s*\(/);
  });

  test('no fontSize, fontWeight or letterSpacing property: type roles carry them', () => {
    expect(src).not.toMatch(/\b(fontSize|fontWeight|letterSpacing)\s*:/);
  });

  test('no em dash anywhere, in copy or in comments', () => {
    expect(src).not.toMatch(/—/);
  });

  test('Ionicons is the only icon family', () => {
    expect(src).not.toMatch(/MaterialIcons|MaterialCommunityIcons|FontAwesome|Feather|AntDesign|Entypo|SimpleLineIcons|react-native-vector-icons/);
    for (const spec of importSpecifiers(src).filter((s) => s.includes('vector-icons'))) {
      expect(spec).toBe('@expo/vector-icons/Ionicons');
    }
  });

  test('no import outside React, React Native, the shallow selector and the app', () => {
    const offenders = importSpecifiers(src).filter((spec) => !ALLOWED_IMPORT.test(spec));
    expect(offenders).toEqual([]);
  });
});

describe.each(SOURCES)('%s, shape', (file, src) => {
  test('a function component, with StyleSheet.create as the last statement', () => {
    expect(src).toMatch(/export default function \w+\(/);
    expect(src).not.toMatch(/\bclass\s+\w+\s+extends\b/);
    const at = src.indexOf('StyleSheet.create(');
    expect(at).toBeGreaterThan(0);
    const end = src.indexOf('\n});', at);
    expect(end).toBeGreaterThan(at);
    expect(src.slice(end + '\n});'.length).trim()).toBe('');
  });

  test('built on the house sheet and the theme, never a local copy', () => {
    expect(src).toMatch(/from '\.\.\/\.\.\/BottomSheet'/);
    expect(src).toMatch(/from '\.\.\/\.\.\/\.\.\/hooks\/useTheme'/);
  });

  test('owns no persistence and reaches no engine, sync, database or notification module', () => {
    expect(src).not.toMatch(/lib\/(database|sync|notifications|nutritionEngine|edPatternDetector|wellbeing|weeklyCoach|coachApply|food)\b/);
    expect(src).not.toMatch(/AsyncStorage|expo-sqlite|supabase|fetch\(/);
  });

  test('none of the words section 6 bans from session components', () => {
    expect(src).not.toMatch(/plate|\bRPE\b|\bRIR\b|est\.?\s?max|e1rm|trophy/i);
  });

  test('no screen-reader live region (the strip decided against per-second speech)', () => {
    expect(src).not.toMatch(/accessibilityLiveRegion/);
  });
});

describe('RestSheet is the strip twin, not a second clock', () => {
  const sheet = read('RestSheet.js');

  test('reads the strip fields and calls the strip actions, through the same floor', () => {
    for (const name of ['restTimerActive', 'restTimerRemaining', 'restTimerDuration', 'stopRestTimer', 'addRestTime']) {
      expect(sheet).toContain(`${name}: s.${name}`);
      expect(STRIP).toContain(`${name}: s.${name}`);
    }
    expect(sheet).toMatch(/useAppStore\(useShallow\(/);
    expect(sheet).toContain("import { clampRestDelta } from '../../../lib/restTimerMath';");
    expect(STRIP).toContain("import { clampRestDelta } from '../lib/restTimerMath';");
    expect(sheet).toMatch(/const safeAmount = clampRestDelta\(delta, remaining\);/);
    expect(sheet).toMatch(/if \(safeAmount !== 0\) addRestTime\(safeAmount\);/);
    expect(STRIP).toMatch(/const safeAmount = clampRestDelta\(delta, remaining\);/);
    expect(STRIP).toMatch(/if \(safeAmount !== 0\) addRestTime\(safeAmount\);/);
  });

  test('never ticks and never starts a rest: the strip interval is the only clock', () => {
    expect(sheet).not.toMatch(/tickRestTimer|startRestTimer|restTimerEndsAt/);
    expect(STRIP).toMatch(/setInterval\(\(\) => \{ tickRestTimer\(\); \}, 1000\)/);
  });

  test('uses the strip labels word for word', () => {
    for (const label of ['Remove 15 seconds', 'Add 15 seconds', 'Skip rest timer']) {
      expect(STRIP).toContain(label);
      expect(sheet).toContain(label);
    }
    const stripCountdown = 'Rest, ${restTimerRemaining} second${restTimerRemaining === 1 ? \'\' : \'s\'} remaining';
    const sheetCountdown = 'Rest, ${remaining} second${remaining === 1 ? \'\' : \'s\'} remaining';
    expect(STRIP).toContain(stripCountdown);
    expect(sheet).toContain(sheetCountdown);
    const stripClock = 'Rest timer, ${mins} minute${mins === 1 ? \'\' : \'s\'} ${secs} second${secs === 1 ? \'\' : \'s\'} remaining';
    expect(STRIP).toContain(stripClock);
    expect(sheet).toContain(stripClock);
  });

  test('holds repeat on the strip cadence', () => {
    expect(STRIP).toContain('setInterval(() => handleAdjust(delta), 200)');
    expect(STRIP).toContain('delayLongPress={300}');
    expect(sheet).toMatch(/const REPEAT_INTERVAL_MS = 200;/);
    expect(sheet).toMatch(/const LONG_PRESS_DELAY_MS = 300;/);
  });

  test('48 dp targets come from the touch target token', () => {
    expect(sheet).toMatch(/minHeight: touchTarget\.minimum/);
  });
});

describe('the other sheets', () => {
  test('HistorySheet is built from the house SegmentedControl and Chip, and owns no store', () => {
    const src = read('HistorySheet.js');
    expect(src).toMatch(/from '\.\.\/\.\.\/SegmentedControl'/);
    expect(src).toMatch(/from '\.\.\/\.\.\/Chip'/);
    expect(src).not.toMatch(/store\/useAppStore/);
    expect(src).not.toMatch(/%/);
  });

  test('SessionNotesSheet uses the house multiline TextField and house Buttons', () => {
    const src = read('SessionNotesSheet.js');
    expect(src).toMatch(/from '\.\.\/\.\.\/TextField'/);
    expect(src).toMatch(/<TextField[\s\S]*?\bmultiline\b/);
    expect(src).toMatch(/from '\.\.\/\.\.\/Button'/);
    expect(src).not.toMatch(/store\/useAppStore/);
  });

  test('ExerciseRestSheet uses the house Chip as a radio group and house Buttons', () => {
    const src = read('ExerciseRestSheet.js');
    expect(src).toMatch(/from '\.\.\/\.\.\/Chip'/);
    expect(src).toMatch(/accessibilityRole="radio"/);
    expect(src).toMatch(/from '\.\.\/\.\.\/Button'/);
    expect(src).toMatch(/const PRESETS = \[60, 90, 120, 180\];/);
    expect(src).toMatch(/const MIN_SECONDS = 30;/);
    expect(src).toMatch(/const MAX_SECONDS = 600;/);
    expect(src).toMatch(/const STEP_SECONDS = 15;/);
    expect(src).not.toMatch(/store\/useAppStore/);
  });
});
