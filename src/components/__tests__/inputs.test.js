/**
 * Mount + behaviour tests for the shared input primitives SearchBar, Chip,
 * and Stepper. These are additive (not yet adopted by screens); the tests
 * lock their contract before rollout.
 */
import { create, act } from 'react-test-renderer';
import { ActivityIndicator, TextInput } from 'react-native';

import SearchBar from '../SearchBar';
import TextField from '../TextField';
import Chip from '../Chip';
import Stepper from '../Stepper';
import { colors } from '../../styles/theme';

describe('SearchBar', () => {
  test('renders the placeholder as the input a11y label', () => {
    let tree;
    act(() => { tree = create(<SearchBar value="" onChangeText={() => {}} placeholder="Search foods" />); });
    const input = tree.root.findByProps({ accessibilityLabel: 'Search foods' });
    expect(input).toBeTruthy();
  });

  test('supports an explicit accessibility label', () => {
    let tree;
    act(() => {
      tree = create(
        <SearchBar
          value=""
          onChangeText={() => {}}
          placeholder="Search exercises"
          accessibilityLabel="Search lifts"
        />,
      );
    });
    expect(tree.root.findByProps({ accessibilityLabel: 'Search lifts' })).toBeTruthy();
  });

  test('clear button only shows when there is a value, and clears', () => {
    const onChangeText = jest.fn();
    let empty;
    act(() => { empty = create(<SearchBar value="" onChangeText={onChangeText} />); });
    expect(empty.root.findAllByProps({ accessibilityLabel: 'Clear search' }).length).toBe(0);

    let filled;
    act(() => { filled = create(<SearchBar value="oats" onChangeText={onChangeText} />); });
    const clear = filled.root.findByProps({ accessibilityLabel: 'Clear search' });
    act(() => clear.props.onPress());
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  test('onClear override is used when provided', () => {
    const onClear = jest.fn();
    const onChangeText = jest.fn();
    let tree;
    act(() => { tree = create(<SearchBar value="x" onChangeText={onChangeText} onClear={onClear} />); });
    act(() => tree.root.findByProps({ accessibilityLabel: 'Clear search' }).props.onPress());
    expect(onClear).toHaveBeenCalled();
    expect(onChangeText).not.toHaveBeenCalled();
  });

  test('loading state shows the spinner instead of the clear button', () => {
    let tree;
    act(() => { tree = create(<SearchBar value="rice" onChangeText={() => {}} loading />); });
    expect(tree.root.findAllByType(ActivityIndicator).length).toBe(1);
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Clear search' }).length).toBe(0);
  });

  test('input font is at least 16 (no iOS zoom)', () => {
    let tree;
    act(() => { tree = create(<SearchBar value="" onChangeText={() => {}} />); });
    const input = tree.root.findByProps({ accessibilityLabel: 'Search' });
    const flat = Array.isArray(input.props.style) ? Object.assign({}, ...input.props.style) : input.props.style;
    expect(flat.fontSize).toBeGreaterThanOrEqual(16);
  });
});

describe('TextField', () => {
  test('renders label and forwards input changes', () => {
    const onChangeText = jest.fn();
    let tree;
    act(() => {
      tree = create(<TextField label="First name" value="" onChangeText={onChangeText} />);
    });
    const input = tree.root.findByType(TextInput);
    expect(input.props.accessibilityLabel).toBe('First name');
    act(() => input.props.onChangeText('Allan'));
    expect(onChangeText).toHaveBeenCalledWith('Allan');
  });

  test('input font is at least 16 and uses theme foreground colour', () => {
    let tree;
    act(() => {
      tree = create(<TextField label="Email" value="" onChangeText={() => {}} />);
    });
    const input = tree.root.findByType(TextInput);
    const flat = Array.isArray(input.props.style) ? Object.assign({}, ...input.props.style) : input.props.style;
    expect(flat.fontSize).toBeGreaterThanOrEqual(16);
    expect(flat.color).toBe(colors.textPrimary);
  });

  test('focus and blur callbacks are preserved', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    let tree;
    act(() => {
      tree = create(<TextField label="Notes" value="" onChangeText={() => {}} onFocus={onFocus} onBlur={onBlur} />);
    });
    const input = tree.root.findByType(TextInput);
    act(() => input.props.onFocus({ nativeEvent: {} }));
    act(() => input.props.onBlur({ nativeEvent: {} }));
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('Chip', () => {
  test('fires onPress', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<Chip label="Build muscle" onPress={onPress} />); });
    // The host Pressable carries onPress; grab the deepest matching node.
    const nodes = tree.root.findAllByProps({ accessibilityRole: 'button' });
    const pressable = nodes.find(n => typeof n.props.onPress === 'function');
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalled();
  });

  test('renders its label', () => {
    const tree = create(<Chip label="Cut" onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('Cut');
  });

  test('disabled blocks press', () => {
    let tree;
    act(() => { tree = create(<Chip label="x" disabled onPress={() => {}} />); });
    const nodes = tree.root.findAllByProps({ accessibilityRole: 'button' });
    expect(nodes.some(n => n.props.disabled === true)).toBe(true);
  });

  test('reflects selected via accessibilityState', () => {
    let tree;
    act(() => { tree = create(<Chip label="x" selected onPress={() => {}} />); });
    const nodes = tree.root.findAllByProps({ accessibilityRole: 'button' });
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some(n => n.props.accessibilityState?.selected === true)).toBe(true);
  });

  test('supports a radio role for single-select groups', () => {
    let tree;
    act(() => { tree = create(<Chip label="Mon" accessibilityRole="radio" selected onPress={() => {}} />); });
    const nodes = tree.root.findAllByProps({ accessibilityRole: 'radio' });
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some(n => n.props.accessibilityState?.selected === true)).toBe(true);
  });
});

describe('Stepper', () => {
  test('increments and decrements by step, clamped to range', () => {
    const onChange = jest.fn();
    let tree;
    act(() => { tree = create(<Stepper value={5} onChange={onChange} min={0} max={10} step={1} label="sets" />); });
    const inc = tree.root.findByProps({ accessibilityLabel: 'Increase sets' });
    const dec = tree.root.findByProps({ accessibilityLabel: 'Decrease sets' });
    act(() => inc.props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(6);
    act(() => dec.props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  test('disables minus at min and plus at max', () => {
    let atMin;
    act(() => { atMin = create(<Stepper value={0} onChange={() => {}} min={0} max={10} />); });
    expect(atMin.root.findByProps({ accessibilityLabel: 'Decrease value' }).props.disabled).toBe(true);
    expect(atMin.root.findByProps({ accessibilityLabel: 'Increase value' }).props.disabled).toBe(false);

    let atMax;
    act(() => { atMax = create(<Stepper value={10} onChange={() => {}} min={0} max={10} />); });
    expect(atMax.root.findByProps({ accessibilityLabel: 'Increase value' }).props.disabled).toBe(true);
  });

  test('formatValue overrides the display', () => {
    const tree = create(
      <Stepper value={7} onChange={() => {}} formatValue={(v) => `${v}:00`} />
    ).toJSON();
    expect(JSON.stringify(tree)).toContain('7:00');
  });
});
