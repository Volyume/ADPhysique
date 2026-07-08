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

  test('can name a human meal action without exposing slot numbers', () => {
    const onAdd = jest.fn();
    const tree = create(
      <EmptyDiary
        onAdd={onAdd}
        addLabel="Add breakfast"
        addAccessibilityLabel="Add breakfast"
      />,
    );
    expect(text(tree)).toContain('Add breakfast');
    expect(text(tree)).not.toContain('Log Meal');
    press(tree, 'Add breakfast');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('can open meal planning from the empty day', () => {
    const onPlanDay = jest.fn();
    const tree = create(<EmptyDiary onPlanDay={onPlanDay} />);
    expect(text(tree)).toContain('Plan meals');
    expect(text(tree)).toContain('Create a day or week from your targets. Nothing is logged until you add it.');
    press(tree, 'Plan meals for this day or week');
    expect(onPlanDay).toHaveBeenCalledTimes(1);
  });
});
