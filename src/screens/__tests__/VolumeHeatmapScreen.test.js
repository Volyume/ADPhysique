/**
 * VolumeHeatmapScreen.test.js
 *
 * What this suite pins and why (register D214, build lane 5 of the Progress
 * elevation; plan docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.4):
 *  - the window control is above the figure; "This week" is the Monday-anchored
 *    week so far (amending D200 ruling 1's "1-week view unchanged") while the
 *    2- and 4-week windows stay the rolling weekly averages with the
 *    partial-history divisor;
 *  - the summary counts LOGGED working-set rows (a set that credits a helper
 *    muscle counts once; warm-ups and explosive sets never count);
 *  - the rows are grouped by band with counts (Under the range, Just enough, In
 *    range, Near the limit, Too much, then No sets), where the Under group's
 *    population is the plan's (a plan-programmed muscle with no sets is Under,
 *    an unprogrammed one is No sets, without a plan a muscle with no sets is No
 *    sets: lane 5 review S2), print "N sets so far this week, range MEV to
 *    MRV" where N is the rounded number that is also the number judged (D214
 *    addendum 9, census 0.4: it read "N of MEV to MRV sets this week"), and
 *    carry no instruction (D204 addendum 3: no "N more", no "add");
 *  - a recovery week is framed, not judged: no band word, one neutral shade;
 *  - NOTHING IS JUDGED UNTIL A SET IS LOGGED in the window shown (D214
 *    addendum 9, census 6.4): with no logged set the rows are the recovery
 *    week's flat list, no band header, no verdict colour, one line saying so;
 *    a window that HAS sets keeps lane 5's population rule; an adaptive
 *    adjustment is said in plain words and never called a recovery week (6.5);
 *  - the editor seeds the bands in force and saves ONLY what the person touched;
 *  - ONE legend (the figure's own), the trend figure in ink, the route param.
 * Source-level guards (fs + regex, the CLAUDE.md convention) lock the founder
 * rules that a render cannot see.
 */
import { create, act } from 'react-test-renderer';
import { StyleSheet, Modal } from 'react-native';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/InfoTooltip', () => () => null);
// The figure's own suite lives in src/components/__tests__/BodyDiagramHeatmap.test.js;
// here it is a recorder, so the screen's input to it can be read.
jest.mock('../../components/BodyDiagramHeatmap', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
// A host stand-in for the text field: its props (value, onChangeText) are what the editor drives.
jest.mock('../../components/TextField', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((props, _ref) => React.createElement('TextField', props)) };
});
jest.mock('../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../../lib/sync', () => ({
  syncUserPref: jest.fn(() => Promise.resolve()),
  // Campaign 1 P0-8 D10: the save/reset paths stamp the local write time.
  notePrefWrite: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/programmePosition', () => ({ resolveProgrammePosition: jest.fn() }));
jest.mock('../../lib/effectiveLandmarks', () => {
  const actual = jest.requireActual('../../lib/effectiveLandmarks');
  return { ...actual, getEffectiveLandmarks: jest.fn(), getPlanLandmarks: jest.fn() };
});

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  // D218 bridge: the reporting read (unfiltered lookup) is built from this
  // suite's own getAllExercises fixture, so each test's fixture stays the contract.
  getExerciseLookup: jest.fn(async () => {
    const db = jest.requireMock('../../lib/database');
    const { buildExerciseLookup } = jest.requireActual('../../lib/exercise/lookup');
    return buildExerciseLookup(await db.getAllExercises());
  }),
  getWeeklyVolumeByMuscle: jest.fn(),
  getActivePlan: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import BodyDiagramHeatmap from '../../components/BodyDiagramHeatmap';
import {
  getCompletedWorkoutSets,
  getAllExercises,
  getExerciseLookup,
  getWeeklyVolumeByMuscle,
  getActivePlan,
  getCurrentMesocycleWeek,
} from '../../lib/database';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { RETIRED_ID_TO_SURVIVOR_ID, survivorExerciseId } from '../../lib/exercise/retiredIds';
import { resolveProgrammePosition } from '../../lib/programmePosition';
import { getEffectiveLandmarks, getPlanLandmarks, mergeLandmarkPrecedence } from '../../lib/effectiveLandmarks';
import { logError } from '../../lib/errorLog';
import { syncUserPref } from '../../lib/sync';
import VolumeHeatmapScreen from '../VolumeHeatmapScreen';
import { VOLUME_LANDMARKS } from '../../lib/algorithms';
import { VOLUME_BAND_LABELS } from '../../lib/volumeBandLabels';
import { colors } from '../../styles/theme';

const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, rel), 'utf8');
const VOLUME_HEATMAP_SOURCE = read('../VolumeHeatmapScreen.js');
// BodyDiagramHeatmap is a recorder above, so its division-legend copy cannot be
// asserted by rendering it from here: a source-level guard, same technique.
const BODY_DIAGRAM_SOURCE = read('../../components/BodyDiagramHeatmap.js');

const DAY = 24 * 60 * 60 * 1000;
// A plain Wednesday, 12:00 local: its Monday is 8 June 2026, so 7 June is last week.
const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
const MONDAY_9AM = new Date(2026, 5, 8, 9, 0, 0).getTime();
const SUNDAY_8PM = new Date(2026, 5, 7, 20, 0, 0).getTime();

const store = {
  user: { id: 'u1' },
  userProfile: { trainingGoal: 'hypertrophy' },
};

const EXERCISES = [
  { id: 'bench', primary_muscle: 'chest', secondary_muscles: '[]' },
  // A compound lift: chest at 1.0, triceps and front delts at 0.5 each.
  { id: 'press', primary_muscle: 'chest', secondary_muscles: JSON.stringify(['triceps', 'front_delts']) },
  { id: 'row', primary_muscle: 'back', secondary_muscles: '[]' },
  { id: 'curl', primary_muscle: 'biceps', secondary_muscles: '[]' },
  { id: 'pushdown', primary_muscle: 'triceps', secondary_muscles: '[]' },
  { id: 'kbswing', primary_muscle: 'hamstrings', secondary_muscles: '[]' },
];

async function flush() {
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  }
}

async function mount(props = {}) {
  let tree;
  await act(async () => { tree = create(<VolumeHeatmapScreen {...props} />); });
  await flush();
  return tree;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

let seq = 0;
// `count` working-set rows of `exerciseId` logged at `at` (epoch ms).
function setsOf(exerciseId, count, at, extra = {}) {
  return Array.from({ length: count }, () => {
    seq += 1;
    return { id: `set-${seq}`, exerciseId, createdAt: at, set_type: 'straight', actualReps: 10, weight: 100, ...extra };
  });
}
const chestSets = (count) => setsOf('bench', count, Date.now());

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

// A chip by its accessibility label ("volume window: 4 weeks"), the same
// find-by-label-and-onPress idiom the rest of this suite family uses.
function pressWindow(tree, label) {
  return tree.root.findAll(
    (n) => n.props.accessibilityLabel === `volume window: ${label}` && typeof n.props.onPress === 'function',
  )[0];
}

// A muscle row (one accessible button per muscle), by its spoken-label prefix.
function findMuscleRow(tree, prefix) {
  return tree.root.findAll(
    (n) => n.props.accessibilityRole === 'button'
      && typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith(prefix)
      && typeof n.props.onPress === 'function',
  )[0];
}

function groupHeaders(tree) {
  return tree.root.findAll(
    (n) => n.props.accessibilityRole === 'header'
      && typeof n.props.accessibilityLabel === 'string'
      && /, \d+ muscles?$/.test(n.props.accessibilityLabel)
      && typeof n.type === 'string',
  ).map(n => n.props.accessibilityLabel);
}

function lastFigureInput() {
  const calls = BodyDiagramHeatmap.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  seq = 0;
  store.user = { id: 'u1' };
  store.userProfile = { trainingGoal: 'hypertrophy' };
  useAppStore.mockImplementation((selector) => selector(store));
  AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
  getCompletedWorkoutSets.mockResolvedValue([]);
  getAllExercises.mockResolvedValue(EXERCISES);
  getWeeklyVolumeByMuscle.mockResolvedValue([]);
  getActivePlan.mockResolvedValue(null);
  getCurrentMesocycleWeek.mockResolvedValue(null);
  resolveProgrammePosition.mockResolvedValue(null);
  getEffectiveLandmarks.mockImplementation(() => Promise.resolve(mergeLandmarkPrecedence({})));
  // No plan by default: the plan layer's own source map programmes no muscle.
  getPlanLandmarks.mockResolvedValue({ table: {}, source: {} });
});

afterEach(() => { jest.useRealTimers(); });

function atWednesday() {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
}

// The plan layer's own source map says 'plan' for each muscle the active plan
// programmes with planned sets above zero (effectiveLandmarks.getPlanLandmarks).
function planProgrammes(...muscles) {
  getPlanLandmarks.mockResolvedValue({
    table: {},
    source: Object.fromEntries(muscles.map((m) => [m, 'plan'])),
  });
}

