/**
 * AnalyticsScreen: D214 lane 3 source guards (Progress root, plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.1, items 1 to 7; register D214 and its
 * addenda 1 and 3; D204).
 *
 * What this suite pins and why (each case fails if the build is undone):
 *  1. "Your plan week" is the first object and is the SHARED PlanWeekCard fed
 *     by the one view-model, the programme position read on focus and on
 *     refresh; the screen holds no second implementation of the card, the
 *     count or the seven cells.
 *  2. The strip is the pure volumeStrip model (logged sets, plan-trained under
 *     count, gated recovery week) and never recounts credits itself; its tap
 *     opens the Volume heatmap on "This week" with { windowWeeks: 1 }; its
 *     colours are named through the one LegendRow; the landmark table and the
 *     plan-trained set are re-read on focus (PR-16), not once per user.
 *  3. The pillar icons are ink (`textSecondary`), never amber or `primary`
 *     (PR-17); the Body row hands the shared derivation to bodyPillarCopy and
 *     carries no ED or calm gate of its own (D214 Q2: the withhold lives in
 *     the derivation).
 *  4. The doors are NavRows in one NavGroup in the plan's order with the
 *     Volume heatmap a PERSISTENT door, never conditional on data (PR-15).
 *  5. Recent sessions title by routine name, else name, else "Session"
 *     (PR-9), and the difficulty chip never prints "/10" (PR-1).
 *  6. The empty state's sentence (PR-11).
 *  7. D204: nothing the screen, the strip or the Training ladder can print
 *     tells the athlete what to do.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SCREEN = read('../AnalyticsScreen.js');
const STRIP = read('../../lib/progress/volumeStrip.js');
const PILLARS = read('../../lib/progress/pillars.js');

// Source with comments removed, so a retirement note may name a retired idiom.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CODE = stripComments(SCREEN);
const CODE_OF = (src) => stripComments(src);

function functionSource(src, name) {
  const start = src.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n}\n', start);
  return src.slice(start, end + 3);
}

describe('1. Your plan week: the shared card, first, from the one view-model', () => {
  test('PlanWeekCard is imported and consumed with the view-model; the strip sits under it', () => {
    expect(SCREEN).toContain("import PlanWeekCard from '../components/PlanWeekCard';");
    expect(SCREEN).toContain("import { buildPlanWeekSummary } from '../lib/progress/planWeek';");
    // RE-ANCHORED D214 addendum 6 (lane 4 review S2): the finished flag rides along.
    // RE-ANCHORED addendum 9 (census 6.13): so do the grid's own days
    // (`completedDays`, calValues' dates), which the seven cells light on.
    expect(SCREEN).toMatch(/buildPlanWeekSummary\(\{ position: planContext\.position, sets: allSets, completedDays, finished: !!currentMesoWeek\?\.awaitingDecision \}\)/);
    expect(SCREEN).toContain('const completedDays = useMemo(() => calValues.map((v) => v.date), [calValues]);');
    // RE-ANCHORED (the lead's landing fix, plan 7.1 item 2 "one Card"): the
    // strip is the card's child, so the tag opens rather than self-closes.
    const card = SCREEN.indexOf('<PlanWeekCard summary={planWeekSummary}>');
    const stripAt = SCREEN.indexOf('<VolumeStrip', card);
    const pillars = SCREEN.indexOf('<Card padding="none" surface="surfaceElevated"');
    expect(card).toBeGreaterThan(SCREEN.indexOf('Header (R1)'));
    expect(stripAt).toBeGreaterThan(card);
    expect(pillars).toBeGreaterThan(stripAt);
  });

  test('no second implementation: the screen builds no count, no cell and no DayDots of its own', () => {
    expect(CODE).not.toMatch(/headlineNumber|headlineWords|trainedDayKeys|sessionsThisWeek|weekdayKey/);
    expect(CODE).not.toMatch(/community\/DayDots|<DayDots/);
    expect(CODE).not.toMatch(/function PlanWeek/);
    expect(CODE).not.toMatch(/localWeekStartMs/);
  });

  test('the programme position is read on focus and on pull-to-refresh, failing to the no-plan reading', () => {
    expect(SCREEN).toContain("import { resolveProgrammePosition } from '../lib/programmePosition';");
    expect(SCREEN).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{ loadPlanContext\(\); \}, \[loadPlanContext\]\),\s*\);/);
    expect(SCREEN).toMatch(/const onRefresh = \(\) => \{ loadPlanContext\(\); handleRefresh\(\); \};/);
    expect(SCREEN).toContain('resolveProgrammePosition(user.id).catch(() => null)');
  });

  test('the old "N sessions this week" context line is gone: one session count on the screen', () => {
    expect(CODE).not.toMatch(/adherenceLine|sessions? this week/);
  });
});

describe('2. The strip: the pure model, one tap target, one legend', () => {
  test('the strip is built by the pure model and the screen recounts nothing', () => {
    expect(SCREEN).toMatch(/buildVolumeStrip\(\{/);
    expect(SCREEN).toContain("import { planTrainedMuscles } from '../lib/volumeLogged';");
    expect(CODE).not.toMatch(/calculateWeeklyVolume|getVolumeStatus|VOLUME_LANDMARKS|weeklyVolume|\.workingSets\b|VolumeSummaryStrip/);
  });

  test('a tap opens the Volume heatmap on "This week"', () => {
    expect(SCREEN).toContain("navigation.navigate('VolumeHeatmap', { windowWeeks: 1 })");
  });

  test('every colour is named through the shared LegendRow, built from the strip\'s one tone table', () => {
    expect(SCREEN).toContain("import LegendRow from '../components/LegendRow';");
    expect(SCREEN).toMatch(/<LegendRow\s+items=\{legendItems\}/);
    expect(SCREEN).toMatch(/stripLegendItems\(\{ colors: t\.colors, recoveryWeek \}\)/);
    expect(SCREEN).toMatch(/stripToneColors\(t\.colors\)/);
    // No hand-rolled swatch or flag legend survives.
    expect(CODE).not.toMatch(/volLegendDot|volLegendItem|volSummaryFlags|below target|over max|All in range/);
    // The three tones' words live with the model. RE-PINNED under D219 lane A5
    // (design 5.3): the strip reads the one judgement, so its tones are Below
    // maintenance, Within the studied range and Beyond the studied range; the old
    // "Under the range", "Inside the range" and "Too much" are retired.
    expect(STRIP).toContain("under: 'Below maintenance'");
    expect(STRIP).toContain("in: 'Within the studied range'");
    expect(STRIP).toContain("over: 'Beyond the studied range'");
    expect(CODE_OF(STRIP)).not.toMatch(/Too much|Under the range|Inside the range/);
  });

  test('the recovery week is the position\'s GATED state, the calendar flag only the fallback', () => {
    expect(SCREEN).toContain('isStripRecoveryWeek({ position: planContext?.position ?? null, currentMesoWeek })');
    expect(STRIP).toContain('position.recoveryState?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY');
    expect(STRIP).not.toMatch(/isLighterTrainingState/);
  });

  // RE-PINNED under D219 lane A5: the strip judges by each muscle's role in the
  // active plan (getPlanRoles), no longer by the resolved landmark table.
  test('the plan roles and the plan-trained set are re-read on every focus, not once per user (PR-16)', () => {
    expect(SCREEN).toContain("import { getPlanLandmarks, getPlanRoles } from '../lib/effectiveLandmarks';");
    expect(SCREEN).toContain('getPlanRoles(user.id)');
    expect(SCREEN).toContain('planTrained: planTrainedMuscles(planLayer)');
    expect(CODE).not.toMatch(/\[user\?\.id, tier\]/);
    expect(CODE).not.toMatch(/landmarkResolution/);
  });
});

describe('3. Ink icons (PR-17) and the untouched Body row', () => {
  test('the pillar icon is ink: textSecondary, never amber or primary', () => {
    const row = stripComments(functionSource(SCREEN, 'PillarRow'));
    expect(row).toMatch(/<Ionicons name=\{icon\} size=\{22\} color=\{t\.colors\.textSecondary\} \/>/);
    expect(row).not.toMatch(/primary|amber|warning/i);
  });

  // D214 addendum 4 (BM-15): the Body headlines end in a full stop of their own, so
  // the spoken label must not add a second ("weeks.. 80.7 kg").
  test('the row\'s spoken label goes through spokenRowLabel, never a bare join that doubles a full stop', () => {
    const row = stripComments(functionSource(SCREEN, 'PillarRow'));
    expect(row).toContain('const a11y = spokenRowLabel(label, stateText, evidenceText);');
    expect(row).not.toMatch(/\.join\('\. '\)/);
    expect(CODE).toMatch(/part\.replace\(\/\[\.\\s\]\+\$\/, ''\)/);
  });

  test('the Body row hands the shared derivation to bodyPillarCopy and gates nothing itself', () => {
    expect(SCREEN).toContain("const bodyCopy = useMemo(() => bodyPillarCopy(weightTrend, bodyWeightUnits || 'st'), [weightTrend, bodyWeightUnits]);");
    expect(CODE).not.toMatch(/edFlag|isCalm|wellbeing|pillarFigure|calmMode/);
  });
});

describe('4. The doors: NavRows in one NavGroup, in the plan\'s order, the Volume heatmap persistent (PR-15)', () => {
  test('Consistency, Volume heatmap, Full history, Recaps, Year of lifts, in that order', () => {
    const at = (label) => SCREEN.indexOf(`label="${label}"`);
    const order = ['Consistency', 'Volume heatmap', 'Full history', 'Recaps', 'Year of lifts'].map(at);
    for (const i of order) expect(i).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(SCREEN).toContain("import { NavRow, NavGroup } from '../components/NavRow';");
    expect(CODE).not.toMatch(/NavTile|navTile/);
  });

  test('the Volume heatmap door is never conditional on data', () => {
    const group = SCREEN.slice(SCREEN.indexOf('<NavGroup>'), SCREEN.indexOf('label="Volume heatmap"'));
    expect(group).not.toMatch(/&&|\?\s*\(|\?\s*<|hasData|hasVolume/);
    expect(SCREEN).toMatch(/<NavRow icon="body-outline" label="Volume heatmap" onPress=\{\(\) => navigation\.navigate\('VolumeHeatmap'\)\} \/>/);
    // Year of lifts is the only conditional door, as before.
    expect(SCREEN).toMatch(/yearOfLiftsUnlocked \? \(\s*<NavRow icon="calendar-outline" label="Year of lifts"/);
  });

  test('Recaps\' gate text and its banner read the sessions milestone\'s count (PR-12)', () => {
    expect(SCREEN).toContain('const loggedSessionCount = sessionCount;');
    expect(SCREEN).toContain('loggedSessionCount >= RECAP_GATE');
    expect(SCREEN).toContain('loggedSessionCount < RECAP_GATE');
    expect(CODE).not.toMatch(/completedWorkoutCount >= |completedWorkoutCount < /);
  });
});

describe('5. Recent sessions: the routine\'s name, the person\'s own word (PR-9, PR-1)', () => {
  test('the title is the routine name, else name, else "Session", as Home reads it', () => {
    expect(SCREEN).toContain("const title = workout.routineName || workout.name || 'Session';");
    expect(read('../../components/HomeLastSessionCard.js')).toContain("lastSession.routineName || lastSession.name || 'Session'");
  });

  test('the chip prints the word with "of 5" spoken, never "/10"', () => {
    expect(CODE).not.toMatch(/\/10/);
    expect(SCREEN).toContain("const DIFFICULTY_WORDS = ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'];");
    expect(SCREEN).toContain('difficulty ${diffWord}, ${diff} of 5');
    // The words are the Workout Summary's own rating words.
    expect(read('../WorkoutSummaryScreen.js')).toContain("sessionDifficulty: ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal']");
  });
});

describe('6. The empty state', () => {
  test('says where the weigh-ins, photos and scans are: the rows above', () => {
    expect(SCREEN).toContain('title="No training trends yet"');
    expect(SCREEN).toContain('text="Training charts appear here once sessions are logged. Weigh-ins, photos and scans are in the rows above."');
    expect(CODE).not.toMatch(/still available below/);
  });

  test('a load failure keeps the Training row\'s last copy and the one error state speaks (PR-2)', () => {
    expect(SCREEN).toContain('const trainingRow = loadError ? (lastTrainingCopyRef.current ?? NO_TRAINING_COPY) : trainingCopy;');
    expect(SCREEN).toContain('stateText={trainingRow.state}');
    expect((SCREEN.match(/title="Couldn't load your training trends"/g) || []).length).toBe(1);
  });
});

describe('7. D204: nothing here tells the athlete what to do', () => {
  // The words an instruction to change a session, a week or a habit would use.
  // RE-ANCHORED D214 addendum 9 (6.7, P7): "add up" as arithmetic ("so the muscle
  // figures add up to more than the sets you logged", the credit sentence the
  // strip's (i) now carries, as the Volume heatmap's does) is a description, not
  // the instruction "add a set". The word stays banned everywhere else, and
  // "the guard bites" below still flags "Add a set to reach your range".
  const INSTRUCTION = /\b(add(?! up to)|aim|try|consider|keep|should|must|need to|push|reduce|increase|decrease|rest|deload|skip|avoid|focus|make sure|remember|don't)\b/i;
  // The one recovery instruction on this screen is about a connection, not training.
  const EXEMPT = ['Your training history is safe. This is a loading problem, not lost data.', 'Check your connection and try again. Your data is safe on this device.'];

  function printedStrings(src) {
    const code = stripComments(src);
    const out = [];
    const quoted = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
    for (let m = quoted.exec(code); m; m = quoted.exec(code)) out.push(m[1] ?? m[2] ?? m[3]);
    const jsxText = />([^<>{}\n]+)</g;
    for (let m = jsxText.exec(code); m; m = jsxText.exec(code)) out.push(m[1].trim());
    return out.filter((s) => s && !EXEMPT.includes(s));
  }

  test.each([
    ['AnalyticsScreen.js', SCREEN],
    ['volumeStrip.js', STRIP],
  ])('%s prints no instruction verb', (_name, src) => {
    const offenders = printedStrings(src).filter((s) => INSTRUCTION.test(s));
    expect(offenders).toEqual([]);
  });

  test('the Training ladder prints no instruction verb either (its one next action is the empty history\'s)', () => {
    const start = PILLARS.indexOf('export function trainingPillarCopy');
    const ladder = PILLARS.slice(start, PILLARS.indexOf('\n}\n', start));
    const offenders = printedStrings(ladder).filter((s) => INSTRUCTION.test(s));
    expect(offenders).toEqual([]);
  });

  test('the guard bites: it flags an instruction and passes a description', () => {
    expect(printedStrings("const a = 'Add a set to reach your range';").filter((s) => INSTRUCTION.test(s))).toHaveLength(1);
    expect(printedStrings("const a = 'Keep going this week';").filter((s) => INSTRUCTION.test(s))).toHaveLength(1);
    expect(printedStrings("const a = 'This week so far: 3 sets logged';").filter((s) => INSTRUCTION.test(s))).toHaveLength(0);
    // Arithmetic is not an instruction; an instruction that happens to follow "add" is still flagged.
    expect(printedStrings("const a = 'so the figures add up to more than you logged';").filter((s) => INSTRUCTION.test(s))).toHaveLength(0);
    expect(printedStrings("const a = 'Add up your sets';").filter((s) => INSTRUCTION.test(s))).toHaveLength(1);
  });
});

// D214 addendum 6 (lane 3 review 2 and 5): wiring that no mounted pin could
// fail is pinned at the source.
describe('D214 addendum 6: wiring pins', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');
  test('the Training window is a rolling 30 days, as the row says', () => {
    expect(SRC).toMatch(/windowDays: 30/);
    expect(SRC).not.toMatch(/windowDays: (?!30)\d+/);
  });
  test('the plan roles flow into the strip (PR-16, D219 lane A5)', () => {
    expect(SRC).toMatch(/roles: planContext\?\.roles/);
  });
  test('the Recaps gate text waits for the session read and is withheld on a failed load', () => {
    expect(SRC).toMatch(/const sessionsRead = !loading && !loadError;/);
    expect(SRC).toMatch(/const recapUnlocked = sessionsRead && loggedSessionCount >= RECAP_GATE;/);
    expect(SRC).toMatch(/sub=\{recapUnlocked \|\| !sessionsRead \? null/);
  });
  test('a finished block claims no live plan week on the first card', () => {
    expect(SRC).toMatch(/finished: !!currentMesoWeek\?\.awaitingDecision/);
  });
});
