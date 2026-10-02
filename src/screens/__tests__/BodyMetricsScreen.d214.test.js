/**
 * BodyMetricsScreen.d214.test.js
 *
 * D214 addendum 4 (Body metrics and the weight trend, lane 7; spec
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 04-BODY-METRICS-AUDIT-AND-SPEC.md sections 3 and 4; findings BM-1 to BM-51
 * in 05-R3-BODY-METRICS-READ.md). The source guards beside this file pin what
 * the screen's SOURCE says. This suite MOUNTS the screen and pins what a
 * person sees and what the screen writes. Only the store, navigation, the
 * database, telemetry and the native glue are mocked; the policy module, the
 * shared derivations and every sentence helper are the REAL ones, so a
 * regression anywhere in the chain fails here:
 *   1. ED-C: nothing renders below the header until BOTH safety reads have
 *      returned; a failed flag read is an open flag and a failed wellbeing
 *      read is calm mode (fail CLOSED, never open);
 *   2. an open flag, and calm mode after "Continue", withhold every direction
 *      word, rate, weekly comparison, swing line, takeaway, maintenance figure,
 *      intake line, recomposition card and measurement change line (ED-A,
 *      ED-B, ED-E), while the person's own weigh-ins, measurements, history
 *      and the actions to log them stay, with the policy's line in the
 *      verdict's slot;
 *   3. the normal screen in the spec's order, each card's sentences;
 *   4. day zero: no weigh-in is made up and nothing is written on open;
 *   5. the states: a failed read says so and never blanks the rest;
 *   6. the person's units;
 *   7. logging: the date refuses the future, the plausibility prompt, the
 *      replace notice, one save per tap;
 *   8. editing a Home weigh-in saves with the validator's own key (BM-1) and
 *      a delete retracts the day's history row AND the day's trend row (BM-2).
 * The calm interstitial is asked once per app session (a module flag), so the
 * calm tests below run in a fixed order and the fail-closed wellbeing read
 * runs before any "Continue" is pressed.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import * as AsyncStorageModule from '@react-native-async-storage/async-storage';

let mockStore;
let mockNavigation;
const mockCaptured = { chart: null, legend: null, picker: null };
const mockAlert = jest.fn();
const mockToastShow = jest.fn();

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector(mockStore)),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { require('react').useEffect(() => cb(), [cb]); },
  useNavigation: () => mockNavigation,
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../components/BackHeader', () => {
  const { Text: RNText } = require('react-native');
  return ({ title }) => <RNText>{title}</RNText>;
});
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../components/InfoTooltip', () => {
  const { Text: RNText } = require('react-native');
  return ({ text }) => <RNText>{`(i) ${text}`}</RNText>;
});
jest.mock('../../components/SectionLabel', () => {
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
jest.mock('../../components/Skeleton', () => {
  const { Text: RNText } = require('react-native');
  return { SkeletonCard: () => <RNText>SKELETON</RNText> };
});
jest.mock('../../components/LegendRow', () => {
  const { Text: RNText } = require('react-native');
  return (props) => {
    mockCaptured.legend = props;
    return <RNText>{props.items.map((i) => i.label).join(' · ')}</RNText>;
  };
});
jest.mock('../../components/NavRow', () => {
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  return {
    NavGroup: ({ children }) => <View>{children}</View>,
    NavRow: ({ label, sub, onPress }) => (
      <TouchableOpacity accessibilityLabel={label} onPress={onPress}>
        <RNText>{label}</RNText>
        <RNText>{sub}</RNText>
      </TouchableOpacity>
    ),
  };
});
jest.mock('../../components/Chip', () => {
  const { Text: RNText, TouchableOpacity } = require('react-native');
  return ({ label, selected, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }} onPress={onPress}>
      <RNText>{label}</RNText>
    </TouchableOpacity>
  );
});
jest.mock('../../components/Button', () => {
  const { Text: RNText, TouchableOpacity } = require('react-native');
  return ({ title, onPress, disabled, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel ?? title} disabled={disabled} onPress={onPress}>
      <RNText>{title}</RNText>
    </TouchableOpacity>
  );
});
jest.mock('../../components/TextField', () => {
  const { TextInput } = require('react-native');
  return ({ value, onChangeText, accessibilityLabel, placeholder }) => (
    <TextInput accessibilityLabel={accessibilityLabel} value={value} onChangeText={onChangeText} placeholder={placeholder} />
  );
});
jest.mock('../../components/SegmentedControl', () => {
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  return ({ options, onChange }) => (
    <View>
      {options.map((o) => (
        <TouchableOpacity key={o.value} accessibilityLabel={`method ${o.label}`} onPress={() => onChange(o.value)}>
          <RNText>{o.label}</RNText>
        </TouchableOpacity>
      ))}
    </View>
  );
});
jest.mock('../../components/PhotoDatePicker', () => (props) => {
  mockCaptured.picker = props;
  return null;
});
jest.mock('../../components/VolyumeChart', () => {
  const { Text: RNText } = require('react-native');
  return (props) => {
    mockCaptured.chart = props;
    return <RNText>CHART</RNText>;
  };
});
jest.mock('../../components/AppAlert', () => ({ appAlert: (...args) => mockAlert(...args) }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: (...args) => mockToastShow(...args) }) }));
jest.mock('../../lib/database', () => ({
  logBodyMetric: jest.fn(),
  updateBodyMetric: jest.fn(),
  deleteBodyMetric: jest.fn(),
  getBodyMetricLog: jest.fn(),
  getMorningWeights: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
  getWorkoutSetsSince: jest.fn(),
  getAllExercises: jest.fn(),
  updateMorningWeightById: jest.fn(),
  deleteMorningWeightById: jest.fn(),
  logMorningWeight: jest.fn(),
  getNutritionTargets: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getUserBodyProfile: jest.fn(),
  getLatestBodyComposition: jest.fn(),
}));
jest.mock('../../lib/food/db', () => ({ getRecentIntakeSummary: jest.fn() }));
jest.mock('../../lib/sync', () => ({ syncAll: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/effectiveMaintenanceService', () => ({ resolveEffectiveMaintenanceForUser: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));

import BodyMetricsScreen from '../BodyMetricsScreen';
import * as db from '../../lib/database';
import { getRecentIntakeSummary } from '../../lib/food/db';
import { resolveEffectiveMaintenanceForUser } from '../../lib/effectiveMaintenanceService';
import { logError } from '../../lib/errorLog';
import { trackFirst } from '../../lib/telemetry/firsts';
import { navigateCrossTab } from '../../navigation/navigateCrossTab';
import { WELLBEING_KEY, WELLBEING_HELPLINE } from '../../lib/wellbeing';
import { BODY_METRICS_CALM_LINE, BODY_METRICS_FLAG_LINE } from '../../lib/bodyMetricsPolicy';
import { DAY_ZERO_LINE } from '../../lib/bodyMetricsDisplay';
import { FUTURE_DATE_MESSAGE } from '../../lib/bodyMetricValidate';
import { localDayKey } from '../../lib/dayKey';
import { resolveTheme } from '../../styles/theme';

// The in-memory store behind the repo's AsyncStorage double (root __mocks__).
const AsyncStorage = AsyncStorageModule.default;
const STORE = AsyncStorageModule.__store;
const DAY = 86400000;
// Thursday 17 September 2026, 14:30 UK time; the open week began Monday 14 September.
const NOW = new Date(2026, 8, 17, 14, 30, 0, 0).getTime();
const THEME = resolveTheme({});

/** Local time `daysAgo` days before NOW. */
function at(daysAgo, hour = 7, minute = 0) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/**
 * Morning weights, oldest first, one a day, 82.1 and 82.7 on alternate days
 * (a steady figure with a real day-to-day swing). Tuesday 15 September is not
 * weighed, so the open week reads "3 of 4". Yesterday and today are 82.4, and
 * today's was at 7:02 (the spec's replace-notice example).
 */