describe('VolumeHeatmapScreen states', () => {
  // EP-20/UI-10 (Codex end-user-polish audit): getCompletedWorkoutSets and
  // the other loadData reads are LOCAL SQLite (src/lib/database.js), never a
  // network call, so a failure here must never claim a connection problem.
  test('shows a retry state when volume data fails to load', async () => {
    getCompletedWorkoutSets.mockRejectedValueOnce(new Error('offline'));
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load volume heatmap");
    expect(text).toContain("Couldn't load this on your device. Try again.");
    expect(text).not.toContain('Check your connection');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Under the range');
  });

  test('shows first-workout guidance instead of an unexplained zero heatmap', async () => {
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Volume appears after your first workout');
    // RE-ANCHORED D214 (VH-17): the screen shows no recovery (D208), so the
    // day-zero copy no longer promises "how recovered it is".
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census H2): the line describes and does not tell
    // ("Finish a workout and this screen will show ... its target range"), and "range" is the one word.
    expect(text).toContain('For each muscle, this screen shows your weekly sets and its range once you have finished a workout.');
    expect(text).not.toMatch(/Finish a workout|target range/);
    expect(text).not.toMatch(/recovered/i);
    // RE-ANCHORED D214 (lane 5 review S2, plan 7.4 item 5): the screen's own
    // legend card is gone, and with no plan and no sets every muscle is outside
    // the verdict population, so all of them sit under the one group "No sets"
    // rather than under a verdict ("Under the range").
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 6.4 and H6, the lead's ruling): nothing is judged
    // until a set is logged, in ANY window, so day zero is the recovery week's flat unjudged list: no
    // group header at all (not even "No sets · 17"), and one line says why.
    expect(text).not.toContain('No sets · 17');
    expect(text).not.toContain('Under the range');
    expect(text).not.toContain('Below target');
    expect(groupHeaders(tree)).toEqual([]);
    expect(text).toContain('Nothing is judged until a set is logged.');
    expect(text).toContain('0 sets so far this week, range 6 to 22');
  });

  test('explains when saved training exists outside the selected volume window', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValueOnce(setsOf('bench', 1, NOW - 20 * DAY));
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    // D214 (lane 5 landing): the chip says "This week", so the empty title names the window in the same words, never a "1-week view".
    expect(text).toContain('No sets since Monday');
    expect(text).not.toContain('1-week view');
    expect(text).toContain('Your training history is still saved.');
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census H1): the wider views are named, not told ("Switch to a
    // wider window if you want to see older volume" was an instruction on a surface).
    expect(text).toContain('Your training history is still saved. The 2 weeks and 4 weeks views reach further back.');
    expect(text).not.toContain('Switch to a wider window');
    expect(text).toContain('No sets logged so far this week');
    expect(text).toContain('Nothing is judged until a set is logged.');
  });

  test('starts a single initial load from the focus trigger, and a window chip never reloads', async () => {
    const tree = await mount();
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(1);
    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });
    await flush();
    // D214: a window chip re-reads the loaded history, never the database.
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(1);
  });

  test('ignores stale volume results when a newer profile-triggered load starts', async () => {
    const oldSets = deferred();
    const newSets = deferred();
    getCompletedWorkoutSets
      .mockImplementationOnce(() => oldSets.promise)
      .mockImplementationOnce(() => newSets.promise);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();
    store.userProfile = { trainingGoal: 'strength' };
    await act(async () => { tree.update(<VolumeHeatmapScreen />); });
    await flush();
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(2);

    await act(async () => { oldSets.resolve(chestSets(3)); });
    await flush();
    let text = flattenText(tree.toJSON());
    expect(text).not.toContain('3 sets so far this week, range 6 to 22');

    await act(async () => { newSets.resolve(chestSets(11)); });
    await flush();
    text = flattenText(tree.toJSON());
    expect(text).toContain('11 sets so far this week, range 6 to 22');
    expect(text).not.toContain('3 sets so far this week, range 6 to 22');
  });
});

describe('D214 (7.4 item 2, amending D200 ruling 1): the window control sits above the figure, and "This week" is the Monday-anchored week so far', () => {
  test('the chips read This week, 2 weeks, 4 weeks and come before the figure in the screen', () => {
    for (const label of ['This week', '2 weeks', '4 weeks']) {
      expect(VOLUME_HEATMAP_SOURCE).toContain(`label: '${label}'`);
    }
    const chips = VOLUME_HEATMAP_SOURCE.indexOf('<WindowChips\n          windows={WINDOW_OPTIONS}');
    const figure = VOLUME_HEATMAP_SOURCE.indexOf('<BodyDiagramHeatmap');
    expect(chips).toBeGreaterThan(-1);
    expect(figure).toBeGreaterThan(chips);
  });

  test('"This week" counts from Monday, not a rolling seven days, and says so', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 6, MONDAY_9AM),
      ...setsOf('bench', 2, SUNDAY_8PM), // inside a rolling 7 days (D200), before Monday
      ...setsOf('bench', 10, NOW - 20 * DAY),
      ...setsOf('bench', 1, NOW - 60 * DAY),
    ]);
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Sets logged since Monday');
    expect(text).toContain('6 sets so far this week, range 6 to 22');
    expect(text).not.toContain('8 sets so far this week'); // the old rolling window would have read 8
  });

  // Lane 5 review S6: the 2- and 4-week wording must never leak into "This week".
  // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.4 and H3): the sentence was "N of range sets this week".
  test('at "This week" no row says "An average of", and every row sentence is exactly "N sets so far this week, range A to B"', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 6, MONDAY_9AM));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).not.toContain('An average of');
    const sentences = tree.root
      .findAll((n) => n.type === 'Text' && /\bsets? so far this week, (range \d+ to \d+|up to \d+)$/.test(flattenText(n)))
      .map((n) => flattenText(n));
    expect(sentences).toHaveLength(17);
    for (const sentence of sentences) {
      expect(sentence).toMatch(/^\d+ sets? so far this week, (range \d+ to \d+|up to \d+)$/);
    }
    expect(sentences).toContain('6 sets so far this week, range 6 to 22');
    expect(sentences).toContain('0 sets so far this week, up to 14'); // front delts: MEV 0
    // A singular set reads "1 set", never "1 sets".
    expect(sentences.join(' | ')).not.toMatch(/\b1 sets\b/);
  });

  test('every Monday the view starts empty, and the summary says so plainly', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 8, 0, 30, 0).getTime()); // Monday, half past midnight
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 12, new Date(2026, 5, 7, 18, 0, 0).getTime()));
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('No sets logged so far this week');
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 6.4): with nothing logged this week the rows are
    // the flat unjudged list, and the figure on each row is still its own sentence.
    expect(text).toContain('0 sets so far this week, range 6 to 22');
    expect(text).toContain('Nothing is judged until a set is logged.');
    expect(groupHeaders(tree)).toEqual([]);
  });

  test('2 and 4 weeks stay the rolling weekly averages with the partial-history divisor (D200 ruling 1)', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 6, MONDAY_9AM),
      ...setsOf('bench', 2, SUNDAY_8PM),
      ...setsOf('bench', 10, NOW - 20 * DAY),
      ...setsOf('bench', 1, NOW - 60 * DAY),
    ]);
    const tree = await mount();

    await act(async () => { pressWindow(tree, '2 weeks').props.onPress(); });
    // (6 + 2) over 2 weeks: the 20-day-old sets lie outside the rolling 14 days.
    expect(flattenText(tree.toJSON())).toContain('An average of 4 sets a week, range 6 to 22');
    expect(flattenText(tree.toJSON())).toContain('Average sets a week over the last 2 weeks');

    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });
    // (6 + 2 + 10) over 4 weeks is 4.5, rounded once to 5.
    expect(flattenText(tree.toJSON())).toContain('An average of 5 sets a week, range 6 to 22');
    expect(flattenText(tree.toJSON())).toContain('Average sets a week over the last 4 weeks');
  });

  test('a steady weekly rate reads the same band at 4 weeks as its weekly rate, never "Too much"', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 12, NOW - 3 * DAY),
      ...setsOf('bench', 12, NOW - 10 * DAY),
      ...setsOf('bench', 12, NOW - 17 * DAY),
      ...setsOf('bench', 12, NOW - 24 * DAY),
      ...setsOf('bench', 1, NOW - 60 * DAY),
    ]);
    const tree = await mount();
    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });

    expect(flattenText(tree.toJSON())).toContain('An average of 12 sets a week, range 6 to 22');
    const chest = findMuscleRow(tree, 'Chest:');
    expect(chest.props.accessibilityLabel).toContain('In range');
    expect(chest.props.accessibilityLabel).not.toContain('Too much');
    // The row's spoken label names the average and the window total (D200-1).
    // The spoken label says the row's own words, then names the window and the total.
    expect(chest.props.accessibilityLabel).toContain('an average of 12 sets a week, range 6 to 22, over the last 4 weeks, 48 in total');
  });

  test('a young account divides by the weeks it actually has, and the note says so', async () => {
    atWednesday();
    // Ten days old: ceil(10 / 7) = 2 weeks counted, not 4.
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 20, NOW - 10 * DAY));
    const tree = await mount();
    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });

    const text = flattenText(tree.toJSON());
    expect(text).toContain('An average of 10 sets a week, range 6 to 22');
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.15): "(your log covers 2 of them)" said it as a
    // log's coverage; the lead's words say what the person did.
    expect(text).toContain('Average sets a week over the last 4 weeks (you logged in 2 of those weeks)');
    expect(text).not.toContain('your log covers');
  });
});

describe('D214: the window note never claims a log that is not there', () => {
  test('an empty account at 2 weeks gets the plain note, not "covers 0 of them"', async () => {
    const tree = await mount({ route: { params: { windowWeeks: 2 } } });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Average sets a week over the last 2 weeks');
    expect(text).not.toContain('your log covers');
    expect(text).not.toContain('you logged in');
  });
});

describe('D214 (7.4 item 1): the route param opens the screen on a window', () => {
  const noteFor = async (windowWeeks) => flattenText((await mount({ route: { params: { windowWeeks } } })).toJSON());

  test('1, 2 and 4 are honoured', async () => {
    expect(await noteFor(1)).toContain('Sets logged since Monday');
    expect(await noteFor(2)).toContain('Average sets a week over the last 2 weeks');
    expect(await noteFor(4)).toContain('Average sets a week over the last 4 weeks');
  });

  test('an absent or invalid param reads as 1', async () => {
    for (const bad of [undefined, null, 3, 0, -1, 8, 'x', NaN]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await noteFor(bad)).toContain('Sets logged since Monday');
    }
    expect(flattenText((await mount()).toJSON())).toContain('Sets logged since Monday');
  });
});

describe('D214 (7.4 item 2): the summary counts logged sets, never credits', () => {
  test('a set that credits two helper muscles counts once; warm-ups and explosive sets never count', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('press', 4, MONDAY_9AM),
      ...setsOf('press', 2, MONDAY_9AM, { set_type: 'warmup' }),
      ...setsOf('kbswing', 3, MONDAY_9AM, { evidence_class: 'ballistic' }),
    ]);
    const tree = await mount();

    const text = flattenText(tree.toJSON());
    // Four logged rows across chest, triceps and front delts. The credits would
    // sum to eight (4 + 2 + 2), which is exactly what the summary must not print.
    expect(text).toContain('4 sets logged so far this week across 3 muscles');
    expect(text).not.toContain('8 sets');
  });

  test('"N sessions left" comes from the programme position, and is omitted with no plan', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    resolveProgrammePosition.mockResolvedValue({
      sessions: [{ state: 'completed' }, { state: 'outstanding' }, { state: 'outstanding' }, { state: 'skipped_by_user' }],
    });
    let tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('3 sets logged so far this week across 1 muscle · 2 sessions left');

    resolveProgrammePosition.mockResolvedValue({ sessions: [{ state: 'completed' }, { state: 'outstanding' }] });
    tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('· 1 session left');

    resolveProgrammePosition.mockResolvedValue({ sessions: [{ state: 'completed' }] });
    tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('· no sessions left');

    resolveProgrammePosition.mockResolvedValue(null);
    tree = await mount();
    expect(flattenText(tree.toJSON())).not.toMatch(/sessions? left/);
  });

  test('an unreadable programme position never blocks the screen', async () => {
    getCompletedWorkoutSets.mockResolvedValue(chestSets(3));
    resolveProgrammePosition.mockRejectedValue(new Error('no block'));
    getCurrentMesocycleWeek.mockRejectedValue(new Error('no block'));
    const tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('3 sets logged so far this week across 1 muscle');
  });

  test('the (i) carries the one sum a reader could trip on', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain(
      'A set counts once for the muscle it works most and half for each muscle that helps, '
      + "'\n  + 'so the rows add up to more than the sets you logged.",
    );
  });

  test('at 2 and 4 weeks the summary is a weekly average of logged sets', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('press', 24, NOW - 3 * DAY),
      ...setsOf('bench', 1, NOW - 60 * DAY),
    ]);
    const tree = await mount();
    await act(async () => { pressWindow(tree, '2 weeks').props.onPress(); });
    // 24 logged rows over 2 weeks: 12 a week, across the three muscles the press credits.
    expect(flattenText(tree.toJSON())).toContain('12 sets a week on average across 3 muscles');
  });
});

