/**
 * ReadinessCards.rateLastSession.test.js
 *
 * Progress-tab audit 2026-09-24, finding F3 / proposal P3(a), ruled by
 * D200 item 2 ("Q2, Recovery: proposal P3 without the duplicate line").
 * Pins three things F3 found missing from the Recovery block: a waiting
 * caption that names what fills an N/A gauge, honest per-gauge micro
 * notes, a one-tap "Rate your last session" button, and (P3(b)) the
 * "From your weekly check-in" row. Written against the REAL component
 * (only its data dependencies are mocked), so a regression in any of
 * these fails here, not just in a source-grep.
 *
 * The one-sample micro note ("One rated session so far") re-anchors the
 * pin at src/__tests__/campaign5.firstUse.test.js:1633 (lead ruling,
 * recorded in the decisions register); that pin's real intent -- a
 * second rated session before a verdict (MIN_RATED_SESSIONS/enoughSamples/
 * hasValue) -- is untouched by the wording.
 *
 * RE-ANCHORED under D214 (lane 2, plan section 7.2 item 4, RC-1 to RC-3 and
 * RC-16): the three dials are three rows on their TRUE scales, the word
 * first and the number second ("Soreness before sessions · mild (1.4 of
 * 3)"), no coloured dots, no "Scale 1-5" note, soreness unshifted; the
 * waiting notes read per row; the weekly check-in row prints the check-in's
 * own words with "of 5" after each score and only within 14 days of its
 * week, sleep in hours only. FatigueTrendCard is stubbed (react-native-svg).
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
// D201: ReadinessCards.js now also imports load.js (loadMuscleRecovery),
// which pulls in trainingHabitSchedule.js -> trainingReminders.js ->
// expo-notifications -> expo-modules-core, which throws
// "Cannot read properties of undefined (reading 'EventEmitter')" at
// require time in this suite's node env. Same fix HomeScreen's own
// recovery test (HomeScreen.recoveryRecommendation.test.js) already
// uses for the identical chain.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ accessibility: { reduceMotion: true } })),
}));
jest.mock('../AnimatedEntrance', () => ({ children }) => children);
jest.mock('../InfoTooltip', () => () => null);
jest.mock('../SectionLabel', () => {
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
// A thin stand-in that keeps title/onPress/accessibilityLabel reachable
// without pulling in the real Button's haptics/animation machinery --
// this suite is about ReadinessCards' own gating, not Button itself.
jest.mock('../Button', () => {
  const { TouchableOpacity, Text: RNText } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <RNText>{title}</RNText>
    </TouchableOpacity>
  );
});
// D201: ReadinessCards.js now imports BodyDiagramHeatmap (the "Recovery by
// muscle" body figure), which pulls in react-native-svg -- native-only,
// cannot run in this suite's node test env. Stubbed away exactly as every
// other component test that transitively imports a react-native-svg
// wrapper already does (e.g. VolumeHeatmapScreen.test.js for this same
// component); this suite's own assertions are about gating/copy elsewhere
// in ReadinessCards and never inspect the figure itself.
jest.mock('../BodyDiagramHeatmap', () => () => null);
// D214 (lane 2): the fatigue-trend bars moved into ReadinessCards; the card
// draws react-native-svg, so it is stubbed like the figure (its own
// rendering is pinned in FatigueTrendCard's and the Recovery suites).
jest.mock('../FatigueTrendCard', () => () => null);
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
}));

import ReadinessCards, {
  ratingText, sorenessWord, fatigueWord, jointWord, checkinSummaryLine, RATINGS_NOTE,
} from '../ReadinessCards';
import * as database from '../../lib/database';
import { logError } from '../../lib/errorLog';

const NOW = Date.now();
// D214: "joint comfort" -> "joint discomfort", the scale's own name (0 = none).
const WAITING_CAPTION = 'These read the soreness you report before a session and the fatigue and joint discomfort you rate after it. They appear after two rated sessions in the last two weeks.';
const AVERAGES_CAPTION = 'Averages of your rated sessions in the last two weeks, the most recent counting most.';
const ROW_LABELS = ['Soreness before sessions', 'Fatigue after sessions', 'Joint discomfort after sessions'];

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ReadinessCards userId="u1" {...props} />);
  });
  await flush();
  return tree;
}

// N completed, recent (inside the 14-day gauge window) sessions, each
// rating all three gauge inputs together -- the ordinary shape the app's
// own flow produces (pre-workout soreness plus post-workout fatigue and
// joint comfort).
function ratedWorkouts(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`, isCompleted: true, setCount: 1,
    startedAt: NOW - i * 60000, endedAt: NOW - i * 60000,
    soreness24hBefore: 2, fatigueLevel: 2, jointDiscomfort: 1,
  }));
}

describe('ReadinessCards waiting-state caption and per-row notes (F3, P3(a))', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCheckins.mockResolvedValue([]);
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
  });

  test('0 rated sessions: the caption renders and every rating row reads "not rated yet"', async () => {
    database.getAllWorkouts.mockResolvedValue([]);
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain(WAITING_CAPTION);
    for (const label of ROW_LABELS) expect(all).toContain(`${label} · not rated yet`);
    expect(all).not.toContain(AVERAGES_CAPTION);
    expect(all).not.toContain('After a couple of sessions');
  });

  test('1 rated session: the caption renders and every rating row reads "one rated session so far"', async () => {
    database.getAllWorkouts.mockResolvedValue(ratedWorkouts(1));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain(WAITING_CAPTION);
    for (const label of ROW_LABELS) expect(all).toContain(`${label} · one rated session so far`);
    expect(all.some((t) => /not rated yet/.test(t))).toBe(false);
  });

  test('2 rated sessions: each row reads its word first and its number second, on its own true scale; the waiting caption is gone and the averages caption shows', async () => {
    database.getAllWorkouts.mockResolvedValue(ratedWorkouts(2));
    const tree = await render();
    const all = texts(tree);
    expect(all).not.toContain(WAITING_CAPTION);
    expect(all.some((t) => /not rated yet|one rated session so far/.test(t))).toBe(false);
    // The fixtures answer soreness 2 (mild), fatigue 2 (mild), joint 1 (slight).
    expect(all).toContain('Soreness before sessions · mild (2.0 of 3)');
    expect(all).toContain('Fatigue after sessions · mild (2.0 of 5)');
    expect(all).toContain('Joint discomfort after sessions · slight (1.0 of 3)');
    expect(all).toContain(AVERAGES_CAPTION);
  });

  test('D214 RC-1: the false "Scale 1-5 · Lower is better" note is gone, and nothing says joint "comfort"', async () => {
    database.getAllWorkouts.mockResolvedValue(ratedWorkouts(2));
    const tree = await render();
    const joined = texts(tree).join(' | ');
    expect(joined).not.toMatch(/Scale 1-5|Lower is better/);
    expect(joined).not.toMatch(/joint comfort|Joint comfort/i);
  });

  // RE-ANCHORED D214 addendum 9 (census 0.23, plain-English order 2026-10-02):
  // "fresh" is the rating BUTTON's word; printed as the answer to "Soreness
  // before sessions" it is not what anyone says, so the lowest band reads "not
  // sore". The scale (1 to 3), the thresholds and the other two bands are
  // unchanged, and the (i) still names the buttons' own words.
  test('D214 RC-2: soreness is on its stored 1 to 3 scale, no display shift: a person who always answers Fresh reads not sore', async () => {
    database.getAllWorkouts.mockResolvedValue(Array.from({ length: 3 }, (_, i) => ({
      id: `w${i}`, isCompleted: true, setCount: 1, startedAt: NOW - i * 60000, endedAt: NOW - i * 60000,
      soreness24hBefore: 1, fatigueLevel: 1, jointDiscomfort: 0,
    })));
    const all = texts(await render());
    expect(all).toContain('Soreness before sessions · not sore (1.0 of 3)');
    expect(all).toContain('Fatigue after sessions · fresh (1.0 of 5)');
    expect(all).toContain('Joint discomfort after sessions · none (0.0 of 3)');
  });

  test('D214 RC-3: fatigue 3 is "moderate", the word the button said, and the top answers read sore, exhausted and significant', async () => {
    database.getAllWorkouts.mockResolvedValue(Array.from({ length: 2 }, (_, i) => ({
      id: `w${i}`, isCompleted: true, setCount: 1, startedAt: NOW - i * 60000, endedAt: NOW - i * 60000,
      soreness24hBefore: 3, fatigueLevel: 3, jointDiscomfort: 3,
    })));
    const all = texts(await render());
    expect(all).toContain('Soreness before sessions · sore (3.0 of 3)');
    expect(all).toContain('Fatigue after sessions · moderate (3.0 of 5)');
    expect(all).toContain('Joint discomfort after sessions · significant (3.0 of 3)');
  });

  test('no coloured dots: the ratings carry words, not a status colour', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'ReadinessCards.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/gaugeDot|dotColor/);
    expect(code).not.toMatch(/\[2, 3, 4\]/);
  });
});

describe('the rating words and numbers (D214 7.2 item 4)', () => {
  test('soreness 1-3: not sore under 1.5, mild to 2.5, sore above (addendum 9, 0.23)', () => {
    expect([1, 1.49].map(sorenessWord)).toEqual(['not sore', 'not sore']);
    expect([1.5, 2, 2.5].map(sorenessWord)).toEqual(['mild', 'mild', 'mild']);
    expect([2.51, 3].map(sorenessWord)).toEqual(['sore', 'sore']);
  });

  test('fatigue 1-5: the summary\'s own words by nearest', () => {
    expect([1, 1.4].map(fatigueWord)).toEqual(['fresh', 'fresh']);
    expect([1.6, 2.4].map(fatigueWord)).toEqual(['mild', 'mild']);
    expect([2.6, 3, 3.4].map(fatigueWord)).toEqual(['moderate', 'moderate', 'moderate']);
    expect([3.6, 4.4].map(fatigueWord)).toEqual(['high', 'high']);
    expect([4.6, 5].map(fatigueWord)).toEqual(['exhausted', 'exhausted']);
  });

  test('joint discomfort 0-3: none under 0.5, slight to 1.5, moderate to 2.5, significant above', () => {
    expect([0, 0.49].map(jointWord)).toEqual(['none', 'none']);
    expect([0.5, 1, 1.5].map(jointWord)).toEqual(['slight', 'slight', 'slight']);
    expect([1.51, 2.5].map(jointWord)).toEqual(['moderate', 'moderate']);
    expect([2.51, 3].map(jointWord)).toEqual(['significant', 'significant']);
  });

  test('ratingText: the spec\'s own three examples, and no verdict from a single answer', () => {
    expect(ratingText({ label: 'Soreness before sessions', value: 1.4, samples: 5, word: sorenessWord, max: 3 }))
      .toBe('Soreness before sessions · not sore (1.4 of 3)');
    expect(ratingText({ label: 'Fatigue after sessions', value: 3.0, samples: 5, word: fatigueWord, max: 5 }))
      .toBe('Fatigue after sessions · moderate (3.0 of 5)');
    expect(ratingText({ label: 'Joint discomfort after sessions', value: 0.2, samples: 5, word: jointWord, max: 3 }))
      .toBe('Joint discomfort after sessions · none (0.2 of 3)');
    expect(ratingText({ label: 'Fatigue after sessions', value: 4, samples: 1, word: fatigueWord, max: 5 }))
      .toBe('Fatigue after sessions · one rated session so far');
    expect(ratingText({ label: 'Fatigue after sessions', value: null, samples: 0, word: fatigueWord, max: 5 }))
      .toBe('Fatigue after sessions · not rated yet');
  });

  test('the (i) states the true scales and that soreness is asked BEFORE a session (RC-1, RC-6)', () => {
    expect(RATINGS_NOTE).toContain('Soreness is asked before a session');
    expect(RATINGS_NOTE).toContain('1 to 3 (fresh, mild, sore)');
    expect(RATINGS_NOTE).toContain('1 to 5 (fresh, mild, moderate, high, exhausted)');
    expect(RATINGS_NOTE).toContain('0 to 3 (none, slight, moderate, significant)');
    expect(RATINGS_NOTE).not.toMatch(/feedback after each workout|Joint Comfort is also 1-5|lower is better/i);
  });
});

describe('ReadinessCards "Rate your last session" button (F3, P3(a))', () => {
  // routineName only ever resolves from getRecentCompletedWorkouts' own
  // routines join (getWorkoutById is a bare `SELECT * FROM workouts` and
  // never carries it) -- fixture and the dedicated test below both pin
  // that.
  const LAST_WORKOUT_BASE = {
    id: 'w-last', durationMinutes: 42, startedAt: NOW - 3600000, endedAt: NOW - 3000000,
    routineId: 'r1', routineName: 'Push Day',
  };
  const LAST_SETS = [
    { id: 's1', workoutId: 'w-last', exerciseId: 'ex1', weight: 100, actualReps: 8, setType: 'straight' },
  ];
  const ALL_EXERCISES = [{ id: 'ex1', name: 'Bench Press', exerciseType: 'weight_reps', loadSemantics: 'total' }];

  beforeEach(() => {
    jest.clearAllMocks();
    database.getAllWorkouts.mockResolvedValue([]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCheckins.mockResolvedValue([]);
    database.getWorkoutSetsForWorkout.mockResolvedValue(LAST_SETS);
    database.getAllExercises.mockResolvedValue(ALL_EXERCISES);
  });

  test('absent when there is no completed session', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
    const tree = await render();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Rate your last session' })).toThrow();
  });

  test('absent when the latest session already carries both post-session ratings', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([{ ...LAST_WORKOUT_BASE, fatigueLevel: 2, jointDiscomfort: 1 }]);
    const tree = await render();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Rate your last session' })).toThrow();
  });

  test('renders when fatigueLevel is missing, and pressing it calls onRateLastSession with readOnly/allowRating/workoutId/routineName', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([{ ...LAST_WORKOUT_BASE, fatigueLevel: null, jointDiscomfort: 1 }]);
    const onRateLastSession = jest.fn();
    const tree = await render({ onRateLastSession });
    const button = tree.root.findByProps({ accessibilityLabel: 'Rate your last session' });
    act(() => { button.props.onPress(); });
    expect(onRateLastSession).toHaveBeenCalledTimes(1);
    const params = onRateLastSession.mock.calls[0][0];
    expect(params.workoutId).toBe('w-last');
    expect(params.readOnly).toBe(true);
    expect(params.allowRating).toBe(true);
    // getRecentCompletedWorkouts' routines join, not getWorkoutById.
    expect(params.routineName).toBe('Push Day');
  });

  test('renders when jointDiscomfort is missing', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([{ ...LAST_WORKOUT_BASE, fatigueLevel: 2, jointDiscomfort: null }]);
    const tree = await render();
    expect(tree.root.findByProps({ accessibilityLabel: 'Rate your last session' })).toBeTruthy();
  });
});

describe('ReadinessCards "From your weekly check-in" row (P3(b), D214 RC-16 and RC-34)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database.getAllWorkouts.mockResolvedValue([]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
  });

  const withCheckin = (row) => database.getRecentCheckins.mockImplementation(async (_userId, count) => (count === 1 ? [row] : []));

  test("renders the latest check-in's week and its own words, with \"of 5\" after each score and sleep in hours", async () => {
    // Within 14 days of its week: the Monday of the current week, local.
    const weekStart = Date.now() - 4 * 86400000;
    withCheckin({ weekStart, energyScore: 4, stressScore: 2, sleepHours: 7.5, sorenessScore: 3 });
    const tree = await render();
    const joined = texts(tree).join(' ');
    expect(joined).toContain('From your weekly check-in');
    expect(joined).toMatch(/Week of \d{1,2} [A-Z][a-z]{2}/);
    expect(joined).toContain('Energy good (4 of 5)');
    expect(joined).toContain('Stress mild (2 of 5)');
    expect(joined).toContain('Soreness moderate (3 of 5)');
    expect(joined).toContain('Sleep 7.5 hours');
    // Never the old slash form, and sleep in ONE measure: hours only.
    expect(joined).not.toMatch(/\d\/5/);
    expect(joined).not.toMatch(/Sleep [\d.]+ h\b(?!ours)/);
  });

  test('is absent entirely when there is no check-in', async () => {
    database.getRecentCheckins.mockResolvedValue([]);
    const tree = await render();
    expect(texts(tree)).not.toContain('From your weekly check-in');
  });

  test('is absent when the latest check-in is more than 14 days old (RC-16: it has no age otherwise)', async () => {
    withCheckin({ weekStart: Date.now() - 20 * 86400000, energyScore: 4, stressScore: 2, sleepHours: 7.5, sorenessScore: 3 });
    const tree = await render();
    expect(texts(tree)).not.toContain('From your weekly check-in');
  });

  test('omits a null value from the line but keeps the ones that exist', async () => {
    withCheckin({ weekStart: Date.now() - 2 * 86400000, energyScore: 5, stressScore: null, sleepHours: null, sorenessScore: 1 });
    const tree = await render();
    const joined = texts(tree).join(' ');
    expect(joined).toContain('Energy high (5 of 5)');
    expect(joined).toContain('Soreness none (1 of 5)');
    expect(joined).not.toMatch(/Stress /);
    expect(joined).not.toMatch(/Sleep /);
  });

  test('checkinSummaryLine: the 14-day bound is exact and a missing check-in is empty', () => {
    const now = 1770000000000;
    const row = { energyScore: 3, stressScore: 3, sleepHours: 1, sorenessScore: 2 };
    expect(checkinSummaryLine(null, now)).toBe('');
    expect(checkinSummaryLine({ ...row, weekStart: now - 14 * 86400000 }, now)).toContain('Energy normal (3 of 5)');
    expect(checkinSummaryLine({ ...row, weekStart: now - 14 * 86400000 - 1 }, now)).toBe('');
    expect(checkinSummaryLine({ ...row, weekStart: now - 86400000 }, now)).toContain('Sleep 1 hour');
    expect(checkinSummaryLine({ ...row, weekStart: now - 86400000 }, now)).not.toContain('Sleep 1 hours');
  });
});

describe('a failed ratings read is said and logged, never swallowed (D214 RC-33)', () => {
  test('the ratings card says it could not load, the milestone does not claim "1 to go", and the failure is logged', async () => {
    jest.clearAllMocks();
    database.getAllWorkouts.mockRejectedValue(new Error('db down'));
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCheckins.mockResolvedValue([]);
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain("Couldn't load your ratings just now.");
    expect(all.some((t) => /to go: First session/.test(t))).toBe(false);
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadRatings', expect.any(Error), { userId: 'u1' });
  });
});
