import { create, act } from 'react-test-renderer';
import EmptyDiary from '../food/EmptyDiary';

jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));

function text(tree) {
  return JSON.stringify(tree.toJSON());
}

function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  act(() => node.props.onPress());
}

describe('EmptyDiary', () => {
  test('defaults to the generic add-food action', () => {
    const onAdd = jest.fn();
    const tree = create(<EmptyDiary onAdd={onAdd} />);
    expect(text(tree)).toContain('Add food');
    press(tree, 'Add food');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('can name the likely meal slot for the primary action', () => {
    const onAdd = jest.fn();
    const tree = create(
      <EmptyDiary
        onAdd={onAdd}
        addLabel="Log Meal 2"
        addAccessibilityLabel="Log Meal 2"
      />,
    );
    expect(text(tree)).toContain('Log Meal 2');
    press(tree, 'Log Meal 2');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('can open meal planning from the empty day', () => {
    const onPlanDay = jest.fn();
    const tree = create(<EmptyDiary onPlanDay={onPlanDay} />);
    expect(text(tree)).toContain('Plan meals');
    expect(text(tree)).toContain('Build to your targets, review, swap, then add to the diary.');
    press(tree, 'Plan meals: build meals for today or the week, review them, then add them to your diary');
    expect(onPlanDay).toHaveBeenCalledTimes(1);
  });
});