function steadyMorning({ days = 45, skip = [2] } = {}) {
  const rows = [];
  for (let ago = days - 1; ago >= 0; ago -= 1) {
    if (skip.includes(ago)) continue;
    let kg = Math.round((82.4 + (ago % 2 ? 0.3 : -0.3)) * 10) / 10;
    if (ago <= 1) kg = 82.4;
    rows.push({
      id: `m${ago}`, weightKg: kg, loggedAt: at(ago, 7, ago === 0 ? 2 : 0), notes: '', deletedAt: null,
    });
  }
  return rows;
}

/** Two measurement entries: body fat 19 then 18 and a waist of 88 then 86 cm. */
const READING_LOGS = [
  { id: 'l10', loggedAt: at(10, 8, 0), weightKg: null, bodyFatPercent: 18, bodyFatSource: 'caliper', waistCm: 86, notes: '' },
  { id: 'l20', loggedAt: at(20, 8, 0), weightKg: null, bodyFatPercent: 19, bodyFatSource: 'caliper', waistCm: 88, notes: '' },
];

function currentAuthority(weights) {
  return {
    resolved: { source: 'validated', status: 'current', effectiveMaintenanceKcal: 2450, asOf: NOW },
    memo: { weightPoints: 23, foodDaysLogged: 6 },
    weights,
    intake: { daysLogged: 6, avgKcal: 2100 },
  };
}
function buildingAuthority(weights) {
  return {
    resolved: { source: 'formula_prior', status: 'formula', effectiveMaintenanceKcal: 2300 },
    memo: null,
    weights,
    intake: { daysLogged: 3, avgKcal: 1900 },
  };
}

const DEFAULTS = {
  morning: null, // steadyMorning() unless set
  logs: READING_LOGS,
  flagRead: () => Promise.resolve(null),
  wellbeing: 'normal',
  authority: currentAuthority,
  intake: { daysLogged: 6, avgKcal: 2100 },
  coach: null,
  sets: [],
  exercises: [],
  bwu: 'kg',
  userProfile: { weightKg: 82 },
  stamps: {},
};

let mounted = null;

function setup(over = {}) {
  const s = { ...DEFAULTS, ...over };
  if (!s.morning) s.morning = steadyMorning();
  mockNavigation = { navigate: jest.fn() };
  mockStore = {
    user: { id: 'u1' },
    session: null,
    units: 'kg',
    bodyWeightUnits: s.bwu,
    userProfile: s.userProfile,
    userProfileFieldUpdatedAt: s.stamps,
    accessibility: { reduceMotion: true },
  };
  STORE.clear();
  if (s.wellbeing !== undefined) STORE.set(WELLBEING_KEY, s.wellbeing);
  db.getMorningWeights.mockImplementation(async () => s.morning.map((r) => ({ ...r })));
  db.getBodyMetricLog.mockImplementation(async (uid, limit, opts = {}) => s.logs
    .filter((r) => (opts.sinceMs == null || r.loggedAt >= opts.sinceMs)
      && (opts.untilMs == null || r.loggedAt < opts.untilMs))
    .slice(0, limit));
  db.getOpenEdPatternFlag.mockImplementation(() => s.flagRead());
  db.getNutritionTargets.mockResolvedValue(null);
  db.getLatestCoachOutput.mockResolvedValue(s.coach);
  db.getWorkoutSetsSince.mockResolvedValue(s.sets);
  db.getAllExercises.mockResolvedValue(s.exercises);
  db.getUserBodyProfile.mockResolvedValue(null);
  db.getLatestBodyComposition.mockResolvedValue(null);
  db.logBodyMetric.mockResolvedValue('new-id');
  db.updateBodyMetric.mockResolvedValue(true);
  db.deleteBodyMetric.mockResolvedValue(true);
  db.updateMorningWeightById.mockResolvedValue(true);
  db.deleteMorningWeightById.mockResolvedValue(true);
  db.logMorningWeight.mockResolvedValue('m-new');
  getRecentIntakeSummary.mockResolvedValue(s.intake);
  resolveEffectiveMaintenanceForUser.mockImplementation(async (uid, inputs, opts) => s.authority(opts?.weights ?? []));
  return s;
}

