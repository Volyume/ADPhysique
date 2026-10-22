/**
 * TodayLine - D231 (app layout rework, batch 1): the three occupants that moved
 * onto the line from unclamped cards and rows (the plan update choice, the
 * plan-rebuilt note, a limitation waiting for a decision) are shown in full, so
 * a long limitation sentence or a large system text size never cuts a question
 * off at two lines. Every other occupant keeps its two-line clamp.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));

import TodayLine from '../TodayLine';

const lineText = (tree) => tree.root.findAllByType(Text).find((n) => typeof n.props.children === 'string');

function mount(item) {
  let tree;
  act(() => { tree = create(<TodayLine item={item} testID="today-line" />); });
  return tree;
}

describe('TodayLine wrap', () => {
  const base = { key: 'k', text: 'A sentence.', onPress: () => {}, onDismiss: null, accessibilityLabel: 'A sentence.' };

  it('clamps at two lines by default (the older occupants)', () => {
    expect(lineText(mount(base)).props.numberOfLines).toBe(2);
  });

  it('shows the sentence in full when the item says wrap', () => {
    expect(lineText(mount({ ...base, wrap: true })).props.numberOfLines).toBeUndefined();
  });

  it('renders nothing without an item', () => {
    expect(mount(null).toJSON()).toBeNull();
  });
});
