/**
 * Mount + behaviour tests for the shared Button and Card primitives.
 */
import { Text, ActivityIndicator } from 'react-native';
import { create, act } from 'react-test-renderer';

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do (screen-mount.test.js). Button reaches it
// through lib/haptics for the primary-variant selection tick (audit 03b M1).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import Button from '../Button';
import Card from '../Card';
import GradientCard from '../GradientCard';
import SectionLabel from '../SectionLabel';
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

  test('tertiary renders as a contained ghost button, not a bare orange text link', () => {
    let tree;
    act(() => { tree = create(<Button title="Not now" variant="tertiary" onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    const flattenedStyle = Array.isArray(pressable.props.style)
      ? Object.assign({}, ...pressable.props.style)
      : pressable.props.style;
    expect(flattenedStyle.backgroundColor).toBe(colors.primaryBg);
    expect(flattenedStyle.borderWidth).toBe(1);
  });

  test('outline is neutral chrome, not an amber text-link button', () => {
    let tree;
    act(() => { tree = create(<Button title="Compare" variant="outline" onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    const flattenedStyle = Array.isArray(pressable.props.style)
      ? Object.assign({}, ...pressable.props.style)
      : pressable.props.style;
    const label = tree.root.findByType(Text);
    expect(flattenedStyle.backgroundColor).toBe(colors.surface);
    expect(flattenedStyle.borderColor).toBe(colors.border);
    expect(label.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.textPrimary })]),
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

  test('forwards accessibility hints and state through pressable cards', () => {
    let tree;
    act(() => {
      tree = create(
        <Card
          onPress={() => {}}
          accessibilityLabel="Refresh profile"
          accessibilityHint="Status: Update. Add current body metrics."
          accessibilityState={{ disabled: false }}
          testID="profile-card"
        >
          <Text>tap</Text>
        </Card>,
      );
    });
    const pressable = tree.root.findByProps({ testID: 'profile-card' });
    expect(pressable.props.accessibilityLabel).toBe('Refresh profile');
    expect(pressable.props.accessibilityHint).toBe('Status: Update. Add current body metrics.');
    expect(pressable.props.accessibilityState).toEqual({ disabled: false });
  });

  test('forwards accessibility hints and state through static cards', () => {
    const tree = create(
      <Card
        accessibilityLabel="Body weight"
        accessibilityHint="Latest logged"
        accessibilityState={{ busy: false }}
        testID="static-profile-card"
      >
        <Text>x</Text>
      </Card>,
    );
    const card = tree.root.findByProps({ testID: 'static-profile-card' });
    expect(card.props.accessibilityHint).toBe('Latest logged');
    expect(card.props.accessibilityState).toEqual({ busy: false });
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

  test('default card treatment is quiet and tighter than primary controls', () => {
    const tree = create(<Card><Text>x</Text></Card>).toJSON();
    expect(JSON.stringify(tree)).toContain(colors.borderSubtle);
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

describe('SectionLabel', () => {
  test('forwards accessibility props to the underlying text', () => {
    const tree = create(<SectionLabel accessibilityRole="header">Records</SectionLabel>);
    expect(tree.root.findByProps({ accessibilityRole: 'header' })).toBeTruthy();
  });

  test('supports title-scale section headings from the shared primitive', () => {
    const tree = create(<SectionLabel variant="title">About you</SectionLabel>).toJSON();
    expect(JSON.stringify(tree)).toContain(colors.textPrimary);
  });
});