async function settle() {
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await new Promise((resolve) => setImmediate(resolve)); });
  }
}

async function mount(over = {}) {
  const scenario = setup(over);
  let tree;
  await act(async () => { tree = create(<BodyMetricsScreen />); });
  await settle();
  mounted = tree;
  return { tree, scenario };
}

// The copy uses a non-breaking space between a number and its unit; compare as plain spaces.
const plain = (s) => String(s).replace(/[\u00a0\u202f]/g, ' ');
function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => plain([].concat(n.props.children).join('')));
}
/** The copy a person reads: everything except the (i) help text behind the info buttons. */
const visible = (tree) => texts(tree).filter((t) => !t.startsWith('(i) '));
const info = (tree) => texts(tree).filter((t) => t.startsWith('(i) '));
const controls = (tree, label) => tree.root.findAll(
  (n) => (n.type === 'TouchableOpacity' || n.type === 'TextInput') && n.props.accessibilityLabel === label,
);
async function press(tree, label, index = 0) {
  const nodes = controls(tree, label).filter((n) => n.type === 'TouchableOpacity');
  if (!nodes.length) throw new Error(`no control labelled "${label}"`);
  await act(async () => { nodes[index].props.onPress(); });
  await settle();
}
async function typeInto(tree, label, value) {
  const nodes = controls(tree, label).filter((n) => n.type === 'TextInput');
  if (!nodes.length) throw new Error(`no field labelled "${label}"`);
  await act(async () => { nodes[0].props.onChangeText(value); });
}
const hasLabel = (tree, label) => controls(tree, label).length > 0;

beforeEach(() => {
  // Only Date is faked: promises, setImmediate and every timer stay real.
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame',
      'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate',
      'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
    ],
  });
  jest.clearAllMocks();
  mockCaptured.chart = null;
  mockCaptured.legend = null;
  mockCaptured.picker = null;
});

afterEach(async () => {
  if (mounted) {
    await act(async () => { mounted.unmount(); });
    mounted = null;
  }
  // Put the AsyncStorage double back to its in-memory behaviour (a test may have broken one read).
  AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(STORE.get(k) ?? null));
  jest.useRealTimers();
});

// What an open flag and calm mode both withhold (ED-A, ED-B, ED-E): no direction
// word, rate, weekly comparison, swing line, takeaway, maintenance, intake,
// recomposition or measurement change line.
const WITHHELD = [
  /^Down /, /^Up /, /Holding steady/, /Not enough (weigh-ins|time) yet to show which way/, /weighed \d+ of \d+ mornings?/, /· average/,
  /a week\b/, /This week's average so far/, /Day to day your weight usually moves/,
  /Everything you have logged/, /Maintenance calories/, /\bkcal\b/,
  /Over the last 7 days/, /Recomposition/, /from \d+(\.\d)?% on /, /from \d+(\.\d)? cm on /,
  /Steady means/,
];

describe('ED-C: nothing renders below the header until both safety reads have returned', () => {
  test('while the flag read is pending only the header shows; when it returns the screen appears', async () => {
    let release;
    const { tree } = await mount({ flagRead: () => new Promise((resolve) => { release = resolve; }) });
    expect(visible(tree)).toEqual(['Body metrics']);
    expect(hasLabel(tree, 'Log weight')).toBe(false);
    await act(async () => { release(null); });
    await settle();
    expect(visible(tree)).toContain('This week');
    expect(hasLabel(tree, 'Log weight')).toBe(true);
  });

  test('a failed flag read counts as an open flag: the line shows and nothing is claimed about direction', async () => {
    const { tree } = await mount({ flagRead: () => Promise.reject(new Error('sqlite closed')) });
    const all = visible(tree);
    expect(all).toContain(BODY_METRICS_FLAG_LINE);
    for (const pattern of WITHHELD) expect(all.filter((t) => pattern.test(t))).toEqual([]);
    expect(all).toContain('82.4 kg');
  });

  test('a failed wellbeing read counts as calm mode: the pause shows and nothing else', async () => {
    AsyncStorage.getItem.mockImplementation((k) => (k === WELLBEING_KEY
      ? Promise.reject(new Error('storage unavailable'))
      : Promise.resolve(STORE.get(k) ?? null)));
    const { tree } = await mount();
    // setup() wrote the wellbeing key, but the read of it fails, so the screen fails closed
    expect(visible(tree)).toContain('A gentle pause');
    expect(visible(tree)).not.toContain('This week');
    expect(hasLabel(tree, 'Log weight')).toBe(false);
  });
});

