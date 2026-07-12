/**
 * Mount + behaviour tests for the shared input primitives SearchBar, Chip,
 * and Stepper. These are additive (not yet adopted by screens); the tests
 * lock their contract before rollout.
 */
import { create, act } from 'react-test-renderer';
import { ActivityIndicator, TextInput, View } from 'react-native';

import SearchBar from '../SearchBar';
import TextField from '../TextField';
import Chip from '../Chip';
import Stepper from '../Stepper';
import { colors } from '../../styles/theme';
import { fontFamily } from '../../styles/fontFamily';

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
    expect(flat.fontFamily).toBe(fontFamily.regular);
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

  test('uses checked state for radio single-select groups', () => {
    let tree;
    act(() => { tree = create(<Chip label="Mon" accessibilityRole="radio" selected onPress={() => {}} />); });
    const nodes = tree.root.findAllByProps({ accessibilityRole: 'radio' });
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some(n => n.props.accessibilityState?.checked === true)).toBe(true);
    expect(nodes.some(n => n.props.accessibilityState?.selected === true)).toBe(false);
  });

  test('supports explicit accessibility labels and label style overrides', () => {
    let tree;
    act(() => {
      tree = create(
        <Chip
          label="Vegan"
          selected
          accessibilityLabel="Diet preference Vegan"
          labelStyle={{ textAlign: 'center' }}
          selectedLabelStyle={{ color: 'red' }}
          onPress={() => {}}
        />,
      );
    });
    expect(tree.root.findByProps({ accessibilityLabel: 'Diet preference Vegan' })).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).toContain('red');
  });

  // AX-05 (launch accessibility audit, 2026-07-12): Chip used to default
  // maxFontSizeMultiplier to 1.3, silently re-capping text EP-14 had already
  // uncapped everywhere else, and its ~36dp default geometry missed the
  // 44dp touch-target minimum. Both are fixed at the primitive; this proves
  // it at render time (Chip.a11y.guard.test.js pins the same facts at
  // source level for the ~49 call sites that can't all be mounted here).
  test('meets the 44dp minimum touch target at default text size', () => {
    let tree;
    act(() => { tree = create(<Chip label="Cut" onPress={() => {}} />); });
    const pressable = tree.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find(n => typeof n.props.onPress === 'function');
    const flat = Object.assign({}, ...[].concat(pressable.props.style).filter(Boolean));
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
  });

  test('label carries no maxFontSizeMultiplier cap, even at a long label a large system text size would wrap further', () => {
    let tree;
    const longLabel = 'A longer chip label than usual, the kind Dynamic Type at 200% produces';
    act(() => { tree = create(<Chip label={longLabel} onPress={() => {}} />); });
    const label = tree.root.findByProps({ children: longLabel });
    // No cap: RN's own (uncapped) system font scaling applies, matching
    // every other Text in the app since EP-14.
    expect(label.props.maxFontSizeMultiplier).toBeUndefined();
    // No forced numberOfLines either: the label is free to wrap/grow at a
    // large multiplier instead of being clipped/truncated.
    expect(label.props.numberOfLines).toBeUndefined();
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

  test('supports compact sizing and explicit accessibility labels', () => {
    let tree;
    act(() => {
      tree = create(
        <Stepper
          value={90}
          onChange={() => {}}
          min={30}
          max={600}
          step={15}
          size="compact"
          formatValue={(v) => `${v}s`}
          decreaseLabel="Decrease rest for bench press"
          increaseLabel="Increase rest for bench press"
          valueLabel="Rest 90s"
        />,
      );
    });

    expect(tree.root.findByProps({ accessibilityLabel: 'Decrease rest for bench press' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Increase rest for bench press' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Rest 90s' })).toBeTruthy();
  });

  // AX-15 (launch accessibility audit, 2026-07-12): the compact button's
  // visible box is a deliberately small 30x34dp, below the 44x44dp minimum
  // touch target. Fix is a default 8dp hit slop on every edge PLUS matching
  // padding on the wrapping row (RN clips hitSlop to the parent's own
  // bounds, so the row has to make room for it or the hit slop is a no-op).
  // This proves the real effective target, not just that a hitSlop prop
  // exists: visible box size + hit slop >= 44 in both axes, and the row's
  // own padding is large enough that the hit slop actually reaches that far
  // (Stepper.a11y.guard.test.js pins the same facts at source level).
  test('compact button reaches a 44dp effective touch target without growing the visible affordance (AX-15)', () => {
    let tree;
    act(() => {
      tree = create(
        <Stepper
          value={90}
          onChange={() => {}}
          min={30}
          max={600}
          step={15}
          size="compact"
          label="rest"
          decreaseLabel="Decrease rest"
          increaseLabel="Increase rest"
        />,
      );
    });

    const decBtn = tree.root.findByProps({ accessibilityLabel: 'Decrease rest' });
    const flatBtn = Object.assign({}, ...[].concat(decBtn.props.style).filter(Boolean));
    const hitSlop = decBtn.props.hitSlop;
    expect(hitSlop).toBeTruthy();

    // Visible affordance is untouched: still the compact 30x34 box.
    expect(flatBtn.width).toBe(30);
    expect(flatBtn.height).toBe(34);

    // Effective touch target, box + hit slop, meets 44dp in both axes.
    expect(flatBtn.width + hitSlop.left + hitSlop.right).toBeGreaterThanOrEqual(44);
    expect(flatBtn.height + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(44);

    // The row wrapping the button must have at least as much padding as the
    // hit slop, or RN's "never past the parent bounds" rule clips it away.
    const row = tree.root.findByType(View);
    const flatRow = Object.assign({}, ...[].concat(row.props.style).flat(Infinity).filter(Boolean));
    expect(flatRow.padding).toBeGreaterThanOrEqual(hitSlop.left);
    expect(flatRow.padding).toBeGreaterThanOrEqual(hitSlop.top);
  });
});