describe('D214 (7.4 item 5): the rows are grouped with counts, in a fixed order', () => {
  // RE-ANCHORED D214 (lane 5 review S2): the plan is the authority on the order
  // (7.4 item 5: "Under the range . 9, Just enough . 1, In range . 5 ...", the
  // strip's count first) and adds the last group "No sets" for a muscle outside
  // the plan's population with no sets. The old order ran Too much first.
  test('Under the range, Just enough, In range, Near the limit, Too much, then No sets, each with its count; empty groups omitted', async () => {
    atWednesday();
    // The plan programmes quads and hamstrings (no sets yet this week) as well
    // as the four muscles trained below.
    planProgrammes('chest', 'back', 'biceps', 'triceps', 'quads', 'hamstrings');
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 25, MONDAY_9AM), // chest 25 > MRV 22: Too much
      ...setsOf('row', 20, MONDAY_9AM), // back 20: MAV 16 < 20 <= MRV 25: Near the limit
      ...setsOf('curl', 10, MONDAY_9AM), // biceps 10: MEV 6 + 2 < 10 <= MAV 14: In range
      ...setsOf('pushdown', 7, MONDAY_9AM), // triceps 7: MEV 6 <= 7 <= 8: Just enough
    ]);
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual([
      'Under the range, 2 muscles', // quads and hamstrings: planned, no sets
      'Just enough, 1 muscle',
      'In range, 1 muscle',
      'Near the limit, 1 muscle',
      'Too much, 1 muscle',
      'No sets, 11 muscles', // the rest: unprogrammed and untrained
    ]);
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toContain('Too much');
    expect(findMuscleRow(tree, 'Back:').props.accessibilityLabel).toContain('Near the limit');
  });

  test('a group with no rows is omitted', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('curl', 10, MONDAY_9AM));
    const tree = await mount();
    // No plan: the sixteen muscles with no sets are outside the verdict population.
    expect(groupHeaders(tree)).toEqual(['In range, 1 muscle', 'No sets, 16 muscles']);
  });

  test('"N sets, range MEV to MRV": the rounded number is the one judged (5.5 reads 6, Just enough, not Under)', async () => {
    atWednesday();
    // 11 chest sets over the last two weeks: an average of 5.5, MEV 6.
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 11, NOW - 3 * DAY),
      ...setsOf('bench', 1, NOW - 60 * DAY),
    ]);
    const tree = await mount();
    await act(async () => { pressWindow(tree, '2 weeks').props.onPress(); });

    expect(flattenText(tree.toJSON())).toContain('An average of 6 sets a week, range 6 to 22');
    const chest = findMuscleRow(tree, 'Chest:');
    expect(chest.props.accessibilityLabel).toContain('Just enough');
    expect(chest.props.accessibilityLabel).not.toContain('Under the range');
    // The figure takes the same rounded number and the same band.
    expect(lastFigureInput().volumeByMuscle.chest).toMatchObject({ workingSets: 6, status: 'minimum' });
  });

  test('a range that starts at 0 reads "up to 14", never "0 to 14" (Front delts), at every window', async () => {
    atWednesday();
    // Front delts: MEV 0, MAV 8, MRV 14. Twelve presses credit them half a set each: six sets.
    getCompletedWorkoutSets.mockResolvedValue(setsOf('press', 12, MONDAY_9AM));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).toContain('6 sets so far this week, up to 14');
    expect(flattenText(tree.toJSON())).not.toMatch(/\b0 to 14\b/);
    expect(flattenText(tree.toJSON())).not.toContain('range up to');
    expect(findMuscleRow(tree, 'Front delts:').props.accessibilityLabel).toContain('6 sets so far this week, up to 14');
    // The bar still takes the range from 0, so the range and the band stay drawn.
    const bar = tree.root.findAll(
      (n) => typeof n.type === 'function' && n.props.value === 6 && n.props.rangeEnd === 14,
    )[0];
    expect(bar.props).toMatchObject({ rangeStart: 0, rangeEnd: 14, bandStart: 2, bandEnd: 8, max: 14 });

    await act(async () => { pressWindow(tree, '2 weeks').props.onPress(); });
    expect(flattenText(tree.toJSON())).toContain('An average of 6 sets a week, up to 14');
    expect(flattenText(tree.toJSON())).not.toMatch(/\b0 to 14\b/);
    expect(findMuscleRow(tree, 'Front delts:').props.accessibilityLabel)
      .toContain('an average of 6 sets a week, up to 14');
  });

  test('every group header reads its label, a middle dot and its count in one line ("In range · 1")', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 25, MONDAY_9AM), // chest: Too much
      ...setsOf('curl', 10, MONDAY_9AM), // biceps: In range
    ]);
    const tree = await mount();
    const headers = tree.root.findAll(
      (n) => typeof n.type === 'string'
        && n.props.accessibilityRole === 'header'
        && /, \d+ muscles?$/.test(n.props.accessibilityLabel || ''),
    );
    // RE-ANCHORED D214 (lane 5 review S2): the plan's order, and "No sets" for the unplanned untrained.
    expect(headers.map(h => flattenText(h))).toEqual(['In range · 1', 'Too much · 1', 'No sets · 15']);
  });

  test('the bar draws the helpful range MEV to MRV with the in-range band MEV + 2 to MAV (the track runs to MRV, or to the value past it)', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([...setsOf('bench', 5, MONDAY_9AM), ...setsOf('curl', 30, MONDAY_9AM)]);
    const tree = await mount();
    const bars = tree.root.findAll((n) => typeof n.type === 'function' && n.props.rangeStart !== undefined && n.props.rangeEnd !== undefined);
    const byValue = (value) => bars.find(b => b.props.value === value);
    // Chest: MEV 6, MAV 14, MRV 22, five sets.
    expect(byValue(5).props).toMatchObject({ value: 5, max: 22, rangeStart: 6, rangeEnd: 22, bandStart: 8, bandEnd: 14 });
    // Biceps: 30 sets is past MRV 22, so the track runs to the value.
    expect(byValue(30).props).toMatchObject({ value: 30, max: 30, rangeStart: 6, rangeEnd: 22, bandStart: 8, bandEnd: 14 });
  });

  test('the bar fill carries the status colour, and no row prints an instruction', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 25, MONDAY_9AM));
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    // D204 addendum 3: a surface describes. The gap to the range is visible from the figures.
    expect(text).not.toMatch(/more to reach|\bmore sets\b|\badd\b|consider|you should|try to/i);
    const bar = tree.root.findAll((n) => typeof n.type === 'function' && n.props.value === 25 && n.props.rangeStart !== undefined)[0];
    expect(bar.props.fillColor).toBe(colors.error);
  });

  test('a row\'s tap opens one line: where its band came from (never a caption on every row)', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 5, MONDAY_9AM));
    const plan = mergeLandmarkPrecedence({
      plan: { table: { chest: { mev: 8, mav: 16, mrv: 24 } }, source: { chest: 'plan' } },
    });
    getEffectiveLandmarks.mockResolvedValue(plan);
    const tree = await mount();

    expect(flattenText(tree.toJSON())).not.toContain('Source:');
    await act(async () => { findMuscleRow(tree, 'Chest:').props.onPress(); });
    expect(flattenText(tree.toJSON())).toContain('Source: your plan');
    // One open at a time: tapping again closes it.
    await act(async () => { findMuscleRow(tree, 'Chest:').props.onPress(); });
    expect(flattenText(tree.toJSON())).not.toContain('Source:');
  });

  test('every source has its words', () => {
    for (const words of [
      "plan: 'your plan'",
      "research: 'research starting point'",
      "adapted: 'adjusted from your logged training'",
      "profile: 'matched to your profile'",
      "manual: 'your own targets'",
    ]) expect(VOLUME_HEATMAP_SOURCE).toContain(words);
  });

  test('one line under the list names the muscles on their own targets, and omits the clause when none', async () => {
    const base = 'Targets start from research figures and adjust to your plan and your logged sessions';
    let tree = await mount();
    expect(flattenText(tree.toJSON())).toContain(`${base}.`);
    expect(flattenText(tree.toJSON())).not.toContain('use your own targets');

    getEffectiveLandmarks.mockResolvedValue(mergeLandmarkPrecedence({
      manual: { chest: { mev: 7, mav: 14, mrv: 22 }, back: { mev: 11, mav: 16, mrv: 25 } },
    }));
    tree = await mount();
    expect(flattenText(tree.toJSON())).toContain(`${base}; Chest and Back use your own targets.`);

    getEffectiveLandmarks.mockResolvedValue(mergeLandmarkPrecedence({
      manual: { chest: { mev: 7, mav: 14, mrv: 22 } },
    }));
    tree = await mount();
    expect(flattenText(tree.toJSON())).toContain(`${base}; Chest uses your own targets.`);
  });

  test('a tap on a region selects it on the figure and scrolls to its row', async () => {
    getCompletedWorkoutSets.mockResolvedValue(chestSets(5));
    await mount();
    const figure = lastFigureInput();
    expect(typeof figure.onMuscleTap).toBe('function');
    await act(async () => { figure.onMuscleTap('chest'); });
    expect(lastFigureInput().selectedMuscle).toBe('chest');
  });
});