describe('calm mode (the pause is asked once an app session; these run in order)', () => {
  test('the pause shows first, with the helpline, and nothing of the body data behind it', async () => {
    const { tree } = await mount({ wellbeing: 'calm' });
    const all = visible(tree);
    expect(all).toContain('A gentle pause');
    expect(all).toContain(WELLBEING_HELPLINE);
    expect(all).not.toContain('This week');
    expect(all).not.toContain('82.4 kg');
    expect(all.join(' | ')).not.toMatch(/trend weight|kcal|Week of/);
  });

  test('after Continue the calm line stands in the verdict slot, the own data stays, the rest is withheld', async () => {
    const { tree } = await mount({ wellbeing: 'calm' });
    await press(tree, 'Continue');
    const all = visible(tree);
    expect(all).toContain(BODY_METRICS_CALM_LINE);
    // the person's own data stays (Q2): the trend weight, the actions, the chart, the readings, the history
    expect(all).toContain('82.4 kg');
    expect(all).toContain('trend weight');
    expect(hasLabel(tree, 'Log weight')).toBe(true);
    expect(hasLabel(tree, 'Add measurements')).toBe(true);
    expect(all).toContain('Trend, last 3 months');
    expect(all).toContain('Body fat and measurements');
    expect(all).toContain('18%');
    expect(all).toContain('History');
    // everything that reads or advises is withheld
    for (const pattern of WITHHELD) expect(all.filter((t) => pattern.test(t))).toEqual([]);
    expect(info(tree).join(' | ')).not.toMatch(/Steady means/);
    // the chart still draws the person's line and dots, with the plain count (no takeaway)
    expect(mockCaptured.chart).toBeTruthy();
    expect(mockCaptured.chart.accessibilityLabel).toBe('Trend, last 3 months. 44 weigh-ins from 4 Aug to 17 Sep.');
  });

  test('a second open in the same session does not ask again, and still withholds', async () => {
    const { tree } = await mount({ wellbeing: 'calm' });
    const all = visible(tree);
    expect(all).not.toContain('A gentle pause');
    expect(all).toContain(BODY_METRICS_CALM_LINE);
    expect(all.filter((t) => /Maintenance calories|Recomposition|kcal/.test(t))).toEqual([]);
  });
});

describe('an open ED-pattern flag', () => {
  test('keeps the person\'s own data, says one plain line in the verdict slot, and withholds the rest', async () => {
    const { tree } = await mount({ flagRead: () => Promise.resolve({ id: 'f1', pattern: 'restriction' }) });
    const all = visible(tree);
    expect(all).toContain(BODY_METRICS_FLAG_LINE);
    expect(all).not.toContain(BODY_METRICS_CALM_LINE);
    expect(all).toContain('82.4 kg');
    expect(all).toContain('trend weight');
    expect(hasLabel(tree, 'Log weight')).toBe(true);
    expect(all).toContain('Body fat and measurements');
    expect(all).toContain('History');
    for (const pattern of WITHHELD) expect(all.filter((t) => pattern.test(t))).toEqual([]);
    expect(info(tree).join(' | ')).not.toMatch(/Steady means/);
    // the maintenance estimate is not even asked for a figure the screen would not print
    expect(all).not.toContain('estimated');
  });

  test('the flag does not move the engine: the trend weight is the same figure as without it', async () => {
    const open = await mount({ flagRead: () => Promise.resolve({ id: 'f1' }) });
    const openHero = visible(open.tree).find((t) => /^\d+(\.\d)? kg$/.test(t));
    await act(async () => { open.tree.unmount(); });
    mounted = null;
    const closed = await mount();
    const closedHero = visible(closed.tree).find((t) => /^\d+(\.\d)? kg$/.test(t));
    expect(openHero).toBeTruthy();
    expect(openHero).toBe(closedHero);
  });
});

