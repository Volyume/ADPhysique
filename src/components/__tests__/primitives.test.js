/**
 * Mount + behaviour tests for the shared Button and Card primitives.
 */
import React from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { create, act } from 'react-test-renderer';

import Button from '../Button';
import Card from '../Card';
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
});
