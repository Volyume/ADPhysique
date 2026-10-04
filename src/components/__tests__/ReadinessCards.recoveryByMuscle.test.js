/**
 * ReadinessCards.recoveryByMuscle.test.js
 *
 * D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md section 6). Pins the "Recovery by muscle" section: row order
 * (recovering, nearly, recovered, by name), each row's visible text and
 * accessibility label, the caption, the Training-recency chip fold, the
 * next-workout sentence (the named programmeNextLine fallback, and
 * absence without a block), the sessions still to do, the loader-
 * failure fallback (section hidden, gauges untouched), and the "estimated"
 * source guard.
 *
 * RE-PINNED under D219 lane A6 (founder 2026-10-04: "Next workout should be
 * planned as the plan builds it we shouldn't be having users to view the plan
 * and see a recommendation and change order"; design 00-AUDIT-AND-PLAN.md
 * section 5.2): the screen no longer prints a swap reason ("Legs is next in
 * your plan. Quads are estimated 64% recovered, ready by Thursday. Push is
 * ready now.") and the "Still to do this plan week" rows no longer carry a
 * readiness. The swap case is now the proof that a result still carrying the
 * old recommended/reason fields prints only the plan's own next session; the
 * rows case is now the proof that the rows are the plan's list, names only,
 * in plan order, whatever each session's readiness. The plan's own next
 * session is still described by the existing non-swap sentence ("Upper A is
 * next: Back is the least recovered ... "), which stays until the "Next in
 * your plan" card replaces it.
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
// D214 (lane 2): the fatigue-trend bars moved into ReadinessCards; the card
// draws react-native-svg, so it is stubbed like the figure.
jest.mock('../FatigueTrendCard', () => () => null);
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
  // D218 (founder order 2026-10-03, audit F-2): ReadinessCards reads the
  // unfiltered exercise lookup; each test's own getAllExercises fixture stays
  // the contract by bridging the lookup to it.
  getExerciseLookup: jest.fn(async () => {
    const db = jest.requireMock('../../lib/database');
    const { buildExerciseLookup } = jest.requireActual('../../lib/exercise/lookup');
    return buildExerciseLookup(await db.getAllExercises());
  }),
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

import ReadinessCards, {
  recoveryByMuscleCaption, recoveryCounts, recoveryAnswerLine, buildNextWorkoutSentence, buildStillToDoRows,
  scrollToNode, RECOVERY_PERCENT_NOTE,
} from '../ReadinessCards';
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
async function render(props = {}, options = undefined) {
  let tree;
  await act(async () => {
    tree = create(<ReadinessCards userId="u1" {...props} />, options);
  });
  await flush();
  return tree;
}

// Four muscles covering all four statuses: quads (recovering), chest
// (nearly), biceps (recovered), triceps (no_recent_session, so it is NOT a
// row -- the line under the list names it, D214).
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
  database.getAllExercises.mockResolvedValue([]);
  resolveProgrammePosition.mockResolvedValue(null);
  loadMuscleRecovery.mockResolvedValue(RECOVERY_RESULT);
  loadPlannedSetsByRoutine.mockResolvedValue({});
  recommendNextWorkout.mockReturnValue({
    programmeNext: null, programmeNextLine: null, perSession: [],
  });
});

describe('the answer line leads the section (D214 Q7 = A)', () => {
  test('counts from the map: still recovering, nearly recovered when any, recovered', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('1 muscle still recovering, 1 nearly recovered, 1 recovered.');
    // It comes before the figure's list and the rows.
    expect(all.indexOf('1 muscle still recovering, 1 nearly recovered, 1 recovered.')).toBeLessThan(all.indexOf('Still recovering · 1'));
  });

  test('the answer line is `h3`, the largest text in the block', async () => {
    const { resolveTheme } = require('../../styles/theme');
    const THEME = resolveTheme({ theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined });
    const tree = await render();
    const node = tree.root.findAll((n) => n.type === 'Text'
      && [].concat(n.props.children).join('') === '1 muscle still recovering, 1 nearly recovered, 1 recovered.')[0];
    const style = Object.assign({}, ...[].concat(node.props.style).flat(3).filter(Boolean));
    expect(style.fontSize).toBe(THEME.type.h3.fontSize);
  });

  test('recoveryCounts and recoveryAnswerLine: every wording', () => {
    expect(recoveryCounts(MAP_FIXTURE)).toEqual({ recovering: 1, nearly: 1, recovered: 1 });
    expect(recoveryCounts(null)).toEqual({ recovering: 0, nearly: 0, recovered: 0 });
    expect(recoveryAnswerLine({ recovering: 4, nearly: 0, recovered: 8 })).toBe('4 muscles still recovering, 8 recovered.');
    expect(recoveryAnswerLine({ recovering: 4, nearly: 2, recovered: 8 })).toBe('4 muscles still recovering, 2 nearly recovered, 8 recovered.');
    expect(recoveryAnswerLine({ recovering: 1, nearly: 0, recovered: 0 })).toBe('1 muscle still recovering.');
    expect(recoveryAnswerLine({ recovering: 0, nearly: 2, recovered: 3 })).toBe('2 nearly recovered, 3 recovered.');
    expect(recoveryAnswerLine({ recovering: 0, nearly: 0, recovered: 8 })).toBe('All 8 muscles recovered.');
    expect(recoveryAnswerLine({ recovering: 0, nearly: 0, recovered: 1 })).toBe('1 muscle recovered.');
    expect(recoveryAnswerLine({ recovering: 0, nearly: 0, recovered: 0 })).toBeNull();
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
  test('a recovering row: name, "64% recovered" and the ready-by plus trained-ago meta line', async () => {
    const tree = await render();
    const all = texts(tree);
    // D214 plan 7.2: the sub-line says what the percents are estimated from.
    expect(all).toContain('Estimated from your sessions · last 14 days');
    // D214 RC-7 / plan 7.0 rule 4: a status word rides with every percent.
    expect(all).toContain('64% recovered');
    const ready = readyClause(QUADS_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 2 days ago`);
  });

  test('a nearly row: percent and meta line', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('80% recovered');
    const ready = readyClause(CHEST_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 1 day ago`);
  });

  test('D214 RC-19: the recovered muscles are one line of names until "Show details"; then a row reads "Ready now"', async () => {
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Recovered · 1');
    expect(all).toContain('Show details');
    expect(all).not.toContain('96% recovered');
    const link = tree.root.findAll((n) => n.props.accessibilityLabel === 'Show details for the recovered muscles' && typeof n.props.onPress === 'function')[0];
    await act(async () => { link.props.onPress(); });
    const open = texts(tree);
    expect(open).toContain('96% recovered');
    expect(open).toContain('Ready now · Trained 3 days ago');
  });

  test('accessibility label carries the muscle, "estimated N percent recovered", the ready-by phrase and the trained-ago fact', async () => {
    const tree = await render();
    const expected = `Quads, ${RECOVERY_ESTIMATE_LABEL} 64 percent recovered, ${readyClause(QUADS_READY_AT, NOW)}, Trained 2 days ago`;
    const node = tree.root.findByProps({ accessibilityLabel: expected });
    expect(node).toBeTruthy();
    expect(node.props.accessibilityRole).toBe('button');
  });

  test('the section heading carries accessibilityRole="header"', async () => {
    const tree = await render();
    const header = tree.root.findByProps({ accessibilityRole: 'header', children: 'Recovery by muscle' });
    expect(header).toBeTruthy();
  });

  test('the body figure receives the recovery map, not the volume map, and the selected muscle', async () => {
    await render();
    expect(BodyDiagramHeatmap).toHaveBeenCalled();
    const props = BodyDiagramHeatmap.mock.calls[0][0];
    expect(props.recoveryByMuscle).toBe(MAP_FIXTURE);
    expect(props.selectedMuscle).toBeNull();
  });

  test('the caption is exact, and its (i) carries the percent\'s referent and thresholds (RC-7, RC-22)', async () => {
    const tree = await render();
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(texts(tree)).toContain(
      'Estimated from how long ago each muscle was last trained and how many sets it had, adjusted for your answer to ‘How’s your recovery?’ and your ratings. Not a measurement.',
    );
    expect(RECOVERY_PERCENT_NOTE).toBe(
      "The percent is how much of the fatigue from a muscle's last session is estimated to have cleared; 90% counts as recovered, 75% as nearly. A session you rate as exhausting, or that leaves you sore or with joint discomfort, is estimated to take longer to recover.",
    );
  });
});

describe('the figure: a tap selects, opens the row and scrolls to it (D214 RC-12)', () => {
  const lastFigureProps = () => BodyDiagramHeatmap.mock.calls[BodyDiagramHeatmap.mock.calls.length - 1][0];

  test('a tap selects the muscle on the figure and opens its breakdown; a second tap closes it', async () => {
    const tree = await render();
    expect(texts(tree)).not.toContain('Based on');
    expect(typeof lastFigureProps().onMuscleTap).toBe('function');
    await act(async () => { lastFigureProps().onMuscleTap('quads'); });
    const open = texts(tree);
    expect(open).toContain('Based on');
    expect(open.filter((t) => t === 'Based on')).toHaveLength(1);
    expect(lastFigureProps().selectedMuscle).toBe('quads');
    await act(async () => { lastFigureProps().onMuscleTap('quads'); });
    expect(texts(tree)).not.toContain('Based on');
    expect(lastFigureProps().selectedMuscle).toBeNull();
  });

  test('a muscle with no row is SELECTED too (no more silence), and opens nothing', async () => {
    const tree = await render();
    await act(async () => { lastFigureProps().onMuscleTap('quads'); });
    await act(async () => { lastFigureProps().onMuscleTap('triceps'); });
    expect(lastFigureProps().selectedMuscle).toBe('triceps');
    expect(texts(tree)).not.toContain('Based on');
  });

  test('a recovered muscle chosen on the figure opens the Recovered group by itself', async () => {
    const tree = await render();
    expect(texts(tree)).not.toContain('96% recovered');
    await act(async () => { lastFigureProps().onMuscleTap('biceps'); });
    const open = texts(tree);
    expect(open).toContain('96% recovered');
    expect(open).toContain('Based on');
  });

  test('the tap scrolls the screen\'s ScrollView to the muscle\'s row, with headroom', async () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: { getInnerViewRef: () => 'inner', scrollTo } };
    // Every host node with a ref reports a measured y of 480 inside the scroll content.
    const createNodeMock = () => ({ measureLayout: (inner, onSuccess) => { onSuccess(0, 480); } });
    const tree = await render({ scrollRef }, { createNodeMock });
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { lastFigureProps().onMuscleTap('quads'); });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 480 - 16, animated: true });
    // A muscle with no row scrolls to the line that names it.
    await act(async () => { lastFigureProps().onMuscleTap('triceps'); });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(tree).toBeTruthy();
  });

  test('no ScrollView ref (Home\'s other uses) means no scroll and no error', async () => {
    await render();
    await act(async () => { lastFigureProps().onMuscleTap('quads'); });
  });

  test('scrollToNode: measures against the ScrollView\'s inner view and never goes above the top', () => {
    const scrollTo = jest.fn();
    const sv = { getInnerViewRef: () => 'inner', scrollTo };
    const node = { measureLayout: jest.fn((inner, ok) => ok(0, 5)) };
    expect(scrollToNode(sv, node, 16)).toBe(true);
    expect(node.measureLayout.mock.calls[0][0]).toBe('inner');
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    expect(scrollToNode(null, node)).toBe(false);
    expect(scrollToNode(sv, null)).toBe(false);
    expect(scrollToNode(sv, {})).toBe(false);
    expect(scrollToNode({ scrollTo }, node)).toBe(false);
  });
});

describe('the personal recovery learning (register D210)', () => {
  const ADJUSTED = {
    factor: 1.2, prior: 1, pairs: 24, reason: 'adjusted', pairsByMuscle: { quads: 24 },
  };

  test('the learning card shows whenever the loader returned a reading, including "still learning"', async () => {
    loadMuscleRecovery.mockResolvedValue({
      ...RECOVERY_RESULT,
      personal: {
        factor: 1, prior: 1, pairs: 3, reason: 'too_few', pairsByMuscle: {},
      },
    });
    const tree = await render({ sections: 'recovery' });
    expect(texts(tree)).toEqual(expect.arrayContaining(['Your recovery speed', 'Still learning']));
  });

  test('no reading (the learner was skipped or failed): no card, and the caption names the recovery answer', async () => {
    const tree = await render({ sections: 'recovery' });
    expect(texts(tree)).not.toContain('Your recovery speed');
    expect(texts(tree)).toContain(recoveryByMuscleCaption(null));
  });

  test('once the learned speed is in use, the caption and each breakdown name it', async () => {
    loadMuscleRecovery.mockResolvedValue({ ...RECOVERY_RESULT, personal: ADJUSTED });
    const tree = await render({ sections: 'recovery' });
    expect(texts(tree)).toContain(
      'Estimated from how long ago each muscle was last trained and how many sets it had, adjusted for your recovery speed (learned from your workouts) and your ratings. Not a measurement.',
    );
    // RE-ANCHORED D214 addendum 9 (census 0.7): "your first estimate", the
    // phrase the scale's own tick already uses ("First estimate").
    expect(texts(tree)).toContain('Slower than your first estimate');
    const quadsRow = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Quads,') && typeof n.props.onPress === 'function')[0];
    await act(async () => { quadsRow.props.onPress(); });
    expect(texts(tree)).toContain('Time, sets and your recovery speed');
  });

  test('recoveryByMuscleCaption: the answer until the learning has moved', () => {
    expect(recoveryByMuscleCaption({ ...ADJUSTED, reason: 'not_clear' })).toBe(recoveryByMuscleCaption(null));
    expect(recoveryByMuscleCaption(ADJUSTED)).toMatch(/your recovery speed \(learned from your workouts\) and your ratings/);
  });
});

describe('the line under the list names EVERY muscle with no row (replaces the Training-recency chips, D214 RC-17)', () => {
  test('muscles with no row are named, the dated ones with how long ago, the rest with the true 90-day window; no chips remain', async () => {
    // quads/chest/biceps are rows (MAP_FIXTURE); triceps IS in the map but as
    // 'no_recent_session'; hamstrings/calves are absent from the map entirely.
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
    const line = all.find((t) => t.startsWith('No session in the last 14 days:'));
    expect(line).toBeTruthy();
    expect(line).toContain('Triceps (20 days ago), Hamstrings (25 days ago), Calves (40 days ago)');
    expect(line).toMatch(/\(none in the last 90 days\)\.$/);
    // Muscles with a row are not named here.
    for (const name of ['Quads', 'Chest', 'Biceps']) expect(line).not.toContain(name);
    // The old chips and their heading are gone, and so is their icon.
    expect(all).not.toContain('Training recency');
    expect(all).not.toContain('How recently each muscle was trained.');
    expect(all).not.toContain('Trained 20 days ago');
  });

  test('every muscle has a row: no line', async () => {
    const full = {};
    for (const key of ['chest', 'back', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs', 'traps', 'neck', 'tibialis']) {
      full[key] = { muscle: key, recoveredPercent: 100, status: 'recovered', readyAtMs: null, lastSessionEndMs: NOW - DAY_MS, lastSessionSets: 4, basis: 'time_and_volume', contributingSessions: [] };
    }
    loadMuscleRecovery.mockResolvedValue({ ...RECOVERY_RESULT, map: full });
    const tree = await render();
    expect(texts(tree).some((t) => t.startsWith('No session in the last 14 days:'))).toBe(false);
    expect(texts(tree)).toContain('All 17 muscles recovered.');
  });
});

describe('the next-workout sentence and the sessions still to do (D214 7.2 a and b)', () => {
  const SESSIONS = [
    { routineId: 'r-legs', name: 'Legs', state: 'outstanding', order: 0 },
    { routineId: 'r-push', name: 'Push', state: 'outstanding', order: 1 },
  ];
  // The names come from the programme position's own sessions (the card
  // looks them up itself), so these two sessions carry the spec's own names.
  const SESSIONS_AB = [
    { routineId: 'r-legs', name: 'Upper A', state: 'outstanding', order: 0 },
    { routineId: 'r-push', name: 'Lower B', state: 'outstanding', order: 1 },
  ];
  const NEXT = (over = {}) => ({
    programmeNext: { routineId: 'r-legs' },
    programmeNextLine: null,
    perSession: [],
    ...over,
  });
  const limitingEntry = (routineId, over = {}) => ({
    routineId,
    readinessNow: {
      verdict: 'not_yet', minPercent: 60, limitingMuscle: 'back', limitingReadyAtMs: NOW + DAY_MS, evidence: true,
      muscles: [{ muscle: 'back', plannedSets: 8, recoveredPercent: 60, status: 'recovering' }],
      ...over,
    },
  });

  test('is absent when there is no active block (and no "Next workout" block exists any more)', async () => {
    resolveProgrammePosition.mockResolvedValue(null);
    const tree = await render();
    const all = texts(tree);
    expect(all).not.toContain('Next workout');
    expect(all.some((t) => / is next/.test(t))).toBe(false);
    expect(all).not.toContain('Still to do this plan week');
  });

  test('is absent when the block has no outstanding session', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: null, sessions: SESSIONS });
    const tree = await render();
    expect(texts(tree)).not.toContain('Still to do this plan week');
    expect(recommendNextWorkout).not.toHaveBeenCalled();
  });

  test('never prints a swap reason (D219): a result still carrying the old recommended/reason fields shows only the plan\'s own next session', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    const SWAP_REASON = 'Legs is next in your plan. Quads are estimated 64% recovered, ready by Thursday. Push is ready now.';
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      // The pre-D219 module's swap answer. Whatever a caller hands the
      // screen, it names the plan's next session and nothing else.
      recommended: { routineId: 'r-push' },
      reason: SWAP_REASON,
      programmeNextLine: 'Quads are estimated 64% recovered, ready by Thursday.',
      perSession: [],
    });
    const tree = await render();
    const all = texts(tree);
    expect(all).not.toContain(SWAP_REASON);
    expect(all.some((t) => /is next in your plan|Push is ready now/.test(t))).toBe(false);
    // What it prints instead: the plan's next session, then its own readiness.
    expect(all).toContain('Legs is next. Quads are estimated 64% recovered, ready by Thursday.');
  });

  test('names the limiting muscle AS the limiting one: "Upper A is next: Back is the least recovered of the muscles it trains, estimated 60% recovered, ready by tomorrow."', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS_AB });
    recommendNextWorkout.mockReturnValue(NEXT({
      programmeNextLine: 'Back is estimated 60% recovered, ready by tomorrow.',
      perSession: [limitingEntry('r-legs')],
    }));
    const tree = await render();
    expect(texts(tree)).toContain('Upper A is next: Back is the least recovered of the muscles it trains, estimated 60% recovered, ready by tomorrow.');
  });

  test('D214 RC-5: no recent session on any muscle it trains says exactly that, never "every muscle ... recovered"', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS_AB });
    recommendNextWorkout.mockReturnValue(NEXT({
      programmeNextLine: 'No recent session on the muscles Upper A trains.',
      perSession: [{
        routineId: 'r-legs',
        readinessNow: {
          verdict: 'ready', minPercent: 100, limitingMuscle: null, limitingReadyAtMs: null, evidence: false,
          muscles: [{ muscle: 'quads', plannedSets: 8, recoveredPercent: 100, status: 'no_recent_session' }],
        },
      }],
    }));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('No recent session on the muscles Upper A trains.');
    expect(all.some((t) => /Every muscle it trains/.test(t))).toBe(false);
  });

  test('falls back to "<Name> is next." plus programmeNextLine when the session\'s readiness entry is absent', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      programmeNextLine: 'Every muscle it trains is estimated recovered.',
      perSession: [],
    });
    const tree = await render();
    // Lead review: unlike Home's card, this block has no title naming the
    // session, so it names it itself.
    expect(texts(tree)).toContain('Legs is next. Every muscle it trains is estimated recovered.');
  });

  test('is absent when the programme-next session\'s planned sets could not be read (no line to state)', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS });
    recommendNextWorkout.mockReturnValue({
      programmeNext: { routineId: 'r-legs' },
      programmeNextLine: null,
      perSession: [],
    });
    const tree = await render();
    expect(texts(tree).some((t) => / is next/.test(t))).toBe(false);
  });

  // RE-ANCHORED D214 addendum 9 (V3): "Still to do this plan week". The rows are
  // the PLAN week's outstanding sessions (position.sessions), which can lag the
  // calendar, and the card above names the same week "in week 2 of your plan".
  //
  // RE-PINNED D219 lane A6 (design 00-AUDIT-AND-PLAN.md section 5.2: "the
  // rows stay as the plan's list with no readiness and no ranking"). The rows
  // used to print each session's readiness ("Upper A · estimated ready by
  // tomorrow", then "(Back 60% recovered)"), which is the information a
  // person would use to pick a different session. They are now the plan's
  // list, the session's name only, in the plan's order.
  test('"Still to do this plan week": one row per outstanding session, the session\'s name only, in plan order, no readiness (D219)', async () => {
    resolveProgrammePosition.mockResolvedValue({ nextSession: { routineId: 'r-legs' }, sessions: SESSIONS_AB });
    recommendNextWorkout.mockReturnValue(NEXT({
      programmeNextLine: 'Back is estimated 60% recovered, ready by tomorrow.',
      perSession: [
        limitingEntry('r-legs'),
        limitingEntry('r-push', { minPercent: 37, limitingMuscle: 'glutes', limitingReadyAtMs: NOW + 3 * DAY_MS, muscles: [{ muscle: 'glutes', plannedSets: 6, recoveredPercent: 37, status: 'recovering' }] }),
      ],
    }));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Still to do this plan week');
    // Each row is its session's name and nothing else.
    expect(all).toContain('Upper A');
    expect(all).toContain('Lower B');
    // No row carries a readiness clause or a limiting-muscle clause.
    expect(all.some((t) => /^(Upper A|Lower B) ·/.test(t))).toBe(false);
    expect(all).not.toContain('(Back 60% recovered)');
    expect(all).not.toContain('(Glutes 37% recovered)');
    expect(all.some((t) => /^Lower B/.test(t) && /ready|recovered|estimated/.test(t))).toBe(false);
    // The whole row is the spoken label, and it is just the name.
    const spoken = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Upper A');
    expect(spoken).toHaveLength(1);
    // The plan's order (Upper A before Lower B), after the answer block and
    // before the figure's list.
    expect(all.indexOf('Upper A')).toBeLessThan(all.indexOf('Lower B'));
    expect(all.indexOf('Still to do this plan week')).toBeLessThan(all.indexOf('Upper A'));
    expect(all.indexOf('Lower B')).toBeLessThan(all.indexOf('Still recovering \u00b7 1'));
  });

  test('buildStillToDoRows: the plan\'s list, names only, whatever each session\'s readiness (ready, not ready, no evidence, unknown)', () => {
    const rec = {
      routineNamesById: { a: 'Upper A', b: 'Lower B', c: 'Push', d: 'Pull', e: 'Legs' },
      perSession: [
        { routineId: 'a', readinessNow: { verdict: 'ready', minPercent: 100, limitingMuscle: null, evidence: false, muscles: [{ muscle: 'quads', status: 'no_recent_session', recoveredPercent: 100 }] } },
        { routineId: 'b', readinessNow: null },
        { routineId: 'c', readinessNow: { verdict: 'ready', minPercent: 100, limitingMuscle: null, evidence: true, muscles: [{ muscle: 'chest', status: 'recovered', recoveredPercent: 94 }, { muscle: 'triceps', status: 'no_recent_session', recoveredPercent: 100 }] } },
        { routineId: 'd', readinessNow: { verdict: 'ready', minPercent: 100, limitingMuscle: null, evidence: false, muscles: [] } },
        { routineId: 'e', readinessNow: { verdict: 'not_yet', minPercent: 20, limitingMuscle: 'quads', limitingReadyAtMs: NOW + 3 * DAY_MS, evidence: true, muscles: [{ muscle: 'quads', status: 'recovering', recoveredPercent: 20 }] } },
      ],
    };
    const rows = buildStillToDoRows(rec, NOW);
    expect(rows.map((r) => r.text)).toEqual(['Upper A', 'Lower B', 'Push', 'Pull', 'Legs']);
    expect(rows.map((r) => r.routineId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    // No readiness, no figure and no ranking word on any row.
    for (const row of rows) expect(row.text).not.toMatch(/ready|recover|estimate|%|\u00b7|\(/i);
    expect(buildStillToDoRows(null, NOW)).toEqual([]);
  });

  test('buildStillToDoRows: rows keep the order they are given (plan order), never re-sorted by how recovered a session is', () => {
    const readyEntry = { verdict: 'ready', minPercent: 100, limitingMuscle: null, evidence: true, muscles: [{ muscle: 'chest', status: 'recovered', recoveredPercent: 100 }] };
    const notYetEntry = { verdict: 'not_yet', minPercent: 20, limitingMuscle: 'quads', limitingReadyAtMs: NOW + 3 * DAY_MS, evidence: true, muscles: [{ muscle: 'quads', status: 'recovering', recoveredPercent: 20 }] };
    const names = { a: 'Upper A', b: 'Lower B' };
    // The least recovered session first, the most recovered second.
    expect(buildStillToDoRows({ routineNamesById: names, perSession: [{ routineId: 'a', readinessNow: notYetEntry }, { routineId: 'b', readinessNow: readyEntry }] }, NOW).map((r) => r.text))
      .toEqual(['Upper A', 'Lower B']);
    // And the other way round.
    expect(buildStillToDoRows({ routineNamesById: names, perSession: [{ routineId: 'a', readinessNow: readyEntry }, { routineId: 'b', readinessNow: notYetEntry }] }, NOW).map((r) => r.text))
      .toEqual(['Upper A', 'Lower B']);
  });

  test('buildStillToDoRows: a session with no name reads "Session"', () => {
    const rows = buildStillToDoRows({ routineNamesById: {}, perSession: [{ routineId: 'x', readinessNow: null }] }, NOW);
    expect(rows.map((r) => r.text)).toEqual(['Session']);
  });

  test('buildNextWorkoutSentence: the all-clear and the mixed line follow the name with a full stop', () => {
    const rec = (readinessNow, line) => ({
      programmeNext: { routineId: 'a' }, programmeNextName: 'Upper A', programmeNextLine: line,
      perSession: [{ routineId: 'a', readinessNow }],
    });
    expect(buildNextWorkoutSentence(rec({
      verdict: 'ready', evidence: true, limitingMuscle: null, minPercent: 100,
      muscles: [{ muscle: 'chest', status: 'recovered', recoveredPercent: 95 }],
    }, 'Every muscle it trains is estimated recovered.'), NOW)).toBe('Upper A is next. Every muscle it trains is estimated recovered.');
    expect(buildNextWorkoutSentence(rec({
      verdict: 'ready', evidence: true, limitingMuscle: null, minPercent: 100,
      muscles: [{ muscle: 'chest', status: 'recovered', recoveredPercent: 95 }, { muscle: 'triceps', status: 'no_recent_session', recoveredPercent: 100 }],
    }, 'Chest is estimated recovered; no recent session on Triceps.'), NOW)).toBe('Upper A is next. Chest is estimated recovered; no recent session on Triceps.');
    expect(buildNextWorkoutSentence(null, NOW)).toBeNull();
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

describe('states: first load, day zero, and a failed read (D214 RC-24, RC-25, RC-33)', () => {
  test('first load: skeletons fill the card slots until the reads have landed, and no section is claimed yet', async () => {
    let release;
    loadMuscleRecovery.mockImplementation(() => new Promise((resolve) => { release = () => resolve(RECOVERY_RESULT); }));
    let tree;
    await act(async () => { tree = create(<ReadinessCards userId="u1" sections="recovery" />); });
    await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
    const loading = tree.root.findAll((n) => n.props?.accessibilityRole === 'progressbar' && n.props?.accessibilityLabel === 'Loading');
    expect(loading.length).toBeGreaterThan(0);
    expect(texts(tree)).not.toContain('Recovery by muscle');
    expect(texts(tree).some((t) => /to go: First session/.test(t))).toBe(false);
    await act(async () => { release(); });
    await flush();
    expect(texts(tree)).toContain('Recovery by muscle');
    expect(tree.root.findAll((n) => n.props?.accessibilityRole === 'progressbar' && n.props?.accessibilityLabel === 'Loading')).toHaveLength(0);
  });

  test("day zero: the figure and \"Each muscle's recovery shows here after your first session.\"", async () => {
    const empty = {};
    for (const key of ['chest', 'back', 'quads']) {
      empty[key] = { muscle: key, recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null, lastSessionEndMs: null, lastSessionSets: null, basis: 'time_and_volume', contributingSessions: [] };
    }
    loadMuscleRecovery.mockResolvedValue({ ...RECOVERY_RESULT, map: empty });
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain("Each muscle's recovery shows here after your first session.");
    expect(BodyDiagramHeatmap).toHaveBeenCalled();
    // No answer line to print, and no list of 17 names at day zero.
    expect(all.some((t) => /still recovering|nearly recovered|^\d+ recovered/.test(t))).toBe(false);
    expect(all.some((t) => t.startsWith('No session in the last 14 days:'))).toBe(false);
  });

  test('trained before, nothing in the window: says so plainly instead of "after your first session"', async () => {
    const empty = { chest: { muscle: 'chest', recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null, lastSessionEndMs: null, lastSessionSets: null, basis: 'time_and_volume', contributingSessions: [] } };
    loadMuscleRecovery.mockResolvedValue({ ...RECOVERY_RESULT, map: empty });
    database.getLastTrainedPerMuscle.mockResolvedValue({ chest: NOW - 40 * DAY_MS });
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('No session in the last 14 days, so there is no estimate to show.');
    expect(all).not.toContain("Each muscle's recovery shows here after your first session.");
  });

  test("a rejected read prints \"Couldn't load the estimate just now.\" under the heading and LOGS it (no silent catch)", async () => {
    loadMuscleRecovery.mockRejectedValue(new Error('boom'));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Recovery by muscle');
    expect(all).toContain("Couldn't load the estimate just now.");
    expect(BodyDiagramHeatmap).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadMuscleRecovery', expect.any(Error), { userId: 'u1' });
  });

  test('a degraded loader (a core read failed) says the same and logs, never an all-clear', async () => {
    loadMuscleRecovery.mockResolvedValue({ ...RECOVERY_RESULT, degraded: true });
    const tree = await render();
    expect(texts(tree)).toContain("Couldn't load the estimate just now.");
    expect(texts(tree).some((t) => /still recovering|recovered\./.test(t))).toBe(false);
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadMuscleRecovery', expect.any(Error), { userId: 'u1' });
  });
});

describe('loader failure: the estimate says so, the ratings stay intact', () => {
  test('loadMuscleRecovery rejecting leaves the ratings rows readable and logs, without crashing', async () => {
    loadMuscleRecovery.mockRejectedValue(new Error('boom'));
    database.getAllWorkouts.mockResolvedValue([
      { id: 'w1', isCompleted: true, setCount: 1, startedAt: NOW, endedAt: NOW, soreness24hBefore: 2, fatigueLevel: 2, jointDiscomfort: 1 },
      { id: 'w2', isCompleted: true, setCount: 1, startedAt: NOW - 60000, endedAt: NOW - 60000, soreness24hBefore: 2, fatigueLevel: 2, jointDiscomfort: 1 },
    ]);
    const tree = await render();
    const all = texts(tree);
    // The ratings (an unrelated reader in the same load()) are unaffected:
    // two rated sessions is enough for a real averaged value.
    expect(all.some((t) => /not rated yet/.test(t))).toBe(false);
    expect(all).toContain('Fatigue after sessions · mild (2.0 of 5)');
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadMuscleRecovery', expect.any(Error), { userId: 'u1' });
  });

  test('resolveProgrammePosition rejecting drops only the next-workout parts, keeping the rows and figure', async () => {
    resolveProgrammePosition.mockRejectedValue(new Error('boom'));
    const tree = await render();
    const all = texts(tree);
    expect(all).toContain('Recovery by muscle');
    expect(all).toContain('Quads');
    expect(all.some((t) => / is next/.test(t))).toBe(false);
    expect(all).not.toContain('Still to do this plan week');
    expect(logError).toHaveBeenCalledWith('ReadinessCards.loadRecoveryRecommendation', expect.any(Error), { userId: 'u1' });
  });
});

describe('source guards (D214)', () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const FILES = ['ReadinessCards.js', 'MuscleRecoveryList.js', 'RecoveryLearningCard.js', 'FatigueTrendCard.js'];

  test('every ${percent} template line in the section\'s files also names RECOVERY_ESTIMATE_LABEL or "estimated"', () => {
    // The rows moved to MuscleRecoveryList.js (D201 addendum 9); the law
    // covers both files, and the rows file must still carry the percent.
    let total = 0;
    for (const file of ['ReadinessCards.js', 'MuscleRecoveryList.js']) {
      const src = read(file);
      const percentLines = src.split('\n').filter((l) => l.includes('${percent}'));
      total += percentLines.length;
      for (const line of percentLines) expect(line).toMatch(/RECOVERY_ESTIMATE_LABEL|estimated/i);
    }
    expect(total).toBeGreaterThan(0);
    const rows = read('MuscleRecoveryList.js');
    expect(rows.includes('${percent}')).toBe(true);
    expect(rows).toMatch(/Estimated|estimated/);
  });

  test('"estimated" is on every recovery percent the screen prints: each sentence template with "% recovered" says estimated, and the rows sit under the "Estimated from your sessions" sub-line', () => {
    const cards = strip(read('ReadinessCards.js'));
    const printed = cards.split('\n').filter((l) => /% recovered/.test(l) && /`/.test(l));
    expect(printed.length).toBeGreaterThan(0);
    for (const line of printed) expect(line).toMatch(/estimated/i);
    expect(cards).toContain('Estimated from your sessions · last 14 days');
  });

  test('no amber on the screen: none of the Recovery files reads the accent family or the warning token (D214 plan 7.0 rule 3)', () => {
    for (const file of FILES) {
      const code = strip(read(file));
      expect(code).not.toMatch(/colors\.(primary|primaryBg|primaryFill|primaryDim|onPrimary|warning|warningBg)\b/);
    }
    const screen = strip(fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'RecoveryScreen.js'), 'utf8'));
    expect(screen).not.toMatch(/colors\.(primary|primaryBg|primaryFill|primaryDim|onPrimary|warning|warningBg)\b/);
  });

  test('D204: nothing on the screen tells the athlete to train, rest, push, hold, lighten or monitor themselves', () => {
    // Word-bounded (the plain words contain "shoulder"). The 'keep' verb is
    // excluded from the pattern because "Keep" is Home's own control, not here.
    const INSTRUCTS = /\b(you should|should|consider|try to|make sure|take it easy|go lighter|lighter (day|week)|rest (more|up|day)|push (your|the|through)|hold your|pay attention|worth paying|needs? more attention|keep an eye|watch (your|for)|monitor|be careful|avoid|focus on|ease (in|off|back)|train (more|less|harder|lighter)|deload)\b/i;
    const screen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'RecoveryScreen.js'), 'utf8');
    for (const src of [...FILES.map(read), screen]) {
      const code = strip(src);
      // Strings only: the copy a person reads.
      const strings = (code.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || []).join('\n');
      expect(strings).not.toMatch(INSTRUCTS);
    }
  });

  test('no em dash anywhere in the Recovery copy', () => {
    for (const file of FILES) expect(strip(read(file))).not.toMatch(/—/);
  });

  test('no silent catch: every catch in ReadinessCards logs through logError', () => {
    const code = strip(read('ReadinessCards.js'));
    expect(code).not.toMatch(/catch \(_\) \{\s*\}/);
    const catches = code.match(/catch \((\w+)\) \{[\s\S]*?\n\s{6,}\}/g) || [];
    expect(catches.length).toBeGreaterThan(5);
    for (const c of catches) expect(c).toMatch(/logError\(/);
  });

  test('the figure is rendered directly in the section, never inside a second Card (it is its own card)', () => {
    const code = strip(read('ReadinessCards.js'));
    expect(code).not.toMatch(/<Card[\s>][\s\S]{0,400}<BodyDiagramHeatmap/);
    expect(code).toMatch(/<BodyDiagramHeatmap/);
  });
});
