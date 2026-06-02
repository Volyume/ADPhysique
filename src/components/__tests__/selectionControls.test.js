/**
 * The shared selection controls used by both the onboarding wizard and the
 * coached builder (H8 unification). Smoke tests: they render their options and
 * fire the right value on press.
 */
import React from 'react';
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import OptionCard from '../OptionCard';
import SegmentedControl from '../SegmentedControl';

function press(node) {
  act(() => node.props.onPress());
}

describe('SegmentedControl', () => {
  const options = [
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '75 min', value: 75 },
  ];

  test('renders one segment per option', () => {
    const tree = create(<SegmentedControl options={options} value={60} onChange={() => {}} />);
    const segments = tree.root.findAllByType(TouchableOpacity);
    expect(segments).toHaveLength(3);
  });

  test('pressing a segment reports its value', () => {
    const onChange = jest.fn();
    const tree = create(<SegmentedControl options={options} value={60} onChange={onChange} />);
    const segments = tree.root.findAllByType(TouchableOpacity);
    press(segments[2]);
    expect(onChange).toHaveBeenCalledWith(75);
  });

  test('the selected segment is flagged for accessibility', () => {
    const tree = create(<SegmentedControl options={options} value={60} onChange={() => {}} />);
    const selected = tree.root
      .findAllByType(TouchableOpacity)
      .filter(n => n.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('60 min');
  });
});

describe('OptionCard', () => {
  test('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const tree = create(
      <OptionCard icon="trophy-outline" label="Advanced" detail="3 to 5 years" active={false} onPress={onPress} />,
    );
    press(tree.root.findByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('reports selected state for accessibility when active', () => {
    const tree = create(
      <OptionCard icon="trophy-outline" label="Advanced" detail="3 to 5 years" active onPress={() => {}} />,
    );
    const card = tree.root.findByType(TouchableOpacity);
    expect(card.props.accessibilityState.selected).toBe(true);
  });
});