describe('the normal screen, in the spec\'s order', () => {
  test('This week, the actions, the Trend card, calories, recomposition, readings, history, then the doors', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    const at1 = (needle) => {
      const i = all.findIndex((t) => (typeof needle === 'string' ? t === needle : needle.test(t)));
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at1('Body metrics'),
      at1('This week'),
      at1('trend weight'),
      at1('Log weight'),
      at1('Add measurements'),
      at1('Trend, last 3 months'),
      at1('Trend · Weigh-ins'),
      at1('Maintenance calories'),
      at1('Recomposition'),
      at1('Body fat and measurements'),
      at1('History'),
      at1('Progress photos'),
      at1('Weight units'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });

  test('the This week card: the trend weight with its name, the denominator, the verdict, the comparison, the swing', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    expect(all).toContain('trend weight');
    expect(all).toContain('weighed 3 of 4 mornings so far this week');
    expect(all.some((t) => /^Holding steady over the last 2 weeks, about [\d.]+ kg a week\.$/.test(t))).toBe(true);
    expect(all.some((t) => /^This week's average so far is [\d.]+ kg, .+ last week's \(3 weigh-ins against 7\)\.$/.test(t))).toBe(true);
    expect(all.some((t) => /^Day to day your weight usually moves within [\d.]+ kg\.$/.test(t))).toBe(true);
    // no chip, no arrow, no delta badge, no "Weekly change"
    expect(all.join(' | ')).not.toMatch(/Weekly change|Losing|Gaining|▲|▼|↑|↓/);
    expect(info(tree)).toContain('(i) A smoothed average of your recent weigh-ins, so one heavy or light morning moves the trend weight only a little. With only a few weigh-ins the trend weight stays close to your latest one.');
  });

  test('the verdict says "Down ... about ... a week" for a trend that is falling faster than the steady rule', async () => {
    const falling = [];
    for (let ago = 29; ago >= 0; ago -= 1) {
      falling.push({
        id: `f${ago}`, weightKg: Math.round((84 - (29 - ago) * 0.1) * 10) / 10, loggedAt: at(ago, 7, 0), notes: '', deletedAt: null,
      });
    }
    const { tree } = await mount({ morning: falling, logs: [] });
    const verdict = visible(tree).find((t) => /^(Down|Up|Holding steady) /.test(t));
    expect(verdict).toMatch(/^Down [\d.]+ kg over the last 2 weeks, about [\d.]+ kg a week\.$/);
  });

  test('the Trend card: words for the windows, one line over faint dots, a legend that names both, 160 dp', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    for (const label of ['1 month', '3 months', '6 months', '1 year']) expect(all).toContain(label);
    expect(all.join(' | ')).not.toMatch(/\b1M\b|\b3M\b|\b6M\b/);
    const chart = mockCaptured.chart;
    expect(chart.color).toBe(THEME.colors.textPrimary);
    expect(chart.color2).toBe(THEME.colors.textMuted);
    expect(chart.dots2).toBe(true);
    expect(chart.height).toBe(160);
    expect(chart.showViewData).toBe(false);
    expect(chart.data2).toHaveLength(chart.data.length);
    expect(mockCaptured.legend.items.map((i) => i.label)).toEqual(['Trend', 'Weigh-ins']);
    expect(mockCaptured.legend.items[0].swatch.fill).toBe(THEME.colors.textPrimary);
    expect(mockCaptured.legend.items[1].swatch.fill).toBe(THEME.colors.textMuted);
    // the y-axis is fitted (rules on round numbers inside the data's own range), not a fixed pad
    expect(chart.yTicks.length).toBeGreaterThanOrEqual(2);
    expect(chart.min).toBeLessThan(Math.min(...chart.data2.map((d) => d.value)));
    expect(chart.max).toBeGreaterThan(Math.max(...chart.data2.map((d) => d.value)));
    // ONE spoken summary: the card title and the takeaway, and the takeaway is also printed
    const takeaway = all.find((t) => t.startsWith('Everything you have logged, 4 Aug to 17 Sep'));
    expect(takeaway).toBeTruthy();
    expect(chart.accessibilityLabel).toBe(`Trend, last 3 months. ${takeaway}`);
  });

  test('choosing a window keeps it and redraws the chart for that window', async () => {
    const { tree } = await mount({ morning: steadyMorning({ days: 120 }) });
    expect(visible(tree)).toContain('Trend, last 3 months');
    await press(tree, 'weight trend window: 1 month');
    expect(visible(tree)).toContain('Trend, last month');
    expect(STORE.get('@volyume_chart_window_weight')).toBe('1M');
    expect(mockCaptured.chart.data.length).toBeLessThanOrEqual(31);
  });

  test('Maintenance calories: the figure and where it comes from, and the intake line', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    expect(all).toContain('2,450');
    expect(all).toContain('kcal a day');
    expect(all).toContain('estimated');
    expect(all).toContain('About 2,450 kcal a day, estimated from 23 weigh-ins and food logged on 6 of the last 7 days.');
    expect(all).toContain('Over the last 7 days you logged food on 6 days, averaging 2,100 kcal.');
    // a display surface never persists the resolver's revalidation marker (BM-14)
    expect(resolveEffectiveMaintenanceForUser).toHaveBeenCalledWith(
      'u1', expect.any(Object), expect.objectContaining({ persistRevalidationMarker: false }),
    );
  });

  test('when the contract has not been met the card counts what is missing and shows no figure', async () => {
    const { tree } = await mount({ authority: buildingAuthority, intake: { daysLogged: 3, avgKcal: 1900 }, morning: steadyMorning({ days: 12, skip: [] }) });
    const all = visible(tree);
    expect(all).toContain('Maintenance calories');
    expect(all).toContain('Not ready yet. Working out your maintenance calories needs 14 weigh-ins and food logged on 5 of the last 7 days. So far you have 12 weigh-ins and 3 days of logged food.');
    expect(all).not.toContain('estimated');
    expect(all.filter((t) => /kcal a day/.test(t))).toEqual([]);
  });

  test('Body fat and measurements: the latest from any entry with its date, the change with both dates', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    expect(all).toContain('Body fat and measurements');
    expect(all).toContain('18%');
    expect(all).toContain('7 Sep · caliper');
    expect(all).toContain('Down from 19% on 28 Aug.');
    expect(all).toContain('86 cm');
    expect(all).toContain('Down 2 cm from 88 cm on 28 Aug.');
  });

  test('Recomposition: one steady definition, the body-fat move and the waist with its date', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    const at1 = all.indexOf('Recomposition');
    expect(at1).toBeGreaterThan(-1);
    const card = all.slice(at1 + 1, all.indexOf('Body fat and measurements')).join(' | ');
    expect(card).toMatch(/down from 19% to 18%/);
    expect(card).toMatch(/Waist/);
    expect(card).toMatch(/Aug/);
    // no strength line and no share row without a lift that moved (a card never carries a body figure)
    expect(card).not.toMatch(/Bench Press/);
    expect(all).not.toContain('Create share image');
  });

  test('a strength gain adds the lift, in both units on the share card, and the share row opens the card', async () => {
    const dayKeyAgo = (n) => localDayKey(NOW - n * DAY);
    const liftSet = (dateKey, weight) => ({
      exerciseId: 1, workoutId: `w-${dateKey}`, createdAt: new Date(`${dateKey}T10:00:00`).getTime(),
      weight, actualReps: 5, setType: 'working',
    });
    const sets = [
      liftSet(dayKeyAgo(40), 60), liftSet(dayKeyAgo(40), 60), liftSet(dayKeyAgo(3), 70), liftSet(dayKeyAgo(3), 70),
    ];
    const { tree } = await mount({ sets, exercises: [{ id: 1, name: 'Bench Press' }] });
    const all = visible(tree);
    const card = all.slice(all.indexOf('Recomposition') + 1, all.indexOf('Body fat and measurements')).join(' | ');
    expect(card).toMatch(/Estimated one-rep max/);
    expect(card).toMatch(/Bench Press/);
    expect(card).toMatch(/kg/);
    expect(card).toMatch(/lbs/);
    expect(all).toContain('Create share image');
    await press(tree, 'Create share image');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ShareCard', {
      milestoneData: expect.objectContaining({ eyebrow: 'Recomposition', stats: [] }),
    });
  });

  test('History: Monday weeks with a count and an average, a tappable row each, no icon pair', async () => {
    const { tree } = await mount();
    const all = visible(tree);
    const open = all.find((t) => t.startsWith('Week of 14 Sep'));
    expect(open).toMatch(/^Week of 14 Sep · average so far [\d.]+ kg · 3 weigh-ins$/);
    expect(all.some((t) => /^Week of 7 Sep · average [\d.]+ kg · 7 weigh-ins$/.test(t))).toBe(true);
    expect(all).toContain('Thu 17 Sep · 82.4 kg');
    expect(hasLabel(tree, 'Edit weigh-in. Thu 17 Sep, 82.4 kg')).toBe(true);
    // forty-five days sit inside the eight weeks shown: nothing earlier to page to
    expect(hasLabel(tree, 'Show earlier weeks')).toBe(false);
  });

  test('"Show earlier weeks" appears when there is more, and pages the History', async () => {
    const { tree } = await mount({ morning: steadyMorning({ days: 100 }) });
    expect(hasLabel(tree, 'Show earlier weeks')).toBe(true);
    const before = visible(tree).filter((t) => t.startsWith('Week of ')).length;
    await press(tree, 'Show earlier weeks');
    const after = visible(tree).filter((t) => t.startsWith('Week of ')).length;
    expect(after).toBeGreaterThan(before);
  });

  test('the doors: photos, and the weight units row, which opens Settings in the Profile tab', async () => {
    const { tree } = await mount();
    expect(visible(tree)).toContain('Private to this device');
    expect(visible(tree)).toContain('Shown in kilograms');
    await press(tree, 'Progress photos');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ProgressPhotos');
    await press(tree, 'Weight units');
    expect(navigateCrossTab).toHaveBeenCalledWith(mockNavigation, 'ProfileTab', 'SettingsWorkout');
  });
});

