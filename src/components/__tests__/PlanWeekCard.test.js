/**
 * PlanWeekCard.test.js
 *
 * D214 addendum 1 (Q5 = A) and plan sections 7.1 item 2 / 7.3 item 2: the ONE
 * "Your plan week" card the Progress root and Consistency both render from
 * `buildPlanWeekSummary`. What this suite pins and why:
 *   1. The card prints the view-model's own words and nothing of its own: the
 *      number, the words and the subline come straight from the summary, so
 *      the two screens can never print different counts or next sessions.
 *   2. The seven cells are the live Community DayDots in its INK tone at the
 *      cell size with initials (a fact beside a denominator, never amber, no
 *      streak, no "rest").
 *   3. The card is one accessible group carrying the summary's sentence; the
 *      visible text inside it is hidden from assistive tech so nothing is read
 *      twice.
 *   4. Without a plan there is no subline and the cells still draw.
 *   5. The type roles it uses exist on the resolved theme (a missing role
 *      would silently render unstyled text).
 */
import { create } from 'react-test-renderer';
import { resolveTheme } from '../../styles/theme';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

import PlanWeekCard from '../PlanWeekCard';
import { buildPlanWeekSummary } from '../../lib/progress/planWeek';
import { SESSION_STATE } from '../../lib/blockProgression';
import { localWeekStartMs } from '../../lib/dayKey';

const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime(); // Thursday
const DAY = 24 * 60 * 60 * 1000;
const at = (d) => localWeekStartMs(NOW) + d * DAY + 10 * 60 * 60 * 1000;

const position = {
  activeWeekIndex: 2,
  plannedWeeks: 6,
  sessions: [
    { routineId: 'a', name: 'Upper A', order: 1, state: SESSION_STATE.COMPLETED },
    { routineId: 'b', name: 'Lower A', order: 2, state: SESSION_STATE.COMPLETED },
    { routineId: 'c', name: 'Upper B', order: 3, state: SESSION_STATE.OUTSTANDING },
    { routineId: 'd', name: 'Lower B', order: 4, state: SESSION_STATE.OUTSTANDING },
  ],
  nextSession: { routineId: 'c', name: 'Upper B', order: 3 },
  weekResolved: false,
  recoveryState: { state: 'normal_accumulation' },
};
const sets = [{ workoutId: 'w1', createdAt: at(0) }, { workoutId: 'w2', createdAt: at(2) }];

const textOf = (tree, testID) => tree.root.findByProps({ testID }).props.children;
const find = (tree, pred) => tree.root.findAll(pred);

beforeEach(() => { mockPrefs = {}; });