describe('D214 lane 5 review S2 (plan 7.4 item 5 and 7.1 item 2): the Under group is the plan\'s population, and the rest with no sets is "No sets"', () => {
  const VERDICT_WORDS = /Under the range|Just enough|In range|Near the limit|Too much/;

  test('a plan-programmed muscle with no sets is Under the range; an unprogrammed one with no sets is No sets', async () => {
    atWednesday();
    planProgrammes('chest', 'quads');
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 10, MONDAY_9AM)); // chest 10: In range
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual(['Under the range, 1 muscle', 'In range, 1 muscle', 'No sets, 15 muscles']);
    expect(findMuscleRow(tree, 'Quads:').props.accessibilityLabel).toContain('0 sets so far this week, range 8 to 20, Under the range');
    // The No sets row prints its figure and no verdict word, aloud or on screen.
    const forearms = findMuscleRow(tree, 'Forearms:').props.accessibilityLabel;
    expect(forearms).toContain('0 sets so far this week, range 4 to 22');
    expect(forearms).not.toMatch(VERDICT_WORDS);
  });

  test('the plan layer is read once per load, for the signed-in person with their profile', async () => {
    atWednesday();
    planProgrammes('chest');
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 10, MONDAY_9AM));
    await mount();
    expect(getPlanLandmarks).toHaveBeenCalledTimes(1);
    expect(getPlanLandmarks).toHaveBeenCalledWith('u1', { userProfile: store.userProfile });
  });

  test('without a plan a muscle with no sets is No sets, and a trained muscle below its range is still Under the range', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM)); // chest 3 < MEV 6
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual(['Under the range, 1 muscle', 'No sets, 16 muscles']);
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toContain('Under the range');
    expect(findMuscleRow(tree, 'Quads:').props.accessibilityLabel).not.toMatch(VERDICT_WORDS);
  });

  test('a trained muscle the plan does not programme is still judged: the population is the plan plus what was logged', async () => {
    atWednesday();
    planProgrammes('quads');
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM)); // chest is off the plan
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual(['Under the range, 2 muscles', 'No sets, 15 muscles']);
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toContain('Under the range');
  });

  test('a manual edit never drops a muscle from the plan-trained set (read from the plan layer, not the merged source)', async () => {
    atWednesday();
    planProgrammes('chest', 'quads');
    // Quads is the person's own band now, so the MERGED source says 'manual'.
    getEffectiveLandmarks.mockResolvedValue(mergeLandmarkPrecedence({ manual: { quads: { mev: 9, mav: 14, mrv: 20 } } }));
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 10, MONDAY_9AM));
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual(['Under the range, 1 muscle', 'In range, 1 muscle', 'No sets, 15 muscles']);
    const quads = findMuscleRow(tree, 'Quads:').props.accessibilityLabel;
    expect(quads).toContain('0 sets so far this week, range 9 to 20, Under the range');
    expect(quads).toContain('source: your own targets');
  });

  test('the figure draws a muscle with no sets hollow whichever group its row sits in', async () => {
    atWednesday();
    planProgrammes('quads');
    getCompletedWorkoutSets.mockResolvedValue(setsOf('curl', 10, MONDAY_9AM));
    await mount();
    const { volumeByMuscle } = lastFigureInput();
    expect(volumeByMuscle.quads).not.toHaveProperty('color'); // planned, no sets: an Under row, "No sets" on the figure
    expect(volumeByMuscle.forearms).not.toHaveProperty('color'); // unplanned, no sets: a No sets row
    expect(volumeByMuscle.biceps.color).toBe(colors.success);
  });

  test('the "No sets" group dot is the legend\'s own hollow swatch: a border and no fill', async () => {
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 6.4): day zero is the flat unjudged list now and
    // carries no group header, so the "No sets" group is read from a window that HAS a set.
    getCompletedWorkoutSets.mockResolvedValue(chestSets(3));
    const tree = await mount();
    const header = tree.root.findAll(
      (n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header'
        && /^No sets, \d+ muscles?$/.test(n.props.accessibilityLabel || ''),
    )[0];
    const dot = header.findAll(
      (n) => typeof n.type === 'string' && n.props.style && StyleSheet.flatten(n.props.style).borderWidth === 1,
    )[0];
    const style = StyleSheet.flatten(dot.props.style);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderColor).toBe(colors.border);
  });

  test('a failed plan read is logged and the screen groups as it does with no plan', async () => {
    atWednesday();
    getPlanLandmarks.mockRejectedValue(new Error('plan read failed'));
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 10, MONDAY_9AM));
    const tree = await mount();

    expect(logError).toHaveBeenCalledWith('VolumeHeatmapScreen.readPlanTrained', expect.any(Error), { userId: 'u1' });
    expect(groupHeaders(tree)).toEqual(['In range, 1 muscle', 'No sets, 16 muscles']);
  });

  test('the plan-trained set comes from the plan layer through the one shared reader (source guard)', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('planTrainedMuscles(await getPlanLandmarks(userId, { userProfile }))');
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/resolvedSource\??\.?\[[^\]]*\]\s*===\s*'plan'/);
  });
});

describe('D214 lane 5 review N3: a failed band read is logged, never silent', () => {
  test('a failed read of the bands in force on load is logged, and the rows judge by the research table', async () => {
    atWednesday();
    getEffectiveLandmarks.mockRejectedValue(new Error('resolve failed'));
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 5, MONDAY_9AM));
    const tree = await mount();

    expect(logError).toHaveBeenCalledWith('VolumeHeatmapScreen.resolveLandmarks', expect.any(Error), { userId: 'u1' });
    expect(flattenText(tree.toJSON())).toContain('5 sets so far this week, range 6 to 22'); // chest at the research band
  });

  test('the post-save and post-reset re-reads of the bands log their failure (source guard)', () => {
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/resolveLandmarksNow\(\)\.catch\(\(\) => \{\}\)/);
    const logged = VOLUME_HEATMAP_SOURCE.match(
      /resolveLandmarksNow\(\)\.catch\(\(e\) => logError\('VolumeHeatmapScreen\.resolveLandmarksNow'/g,
    );
    expect(logged).toHaveLength(2);
  });
});

describe('D214 (7.4 item 5, VH-18 and VH-11): the recency read counts secondary credit and untyped sets, in ink', () => {
  test('a muscle only ever a helper reads "Trained N days ago", from an untyped set too', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('press', 1, NOW - 3 * DAY, { set_type: null }), // untyped, credits triceps at 0.5
    ]);
    const tree = await mount();
    const triceps = findMuscleRow(tree, 'Triceps:');
    expect(triceps.props.accessibilityLabel).toContain('Trained 3 days ago');
  });

  test('the recency is textMuted with no status colour, even within a day', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, NOW - 60 * 1000));
    const tree = await mount();
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.18, trainingRecency.js): "Trained in the last 24 hours".
    const chip = tree.root.findAll((n) => n.type === 'Text' && flattenText(n.props.children) === 'Trained in the last 24 hours')[0];
    expect(StyleSheet.flatten(chip.props.style).color).toBe(colors.textMuted);
    expect(StyleSheet.flatten(chip.props.style).color).not.toBe(colors.warning);
  });

  test('a warm-up or explosive row never makes a muscle "trained"', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 3, NOW - 2 * DAY, { set_type: 'warmup' }),
      ...setsOf('kbswing', 3, NOW - 2 * DAY, { evidence_class: 'ballistic' }),
    ]);
    const tree = await mount();
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).not.toMatch(/Trained/);
    expect(findMuscleRow(tree, 'Hamstrings:').props.accessibilityLabel).not.toMatch(/Trained/);
  });
});

describe('AX-04 (launch accessibility audit): the muscle rows are the accessible + operable path', () => {
  // The figure above the rows is a single summary image for assistive tech
  // (BodyDiagramHeatmap.js, own AX-04 tests); these rows carry the real path:
  // one focusable node per muscle (never duplicated per left or right side),
  // each with a combined label, at a 44dp target. RE-ANCHORED D214: a row is a
  // button now (its tap opens the source line), so the role and the label's
  // wording change; the one-node-per-muscle contract and the target size stand.
  test('each muscle row is one accessibilityRole="button" node with a combined spoken label, >=44dp tall', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 11, MONDAY_9AM));
    const tree = await mount();

    const rows = tree.root.findAll(
      (n) => n.props.accessibilityRole === 'button'
        && typeof n.props.accessibilityLabel === 'string'
        && / sets? so far this week/.test(n.props.accessibilityLabel)
        && typeof n.type === 'string',
    );
    expect(rows.length).toBe(Object.keys(VOLUME_LANDMARKS).length);
    const labels = rows.map((r) => r.props.accessibilityLabel);
    expect(new Set(labels).size).toBe(labels.length);

    const chestRow = rows.find((r) => r.props.accessibilityLabel.startsWith('Chest:'));
    expect(chestRow.props.accessibilityLabel)
      .toBe('Chest: 11 sets so far this week, range 6 to 22, In range, Trained 2 days ago, source: research starting point');
    expect(StyleSheet.flatten(chestRow.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  test('the row is hidden from nothing and nests nothing accessible', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 11, NOW - 60 * 1000));
    const tree = await mount();
    const chestRow = tree.root.findAll(
      (n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string'
        && (n.props.accessibilityLabel || '').startsWith('Chest:'),
    )[0];
    expect(chestRow.props.accessibilityLabel).toContain('Trained in the last 24 hours');
    expect(chestRow.props.accessibilityLabel).not.toMatch(/Fresh|Recovering|Ready/);
    expect(chestRow.findAll((n) => n.props.accessibilityRole === 'image').length).toBe(0);
  });

  test('a future or malformed last-trained timestamp reads as unknown, never a guessed verdict', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, NOW + 3 * DAY));
    const tree = await mount();
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).not.toMatch(/Trained|Not logged/);
  });
});

