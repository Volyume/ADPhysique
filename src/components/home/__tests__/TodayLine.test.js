/**
 * TodayLine - D231 (app layout rework, batch 1): the three occupants that moved
 * onto the line from unclamped cards and rows (the plan update choice, the
 * plan-rebuilt note, a limitation waiting for a decision) are shown in full, so
 * a long limitation sentence or a large system text size never cuts a question
 * off at two lines. LOC-683: every other occupant now shows in full too.
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

  // LOC-683: the kit's notice never clamps, so no occupant is cut short, wrap flag or not.
  it('shows the sentence in full for every occupant, with or without the wrap flag', () => {
    expect(lineText(mount(base)).props.numberOfLines).toBeUndefined();
    expect(lineText(mount({ ...base, wrap: true })).props.numberOfLines).toBeUndefined();
  });

  it('renders nothing without an item', () => {
    expect(mount(null).toJSON()).toBeNull();
  });
});
