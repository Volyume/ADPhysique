/**
 * DayDots.cell.test.js
 *
 * D214 addendum 1, Q5 = A: the plan-week card on the Progress root and
 * Consistency draws its seven cells through DayDots at the `cell` size with
 * weekday initials. What this suite pins and why:
 *   1. `size="cell"`: 12 dp dots with `spacing.sm` gaps; the default stays
 *      the 6 dp Community row line, byte-for-byte the same structure, so the
 *      Community pins (`DayDots.test.js`, `DayDots.tone.test.js`,
 *      `rows.amber.guard.test.js`) hold.
 *   2. `initials`: M T W T F S S under the dots, today's in `textPrimary`,
 *      the rest `textMuted`, hidden from assistive tech (the group's one
 *      spoken label is unchanged).
 *   3. The ring and fill rules are the same at both sizes.
 */
import { create } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { resolveTheme, spacing } from '../../../styles/theme';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
let mockPrefs = {};
jest.mock('../../../hooks/useTheme', () => () => require('../../../styles/theme').resolveTheme(mockPrefs));

import DayDots from '../DayDots';

const flat = (style) => StyleSheet.flatten(style);
const dotStyle = (tree, key) => flat(tree.root.findByProps({ testID: `day-dot-${key}` }).props.style);

beforeEach(() => { mockPrefs = {}; });

describe('size="cell"', () => {
  test('dots are 12 dp with spacing.sm gaps; the default row is unchanged at 6 dp', () => {
    const cellTree = create(<DayDots days={['mon']} todayKey="thu" tone="ink" size="cell" />);
    expect(dotStyle(cellTree, 'mon')).toMatchObject({ width: 12, height: 12 });
    expect(flat(cellTree.toJSON().props.style)).toMatchObject({ gap: spacing.sm });
    const rowTree = create(<DayDots days={['mon']} todayKey="thu" />);
    expect(dotStyle(rowTree, 'mon')).toMatchObject({ width: 6, height: 6 });
    expect(flat(rowTree.toJSON().props.style)).toMatchObject({ gap: spacing.xs });
    // The default structure is flat: seven dots straight under the group.
    expect(rowTree.toJSON().children).toHaveLength(7);
    expect(rowTree.toJSON().children.every((c) => !c.children)).toBe(true);
  });

  test('the ring and fill rules hold at the cell size', () => {
    const t = resolveTheme({});
    const tree = create(<DayDots days={['mon', 'wed']} todayKey="thu" tone="ink" size="cell" />);
    expect(dotStyle(tree, 'mon').backgroundColor).toBe(t.colors.textSecondary);
    expect(dotStyle(tree, 'tue')).toMatchObject({ backgroundColor: 'transparent', borderColor: t.colors.border, borderWidth: 1 });
    expect(dotStyle(tree, 'thu')).toMatchObject({ borderColor: t.colors.textPrimary, borderWidth: 1, backgroundColor: 'transparent' });
    // A trained today at the cell size: the ring, a gap, an 8 dp fill inside.
    const trainedToday = create(<DayDots days={['thu']} todayKey="thu" tone="ink" size="cell" />);
    expect(dotStyle(trainedToday, 'thu')).toMatchObject({ borderColor: t.colors.textPrimary, borderWidth: 1, backgroundColor: 'transparent' });
    const inner = trainedToday.root.findAll((n) => typeof n.type === 'string' && n.props?.testID === 'day-dot-fill-thu');
    expect(flat(inner[0].props.style)).toMatchObject({ width: 8, height: 8, backgroundColor: t.colors.textSecondary });
  });
});

describe('initials', () => {
  test('M T W T F S S sit under the dots, today in textPrimary, the rest textMuted', () => {
    const t = resolveTheme({});
    const tree = create(<DayDots days={['mon']} todayKey="thu" tone="ink" size="cell" initials />);
    const letters = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => tree.root.findByProps({ testID: `day-initial-${k}` }));
    expect(letters.map((n) => n.props.children)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(flat(letters[3].props.style).color).toBe(t.colors.textPrimary);
    expect(flat(letters[0].props.style).color).toBe(t.colors.textMuted);
    expect(flat(letters[0].props.style).fontSize).toBe(t.type.captionTight.fontSize);
  });

  test('the initials are hidden from assistive tech and the group label is unchanged', () => {
    const tree = create(<DayDots days={['mon', 'wed']} todayKey="thu" tone="ink" size="cell" initials />);
    const group = tree.toJSON();
    expect(group.props.accessibilityLabel).toBe('Trained Mon, Wed');
    expect(group.props.accessibilityRole).toBe('image');
    // Host nodes only: react-test-renderer's findAll also returns the composite View instance of each column.
    const columns = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityElementsHidden === true);
    expect(columns).toHaveLength(7);
    columns.forEach((c) => expect(c.props.importantForAccessibility).toBe('no-hide-descendants'));
  });

  test('without initials there is no text node at all (Community rows stay text-free)', () => {
    const tree = create(<DayDots days={['mon']} todayKey="thu" tone="ink" size="cell" />);
    expect(tree.root.findAllByProps({ testID: 'day-initial-mon' })).toHaveLength(0);
  });
});
