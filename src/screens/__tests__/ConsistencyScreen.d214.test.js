/**
 * ConsistencyScreen.d214.test.js
 *
 * D214 (Progress, the recovery heatmap and Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3, items 1 to 10, with the founder's rulings
 * Q3 = A and Q5 = A and the standing D204 and D166). The screen is rebuilt in
 * the plan's order and this suite pins the whole of it against the REAL child
 * cards (only the data hook, the store, navigation and native glue are
 * mocked), so a regression in any card or in the wiring fails here:
 *   1. the order: Your plan week, Last 12 weeks (the grid, its caption, the
 *      milestone), Your block, This week's plan, Load, Sessions, Signs of
 *      building fatigue;
 *   2. the plan-week card first, rendered from the one shared view-model;
 *   3. the grid with "Trained" and "No session" and "Rest" nowhere (D166);
 *   4. the block card: one total, no percent, the effort line, and "a recovery
 *      week" only when the programme position's GATED planned recovery week
 *      says so (an adaptive adjustment is never called one);
 *   5. the load card in the person's units, compared like for like;
 *   6. the one sessions line;
 *   7. every reason of the fatigue check, in the neutral card, describing only;
 *   8. the states: a block with no completed session still shows the plan week
 *      and the block, the empty state is the plan's sentence, loading is
 *      skeletons and the failure state stays;
 *   9. nothing of what moved away is rendered here, and no instruction verb
 *      sits in any file of the lane (D204).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

let mockProgressState;
let mockStore;

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector(mockStore)),
}));
jest.mock('../../hooks/useProgressData', () => ({
  __esModule: true,
  default: jest.fn(() => mockProgressState),
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/AnimatedEntrance', () => ({ children }) => children);
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../components/EmptyState', () => {
  const { View, Text: RNText } = require('react-native');
  return ({ title, text }) => (
    <View>
      <RNText>{title}</RNText>
      <RNText>{text}</RNText>
    </View>
  );
});
jest.mock('../../components/InfoTooltip', () => {
  const { Text: RNText } = require('react-native');
  return ({ text }) => <RNText>{text}</RNText>;
});
jest.mock('../../components/SectionLabel', () => {
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
jest.mock('../../components/Skeleton', () => {
  const { Text: RNText } = require('react-native');
  return { SkeletonCard: () => <RNText>SKELETON</RNText> };
});
jest.mock('../../components/ReadinessCards', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>MILESTONE_SENTENCE</RNText>;
});
// PressableCard (BlockProgressCard's tappable surface) pulls in reanimated.
jest.mock('../../components/PressableCard', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, onPress, accessibilityHint }) => (
    <TouchableOpacity accessibilityRole="button" accessibilityHint={accessibilityHint} onPress={onPress}>{children}</TouchableOpacity>
  );
});

import ConsistencyScreen, { blockReading } from '../ConsistencyScreen';
import { SESSION_STATE } from '../../lib/blockProgression';
import { RECOVERY_STATE } from '../../lib/recoveryState';
import { localDayKey, localWeekStartMs } from '../../lib/dayKey';
import { navigateCrossTab } from '../../navigation/navigateCrossTab';

const DAY = 86400000;
const plain = (s) => String(s).replace(/ /g, ' ');

const sessions = (done) => [
  { routineId: 'a', name: 'Upper A', order: 1, state: done >= 1 ? SESSION_STATE.COMPLETED : SESSION_STATE.OUTSTANDING },
  { routineId: 'b', name: 'Lower A', order: 2, state: done >= 2 ? SESSION_STATE.COMPLETED : SESSION_STATE.OUTSTANDING },
  { routineId: 'c', name: 'Upper B', order: 3, state: done >= 3 ? SESSION_STATE.COMPLETED : SESSION_STATE.OUTSTANDING },
  { routineId: 'd', name: 'Lower B', order: 4, state: done >= 4 ? SESSION_STATE.COMPLETED : SESSION_STATE.OUTSTANDING },
];
const POSITION = {
  activeWeekIndex: 2,
  plannedWeeks: 6,
  sessions: sessions(2),
  nextSession: { routineId: 'c', name: 'Upper B', order: 3 },
  weekResolved: false,
  recoveryState: { state: RECOVERY_STATE.NORMAL_ACCUMULATION, awaitingDecision: false },
};
const WEEK = { weekIndex: 2, plannedWeeks: 6, isDeload: false, awaitingDecision: false, rirTarget: 2 };

function baseProgress(over = {}) {
  const now = Date.now();
  return {
    activeMeso: { name: 'Upper Lower 4-Day', durationWeeks: 8 },
    mesoTonnage: [
      { value: 12100, label: '-3w' }, { value: 14300, label: '-2w' }, { value: 16000, label: '-1w' }, { value: 9598, label: 'Now' },
    ],
    workloadData: { acute: 9598, chronic: 16406, ratio: 0.59, weeksOfData: 4 },
    loadComparison: { current: 9598, expected: 9400, ratio: 1.02, comparison: 'in_line', weeksOfData: 3 },
    position: POSITION,
    blockProgress: [
      { muscle: 'back', label: 'Back', actual: 5, planned: 12 },
      { muscle: 'quads', label: 'Quads', actual: 6, planned: 10 },
    ],
    currentMesoWeek: WEEK,
    deloadAlert: null,
    calValues: [{ date: localDayKey(now), count: 1 }, { date: localDayKey(now - 3 * DAY), count: 1 }],
    earliestWorkoutAt: now - 200 * DAY,
    typicalSessionMinutes: 57,
    // Two sessions inside the current Monday week whatever the clock says.
    allSets: [{ workoutId: 'w1', createdAt: localWeekStartMs(now) + 1000 }, { workoutId: 'w2', createdAt: localWeekStartMs(now) + 2000 }],
    refreshing: false,
    loading: false,
    loadError: false,
    hasData: true,
    handleRefresh: jest.fn(),
    ...over,
  };
}

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => plain([].concat(n.props.children).join('')));
}
function render(over = {}, store = {}) {
  mockProgressState = baseProgress(over);
  mockStore = { user: { id: 'u1' }, units: 'kg', accessibility: { reduceMotion: true }, ...store };
  let tree;
  act(() => { tree = create(<ConsistencyScreen navigation={{ navigate: jest.fn() }} />); });
  return tree;
}
const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('the plan\'s order (7.3)', () => {
  test('plan week, last 12 weeks (grid, caption, milestone), block, plan rows, load, sessions, fatigue', () => {
    const tree = render({ deloadAlert: { deload: true, reasons: ['Your average reps per set have dropped over the last 4 weeks'] } });
    const all = texts(tree);
    const at = (needle) => {
      const i = all.findIndex((t) => (typeof needle === 'string' ? t === needle : needle.test(t)));
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('Your plan week'),
      at('2 of 4'),
      at('Last 12 weeks'),
      at('No session'),
      at(/^2 days trained in the last 12 weeks/),
      at('MILESTONE_SENTENCE'),
      at('Your block'),
      at('Week 2 of 6'),
      at("This week's plan"),
      at(/^Sets done so far this plan week/),
      at('Load'),
      at(/lifted so far this week$/),
      at('Sessions'),
      at('Sessions usually last about 57 minutes.'),
      at('Signs of building fatigue'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });
});

describe('Your plan week: first, from the one shared card (item 2)', () => {
  test('the card prints the programme\'s count, its week and what is next, then the seven cells', () => {
    const all = texts(render());
    expect(all).toContain('2 of 4');
    expect(all).toContain('sessions');
    expect(all).toContain('in week 2 of your plan · Upper B is next');
  });

  test('without a readable plan it reads the calendar count, "2 sessions this week"', () => {
    const all = texts(render({ position: null }));
    expect(all).toContain('2');
    expect(all).toContain('sessions this week');
    expect(all.join(' | ')).not.toMatch(/of your plan/);
  });

  test('it renders from the shared view-model and component; the screen has no second implementation', () => {
    const SRC = code(read('screens/ConsistencyScreen.js'));
    expect(SRC).toMatch(/import PlanWeekCard from '\.\.\/components\/PlanWeekCard'/);
    expect(SRC).toMatch(/import \{ buildPlanWeekSummary \} from '\.\.\/lib\/progress\/planWeek'/);
    expect(SRC).toMatch(/buildPlanWeekSummary\(\{ position, sets: allSets \}\)/);
    expect(SRC).toMatch(/<PlanWeekCard summary=\{planWeek\} \/>/);
    expect(SRC).not.toMatch(/sessions this week|in week \d|DayDots/);
    // The position is read once, by the hook that loads everything else on
    // focus and on refresh; the plan week card is the first object on the page.
    expect(SRC.indexOf('<PlanWeekCard')).toBeLessThan(SRC.indexOf('<TrainingDaysSection'));
    expect(read('hooks/useProgressData.js')).toMatch(/resolveProgrammePosition\(user\.id\)/);
  });

  test('with no completed session it still shows, with its zeros (CS-15, CS-16)', () => {
    const all = texts(render({
      hasData: false, allSets: [], calValues: [], blockProgress: [], mesoTonnage: [],
      position: { ...POSITION, sessions: sessions(0) },
    }));
    expect(all).toContain('0 of 4');
    expect(all).toContain('Your block');
  });
});

describe('Last 12 weeks: the labelled grid, "No session", never "Rest" (item 3, CS-13, CS-21, D166)', () => {
  test('the grid and its legend', () => {
    const tree = render();
    const all = texts(tree);
    expect(all).toContain('Trained');
    expect(all).toContain('No session');
    expect(all.join(' | ')).not.toMatch(/\bRest\b/);
    tree.root.findByProps({ testID: 'training-days-grid' });
  });

  test('the caption counts the trained days and names the window', () => {
    expect(texts(render())).toContain('2 days trained in the last 12 weeks');
  });

  test('the milestone sentence sits under the caption, drawn by the milestone section', () => {
    const all = texts(render());
    expect(all.indexOf('MILESTONE_SENTENCE')).toBeGreaterThan(all.findIndex((t) => /days? trained in the last 12 weeks/.test(t)));
  });

  test('"Rest" is not a word of any file of the lane (D166: no rest-day concept)', () => {
    for (const rel of ['screens/ConsistencyScreen.js', 'components/ProgressSections.js', 'components/BlockProgressCard.js']) {
      expect({ rel, hit: /\bRest\b/.test(code(read(rel))) }).toEqual({ rel, hit: false });
    }
  });
});

describe('Your block: one total, no percent, a gated recovery week (item 4, CS-5, CS-7)', () => {
  test('"Week 2 of 6" from the block\'s one total, in the sentence and the bar, no percent, no second M', () => {
    const all = texts(render());
    expect(all.filter((t) => /Week 2 of 6/.test(t)).length).toBeGreaterThanOrEqual(2);
    expect(all).toContain('Week 2 of 6 · Build. Recovery week in 4 weeks.');
    expect(all).toContain('Week 2 of 6');
    expect(all).toContain('Upper Lower 4-Day');
    // The block section only (the load card's (i) names its own 20% and 30%).
    const block = all.slice(all.indexOf('Your block'), all.indexOf("This week's plan")).join(' | ');
    expect(block).not.toMatch(/of 8|%|complete/);
  });

  test('"This week\'s effort: 3 of 5" with the (i)', () => {
    const all = texts(render());
    expect(all).toContain("This week's effort: 3 of 5");
    expect(all).toContain('How close to your limit the set should feel: 5 means you could not do another rep, 0 means very easy.');
  });

  test('tap opens the block, as today; no plan offers the library', () => {
    const tree = render();
    tree.root.findByProps({ accessibilityHint: 'Opens training block' }).props.onPress();
    expect(navigateCrossTab).toHaveBeenCalledWith(expect.anything(), 'PlansTab', 'MesocycleBuilder');
    const none = render({ activeMeso: null });
    expect(texts(none)).toContain('No plan running yet');
  });

  test('the planned recovery week is the position\'s GATED reading, on every card that names it', () => {
    const all = texts(render({
      position: {
        ...POSITION, activeWeekIndex: 6, nextSession: null, weekResolved: true,
        sessions: sessions(4),
        recoveryState: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY },
      },
      currentMesoWeek: { ...WEEK, weekIndex: 6, isDeload: true, rirTarget: 4 },
    }));
    expect(all).toContain('Recovery week. Lighter on purpose: fewer sets and easier effort, so fatigue clears before the next block.');
    expect(all).toContain('in week 6 of your plan, a recovery week · every session done');
    expect(all).toContain('Week 6 of 6');
  });

  test('the calendar says recovery but a required session is outstanding: neither card names a recovery week', () => {
    const all = texts(render({
      position: {
        ...POSITION, activeWeekIndex: 5, sessions: sessions(3),
        nextSession: { routineId: 'd', name: 'Lower B', order: 4 },
        recoveryState: { state: RECOVERY_STATE.NORMAL_ACCUMULATION, because: 'accumulation_work_outstanding' },
      },
      currentMesoWeek: { ...WEEK, weekIndex: 6, isDeload: true, rirTarget: 4 },
    }));
    const joined = all.join(' | ');
    expect(joined).not.toContain('Lighter on purpose');
    expect(joined).not.toContain('a recovery week');
    expect(all).toContain('in week 5 of your plan · Lower B is next');
    expect(all).toContain('Week 5 of 6');
    expect(all).toContain('Week 5 of 6 · Push. Your hardest week of the block. Recovery week next.');
  });

  test('an adaptive adjustment keeps the module\'s own words and is never called a recovery week', () => {
    const all = texts(render({
      position: { ...POSITION, activeWeekIndex: 3, recoveryState: { state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT, because: 'recovery_evidence' } },
      currentMesoWeek: { ...WEEK, weekIndex: 3, isDeload: true, rirTarget: 4 },
    }));
    expect(all).toContain('Training is lighter for now. Your recent recovery has been harder, so your coach is holding back some of the workload for now.');
    const joined = all.join(' | ');
    expect(joined).not.toContain('Lighter on purpose');
    expect(joined).not.toContain('a recovery week');
    expect(all).toContain('Week 3 of 6 · Build. Recovery week in 3 weeks.');
  });

  test('the calendar flag is read only as the fallback when the position cannot be', () => {
    const fallback = texts(render({ position: null, currentMesoWeek: { ...WEEK, weekIndex: 6, isDeload: true, rirTarget: 4 } }));
    expect(fallback).toContain('Recovery week. Lighter on purpose: fewer sets and easier effort, so fatigue clears before the next block.');
    // A finished block is never a live recovery week, on either path.
    for (const position of [null, { ...POSITION, recoveryState: null }]) {
      const done = texts(render({ position, currentMesoWeek: { ...WEEK, weekIndex: 6, isDeload: true, awaitingDecision: true, rirTarget: 4 } }));
      expect(done).toContain('Block finished. Sets stay at recovery-week level until you choose what comes next.');
      expect(done.join(' | ')).not.toContain('Lighter on purpose');
    }
  });

  test('blockReading is the one place that decides it', () => {
    expect(blockReading({ position: null, currentMesoWeek: { weekIndex: 3, plannedWeeks: 6, isDeload: true } }))
      .toMatchObject({ recoveryWeek: true, weekIndex: 3, plannedWeeks: 6, note: null });
    expect(blockReading({
      position: { activeWeekIndex: 5, plannedWeeks: 6, recoveryState: { state: RECOVERY_STATE.NORMAL_ACCUMULATION } },
      currentMesoWeek: { weekIndex: 6, plannedWeeks: 6, isDeload: true },
    })).toMatchObject({ recoveryWeek: false, weekIndex: 5, plannedWeeks: 6, note: null });
    expect(blockReading({ position: null, currentMesoWeek: null })).toMatchObject({ weekIndex: null, plannedWeeks: null, recoveryWeek: false });
    expect(blockReading({ position: { activeWeekIndex: 4, plannedWeeks: 5, recoveryState: null }, currentMesoWeek: null }))
      .toMatchObject({ weekIndex: 4, plannedWeeks: 5 });
  });
});

describe('This week\'s plan: "so far" and the plan week\'s sessions (item 5)', () => {
  test('the header, the sessions done, the (i) and the "5 of 12" rows', () => {
    const all = texts(render());
    expect(all).toContain("This week's plan");
    expect(all).toContain('Sets done so far this plan week · 2 of 4 sessions done');
    expect(all).toContain('5 of 12');
    expect(all).toContain('6 of 10');
    expect(all.some((t) => t.startsWith('A plan week starts on the day your block started'))).toBe(true);
  });

  test('with no readable plan there is no sessions clause', () => {
    const all = texts(render({ position: null }));
    expect(all).toContain('Sets done so far this plan week');
    expect(all.join(' | ')).not.toMatch(/sessions done/);
  });

  test('a tap opens the Volume heatmap, as before', () => {
    const navigate = jest.fn();
    mockProgressState = baseProgress();
    mockStore = { user: { id: 'u1' }, units: 'kg', accessibility: { reduceMotion: true } };
    let tree;
    act(() => { tree = create(<ConsistencyScreen navigation={{ navigate }} />); });
    tree.root.findByProps({ accessibilityHint: 'Opens weekly volume by muscle' }).props.onPress();
    expect(navigate).toHaveBeenCalledWith('VolumeHeatmap');
  });
});

describe('Load: one card, the person\'s units, like for like (item 6, CS-1, CS-6)', () => {
  test('kilograms for a kilogram user, with the sentence and the average', () => {
    const all = texts(render());
    expect(all).toContain('9,598 kg lifted so far this week');
    expect(all).toContain('In line with recent weeks at this point');
    expect(all).toContain('4-week average: 16,406 kg');
    expect(all).toContain('so far');
  });

  test('a pounds user never reads "kg" in the load card', () => {
    const all = texts(render({}, { units: 'lbs' }));
    expect(all).toContain('9,598 lbs lifted so far this week');
    expect(all).toContain('4-week average: 16,406 lbs');
    expect(all.join(' | ')).not.toMatch(/\bkg\b/);
  });

  test('the ratio and the second card are gone', () => {
    const joined = texts(render()).join(' | ');
    expect(joined).not.toMatch(/0\.59|vs recent average|Weekly load|This week so far against|Well above|Training load/);
    expect(joined.match(/lifted so far this week/g)).toHaveLength(1);
  });

  test('the comparison is withheld when there is nothing like for like to compare against', () => {
    const all = texts(render({ loadComparison: { current: 9598, expected: null, ratio: null, comparison: null, weeksOfData: 1 } }));
    expect(all).toContain('9,598 kg lifted so far this week');
    expect(all.filter((t) => /at this point$/.test(t))).toHaveLength(0);
  });
});

describe('Sessions: one line (item 7, CS-11)', () => {
  test('"Sessions usually last about 57 minutes." and nothing of the chart or its inference', () => {
    const all = texts(render());
    expect(all).toContain('Sessions usually last about 57 minutes.');
    expect(all.join(' | ')).not.toMatch(/Session length|getting shorter|fatigue\./);
  });
  test('no typical length, no section', () => {
    const all = texts(render({ typicalSessionMinutes: null }));
    expect(all.join(' | ')).not.toMatch(/Sessions usually last/);
    expect(all).not.toContain('Sessions');
  });
});

describe('Signs of building fatigue: every reason, describing only (item 8, CS-18)', () => {
  const REASONS = [
    'Your average reps per set have dropped over the last 4 weeks',
    'Recurring joint discomfort across the block',
    'More sets on a muscle than it can usually recover from, in 2 or more weeks',
    'Sustained soreness across 3 or more weeks',
  ];

  test('all four reasons are listed, not only the first', () => {
    const all = texts(render({ deloadAlert: { deload: true, reasons: REASONS } }));
    expect(all.filter((t) => t === 'Signs of building fatigue')).toHaveLength(1);
    for (const r of REASONS) expect(all).toContain(r);
  });

  test('a check with no stated reason still says what it found, once', () => {
    const all = texts(render({ deloadAlert: { deload: true, reasons: [] } }));
    expect(all).toContain('Your recent sessions show signs that fatigue is building up.');
  });

  test('the (i) says it is not an instruction and that the plan sets the sessions (D204)', () => {
    const all = texts(render({ deloadAlert: { deload: true, reasons: REASONS } }));
    expect(all.some((t) => t.includes("It's a picture of how you've been recovering, not an instruction. Your plan sets your sessions."))).toBe(true);
  });

  test('no alert, no card', () => {
    expect(texts(render())).not.toContain('Signs of building fatigue');
  });
});

describe('States (item 10, CS-4, CS-15)', () => {
  test('no completed session: the plan week and the block stay, the empty state is the plan\'s sentence', () => {
    const all = texts(render({
      hasData: false, allSets: [], calValues: [], blockProgress: [], mesoTonnage: [], typicalSessionMinutes: null,
    }));
    expect(all).toContain('No consistency data yet');
    expect(all).toContain('Once you finish a session, this page shows how often you train, where you are in your block and the sets you do each week.');
    expect(all).toContain('Your plan week');
    expect(all).toContain('Your block');
    expect(all).toContain('Week 2 of 6');
    for (const gone of ['Last 12 weeks', 'MILESTONE_SENTENCE', "This week's plan", 'Load', 'Sessions']) {
      expect(all).not.toContain(gone);
    }
    expect(all.join(' | ')).not.toMatch(/recovery signals|load trends|rhythm/);
  });

  test('loading draws skeleton cards and no content', () => {
    const all = texts(render({ loading: true }));
    expect(all.filter((t) => t === 'SKELETON')).toHaveLength(3);
    expect(all).not.toContain('Your plan week');
  });

  test('a failed read keeps its retryable state and shows no plan week', () => {
    const all = texts(render({ loadError: true, hasData: false }));
    expect(all).toContain("Couldn't load consistency");
    expect(all).not.toContain('Your plan week');
  });
});

describe('what moved away is not rendered here, and nothing instructs (item 9, D204)', () => {
  const FILES = ['screens/ConsistencyScreen.js', 'components/ProgressSections.js', 'components/BlockProgressCard.js'];

  test('FatigueTrendCard, MuscleFrequencyTable, SessionDurationChart and the second load card are not imported or rendered', () => {
    const SRC = read('screens/ConsistencyScreen.js');
    for (const gone of [
      'FatigueTrendCard', 'MuscleFrequencyTable', 'SessionDurationChart', 'WorkloadCard', 'MesocyclePulseCard',
      'TrainingCalendar', 'muscleFreq', 'showAllMuscles', 'fatigueSessions', 'durationBars',
    ]) {
      expect({ gone, hit: SRC.includes(gone) }).toEqual({ gone, hit: false });
    }
    const joined = texts(render()).join(' | ');
    expect(joined).not.toMatch(/Fatigue trend|Training frequency|Show all|Session length|Training days \(last 12 weeks\)|Training block/);
  });

  test('the hook no longer carries the removed plumbing (CS-20\'s clock-change week goes with it)', () => {
    const HOOK = code(read('hooks/useProgressData.js'));
    for (const gone of ['muscleFreq', 'showAllMuscles', 'loadMuscleFrequency', 'WEEK_MS', 'durationBars', 'fatigueSessions', 'getRecentWorkoutFeedback']) {
      expect({ gone, hit: HOOK.includes(gone) }).toEqual({ gone, hit: false });
    }
  });

  test('no instruction verb in any file of the lane: the plan sets the sessions, these surfaces describe (D204)', () => {
    const INSTRUCTS = /\b(push (your|the|harder)|aim (for|to)|try to|consider|you should|you must|keep going|keep it up|add (more|a set|sets)|reduce your|increase your|train (easier|harder|lighter)|ease off|lighter (day|week) (recommended|is)|take (it easy|a rest|a lighter)|slow down|rest (up|more|day)|monitor how)\b/i;
    for (const rel of [...FILES, 'lib/trainingLoad.js']) {
      expect({ rel, hit: (code(read(rel)).match(INSTRUCTS) ?? [])[0] ?? null }).toEqual({ rel, hit: null });
    }
    // The milestone sentence builder and the takeaway words, the other two
    // places this lane writes a sentence.
    const cards = code(read('components/ReadinessCards.js'));
    expect(cards.slice(cards.indexOf('const MILESTONES = ['), cards.indexOf('export function recoveryByMuscleCaption'))).not.toMatch(INSTRUCTS);
    expect(code(read('lib/chartWindows.js')).slice(-600)).not.toMatch(INSTRUCTS);
  });

  test('no streak and no countdown on the screen (D166, plan rule 2)', () => {
    for (const rel of FILES) {
      expect({ rel, hit: /\bstreak\b|days left|\bto go\b|keep it going/i.test(code(read(rel))) }).toEqual({ rel, hit: false });
    }
  });
});

// The lead's landing review of lane 4: LoadCard withholds itself when nothing
// has been lifted in the four weeks (bodyweight-only training), so the "Load"
// section label must go with it rather than stand over nothing.
describe('the Load section goes with its card when nothing was lifted', () => {
  test('all-zero load bars: no "Load" heading, no headline, no comparison sentence', () => {
    const tree = render({
      mesoTonnage: [
        { value: 0, label: '-3w' }, { value: 0, label: '-2w' }, { value: 0, label: '-1w' }, { value: 0, label: 'Now' },
      ],
      workloadData: null,
      loadComparison: null,
    });
    const all = texts(tree);
    expect(all).not.toContain('Load');
    expect(all.some((t) => /lifted so far this week/.test(t))).toBe(false);
    expect(all.some((t) => /recent weeks at this point/.test(t))).toBe(false);
    // The rest of the screen is untouched by the withhold.
    expect(all).toContain('Your plan week');
    expect(all).toContain('Sessions');
  });
  test('any lifted weight in the window: the heading and the card render', () => {
    const tree = render({
      mesoTonnage: [
        { value: 0, label: '-3w' }, { value: 0, label: '-2w' }, { value: 0, label: '-1w' }, { value: 420, label: 'Now' },
      ],
    });
    const all = texts(tree);
    expect(all).toContain('Load');
    expect(all).toContain('420 kg lifted so far this week');
  });
});