describe('PlanWeekCard prints the shared view-model', () => {
  test('number, words and subline come from buildPlanWeekSummary', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    expect(textOf(tree, 'plan-week-number')).toBe('2 of 4');
    expect(textOf(tree, 'plan-week-words')).toBe('sessions');
    expect(textOf(tree, 'plan-week-subline')).toBe('in week 2 of your plan · Upper B is next');
  });

  test('the cells are DayDots in the ink tone, cell size, with initials, fed the week\'s trained days', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    const dots = find(tree, (n) => n.props?.tone === 'ink');
    expect(dots).toHaveLength(1);
    expect(dots[0].props).toMatchObject({ size: 'cell', initials: true, days: ['mon', 'wed'], todayKey: 'thu' });
  });

  test('the cells light on the days a completed session STARTED when the screen passes them (census 6.13)', () => {
    // Sets on Monday and Wednesday, but the completed workouts started on
    // Monday and Thursday (the grid's own days): the cells follow the workouts.
    const summary = buildPlanWeekSummary({ position, sets, completedDays: ['2026-09-28', '2026-10-01'], now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    const dots = find(tree, (n) => n.props?.tone === 'ink');
    expect(dots[0].props.days).toEqual(['mon', 'thu']);
  });

  test('no amber anywhere on the card: the cells are a fact, not the thing to do', () => {
    [{}, { theme: 'light' }, { colorBlindSafe: true }].forEach((prefs) => {
      mockPrefs = prefs;
      const t = resolveTheme(prefs);
      const summary = buildPlanWeekSummary({ position, sets, now: NOW });
      const tree = create(<PlanWeekCard summary={summary} />);
      const colours = find(tree, (n) => n.props?.style != null)
        .flatMap((n) => [].concat(n.props.style).flat())
        .filter(Boolean)
        .flatMap((s) => [s.color, s.backgroundColor, s.borderColor]);
      expect(colours).not.toContain(t.colors.primary);
    });
  });

  test('the card is one accessible group carrying the summary sentence', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    // RE-ANCHORED D214 addendum 5 (the lead's landing fix for lane 3): the
    // accessible group is the inner summary view, so children rendered under
    // it keep their own controls reachable.
    const group = tree.root.findByProps({ testID: 'plan-week-summary' });
    expect(group.props.accessible).toBe(true);
    expect(group.props.accessibilityLabel).toBe('2 of 4 sessions in week 2 of your plan. Upper B is next.');
    expect(tree.root.findByProps({ testID: 'plan-week-card' }).props.accessible).toBeUndefined();
    // The visible headline and subline are hidden from assistive tech (read once, through the group).
    const hidden = find(tree, (n) => n.props?.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  test('without a plan: the calendar count, no subline, the cells still draw', () => {
    const summary = buildPlanWeekSummary({ position: null, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    expect(textOf(tree, 'plan-week-number')).toBe('2');
    // RE-ANCHORED D214 addendum 9 (P13): the open week says "so far".
    expect(textOf(tree, 'plan-week-words')).toBe('sessions so far this week');
    expect(tree.root.findAllByProps({ testID: 'plan-week-subline' })).toHaveLength(0);
    expect(find(tree, (n) => n.props?.tone === 'ink')).toHaveLength(1);
  });

  test('a missing summary renders nothing rather than an empty card', () => {
    expect(create(<PlanWeekCard summary={null} />).toJSON()).toBeNull();
  });

  test('the type roles the card uses exist on the resolved theme', () => {
    const t = resolveTheme({});
    ['h2', 'bodyStrong', 'bodySm'].forEach((role) => expect(t.type[role]).toBeTruthy());
  });
});

// The lead's landing fix for lane 3 (plan 7.1 item 2, "one Card"): children
// render inside the card under a hairline and outside the accessible group.
describe('PlanWeekCard children', () => {
  const { Text, View } = require('react-native');
  test('no children: no under-section is drawn', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    expect(tree.root.findAllByProps({ testID: 'plan-week-under' }).filter((n) => typeof n.type === 'string')).toHaveLength(0);
  });
  test('children sit under a hairline, outside the accessible summary group', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(
      <PlanWeekCard summary={summary}>
        <View testID="child-strip"><Text>strip</Text></View>
      </PlanWeekCard>,
    );
    const under = tree.root.findAllByProps({ testID: 'plan-week-under' }).filter((n) => typeof n.type === 'string')[0];
    expect(under).toBeTruthy();
    expect([].concat(under.props.style).some((s) => s && s.borderTopWidth === 1)).toBe(true);
    const group = tree.root.findAllByProps({ testID: 'plan-week-summary' }).filter((n) => typeof n.type === 'string')[0];
    expect(group.findAllByProps({ testID: 'child-strip' })).toHaveLength(0);
    expect(under.findAllByProps({ testID: 'child-strip' }).length).toBeGreaterThan(0);
  });
});

// D214 addendum 6 (lane 3 review 1): the seven cells are no descendant of the
// accessible summary group, so their own spoken days are reachable.
describe('PlanWeekCard: the cells are reachable', () => {
  test('the DayDots node has no accessible ancestor', () => {
    const summary = buildPlanWeekSummary({ position, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    const dots = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && /^Trained/.test(n.props.accessibilityLabel));
    expect(dots.length).toBeGreaterThan(0);
    for (const d of dots) {
      // DayDots may group its own cells; nothing ABOVE that group may be an
      // accessible group (that would swallow the days), and the summary group
      // and the card never are.
      const accessibleAncestors = [];
      let p = d.parent;
      while (p) {
        if (p.props?.accessible === true) accessibleAncestors.push(p);
        p = p.parent;
      }
      expect(accessibleAncestors.some((a) => a.props?.testID === 'plan-week-summary' || a.props?.testID === 'plan-week-card')).toBe(false);
      expect(accessibleAncestors.length).toBeLessThanOrEqual(1);
    }
    const group = tree.root.findAllByProps({ testID: 'plan-week-summary' }).filter((n) => typeof n.type === 'string')[0];
    expect(group.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && /^Trained/.test(n.props.accessibilityLabel))).toHaveLength(0);
  });
});
