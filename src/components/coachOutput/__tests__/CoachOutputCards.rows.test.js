/**
 * CoachOutputCards.rows.test.js
 *
 * D206 redesign: pins the Coaching decision screen's row parts. A WeekRow
 * shows the fact's name, its value and at most one mark, and speaks all of
 * it; WeekRowsCard renders nothing for no rows; a TextRow speaks its title
 * and reason as one sentence; a LinkRow is a button at least 44 dp tall.
 * Source guard: none of these parts reads the accent colour (amber on this
 * screen means a row that takes you somewhere, and the committing Apply).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: RNText } = require('react-native');
  return ({ name }) => <RNText>{`icon:${name}`}</RNText>;
});
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('../../InfoTooltip', () => () => null);

import {
  WeekRow, WeekRowsCard, TextRow, LinkRow,
} from '../CoachOutputCards';

function render(el) {
  let tree;
  act(() => { tree = create(el); });
  return tree;
}
const texts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));

describe('WeekRow', () => {
  test('name, value, the mark glyph, and one spoken sentence', () => {
    const tree = render(<WeekRow icon="barbell-outline" label="Sessions" value="2 of 4" mark="attention" first />);
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['icon:barbell-outline', 'Sessions', '2 of 4', 'icon:alert-circle']));
    const node = tree.root.findByProps({ accessibilityLabel: 'Sessions: 2 of 4, worth a look' });
    expect(node.props.accessibilityRole).toBe('text');
  });

  test('a good mark is the check-in\'s tick; no mark draws no glyph', () => {
    expect(texts(render(<WeekRow icon="flash-outline" label="PRs" value="7" mark="good" first />))).toContain('icon:checkmark-circle');
    const none = texts(render(<WeekRow icon="arrow-up-outline" label="7-day trend" value="+1.1 lbs" first />));
    expect(none.some((t) => /checkmark|alert/.test(t))).toBe(false);
  });
});

describe('WeekRowsCard', () => {
  test('renders nothing for no rows', () => {
    expect(render(<WeekRowsCard rows={[]} />).toJSON()).toBeNull();
  });

  test('renders one row per fact, in order', () => {
    const tree = render(<WeekRowsCard rows={[
      { key: 'sessions', icon: 'barbell-outline', label: 'Sessions', value: '2 of 4', mark: 'attention', tooltip: null },
      { key: 'prs', icon: 'flash-outline', label: 'PRs', value: '7', mark: 'good', tooltip: null },
    ]} />);
    const all = texts(tree);
    expect(all.indexOf('Sessions')).toBeLessThan(all.indexOf('PRs'));
  });
});

describe('TextRow and LinkRow', () => {
  test('a TextRow speaks its title and reason together', () => {
    const tree = render(<TextRow icon="pause-circle-outline" title="Calories held." sub="Trend is on target." first />);
    expect(tree.root.findByProps({ accessibilityLabel: 'Calories held. Trend is on target.' })).toBeTruthy();
  });

  test('a LinkRow is a button with a 44 dp floor', () => {
    const onPress = jest.fn();
    const tree = render(<LinkRow icon="information-circle-outline" label="How this decision was made" onPress={onPress} />);
    const button = tree.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: 'How this decision was made' });
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
    const style = Object.assign({}, ...[].concat(button.props.style).filter(Boolean));
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('source guard', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputCards.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  test('the row parts never read the accent colour', () => {
    const rowsCode = code.slice(code.indexOf('export function WeekRow('), code.indexOf('export function RapidLossAlert('));
    expect(rowsCode.length).toBeGreaterThan(0);
    expect(rowsCode).not.toMatch(/colors\.primary/);
  });
  test('the retired chips, ledger and why block are gone', () => {
    expect(code).not.toMatch(/export function (StatChip|LedgerCard|WhyBlock)\b/);
  });
});