describe('D214 (7.4 items 2 and 3, PR-14 and VH-10): a recovery week is framed, not judged', () => {
  async function recoveryWeekTree() {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, weekIndex: 5, plannedWeeks: 5 });
    getCompletedWorkoutSets.mockResolvedValue([...setsOf('bench', 3, MONDAY_9AM), ...setsOf('curl', 2, MONDAY_9AM)]);
    return mount();
  }

  test('says it is a recovery week, and prints no band word on the rows', async () => {
    const tree = await recoveryWeekTree();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Recovery week: sets are planned lower this week');
    for (const word of ['Under the range', 'Just enough', 'In range', 'Near the limit', 'Too much']) {
      expect(text).not.toContain(word);
    }
    expect(groupHeaders(tree)).toEqual([]);
    // The rows still print their figures.
    expect(text).toContain('3 sets so far this week, range 6 to 22');
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.16): the neutral figure's note says it in plain words.
    expect(text).toContain('No muscle is judged this week. Every muscle you trained is shown in one colour on the figure.');
    expect(text).not.toMatch(/share one shade|its legend says only/);
    // A recovery week already says nothing is judged, so the unjudged line is not said twice.
    expect(text).not.toContain('Nothing is judged until a set is logged.');
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).not.toMatch(/Under the range|Just enough|In range|Near the limit|Too much/);
  });

  // D214 addendum 2 (lane 5 landing): the recovery week is the programme
  // position's GATED state (programmePosition.js), the reading the plan-week
  // card and the Progress strip make, so the three surfaces cannot disagree;
  // the calendar row is only the fallback when the position cannot be read.
  test('the gated programme position decides: the planned recovery week frames the screen even when the calendar row does not', async () => {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: false, weekIndex: 5, plannedWeeks: 5 });
    resolveProgrammePosition.mockResolvedValue({
      sessions: [{ state: 'outstanding' }],
      recoveryState: { state: 'planned_block_recovery', because: 'block_recovery_week' },
    });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    const tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('Recovery week: sets are planned lower this week');
    expect(groupHeaders(tree)).toEqual([]);
  });

  test('a recovery week the position holds back behind an outstanding accumulation session is judged as an ordinary week', async () => {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, weekIndex: 5, plannedWeeks: 5 });
    resolveProgrammePosition.mockResolvedValue({
      sessions: [{ state: 'outstanding' }],
      recoveryState: { state: 'normal_accumulation', because: 'accumulation_work_outstanding' },
    });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    const tree = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Recovery week');
    expect(groupHeaders(tree).length).toBeGreaterThan(0);
  });

  // Lane 5 review S1: the screen reads the planned-recovery state exactly as the
  // plan-week card does (progress/planWeek.js), because recoveryState.js's own
  // rule is that an adaptive recovery adjustment is never called a recovery week
  // (the calendar row's is_deload flag is true on both kinds of lighter week).
  test('an adaptive recovery adjustment is not a recovery week: no framing line and the band groups stay, though the calendar row is flagged', async () => {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, weekIndex: 3, plannedWeeks: 5 });
    resolveProgrammePosition.mockResolvedValue({
      sessions: [{ state: 'outstanding' }],
      recoveryState: { state: 'adaptive_recovery_adjustment', because: 'recovery_evidence' },
    });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).not.toContain('Recovery week');
    expect(groupHeaders(tree)).toEqual(['Under the range, 1 muscle', 'No sets, 16 muscles']);
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toContain('Under the range');
    expect(lastFigureInput().neutralVolume).toBe(false);
    // The position was readable, so the calendar row is not consulted at all.
    expect(getCurrentMesocycleWeek).not.toHaveBeenCalled();
  });

  test('the screen reads the planned-recovery state itself, never isLighterTrainingState (source guard)', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('position.recoveryState?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY');
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/import \{ RECOVERY_STATE \} from '\.\.\/lib\/recoveryState';/);
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/import \{[^}]*isLighterTrainingState[^}]*\} from/);
  });

  test('the figure is told to draw no verdict in a recovery week, and a verdict otherwise', async () => {
    const tree = await recoveryWeekTree();
    expect(tree).toBeTruthy();
    const last = BodyDiagramHeatmap.mock.calls[BodyDiagramHeatmap.mock.calls.length - 1][0];
    expect(last.neutralVolume).toBe(true);
    BodyDiagramHeatmap.mockClear();
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue(null);
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    await mount();
    const ordinary = BodyDiagramHeatmap.mock.calls[BodyDiagramHeatmap.mock.calls.length - 1][0];
    expect(ordinary.neutralVolume).toBe(false);
  });

  test('a finished block awaiting its decision is no live recovery week', async () => {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, awaitingDecision: true, weekIndex: 5, plannedWeeks: 5 });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Recovery week');
    expect(groupHeaders(tree).length).toBeGreaterThan(0); // judged as an ordinary week
  });

  test('the figure takes one neutral shade for every trained muscle and nothing for the rest', async () => {
    await recoveryWeekTree();
    const { volumeByMuscle } = lastFigureInput();
    expect(volumeByMuscle.chest.color).toBe(colors.surface3);
    expect(volumeByMuscle.biceps.color).toBe(colors.surface3);
    expect(volumeByMuscle.back).not.toHaveProperty('color'); // no sets: drawn as "No sets"
  });

  test('an ordinary week judges, and a muscle with no sets carries no colour on the figure', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('curl', 10, MONDAY_9AM));
    await mount();
    const { volumeByMuscle } = lastFigureInput();
    expect(volumeByMuscle.biceps.color).toBe(colors.success); // In range
    expect(volumeByMuscle.chest).not.toHaveProperty('color'); // zero sets: "No sets", not "Under the range"
  });
});

describe('D214 (7.4 item 4): the one legend', () => {
  test('the screen carries no legend of its own, and no band word of the old legend', async () => {
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/LegendItem|LegendRow|legendRow/);
    for (const old of ['Below target', 'Good range', 'Getting close', 'No data']) {
      expect(VOLUME_HEATMAP_SOURCE).not.toContain(old);
    }
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    for (const old of ['Below target', 'Good range', 'Getting close']) expect(text).not.toContain(old);
  });

  test('the figure\'s own legend names all six colours the screen can draw', () => {
    for (const word of ['Under the range', 'Just enough', 'In range', 'Near the limit', 'Too much', 'No sets']) {
      expect(BODY_DIAGRAM_SOURCE).toContain(`label: '${word}'`);
    }
  });

  // RE-ANCHORED 2026-10-02 (D214 addendum 9, census W4): the five words are written ONCE, in
  // lib/volumeBandLabels.js, and this screen reads them from it (the Workout Summary reads the same map);
  // the figure's own legend names the same words and is held equal to the map here.
  test('the group headers use the legend\'s own words, read from the one shared map', () => {
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/import \{ VOLUME_BAND_LABELS, volumeRangeText \} from '\.\.\/lib\/volumeBandLabels';/);
    for (const key of ['below', 'minimum', 'optimal', 'near_mrv', 'over_mrv']) {
      expect(VOLUME_HEATMAP_SOURCE).toContain(`label: VOLUME_BAND_LABELS.${key}`);
    }
    for (const word of Object.values(VOLUME_BAND_LABELS)) {
      expect(BODY_DIAGRAM_SOURCE).toContain(`label: '${word}'`);
    }
  });
});

describe('D214 (7.4 item 6): the trend card', () => {
  const thisMonday = (k) => new Date(2026, 5, 8 + 7 * k).getTime();
  const bucket = (k, volumeByMuscle) => ({
    weekLabel: `W${k + 4}`, weekStart: thisMonday(k), weekEnd: thisMonday(k + 1), volumeByMuscle,
  });

  async function trendTree() {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 10, thisMonday(-3) + 3600000),
      ...setsOf('bench', 12, thisMonday(-2) + 3600000),
      ...setsOf('bench', 14, thisMonday(-1) + 3600000),
      ...setsOf('bench', 5, MONDAY_9AM),
    ]);
    getWeeklyVolumeByMuscle.mockResolvedValue([
      bucket(-3, { chest: 10 }), bucket(-2, { chest: 12 }), bucket(-1, { chest: 14 }), bucket(0, { chest: 5 }),
    ]);
    return mount();
  }

  test('titled in weeks, with the window chips, and the figure labelled and in ink, not a band colour', async () => {
    const tree = await trendTree();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Sets a week, last 4 weeks');
    expect(text).toContain('this week so far: 5 sets');
    const figure = tree.root.findAll((n) => n.type === 'Text' && flattenText(n.props.children) === 'this week so far: 5 sets')[0];
    expect(StyleSheet.flatten(figure.props.style).color).toBe(colors.textSecondary);
  });

  test('the current half-finished week is drawn in ink, full weeks by their band, empty weeks as the empty track', async () => {
    const tree = await trendTree();
    const chart = tree.root.findAll((n) => n.type === 'VolyumeChart')[0];
    const data = chart.props.data;
    expect(data).toHaveLength(4);
    expect(data[3].color).toBe(colors.textSecondary); // this week so far: never a full-week verdict
    expect(data[2].color).toBe(colors.success); // 14 sets: In range
    expect(data[0].color).toBe(colors.success); // 10 sets: In range
  });

  test('the takeaway counts LOGGED sets per Monday week, never the credits', async () => {
    const tree = await trendTree();
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.22): the average names its unit, "sets a week".
    expect(flattenText(tree.toJSON())).toContain('This week so far: 5 sets logged. Last 3 full weeks: about 12 sets a week.');
  });

  test('credits that exceed logged sets (a compound lift) do not inflate the takeaway', async () => {
    atWednesday();
    // Eight logged presses in a full week credit chest 8, triceps 4 and front delts 4: 16 credits.
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('press', 8, thisMonday(-2) + 3600000),
      ...setsOf('press', 8, thisMonday(-1) + 3600000),
      ...setsOf('press', 4, MONDAY_9AM),
    ]);
    getWeeklyVolumeByMuscle.mockResolvedValue([
      bucket(-2, { chest: 8, triceps: 4, front_delts: 4 }),
      bucket(-1, { chest: 8, triceps: 4, front_delts: 4 }),
      bucket(0, { chest: 4, triceps: 2, front_delts: 2 }),
    ]);
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('This week so far: 4 sets logged. Last 2 full weeks: about 8 sets a week.');
    expect(text).not.toContain('about 16');
    expect(text).not.toContain('8 sets logged');
  });

  // D214 addendum 9 (census H5): a full week with no logged set is left out of the average, so the label
  // says how many of the full weeks the average rests on rather than claiming every week in the window.
  test('a week away is named: "Last 3 full weeks (2 with sets logged): about 12 sets a week."', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 10, thisMonday(-3) + 3600000),
      // nothing logged in the week of thisMonday(-2): a week away
      ...setsOf('bench', 14, thisMonday(-1) + 3600000),
      ...setsOf('bench', 5, MONDAY_9AM),
    ]);
    getWeeklyVolumeByMuscle.mockResolvedValue([
      bucket(-3, { chest: 10 }), bucket(-2, {}), bucket(-1, { chest: 14 }), bucket(0, { chest: 5 }),
    ]);
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('This week so far: 5 sets logged. Last 3 full weeks (2 with sets logged): about 12 sets a week.');
    expect(text).not.toContain('Last 3 full weeks: about');
  });

  test('every full week had sets: no parenthesis, the label is the plain one', async () => {
    const tree = await trendTree();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Last 3 full weeks: about 12 sets a week.');
    expect(text).not.toContain('with sets logged');
  });

  // Census H4, 6.2 and 6.3: the card's own window control reads in words and takes the ink variant.
  test('the trend chips read "4 weeks", "8 weeks", "3 months", "6 months", and the selected one is ink', async () => {
    const tree = await trendTree();
    const chip = (label) => tree.root.findAll(
      (n) => n.props.accessibilityLabel === `volume trend window: ${label}` && typeof n.props.onPress === 'function',
    )[0];
    for (const label of ['4 weeks', '8 weeks', '3 months', '6 months']) expect(chip(label)).toBeTruthy();
    const bare = tree.root.findAll((n) => n.type === 'Text' && ['4W', '8W', '3M', '6M'].includes(flattenText(n.props.children)));
    expect(bare).toHaveLength(0);
    // The screen hands the card's chips the ink variant (the top control is amber: pinned in WindowChips.inkSelected.test.js).
    const windowChips = tree.root.findAll((n) => typeof n.type === 'function' && n.type.name === 'WindowChips');
    expect(windowChips).toHaveLength(2);
    expect(windowChips[0].props.inkSelected).toBeUndefined();
    expect(windowChips[1].props.inkSelected).toBe(true);
    expect(windowChips[1].props.accessibilityPrefix).toBe('volume trend window');
  });

  test('a trend chip reloads only the trend, never the whole screen', async () => {
    const tree = await trendTree();
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(1);
    expect(getWeeklyVolumeByMuscle).toHaveBeenCalledTimes(1);
    const eightWeeks = tree.root.findAll(
      // RE-ANCHORED 2026-10-02 (D214 addendum 9, census H4): the trend chips read in words ("8 weeks").
      (n) => n.props.accessibilityLabel === 'volume trend window: 8 weeks' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { eightWeeks.props.onPress(); });
    await flush();
    expect(getWeeklyVolumeByMuscle).toHaveBeenCalledTimes(2);
    expect(getWeeklyVolumeByMuscle.mock.calls[1][1]).toBe(8);
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(1);
    expect(flattenText(tree.toJSON())).toContain('Sets a week, last 8 weeks');
  });

  test('a failed trend read hides the card and never fails the screen', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 5, MONDAY_9AM));
    getWeeklyVolumeByMuscle.mockRejectedValue(new Error('read failed'));
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain("Couldn't load volume heatmap");
    expect(text).not.toContain('Sets a week');
    expect(text).toContain('5 sets so far this week, range 6 to 22');
  });
});

