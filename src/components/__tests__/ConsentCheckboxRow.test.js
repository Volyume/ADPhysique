import { create, act } from 'react-test-renderer';
import { Pressable } from 'react-native';
import ConsentCheckboxRow from '../ConsentCheckboxRow';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);

describe('ConsentCheckboxRow', () => {
  test('renders as an accessible checkbox and calls onPress', () => {
    const onPress = jest.fn();
    const tree = create(
      <ConsentCheckboxRow
        checked={false}
        onPress={onPress}
        label="I consent"
        accessibilityLabel="Consent checkbox"
      />,
    );

    const row = tree.root.findByType(Pressable);
    expect(row.props.accessibilityLabel).toBe('Consent checkbox');
    expect(row.props.accessibilityRole).toBe('checkbox');
    expect(row.props.accessibilityState).toEqual({ checked: false, disabled: false });

    act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('reports checked and disabled state without firing disabled presses', () => {
    const onPress = jest.fn();
    const tree = create(
      <ConsentCheckboxRow
        checked
        disabled
        onPress={onPress}
        label="I consent"
      />,
    );

    const row = tree.root.findByType(Pressable);
    expect(row.props.accessibilityLabel).toBe('I consent');
    expect(row.props.disabled).toBe(true);
    expect(row.props.accessibilityState).toEqual({ checked: true, disabled: true });
    expect(row.props.onPress).toBeUndefined();
  });

  test('supports the larger card presentation used by Article 9 consent', () => {
    const tree = create(
      <ConsentCheckboxRow
        checked
        onPress={() => {}}
        label="I agree to Volyume using my health and nutrition data to coach me."
        variant="card"
        size="md"
      />,
    ).toJSON();

    expect(JSON.stringify(tree)).toContain('I agree to Volyume');
  });
});
