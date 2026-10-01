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
    const card = tree.root.findByProps({ testID: 'plan-week-card' });
    expect(card.props.accessible).toBe(true);
    expect(card.props.accessibilityLabel).toBe('2 of 4 sessions in week 2 of your plan. Upper B is next.');
    // The visible headline and subline are hidden from assistive tech (read once, through the group).
    const hidden = find(tree, (n) => n.props?.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  test('without a plan: the calendar count, no subline, the cells still draw', () => {
    const summary = buildPlanWeekSummary({ position: null, sets, now: NOW });
    const tree = create(<PlanWeekCard summary={summary} />);
    expect(textOf(tree, 'plan-week-number')).toBe('2');
    expect(textOf(tree, 'plan-week-words')).toBe('sessions this week');
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