describe('D214 (7.4 item 7): Volume targets, one door to a touched-only editor', () => {
  const KEY = '@volyume_landmarks_u1';

  // A plan band on chest (8/16/24), everything else at research.
  const planTable = () => mergeLandmarkPrecedence({
    plan: { table: { chest: { mev: 8, mav: 16, mrv: 24 } }, source: { chest: 'plan' } },
  });

  // The jest Modal mock renders its children whether or not it is visible (a real
  // Modal mounts nothing while closed), so open/closed is read from its prop.
  const editorOpen = (tree) => tree.root.findAllByType(Modal)[0].props.visible === true;
  const field = (tree, label) => tree.root.findAll((n) => n.type === 'TextField' && n.props.accessibilityLabel === label)[0];
  const press = (tree, label) => tree.root.findAll(
    // The door's spoken label carries its sub line too (NavRow, the lead's D214
    // rule 3 landing fix), so the press matches the label or its first sentence.
    (n) => (n.props.accessibilityLabel === label || (typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`${label}. `)))
      && typeof n.props.onPress === 'function',
  )[0];
  const savedBlob = () => {
    const call = AsyncStorage.setItem.mock.calls.find(([k]) => k === KEY);
    return call ? JSON.parse(call[1]) : null;
  };

  async function openEditor(tree) {
    await act(async () => { press(tree, 'Volume targets').props.onPress(); });
  }
  async function type(tree, label, value) {
    await act(async () => { field(tree, label).props.onChangeText(value); });
  }
  async function save(tree) {
    await act(async () => { await press(tree, 'Save volume targets').props.onPress(); });
    await flush();
  }

  beforeEach(() => {
    getEffectiveLandmarks.mockImplementation(() => Promise.resolve(planTable()));
  });

  test('the screen ends with one NavRow "Volume targets" and the editor is closed until it is pressed', async () => {
    const tree = await mount();
    expect(press(tree, 'Volume targets')).toBeTruthy();
    expect(flattenText(tree.toJSON())).toContain('How many sets each muscle gets each week.');
    expect(editorOpen(tree)).toBe(false);
    await openEditor(tree);
    expect(editorOpen(tree)).toBe(true);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/import \{ NavRow, NavGroup \} from '\.\.\/components\/NavRow';/);
    expect(VOLUME_HEATMAP_SOURCE).not.toContain('Reset to defaults');
    expect(VOLUME_HEATMAP_SOURCE).not.toContain('Edit volume targets');
  });

  test('the editor seeds each field with the band in force, not the research table', async () => {
    const tree = await mount();
    await openEditor(tree);
    expect(field(tree, 'Chest Min').props.value).toBe('8'); // the plan band (research is 6)
    expect(field(tree, 'Chest Target').props.value).toBe('16');
    expect(field(tree, 'Chest Max').props.value).toBe('24');
    expect(field(tree, 'Back Min').props.value).toBe(String(VOLUME_LANDMARKS.back.mev));
  });

  test('a plan-banded muscle left untouched is never written as a manual edit', async () => {
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Back Min', '12'); // touch only back
    await save(tree);

    const blob = savedBlob();
    expect(Object.keys(blob)).toEqual(['back']);
    expect(blob.back).toEqual({ mev: 12, mav: VOLUME_LANDMARKS.back.mav, mrv: VOLUME_LANDMARKS.back.mrv, explicit: true });
    expect(blob).not.toHaveProperty('chest'); // chest's seed differs from research, and must not be saved for that
    expect(syncUserPref).toHaveBeenCalledWith('u1', KEY, JSON.stringify(blob));
  });

  test('opening the editor and saving with nothing touched writes nothing', async () => {
    const tree = await mount();
    await openEditor(tree);
    await save(tree);
    expect(AsyncStorage.setItem.mock.calls.filter(([k]) => k === KEY)).toEqual([]);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(syncUserPref).not.toHaveBeenCalled();
    expect(editorOpen(tree)).toBe(false); // the editor closed
  });

  test('a failed re-read of the bands after a save is logged, and the save still stands', async () => {
    getEffectiveLandmarks.mockReset();
    getEffectiveLandmarks.mockResolvedValueOnce(planTable()).mockRejectedValue(new Error('re-read failed'));
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Back Min', '12');
    await save(tree);

    expect(savedBlob()).toEqual({
      back: { mev: 12, mav: VOLUME_LANDMARKS.back.mav, mrv: VOLUME_LANDMARKS.back.mrv, explicit: true },
    });
    expect(logError).toHaveBeenCalledWith('VolumeHeatmapScreen.resolveLandmarksNow', expect.any(Error), { userId: 'u1' });
  });

  test('a touched muscle saved at the research value is still explicit, even against a different seed', async () => {
    const tree = await mount();
    await openEditor(tree);
    // Chest was seeded at the plan band 8/16/24; the person types the research values 6/14/22.
    await type(tree, 'Chest Min', '6');
    await type(tree, 'Chest Target', '14');
    await type(tree, 'Chest Max', '22');
    await save(tree);

    expect(savedBlob()).toEqual({ chest: { mev: 6, mav: 14, mrv: 22, explicit: true } });
  });

  test('a touched muscle typed back to its own seeded value is still the person\'s own (intent is recorded, not inferred)', async () => {
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Chest Min', '9');
    await type(tree, 'Chest Min', '8');
    await save(tree);
    expect(savedBlob()).toEqual({ chest: { mev: 8, mav: 16, mrv: 24, explicit: true } });
  });

  test('an abandoned edit is not intent: cancelling then saving another muscle never stamps the first', async () => {
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Chest Min', '9');
    await act(async () => { press(tree, 'Cancel').props.onPress(); });
    await openEditor(tree);
    expect(field(tree, 'Chest Min').props.value).toBe('8'); // re-seeded: the typed 9 is gone
    await type(tree, 'Back Min', '12');
    await save(tree);
    expect(Object.keys(savedBlob())).toEqual(['back']);
  });

  test('an earlier saved edit survives a save that touches another muscle; a neutral legacy default does not', async () => {
    AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k === KEY ? JSON.stringify({
      biceps: { mev: 8, mav: 14, mrv: 22 }, // a real legacy edit (differs from research 6/14/22), no flag
      quads: { mev: 8, mav: 14, mrv: 20 }, // an untouched research default saved by the old editor: not intent
    }) : null));
    getEffectiveLandmarks.mockImplementation(() => Promise.resolve(mergeLandmarkPrecedence({
      manual: { biceps: { mev: 8, mav: 14, mrv: 22 } },
      plan: { table: { chest: { mev: 8, mav: 16, mrv: 24 } }, source: { chest: 'plan' } },
    })));
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Back Min', '12');
    await save(tree);

    const blob = savedBlob();
    expect(Object.keys(blob).sort()).toEqual(['back', 'biceps']);
    expect(blob.biceps).toEqual({ mev: 8, mav: 14, mrv: 22 });
  });

  test('"Back to Volyume\'s targets" sits inside the editor: per muscle, and for all', async () => {
    AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k === KEY
      ? JSON.stringify({ chest: { mev: 7, mav: 15, mrv: 23, explicit: true } }) : null));
    const tree = await mount();
    expect(editorOpen(tree)).toBe(false);
    await openEditor(tree);
    expect(press(tree, "Chest back to Volyume's targets")).toBeTruthy();
    expect(press(tree, "Back back to Volyume's targets")).toBeUndefined(); // nothing to hand back
    expect(press(tree, "All muscles back to Volyume's targets")).toBeTruthy();

    // The per-muscle release drops that muscle's entry and tombstones the cloud copy when it was the last.
    await act(async () => { await press(tree, "Chest back to Volyume's targets").props.onPress(); });
    await flush();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY);
    expect(syncUserPref).toHaveBeenCalledWith('u1', KEY, '');
  });

  test('releasing a muscle that was only typed in this session writes nothing and restores its seeded band', async () => {
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Chest Min', '9'); // chest is seeded at the plan band, min 8
    expect(field(tree, 'Chest Min').props.value).toBe('9');
    await act(async () => { await press(tree, "Chest back to Volyume's targets").props.onPress(); });
    await flush();
    expect(field(tree, 'Chest Min').props.value).toBe('8');
    expect(flattenText(tree.toJSON())).toContain("Chest is back to Volyume's targets.");
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem.mock.calls.filter(([k]) => k === KEY)).toEqual([]);
    expect(syncUserPref).not.toHaveBeenCalled();
    // And a save now writes nothing: the muscle is no longer touched.
    await save(tree);
    expect(AsyncStorage.setItem.mock.calls.filter(([k]) => k === KEY)).toEqual([]);
  });

  test('"All muscles back to Volyume\'s targets" confirms inline, then removes the blob and tombstones the cloud copy', async () => {
    AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k === KEY
      ? JSON.stringify({ chest: { mev: 7, mav: 15, mrv: 23, explicit: true } }) : null));
    const tree = await mount();
    await openEditor(tree);
    await act(async () => { press(tree, "All muscles back to Volyume's targets").props.onPress(); });
    // A confirmation is showing; nothing has been written yet.
    expect(flattenText(tree.toJSON())).toContain('Your own targets are removed.');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(syncUserPref).not.toHaveBeenCalled();

    await act(async () => { await press(tree, "Confirm all muscles back to Volyume's targets").props.onPress(); });
    await flush();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY);
    expect(syncUserPref).toHaveBeenCalledWith('u1', KEY, '');
    expect(editorOpen(tree)).toBe(false);
    // The bands in force are read again, so the rows follow the targets Volyume now uses.
    expect(getEffectiveLandmarks.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('"Keep mine" backs out of the confirmation without writing anything', async () => {
    AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k === KEY
      ? JSON.stringify({ chest: { mev: 7, mav: 15, mrv: 23, explicit: true } }) : null));
    const tree = await mount();
    await openEditor(tree);
    await act(async () => { press(tree, "All muscles back to Volyume's targets").props.onPress(); });
    await act(async () => { press(tree, 'Keep my own targets').props.onPress(); });
    expect(press(tree, "All muscles back to Volyume's targets")).toBeTruthy();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(editorOpen(tree)).toBe(true);
  });

  test('a failed save says so inside the editor, which sits above the toast host, and stays open', async () => {
    const tree = await mount();
    await openEditor(tree);
    await type(tree, 'Back Min', '12');
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await save(tree);
    expect(flattenText(tree.toJSON())).toContain("Couldn't save your volume targets. Try again.");
    expect(editorOpen(tree)).toBe(true);
  });

  test('the editor is a native Modal, so it never calls the alert host (which would sit behind it)', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('<Modal visible={editing}');
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/appAlert/);
  });

  test('no editor copy tells the athlete what to do', () => {
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/more to reach|N more|add a couple|consider|you should|try adding/i);
  });
});