describe('day zero: no weigh-in is made up, and nothing is written on open', () => {
  test('the setup weight is shown as what it is, with its date, and the trend says when it starts', async () => {
    const { tree } = await mount({
      morning: [],
      logs: [],
      userProfile: { weightKg: 82 },
      stamps: { weightKg: new Date(2026, 7, 3, 9, 0).getTime() },
    });
    const all = visible(tree);
    expect(all).toContain('Starting weight from setup: 82 kg, 3 Aug');
    expect(all).toContain('Your trend starts with your first morning weigh-in.');
    expect(DAY_ZERO_LINE).toBe('Your trend starts with your first morning weigh-in.');
    expect(all).not.toContain('trend weight');
    expect(all.join(' | ')).not.toMatch(/weighed \d+ of \d+ mornings/);
    // the Trend card names no window over an empty series ("last year" over nothing)
    expect(all).toContain('Trend');
    expect(all).toContain('The chart starts once you have two weigh-ins.');
    expect(all.join(' | ')).not.toMatch(/Trend, last/);
    expect(hasLabel(tree, 'Log weight')).toBe(true);
    // nothing is written: no seed row, no entry, no telemetry of a weigh-in
    expect(db.logMorningWeight).not.toHaveBeenCalled();
    expect(db.logBodyMetric).not.toHaveBeenCalled();
    expect(db.updateBodyMetric).not.toHaveBeenCalled();
    expect(db.updateMorningWeightById).not.toHaveBeenCalled();
    expect(trackFirst).not.toHaveBeenCalled();
  });

  test('a person whose only weight is the setup row has the same day zero, from that row\'s own date', async () => {
    const seed = [{ id: 'seed', weightKg: 82, loggedAt: at(10, 9, 0), notes: 'enrolment', deletedAt: null }];
    const { tree } = await mount({ morning: seed, logs: [] });
    const all = visible(tree);
    expect(all).toContain('Starting weight from setup: 82 kg, 7 Sep');
    expect(all).toContain('Your trend starts with your first morning weigh-in.');
    expect(all).not.toContain('trend weight');
    // its row keeps its real date and shows its note
    expect(all).toContain('Mon 7 Sep · 82 kg');
    expect(all).toContain('Starting weight from setup');
  });
});

describe('states: a failed read says so, and the rest of the screen stays', () => {
  test('a failed weigh-in read says so in the card, logs the error, and keeps the actions', async () => {
    setup();
    db.getBodyMetricLog.mockRejectedValue(new Error('disk I/O error'));
    let tree;
    await act(async () => { tree = create(<BodyMetricsScreen />); });
    await settle();
    mounted = tree;
    const all = visible(tree);
    expect(all).toContain("Couldn't load your weigh-ins just now.");
    expect(logError).toHaveBeenCalledWith('BodyMetricsScreen.loadEntries', expect.any(Error), expect.any(Object));
    expect(hasLabel(tree, 'Log weight')).toBe(true);
    expect(hasLabel(tree, 'Try loading your weigh-ins again')).toBe(true);
  });

  test('before the weigh-ins have loaded each card is a skeleton, never an empty frame', async () => {
    setup();
    let release;
    db.getMorningWeights.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    let tree;
    await act(async () => { tree = create(<BodyMetricsScreen />); });
    await settle();
    mounted = tree;
    expect(visible(tree).filter((t) => t === 'SKELETON').length).toBeGreaterThanOrEqual(2);
    await act(async () => { release([]); });
    await settle();
    expect(visible(tree)).not.toContain('SKELETON');
  });

  test('a failed maintenance read says so in its own card and leaves the weigh-ins alone', async () => {
    setup();
    resolveEffectiveMaintenanceForUser.mockRejectedValue(new Error('resolver down'));
    let tree;
    await act(async () => { tree = create(<BodyMetricsScreen />); });
    await settle();
    mounted = tree;
    const all = visible(tree);
    expect(all).toContain("Couldn't load your maintenance estimate just now.");
    expect(all).toContain('82.4 kg');
    expect(all).toContain('History');
    expect(logError).toHaveBeenCalledWith('BodyMetricsScreen.loadMaintenance', expect.any(Error), expect.any(Object));
  });
});

