/**
 * Mount + behaviour tests for the shared Button and Card primitives.
 */
import { Text, ActivityIndicator } from 'react-native';
import { create, act } from 'react-test-renderer';

import Button from '../Button';
import Card from '../Card';
import GradientCard from '../GradientCard';
import { colors, withAlpha } from '../../styles/theme';

describe('Button', () => {
  test('renders its title', () => {
    const tree = create(<Button title="Set active" onPress={() => {}} />).toJSON();
    expect(JSON.stringify(tree)).toContain('Set active');
  });

  test('fires onPress when enabled', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<Button title="Go" onPress={onPress} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('loading shows a spinner, hides the title text, and disables press', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<Button title="Save" loading onPress={onPress} />); });
    // Spinner is shown and no visible Text label is rendered (the
    // accessibilityLabel legitimately still carries the title).
    expect(tree.root.findAllByType(ActivityIndicator).length).toBe(1);
    expect(tree.root.findAllByType(Text).length).toBe(0);
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(pressable.props.disabled).toBe(true);
  });

  test('disabled blocks press', () => {
    let tree;
    act(() => { tree = create(<Button title="X" disabled onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(pressable.props.disabled).toBe(true);
  });

  test('falls back to the title for the accessibility label', () => {
    let tree;
    act(() => { tree = create(<Button title="Add to my plans" onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(pressable.props.accessibilityLabel).toBe('Add to my plans');
  });

  test('primary ink uses the always-dark onPrimary token, not theme `background` (U-F-1 contrast guard)', () => {
    // `onPrimary` stays #0D0D0D in both themes; `background` flips near-white in the
    // light theme and would fail contrast on the amber fill. In the dark-theme test
    // env onPrimary and background share a value, so this pins the intended ink
    // token at the value level and catches a swap to any other token.
    let tree;
    act(() => { tree = create(<Button title="Save" onPress={() => {}} />); });
    const label = tree.root.findByType(Text);
    expect(label.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.onPrimary })]),
    );
  });
});

describe('Card', () => {
  test('renders children', () => {
    const tree = create(<Card><Text>Inside</Text></Card>).toJSON();
    expect(JSON.stringify(tree)).toContain('Inside');
  });

  test('static card (no onPress) is not a button', () => {
    const tree = create(<Card><Text>x</Text></Card>);
    expect(tree.root.findAllByProps({ accessibilityRole: 'button' }).length).toBe(0);
  });

  test('pressable card (onPress) exposes a button role and fires', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<Card onPress={onPress}><Text>tap</Text></Card>); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('tone applies an accent border via withAlpha (rgba, not hex concat)', () => {
    const tree = create(<Card tone="primary"><Text>x</Text></Card>).toJSON();
    // Derive the expected border from the token so this survives accent
    // tweaks; the point of the test is "rgba via withAlpha, not hex concat".
    const expected = withAlpha(colors.primary, 0.33);
    expect(expected.startsWith('rgba(')).toBe(true);
    expect(JSON.stringify(tree)).toContain(expected);
  });

  test('elevated sits the card on the raised surface tier', () => {
    const tree = create(<Card elevated><Text>x</Text></Card>).toJSON();
    expect(JSON.stringify(tree)).toContain(colors.surfaceElevated);
  });
});

describe('GradientCard shim', () => {
  test('forwards to Card and renders its children (no gradient)', () => {
    const tree = create(<GradientCard tone="primary"><Text>hi</Text></GradientCard>).toJSON();
    // Renders the Card surface with the tone accent border.
    expect(JSON.stringify(tree)).toContain(withAlpha(colors.primary, 0.33));
    expect(JSON.stringify(tree)).toContain('hi');
  });
  test('honours an explicit tint as the accent border', () => {
    const tree = create(<GradientCard tint="#FFD700"><Text>x</Text></GradientCard>).toJSON();
    expect(JSON.stringify(tree)).toContain(withAlpha('#FFD700', 0.33));
  });
  test('the dead intensity prop is accepted without throwing', () => {
    expect(() => create(<GradientCard intensity={0.28}><Text>x</Text></GradientCard>)).not.toThrow();
  });
});