describe('R2 (2026-07-11) design-cohesion census', () => {
  test('the target-edit input uses the input radius (md), not the tighter sm', () => {
    // Input class -> radius.md (FOOD-DESIGN-STANDARD.md section 4).
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/editInputField: \{ borderRadius: radius\.md \}/);
  });

  test('every pure set-count/target readout carries tabular figures', () => {
    // RE-ANCHORED D214: the old setsCount / "/22" pair and the bare trend
    // count are sentences now ("5 sets so far this week, range 6 to 22", "this week so
    // far: 5 sets"). The editor's numeric boxes keep tabular figures, and the
    // trend figure reads through type.num (tabular) in its frozen style and its
    // live-theme twin (D70 precedent).
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/editInputText: \{[\s\S]*?fontVariant: \['tabular-nums'\]/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/figure: \{\n    \.\.\.type\.num\('caption'\),/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/figure: \{ \.\.\.t\.type\.num\('caption'\), color: t\.colors\.textSecondary \}/);
  });
});

describe('A7 (final certification 2026-09-05): the heatmap says what it does not count', () => {
  // Ruling A7: advice and readouts must not be built on evidence the engine
  // has deliberately excluded. calculateWeeklyVolume drops every ballistic
  // set (EL-7), so a swing-heavy week reads near-empty. The line below is
  // shown ONLY when the displayed window actually contains such work.
  const swingSets = (count) => setsOf('kbswing', count, Date.now(), { evidence_class: 'ballistic', actualReps: 15, weight: 24 });

  // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
  const NOTE = 'Explosive lifts like swings, cleans, snatches and jumps are not counted here '
    + 'or used to judge your weekly volume.';

  test('names the excluded work when the window contains ballistic sets', async () => {
    getCompletedWorkoutSets.mockResolvedValueOnce([...chestSets(11), ...swingSets(10)]);
    const tree = await mount();
    expect(flattenText(tree.toJSON())).toContain(NOTE);
  });

  test('stays silent on an ordinary week', async () => {
    getCompletedWorkoutSets.mockResolvedValueOnce(chestSets(11));
    const tree = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Explosive lifts');
  });

  test('a circuit set alone never triggers the line (EL-7: circuit sets DO count)', async () => {
    getCompletedWorkoutSets.mockResolvedValueOnce(
      chestSets(11).map((s) => ({ ...s, evidence_class: 'circuit' })),
    );
    const tree = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Explosive lifts');
  });

  test('the sentence claims nothing the volume read does not actually exclude', () => {
    // Source guard: circuit rounds are counted by calculateWeeklyVolume, so
    // the copy must never tell the user they are dropped. British English,
    // no em dash (CLAUDE.md section 3).
    const line = VOLUME_HEATMAP_SOURCE.match(/Explosive lifts like[^\n]*/)?.[0] ?? '';
    expect(line).toContain('swings, cleans, snatches and jumps are not counted here');
    expect(line).not.toMatch(/circuit/i);
    expect(line).not.toContain('—');
  });
});

describe('D204 addendum 3 (source guard): the screen describes and never instructs', () => {
  test('no instruction to the athlete appears anywhere in the screen source', () => {
    // Comments included: nothing here may say what to add, reach or consider.
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/more to reach|\bN more\b|add a couple|\bconsider\b|you should|try adding|aim for|\bkeep going\b/i);
    expect(VOLUME_HEATMAP_SOURCE).not.toContain('—'); // no em dash anywhere (CLAUDE.md section 3)
  });
});

describe('F6 (progress-tab audit 2026-09-24): the division legend names the weekly target, not internal jargon', () => {
  // BodyDiagramHeatmap is a recorder above, so this is a source-level
  // regression guard on the exact copy (see BODY_DIAGRAM_SOURCE).
  test('the legend copy renders "weekly target raised for"/"it is capped", not "Elevated for"/"means capped"', () => {
    expect(BODY_DIAGRAM_SOURCE).toMatch(/weekly target raised for \$\{divisionLabel\}/);
    expect(BODY_DIAGRAM_SOURCE).toMatch(/Triangle up means the weekly target is raised for/);
    expect(BODY_DIAGRAM_SOURCE).toMatch(/triangle down means it is capped/);
    expect(BODY_DIAGRAM_SOURCE).not.toMatch(/Elevated for \$\{divisionLabel\}/);
    expect(BODY_DIAGRAM_SOURCE).not.toMatch(/triangle down means capped/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// D214 addendum 9 (census 6.4, H6, the lead's ruling). A plan that programmes
// every muscle read "Under the range · 17" over seventeen "0 of 6 to 22" rows on
// a Monday morning, while the Progress strip said "no sets logged" and judged
// nothing. Nothing is judged until a set is logged in the window shown. BOTH
// states are pinned: a window with no logged set is the recovery week's flat
// unjudged list; a window that HAS sets keeps lane 5's population rule.
// ───────────────────────────────────────────────────────────────────────────
describe('D214 addendum 9 (census 6.4): nothing is judged until a set is logged in the window shown', () => {
  const VERDICT = /Under the range|Just enough|In range|Near the limit|Too much/;
  const NOTHING_JUDGED = 'Nothing is judged until a set is logged.';

  test('a plan that programmes muscles and nothing logged: one flat list, no band header, no verdict, and the one line', async () => {
    atWednesday();
    planProgrammes('chest', 'back', 'quads', 'hamstrings');
    const tree = await mount();
    const text = flattenText(tree.toJSON());

    expect(groupHeaders(tree)).toEqual([]);
    expect(text).not.toMatch(VERDICT);
    expect(text).not.toContain('No sets ·');
    expect(text).toContain(NOTHING_JUDGED);
    const rows = tree.root.findAll(
      (n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string'
        && / sets? so far this week/.test(n.props.accessibilityLabel || ''),
    );
    expect(rows).toHaveLength(17);
    const quads = findMuscleRow(tree, 'Quads:').props.accessibilityLabel;
    expect(quads).toMatch(/^Quads: 0 sets so far this week, range 8 to 20(, |$)/);
    expect(quads).not.toMatch(VERDICT);
    // No verdict colour reaches the figure or a bar, and the figure is told nothing is judged by drawing none.
    for (const entry of Object.values(lastFigureInput().volumeByMuscle)) expect(entry).not.toHaveProperty('color');
    const bars = tree.root.findAll((n) => typeof n.type === 'function' && n.props.rangeStart !== undefined && n.props.rangeEnd !== undefined);
    expect(bars.length).toBe(17);
    for (const bar of bars) expect(bar.props.fillColor).toBeUndefined();
  });

  test('the same plan with a set logged judges again: the planned muscles with no sets list under Under the range', async () => {
    atWednesday();
    planProgrammes('chest', 'back', 'quads', 'hamstrings');
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 10, MONDAY_9AM)); // chest 10: In range
    const tree = await mount();

    expect(groupHeaders(tree)).toEqual(['Under the range, 3 muscles', 'In range, 1 muscle', 'No sets, 13 muscles']);
    expect(flattenText(tree.toJSON())).not.toContain(NOTHING_JUDGED);
    expect(findMuscleRow(tree, 'Quads:').props.accessibilityLabel).toContain('Under the range');
  });

  test('it is about the window shown: sets 20 days ago leave "This week" unjudged and the 4 weeks view judged', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 8, NOW - 20 * DAY));
    const tree = await mount();
    expect(groupHeaders(tree)).toEqual([]);
    expect(flattenText(tree.toJSON())).toContain(NOTHING_JUDGED);

    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });
    expect(groupHeaders(tree).length).toBeGreaterThan(0);
    expect(flattenText(tree.toJSON())).not.toContain(NOTHING_JUDGED);
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toMatch(/Under the range|Just enough|In range/);
  });

  test('any window: nothing logged in 2 weeks is unjudged at 2 weeks too, each row an average of nothing', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 8, NOW - 20 * DAY));
    const tree = await mount({ route: { params: { windowWeeks: 2 } } });
    const text = flattenText(tree.toJSON());
    expect(groupHeaders(tree)).toEqual([]);
    expect(text).toContain(NOTHING_JUDGED);
    expect(text).toContain('No sets logged in the last 2 weeks');
    expect(text).toContain('An average of 0 sets a week, range 6 to 22');
    expect(text).not.toMatch(VERDICT);
  });

  test('a recovery week says it once, in its own words, and never adds this line', async () => {
    atWednesday();
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, weekIndex: 5, plannedWeeks: 5 });
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Recovery week: sets are planned lower this week');
    expect(text).not.toContain(NOTHING_JUDGED);
    expect(groupHeaders(tree)).toEqual([]);
  });

  test('the rule lives in one flag that the rows, the groups and the figure all read (source guard)', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('const unjudged = recoveryWeek || !view || view.loggedRows === 0;');
    expect(VOLUME_HEATMAP_SOURCE).toContain('const judged = !unjudged && group !== NO_SETS_GROUP;');
    expect(VOLUME_HEATMAP_SOURCE).toContain('if (unjudged) return [{ key: \'flat\', label: null, status: null, rows: rowModels }];');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// D214 addendum 9 (census 6.5). The adaptive adjustment (recovery evidence easing
// one accumulation week) is said on the heatmap in plain words, and never as a
// recovery week. VERIFIED FIRST, as the brief required: the bands the rows judge
// against do NOT drop with the adjustment, so the line says a muscle can read
// under its range. The source guard below pins that premise.
// ───────────────────────────────────────────────────────────────────────────
describe('D214 addendum 9 (census 6.5): an adaptive adjustment is said in plain words, never as a recovery week', () => {
  const LINE = 'Training is lighter for now: your coach is holding back some of your sets, so a muscle can read under its range.';

  async function withState(state, extra = {}) {
    atWednesday();
    resolveProgrammePosition.mockResolvedValue({
      sessions: [{ state: 'outstanding' }],
      recoveryState: { state, because: 'test' },
      ...extra,
    });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    return mount();
  }

  test('adaptive: the line sits under the summary, the muscles are still judged, and "recovery week" is never said', async () => {
    const tree = await withState('adaptive_recovery_adjustment');
    const text = flattenText(tree.toJSON());
    expect(text).toContain(LINE);
    expect(text.indexOf(LINE)).toBeGreaterThan(text.indexOf('sets logged so far this week'));
    expect(text).not.toMatch(/recovery week/i);
    expect(text).not.toContain('No muscle is judged this week');
    expect(groupHeaders(tree)).toEqual(['Under the range, 1 muscle', 'No sets, 16 muscles']);
    expect(lastFigureInput().neutralVolume).toBe(false);
  });

  test('a normal accumulation week and a planned recovery week do not say it', async () => {
    let tree = await withState('normal_accumulation');
    expect(flattenText(tree.toJSON())).not.toContain('Training is lighter for now');

    tree = await withState('planned_block_recovery');
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Recovery week: sets are planned lower this week');
    expect(text).not.toContain('Training is lighter for now');
  });

  test('without a readable position nothing is claimed: the calendar flag cannot tell the two kinds of lighter week apart', async () => {
    atWednesday();
    resolveProgrammePosition.mockResolvedValue(null);
    getCurrentMesocycleWeek.mockResolvedValue({ isDeload: true, weekIndex: 3, plannedWeeks: 5 });
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, MONDAY_9AM));
    const tree = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Training is lighter for now');
  });

  test('the bands do not drop with the adjustment: the band resolver reads none of what the adjustment writes (source guard)', () => {
    // The adjustment flips the week's flag and cuts planned_muscle_volume (database.js
    // setMesocycleWeekDeload, applyCoachTrainingAdjustment). The bands come from the manual, adapted,
    // plan-routine and profile layers; if one of them ever starts to follow the adjustment, the second
    // clause of the line ("so a muscle can read under its range") is untrue and must go.
    for (const rel of ['../../lib/effectiveLandmarks.js', '../../lib/planVolumeTargets.js']) {
      expect({ rel, hit: /planned_muscle_volume|PlannedMuscleVolume|is_deload|isDeload|recoveryState|MesocycleWeek/.test(read(rel)) })
        .toEqual({ rel, hit: false });
    }
  });

  test('the screen reads the adaptive state from the position only, beside the planned-recovery read (source guard)', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('out.adaptiveAdjustment = position.recoveryState?.state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT;');
    expect(VOLUME_HEATMAP_SOURCE).toContain(LINE);
  });
});