describe('the person\'s units', () => {
  test('stones and pounds everywhere, the chart axis in kilograms with its one-line note, rates in pounds', async () => {
    const { tree } = await mount({ bwu: 'st' });
    const all = visible(tree);
    expect(all.filter((t) => /\bkg\b/.test(t) && !/chart reads in kilograms/.test(t))).toEqual([]);
    expect(all).toContain('The chart reads in kilograms.');
    expect(all.some((t) => /^Holding steady over the last 2 weeks, about [\d.]+ lbs a week\.$/.test(t))).toBe(true);
    expect(all.some((t) => /^\d+ st( \d+(\.\d)? lbs)?$/.test(t))).toBe(true);
    expect(mockCaptured.chart.yAxisSuffix).toBe(' kg');
  });

  test('pounds: the chart reads in pounds and says nothing about kilograms', async () => {
    const { tree } = await mount({ bwu: 'lbs' });
    const all = visible(tree);
    expect(all.filter((t) => /\bkg\b/.test(t))).toEqual([]);
    expect(all.some((t) => /^\d+(\.\d)? lbs$/.test(t))).toBe(true);
    expect(mockCaptured.chart.yAxisSuffix).toBe(' lbs');
  });
});

describe('logging a weigh-in', () => {
  test('the form keeps its units as labels, says what a same-day entry replaces, and saves once', async () => {
    const { tree } = await mount();
    await press(tree, 'Log weight');
    expect(visible(tree)).toContain('Weight');
    expect(visible(tree)).toContain('kg');
    await typeInto(tree, 'Weight in kilograms', '82.0');
    expect(visible(tree)).toContain("This replaces today's 7:02 weigh-in of 82.4 kg.");
    await press(tree, 'Save entry');
    expect(db.logBodyMetric).toHaveBeenCalledTimes(1);
    expect(db.logBodyMetric).toHaveBeenCalledWith('u1', expect.objectContaining({ weightKg: 82 }));
    expect(trackFirst).toHaveBeenCalledWith('u1', 'first_weigh_in');
    expect(mockAlert).not.toHaveBeenCalled();
    // the form closes and the screen reads again
    expect(hasLabel(tree, 'Log weight')).toBe(true);
  });

  test('a typed weight far from the last one is asked about first, and nothing is saved until the person agrees', async () => {
    const { tree } = await mount();
    await press(tree, 'Log weight');
    await typeInto(tree, 'Weight in kilograms', '28.4');
    await press(tree, 'Save entry');
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = mockAlert.mock.calls[0];
    expect(title).toBe('Check this weigh-in');
    expect(message).toBe('That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?');
    expect(buttons.map((b) => b.text)).toEqual(['Change it', 'Save anyway']);
    expect(db.logBodyMetric).not.toHaveBeenCalled();
    await act(async () => { buttons[1].onPress(); });
    await settle();
    expect(db.logBodyMetric).toHaveBeenCalledTimes(1);
    expect(db.logBodyMetric).toHaveBeenCalledWith('u1', expect.objectContaining({ weightKg: 28.4 }));
  });

  test('"Change it" saves nothing and leaves the form as typed', async () => {
    const { tree } = await mount();
    await press(tree, 'Log weight');
    await typeInto(tree, 'Weight in kilograms', '28.4');
    await press(tree, 'Save entry');
    const [, , buttons] = mockAlert.mock.calls[0];
    expect(buttons[0].onPress).toBeUndefined();
    expect(db.logBodyMetric).not.toHaveBeenCalled();
    expect(controls(tree, 'Weight in kilograms')[0].props.value).toBe('28.4');
  });

  test('a date after today is refused with a calm line and nothing is saved', async () => {
    const { tree } = await mount();
    await press(tree, 'Log weight');
    await typeInto(tree, 'Weight in kilograms', '82.0');
    await act(async () => { mockCaptured.picker.onChange(NOW + 3 * DAY); });
    await press(tree, 'Save entry');
    expect(mockToastShow).toHaveBeenCalledWith(FUTURE_DATE_MESSAGE, { variant: 'warning' });
    expect(db.logBodyMetric).not.toHaveBeenCalled();
  });

  test('a failed save says so calmly and does not claim it saved', async () => {
    const { tree } = await mount();
    db.logBodyMetric.mockRejectedValue(new Error('disk full'));
    await press(tree, 'Log weight');
    await typeInto(tree, 'Weight in kilograms', '82.0');
    await press(tree, 'Save entry');
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't save. Try again.", { variant: 'error' });
    expect(logError).toHaveBeenCalledWith('BodyMetricsScreen.save', expect.any(Error), expect.any(Object));
    expect(trackFirst).not.toHaveBeenCalled();
  });

  test('"Add measurements" opens the same form with the measurements shown, body fat with its method glossed', async () => {
    const { tree } = await mount();
    await press(tree, 'Add measurements');
    const all = visible(tree);
    expect(all).toContain('Add measurements');
    expect(all).toContain('Body fat');
    expect(all).toContain('Waist');
    expect(all).toContain('cm');
    // the method is asked once a body-fat figure is typed, and glossed behind an (i)
    expect(all).not.toContain('How it was measured');
    await typeInto(tree, 'Body fat percentage', '17.5');
    // RE-ANCHORED 2026-10-02 (founder's answer to lane 7 question 1, D214 addendum
    // 11): the method row is asked once a figure is typed, as the setup wizard
    // asks it, and its (i) glosses the methods.
    expect(visible(tree)).toContain('How it was measured');
    expect(info(tree).some((t) => /DEXA|caliper|BIA/i.test(t))).toBe(true);
    // how to measure sits behind one (i)
    expect(info(tree).some((t) => /Waist: around the narrowest part/.test(t))).toBe(true);
  });

  // Founder, 2026-10-02 (D214 addendum 11): the method chosen on the form is
  // stored, as the setup wizard stores it; the engine reads it from there.
  test('the method chosen on the form is stored with the figure', async () => {
    const { tree } = await mount();
    await press(tree, 'Add measurements');
    await typeInto(tree, 'Body fat percentage', '17.5');
    await press(tree, 'method DEXA');
    await press(tree, 'Save entry');
    expect(db.logBodyMetric).toHaveBeenCalledTimes(1);
    expect(db.logBodyMetric.mock.calls[0][1]).toEqual(expect.objectContaining({ bodyFatPercent: 17.5, bodyFatSource: 'dexa' }));
  });
});

