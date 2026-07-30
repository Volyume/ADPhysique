import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
}));

import QuickAddSheet from '../QuickAddSheet';

function render(props = {}) {
  const merged = {
    visible: true,
    initialMealSlot: 'snack',
    onSave: jest.fn(async () => {}),
    onClose: jest.fn(),
    ...props,
  };
  let tree;
  act(() => {
    tree = create(<QuickAddSheet {...merged} />);
  });
  return { tree, props: merged };
}

function setInput(tree, label, value) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function',
  )[0];
  expect(node).toBeTruthy();
  act(() => node.props.onChangeText(value));
}

async function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  await act(async () => {
    await node.props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('QuickAddSheet', () => {
  test('blocks invalid calories with a calm warning', async () => {
    const { tree, props } = render();

    await press(tree, 'Add to diary');

    expect(props.onSave).not.toHaveBeenCalled();
    // X1: the copy names the unit the user is typing in. Default preference
    // is kcal, so the bound is unchanged at 5000 for this case.
    expect(mockToastShow).toHaveBeenCalledWith(
      'Enter energy between 1 and 5000 kcal.',
      { variant: 'warning' },
    );
  });

  test('saves calories, macros and meal slot', async () => {
    const { tree, props } = render({ initialMealSlot: 'dinner' });
    setInput(tree, 'Energy in kcal', '300');
    setInput(tree, 'Protein in grams', '20');
    setInput(tree, 'Carbohydrates in grams', '31.5');
    setInput(tree, 'Fat in grams', '9');

    await press(tree, 'Add to diary');

    expect(props.onSave).toHaveBeenCalledWith({
      kcal: 300,
      protein: 20,
      carbs: 31.5,
      fat: 9,
      mealSlot: 'dinner',
    });
  });
});