// Census H1: the empty-window line names only the views that really reach further back.
describe('D214 addendum 9 (census H1): the empty-window line names the wider views, and only those that exist', () => {
  test('This week names the 2 and 4 weeks views, 2 weeks names the 4 weeks view, and 4 weeks names none', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue(setsOf('bench', 3, NOW - 40 * DAY)); // saved, but outside every window
    const tree = await mount();
    let text = flattenText(tree.toJSON());
    expect(text).toContain('Your training history is still saved. The 2 weeks and 4 weeks views reach further back.');

    await act(async () => { pressWindow(tree, '2 weeks').props.onPress(); });
    text = flattenText(tree.toJSON());
    expect(text).toContain('Your training history is still saved. The 4 weeks view reaches further back.');
    expect(text).not.toContain('The 2 weeks and 4 weeks views');

    await act(async () => { pressWindow(tree, '4 weeks').props.onPress(); });
    text = flattenText(tree.toJSON());
    expect(text).toContain('Your training history is still saved.');
    expect(text).not.toMatch(/reach(es)? further back/);
    expect(text).not.toContain('Switch to a wider window');
  });
});

describe('D214 addendum 9 (census H7): the editor names the three boxes the way the boxes do', () => {
  test('"minimum, target and maximum", beside the fields Min, Target and Max; no "ceiling"', () => {
    expect(VOLUME_HEATMAP_SOURCE).toContain('Weekly sets per muscle: minimum, target and maximum.');
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/minimum, target and ceiling|\bceiling\b/);
    for (const label of ["'Min'", "'Target'", "'Max'"]) expect(VOLUME_HEATMAP_SOURCE).toContain(label);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// D218 (founder order 2026-10-03: "I need you to check across the board and
// ensure all exercises are logged and reported correct after the workout
// ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
// 00-FINDINGS.md, F-3 and P14). The rows, "N sets logged", the per-week totals
// and "Trained N days ago" read the exercise library through ONE unfiltered,
// survivor-aware lookup (getExerciseLookup), not getAllExercises(), which hides
// a soft-deleted custom exercise (EL-18). Deleting an exercise definition never
// hides training that happened: before D218 this screen dropped those sets
// while the trend chart under it (an unfiltered SQL read) counted them, so one
// week had two totals on one screen. The plan-generation read below it (the
// division fingerprint) keeps getAllExercises, which the source guard pins.
// ───────────────────────────────────────────────────────────────────────────
describe('D218 (F-3, P14): the heatmap credits every logged set through the unfiltered lookup', () => {
  const DELETED_CUSTOM = {
    id: 'custom-curl', name: 'Zottman Curl X', primary_muscle: 'biceps', secondary_muscles: '[]',
    is_custom: 1, deleted_at: 1700000000000,
  };

  test('sets on a soft-deleted custom exercise count: the summary and the muscle row both include them', async () => {
    atWednesday();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 2, MONDAY_9AM),
      ...setsOf('custom-curl', 3, MONDAY_9AM),
    ]);
    // getAllExercises FILTERS the deleted custom row (EL-18); the lookup keeps it.
    getExerciseLookup.mockImplementationOnce(async () => buildExerciseLookup([...EXERCISES, DELETED_CUSTOM]));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).toContain('5 sets logged so far this week across 2 muscles');
    expect(findMuscleRow(tree, 'Biceps:').props.accessibilityLabel).toMatch(/^Biceps: 3 sets so far this week/);
  });

  test('the trend card\'s "This week so far: N sets logged" counts the deleted custom exercise too', async () => {
    atWednesday();
    const monday = (k) => new Date(2026, 5, 8 + 7 * k).getTime();
    getCompletedWorkoutSets.mockResolvedValue([
      ...setsOf('bench', 2, MONDAY_9AM),
      ...setsOf('custom-curl', 3, MONDAY_9AM),
    ]);
    getExerciseLookup.mockImplementationOnce(async () => buildExerciseLookup([...EXERCISES, DELETED_CUSTOM]));
    // The trend query is an unfiltered SQL read: it already credited the deleted exercise.
    getWeeklyVolumeByMuscle.mockResolvedValue([
      { weekLabel: 'W4', weekStart: monday(0), weekEnd: monday(1), volumeByMuscle: { chest: 2, biceps: 3 } },
    ]);
    const tree = await mount();

    expect(flattenText(tree.toJSON())).toMatch(/This week so far: 5 sets logged/);
  });

  test('a set whose id this device does not hold is credited through its own name snapshot', async () => {
    atWednesday();
    const LIB = [{ id: 'bench-lib', name: 'Barbell Bench Press', primary_muscle: 'chest', secondary_muscles: '[]' }];
    getCompletedWorkoutSets.mockResolvedValue(
      setsOf('id-from-another-device', 4, MONDAY_9AM, { exercise_name: 'Barbell Bench Press' }),
    );
    getExerciseLookup.mockImplementationOnce(async () => buildExerciseLookup(LIB));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).toContain('4 sets logged so far this week across 1 muscle');
    expect(findMuscleRow(tree, 'Chest:').props.accessibilityLabel).toMatch(/^Chest: 4 sets so far this week/);
  });

  test('a retired exercise id credits its survivor row (D217) through the same lookup', async () => {
    atWednesday();
    const retiredId = [...RETIRED_ID_TO_SURVIVOR_ID.keys()][0];
    const survivorId = survivorExerciseId(retiredId); // the final survivor, whatever the chain
    const LIB = [{ id: survivorId, name: 'Survivor Raise', primary_muscle: 'side_delts', secondary_muscles: '[]' }];
    getCompletedWorkoutSets.mockResolvedValue(setsOf(retiredId, 3, MONDAY_9AM));
    getExerciseLookup.mockImplementationOnce(async () => buildExerciseLookup(LIB));
    const tree = await mount();

    expect(flattenText(tree.toJSON())).toContain('3 sets logged so far this week across 1 muscle');
  });

  test('a failed lookup read is the screen\'s own retry state, never a heatmap that silently credits nothing', async () => {
    getCompletedWorkoutSets.mockResolvedValue(chestSets(3));
    getExerciseLookup.mockImplementationOnce(async () => { throw new Error('exercises unreadable'); });
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load volume heatmap");
    expect(text).not.toContain('sets logged so far this week');
  });

  test('source guard: the dataset is built from the lookup; only the division fingerprint keeps getAllExercises', () => {
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/getExerciseLookup/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/buildDataset\(allSets, lookup, now\)/);
    expect(VOLUME_HEATMAP_SOURCE).not.toMatch(/buildDataset\(allSets, exerciseMap/);
    // Plan generation keeps the filtered library (a deleted custom exercise must not be generated into a plan).
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/filterLibraryForGeneration\(allExercises, scoped\)/);
  });
});
