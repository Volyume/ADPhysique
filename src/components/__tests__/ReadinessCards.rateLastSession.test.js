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
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
}));

import ReadinessCards from '../ReadinessCards';
import * as database from '../../lib/database';

const NOW = Date.now();
const WAITING_CAPTION = 'These read the soreness you report before a session and the fatigue and joint comfort you rate after it. They appear after two rated sessions in the last two weeks.';

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

describe('ReadinessCards waiting-state caption and per-gauge notes (F3, P3(a))', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCheckins.mockResolvedValue([]);
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
  });

  test('0 rated sessions: the caption renders and every gauge reads "Not rated yet"', async () => {
    database.getAllWorkouts.mockResolvedValue([]);
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain(WAITING_CAPTION);
    expect(all.filter((t) => t === 'Not rated yet')).toHaveLength(3);
    expect(all).not.toContain('After a couple of sessions');
  });

  test('1 rated session: the caption renders and every gauge reads "One rated session so far"', async () => {
    database.getAllWorkouts.mockResolvedValue(ratedWorkouts(1));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain(WAITING_CAPTION);
    expect(all.filter((t) => t === 'One rated session so far')).toHaveLength(3);
    expect(all).not.toContain('Not rated yet');
  });

  test('2 rated sessions: neither the caption nor a waiting note renders', async () => {
    database.getAllWorkouts.mockResolvedValue(ratedWorkouts(2));
    const tree = await render();
    const all = texts(tree);
    expect(all).not.toContain(WAITING_CAPTION);
    expect(all).not.toContain('Not rated yet');
    expect(all).not.toContain('One rated session so far');
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

describe('ReadinessCards "From your weekly check-in" row (P3(b))', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database.getAllWorkouts.mockResolvedValue([]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getLastTrainedPerMuscle.mockResolvedValue({});
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
  });

  test("renders the latest check-in's week and values", async () => {
    const weekStart = new Date(2026, 8, 21).getTime(); // 21 Sep 2026, local
    database.getRecentCheckins.mockImplementation(async (_userId, count) => (
      count === 1
        ? [{ weekStart, energyScore: 4, stressScore: 2, sleepHours: 7.5, sorenessScore: 3 }]
        : []
    ));
    const tree = await render();
    const joined = texts(tree).join(' ');
    expect(joined).toContain('From your weekly check-in');
    expect(joined).toContain('Week of 21 Sep');
    expect(joined).toContain('Energy 4/5');
    expect(joined).toContain('Stress 2/5');
    expect(joined).toContain('Sleep 7.5 h');
    expect(joined).toContain('Soreness 3/5');
  });

  test('is absent entirely when there is no check-in', async () => {
    database.getRecentCheckins.mockResolvedValue([]);
    const tree = await render();
    expect(texts(tree)).not.toContain('From your weekly check-in');
  });

  test('omits a null value from the line but keeps the ones that exist', async () => {
    database.getRecentCheckins.mockImplementation(async (_userId, count) => (
      count === 1
        ? [{ weekStart: NOW, energyScore: 5, stressScore: null, sleepHours: null, sorenessScore: 1 }]
        : []
    ));
    const tree = await render();
    const joined = texts(tree).join(' ');
    expect(joined).toContain('Energy 5/5');
    expect(joined).toContain('Soreness 1/5');
    expect(joined).not.toMatch(/Stress \d/);
    expect(joined).not.toMatch(/Sleep [\d.]+ h/);
  });
});