describe('editing and deleting a weigh-in', () => {
  test('BM-1: editing a Home weigh-in saves with the validator\'s own key and touches nothing else', async () => {
    const { tree } = await mount();
    await press(tree, 'Edit weigh-in. Wed 16 Sep, 82.4 kg');
    expect(visible(tree)).toContain('Edit weigh-in');
    expect(controls(tree, 'Weight in kilograms')[0].props.value).toBe('82.4');
    await typeInto(tree, 'Weight in kilograms', '82.1');
    await press(tree, 'Save changes');
    expect(db.updateMorningWeightById).toHaveBeenCalledTimes(1);
    expect(db.updateMorningWeightById).toHaveBeenCalledWith('u1', 'm1', { weightKg: 82.1 });
    expect(db.logBodyMetric).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a note-only edit keeps the stored weight and writes the note', async () => {
    const { tree } = await mount();
    await press(tree, 'Edit weigh-in. Wed 16 Sep, 82.4 kg');
    await typeInto(tree, 'Note', 'After a long run');
    await press(tree, 'Save changes');
    expect(db.updateMorningWeightById).toHaveBeenCalledWith('u1', 'm1', { weightKg: 82.4, notes: 'After a long run' });
  });

  // Lane 7 review N4, D214 addendum 11: a note edit on a row whose body fat was
  // measured keeps the stored method; the control's seed never overwrites it.
  test('a note edit keeps a measured body-fat method', async () => {
    const { tree } = await mount();
    await press(tree, 'Edit weigh-in. Mon 7 Sep, 82.1 kg');
    await typeInto(tree, 'Note', 'Caliper day');
    await press(tree, 'Save changes');
    expect(db.updateBodyMetric).toHaveBeenCalledTimes(1);
    expect(db.updateBodyMetric.mock.calls[0][2]).toEqual(expect.objectContaining({ bodyFatPercent: 18, bodyFatSource: 'caliper' }));
  });

  test('BM-2: a delete asks, says what it removes, and retracts the log row AND the day\'s trend row', async () => {
    const { tree } = await mount();
    await press(tree, 'Edit weigh-in. Mon 7 Sep, 82.1 kg');
    await press(tree, 'Delete this entry');
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = mockAlert.mock.calls[0];
    expect(title).toBe('Delete this entry?');
    expect(message).toBe('This removes the weigh-in and the measurements logged that day from your history, and the weigh-in from your trend.');
    expect(buttons.map((b) => [b.text, b.style])).toEqual([['Cancel', 'cancel'], ['Delete', 'destructive']]);
    expect(db.deleteBodyMetric).not.toHaveBeenCalled();
    await act(async () => { buttons[1].onPress(); });
    await settle();
    expect(db.deleteBodyMetric).toHaveBeenCalledWith('u1', 'l10');
    expect(db.deleteMorningWeightById).toHaveBeenCalledWith('u1', 'm10');
    expect(mockToastShow).toHaveBeenCalledWith('Entry deleted.', { variant: 'success' });
  });

  test('a delete of a Home weigh-in says the plain sentence and retracts the trend row', async () => {
    const { tree } = await mount();
    await press(tree, 'Edit weigh-in. Wed 16 Sep, 82.4 kg');
    await press(tree, 'Delete this entry');
    const [, message, buttons] = mockAlert.mock.calls[0];
    expect(message).toBe('This removes the weigh-in from your history and your trend.');
    await act(async () => { buttons[1].onPress(); });
    await settle();
    expect(db.deleteMorningWeightById).toHaveBeenCalledWith('u1', 'm1');
    expect(db.deleteBodyMetric).not.toHaveBeenCalled();
  });

  test('a delete that finds nothing to remove says so and does not claim it deleted', async () => {
    const { tree } = await mount();
    db.deleteMorningWeightById.mockResolvedValue(false);
    await press(tree, 'Edit weigh-in. Wed 16 Sep, 82.4 kg');
    await press(tree, 'Delete this entry');
    const [, , buttons] = mockAlert.mock.calls[0];
    await act(async () => { buttons[1].onPress(); });
    await settle();
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't delete. Try again.", { variant: 'error' });
    expect(mockToastShow).not.toHaveBeenCalledWith('Entry deleted.', expect.anything());
  });
});
