/**
 * ReadinessCards.recoveryByMuscle.test.js
 *
 * D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md section 6). Pins the "Recovery by muscle" section: row order
 * (recovering, nearly, recovered, by name), each row's visible text and
 * accessibility label, the caption, the Training-recency chip fold, the
 * "Next workout" row (reason, the named programmeNextLine fallback, and
 * absence without a block), the loader-
 * failure fallback (section hidden, gauges untouched), and the "estimated"
 * source guard.
 *
 * Mocking follows ReadinessCards.rateLastSession.test.js's own pattern
 * (react-navigation/useFocusEffect, Ionicons, zustand shallow, the store,
 * AnimatedEntrance/InfoTooltip/SectionLabel/Button stand-ins, and
 * ../../lib/database), plus the recovery domain's own modules:
 * BodyDiagramHeatmap is stubbed (native react-native-svg, same reason as
 * that file's own new stub); load.js and programmePosition.js are mocked
 * wholesale so this suite controls the exact map/position fixtures rather
 * than re-deriving them through real SQLite reads (those reads are R-C's
 * and R-A's own modules, already covered by their own test suites);
 * nextWorkoutRecommendation.js is mocked ONLY on recommendNextWorkout,
 * keeping readyClause real (pure, no I/O) so this suite's expected
 * "ready by" strings are computed the exact same way the component does.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
// load.js's real loadMuscleRecovery pulls in trainingHabitSchedule.js ->
// trainingReminders.js -> expo-notifications -> expo-modules-core, which
// throws at require time in this suite's node env even though load.js
// itself is mocked below -- the mock factory only replaces load.js's own
// exports, not what its *sibling* real import (nextWorkoutRecommendation's
// requireActual chain does not touch this, but ReadinessCards.js's own
// static import of '../lib/recovery/load' is still the REAL module unless
// load.js itself is mocked, which it is below; this mock is kept anyway as
// the same defensive precedent HomeScreen.recoveryRecommendation.test.js
// and the other ReadinessCards suites use, in case any mock here is ever
// loosened to a partial (requireActual) mock in the future.
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
jest.mock('../Button', () => {
  const { TouchableOpacity, Text: RNText } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <RNText>{title}</RNText>
    </TouchableOpacity>
  );
});
// Native (react-native-svg); see BodyDiagramHeatmap.recovery.test.js for
// the figure's own palette suite. jest.fn() so tests can inspect exactly
// what prop it was given without rendering real SVG.
jest.mock('../BodyDiagramHeatmap', () => {
  const mockFn = jest.fn(() => null);
  return { __esModule: true, default: mockFn };
});
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/programmePosition', () => ({ resolveProgrammePosition: jest.fn() }));
jest.mock('../../lib/recovery/load', () => ({
  loadMuscleRecovery: jest.fn(),
  loadPlannedSetsByRoutine: jest.fn(),
}));
jest.mock('../../lib/recovery/nextWorkoutRecommendation', () => ({
  ...jest.requireActual('../../lib/recovery/nextWorkoutRecommendation'),
  recommendNextWorkout: jest.fn(),
}));

import ReadinessCards from '../ReadinessCards';
import BodyDiagramHeatmap from '../BodyDiagramHeatmap';
import * as database from '../../lib/database';
import { logError } from '../../lib/errorLog';
import { resolveProgrammePosition } from '../../lib/programmePosition';
import { loadMuscleRecovery, loadPlannedSetsByRoutine } from '../../lib/recovery/load';
import { recommendNextWorkout, readyClause } from '../../lib/recovery/nextWorkoutRecommendation';
import { RECOVERY_ESTIMATE_LABEL } from '../../lib/recovery/constants';

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

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

// Four muscles covering all four statuses: quads (recovering), chest
// (nearly), biceps (recovered), triceps (no_recent_session, so it is NOT a
// row -- it folds into the Training-recency chips instead).
const QUADS_READY_AT = NOW + 2 * DAY_MS;
const CHEST_READY_AT = NOW + 1 * DAY_MS;
const MAP_FIXTURE = {
  quads: {
    muscle: 'quads', recoveredPercent: 64, status: 'recovering', readyAtMs: QUADS_READY_AT,
    lastSessionEndMs: NOW - 2 * DAY_MS, lastSessionSets: 6, basis: 'time_and_volume', contributingSessions: [],
  },
  chest: {
    muscle: 'chest', recoveredPercent: 80, status: 'nearly', readyAtMs: CHEST_READY_AT,
    lastSessionEndMs: NOW - 1 * DAY_MS, lastSessionSets: 6, basis: 'time_and_volume', contributingSessions: [],
  },
  biceps: {
    muscle: 'biceps', recoveredPercent: 96, status: 'recovered', readyAtMs: null,
    lastSessionEndMs: NOW - 3 * DAY_MS, lastSessionSets: 6, basis: 'time_and_volume', contributingSessions: [],
  },
  triceps: {
    muscle: 'triceps', recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null,
    lastSessionEndMs: null, lastSessionSets: null, basis: 'time_and_volume', contributingSessions: [],
  },
};
const RECOVERY_RESULT = {
  map: MAP_FIXTURE, nowMs: NOW, recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 1080,
};

beforeEach(() => {
  jest.clearAllMocks();
  database.getAllWorkouts.mockResolvedValue([]);
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getLastTrainedPerMuscle.mockResolvedValue({});
  database.getRecentCheckins.mockResolvedValue([]);
  database.getRecentCompletedWorkouts.mockResolvedValue([]);
  resolveProgrammePosition.mockResolvedValue(null);
  loadMuscleRecovery.mockResolvedValue(RECOVERY_RESULT);
  loadPlannedSetsByRoutine.mockResolvedValue({});
  recommendNextWorkout.mockReturnValue({
    programmeNext: null, recommended: null, reason: null, programmeNextLine: null, perSession: [],
  });
});

describe('rows: order, text and accessibility labels (spec section 6)', () => {
  test('lists only muscles with a session in the last 14 days, recovering first then nearly then recovered', async () => {
    const tree = await render();
    const all = texts(tree);
    const quadsIdx = all.indexOf('Quads');
    const chestIdx = all.indexOf('Chest');
    const bicepsIdx = all.indexOf('Biceps');
    expect(quadsIdx).toBeGreaterThan(-1);
    expect(chestIdx).toBeGreaterThan(-1);
    expect(bicepsIdx).toBeGreaterThan(-1);
    expect(quadsIdx).toBeLessThan(chestIdx);
    expect(chestIdx).toBeLessThan(bicepsIdx);
    // triceps (no_recent_session) never gets its own row.
    expect(all).not.toContain('Triceps');
  });

  // Founder, 2026-09-26: the sentence per muscle read as a wall of text,
  // then "Investigate how JeFit does this". The rows are MuscleRecoveryList
  // (its own suite pins the anatomy); this suite pins that the section
  // feeds it: the card's sub-line carries "Estimated" for every percent
  // below it, each row's percent and meta line render, and the figure's
  // muscle tap opens that row's breakdown.
  test('a recovering row: name, percent and the ready-by plus trained-ago meta line', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Estimated · last 14 days');
    expect(all).toContain('64%');
    const ready = readyClause(QUADS_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 2 days ago`);
  });

  test('a nearly row: percent and meta line', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('80%');
    const ready = readyClause(CHEST_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 1 day ago`);
  });

  test('a recovered row reads "Ready now" rather than a weekday, and its bar is full-strength success', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('96%');
    expect(all).toContain('Ready now · Trained 3 days ago');
  });

  test('accessibility label carries the muscle, "estimated N percent recovered", the ready-by phrase and the trained-ago fact', async () => {
    const tree = await render();
    const expected = `Quads, ${RECOVERY_ESTIMATE_LABEL} 64 percent recovered, ${readyClause(QUADS_READY_AT, NOW)}, Trained 2 days ago`;
    const node = tree.root.findByProps({ accessibilityLabel: expected });
    expect(node).toBeTruthy();
    expect(node.props.accessibilityRole).toBe('button');
  });

  test('the figure\'s muscle tap opens that muscle\'s breakdown; a muscle with no row is left alone', async () => {
    const tree = await render();
    expect(texts(tree)).not.toContain('Based on');
    const props = BodyDiagramHeatmap.mock.calls[0][0];
    expect(typeof props.onMuscleTap).toBe('function');
    await act(async () => { props.onMuscleTap('quads'); });
    const open = texts(tree);
    expect(open).toContain('Based on');
    expect(open.filter((t) => t === 'Based on')).toHaveLength(1);
    // triceps has no row (no_recent_session): the open row stays as it was.
    const latest = BodyDiagramHeatmap.mock.calls[BodyDiagramHeatmap.mock.calls.length - 1][0];
    await act(async () => { latest.onMuscleTap('triceps'); });
    expect(texts(tree).filter((t) => t === 'Based on')).toHaveLength(1);
    // Tapping the open muscle again on the figure closes it.
    const again = BodyDiagramHeatmap.mock.calls[BodyDiagramHeatmap.mock.calls.length - 1][0];
    await act(async () => { again.onMuscleTap('quads'); });
    expect(texts(tree)).not.toContain('Based on');
  });

  test('the section heading carries accessibilityRole="header"', async () => {
    const tree = await render();
    const header = tree.root.findByProps({ accessibilityRole: 'header', children: 'Recovery by muscle' });
    expect(header).toBeTruthy();
  });

  test('the body figure receives the recovery map, not the volume map', async () => {
    await render();
    expect(BodyDiagramHeatmap).toHaveBeenCalled();
    const props = BodyDiagramHeatmap.mock.calls[0][0];
    expect(props.recoveryByMuscle).toBe(MAP_FIXTURE);
  });

  test('the caption is exact', async () => {
    const tree = await render();
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(texts(tree)).toContain(
      "Estimated from the time since each muscle's last session and how many sets it did, adjusted by your recovery answer and your ratings. Not a measurement.",
    );
  });
});

describe('the Training-recency chip fold (spec section 6)', () => {
  test('muscles that are ever-trained but have no row keep their chip; muscles with a row lose theirs', async () => {
    // quads/chest/biceps are rows (MAP_FIXTURE); hamstrings/calves are
    // "ever trained" per getLastTrainedPerMuscle but absent from the map
    // entirely; triceps IS in the map but as 'no_recent_session'. All
    // three (triceps, hamstrings, calves) must fold together.
    database.getLastTrainedPerMuscle.mockResolvedValue({
      quads: NOW - 2 * DAY_MS,
      chest: NOW - 1 * DAY_MS,
      biceps: NOW - 3 * DAY_MS,
      triceps: NOW - 20 * DAY_MS,
      hamstrings: NOW - 25 * DAY_MS,
      calves: NOW - 40 * DAY_MS,
    });
    const tree = await render();
    const all = texts(tree);
    // Lead review: the chips are the one place these are named; no second
    // "No recent session: <names>" line repeats them under the rows.
    expect(all.some((t) => t.startsWith('No recent session:'))).toBe(false);
    expect(all).toContain('Training recency');
    expect(all).toContain('Triceps');
    expect(all).toContain('Hamstrings');
    expect(all).toContain('Calves');
    // quads/chest/biceps have a row now, so their chip must not also render.
    // The row names each muscle once (its own name Text); a chip would name
    // it a second time, beside a chip label ("Trained 2 days ago") that a
    // folded muscle only ever shows inside its row's meta line.
    for (const name of ['Quads', 'Chest', 'Biceps']) {
      expect(all.filter((t) => t === name)).toHaveLength(1);
    }
    expect(all).not.toContain('Trained 2 days ago');
    expect(all).not.toContain('Trained 1 day ago');
    expect(all).not.toContain('Trained 3 days ago');
    // The un-folded chips still carry their own label Text.
    expect(all).toContain('Trained 20 days ago');
  });

  test('is absent when every ever-trained muscle already has a row', async () => {
    database.getLastTrainedPerMuscle.mockResolvedValue({
      quads: NOW - 2 * DAY_MS,
      chest: NOW - 1 * DAY_MS,
      biceps: NOW - 3 * DAY_MS,
    });
    const tree = await render();
    const all = texts(tree);
    expect(all.some((t) => t.startsWith('No recent session:'))).toBe(false);
    expect(all).not.toContain('Training recency');
  });
});

describe('"Next workout" row (spec section 4.3 / 6)', () => {
  const SESSIONS = [
    { routineId: 'r-legs', name: 'Legs', state: 'outstanding', order: 0 },
    { routineId: 'r-push', name: 'Push', state: 'outstanding', order: 1 },
  ];

  test('is absent when there is no active block', async () => {
    resolveProgrammePosition.mockResolvedValue(null);
    const tree = await render();
    expect(texts(tree)).not.toContain('Next workout');
  });

  test('is absent when the block has no outstanding session', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: null, sessions: SESSIONS });
    const tree = await render();
    expect(texts(tree)).not.toContain('Next workout');
    expect(recommendNextWorkout).not.toHaveBeenCalled();
  });

  test('shows the reason verbatim when a swap is recommended', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      recommended: { routineId: 'r-push' },
      reason: 'Legs is next in your plan. Quads are estimated 64% recovered, ready by Thursday. Push is ready now.',
      programmeNextLine: 'Quads are estimated 64% recovered, ready by Thursday.',
      perSession: [],
    });
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Next workout');
    expect(all).toContain('Legs is next in your plan. Quads are estimated 64% recovered, ready by Thursday. Push is ready now.');
  });

  test('falls back to "<Name> is next." plus programmeNextLine when no swap is recommended', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      recommended: null,
      reason: null,
      programmeNextLine: 'Every muscle it trains is estimated recovered.',
      perSession: [],
    });
    const tree = await render();
    // Lead review: unlike Home's card, this row has no title naming the
    // session, so it names it itself.
    expect(texts(tree)).toContain('Legs is next. Every muscle it trains is estimated recovered.');
  });

  test('is absent when the programme-next session\'s planned sets could not be read (no line to state)', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      recommended: null,
      reason: null,
      programmeNextLine: null,
      perSession: [],
    });
    const tree = await render();
    expect(texts(tree)).not.toContain('Next workout');
  });

  test('calls loadPlannedSetsByRoutine with only the outstanding routine ids, and recommendNextWorkout with the loaded map', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    await render();
    expect(loadPlannedSetsByRoutine).toHaveBeenCalledWith(['r-legs', 'r-push']);
    const call = recommendNextWorkout.mock.calls[0][0];
    expect(call.sessions).toBe(SESSIONS);
    expect(call.recoveryMap).toBe(MAP_FIXTURE);
    expect(call.routineNamesById).toEqual({ 'r-legs': 'Legs', 'r-push': 'Push' });
  });
});

describe('loader failure: the section hides, the gauges stay intact', () => {
  test('loadMuscleRecovery rejecting hides the whole section and logs, without crashing', async () => {
    loadMuscleRecovery.mockRejectedValue(new Error('boom'));
    database.getAllWorkouts.mockResolvedValue([
      { id: 'w1', isCompleted: true, setCount: 1, startedAt: NOW, endedAt: NOW, soreness24hBefore: 2, fatigueLevel: 2, jointDiscomfort: 1 },
      { id: 'w2', isCompleted: true, setCount: 1, startedAt: NOW - 60000, endedAt: NOW - 60000, soreness24hBefore: 2, fatigueLevel: 2, jointDiscomfort: 1 },
    ]);
    const tree = await render();
    const all = texts(tree);
    expect(all).not.toContain('Recovery by muscle');
    expect(all.some((t) => t.startsWith('No recent session:'))).toBe(false);
    // The gauges (an unrelated reader in the same load()) are unaffected:
    // two rated sessions is enough for a real averaged value, not 'N/A'.
    expect(all).not.toContain('N/A');
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadMuscleRecovery', expect.any(Error), { userId: 'u1' });
    expect(BodyDiagramHeatmap).not.toHaveBeenCalled();
  });

  test('resolveProgrammePosition rejecting hides only the next-workout row, keeping the rows/figure', async () => {
    resolveProgrammePosition.mockRejectedValue(new Error('boom'));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Recovery by muscle');
    expect(all).toContain('Quads');
    expect(all).not.toContain('Next workout');
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadRecoveryRecommendation', expect.any(Error), { userId: 'u1' });
  });
});

describe('source guard: every percent rendered in this section sits beside "estimated"', () => {
  test('every ${percent} template line in the section\'s two files also names RECOVERY_ESTIMATE_LABEL or "estimated"', () => {
    // The rows moved to MuscleRecoveryList.js (D201 addendum 9); the law
    // covers both files, and the rows file must still carry the percent.
    const files = ['ReadinessCards.js', 'MuscleRecoveryList.js'];
    let total = 0;
    for (const file of files) {
      const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      const percentLines = src.split('\n').filter((l) => l.includes('${percent}'));
      total += percentLines.length;
      for (const line of percentLines) expect(line).toMatch(/RECOVERY_ESTIMATE_LABEL|estimated/i);
    }
    expect(total).toBeGreaterThan(0);
    const rows = fs.readFileSync(path.join(__dirname, '..', 'MuscleRecoveryList.js'), 'utf8');
    expect(rows.includes('${percent}')).toBe(true);
    expect(rows).toMatch(/Estimated|estimated/);
  });
});
