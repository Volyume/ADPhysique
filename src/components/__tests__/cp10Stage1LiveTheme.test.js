/**
 * CP-10 stage 1 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md): pins that every primitive migrated in
 * this stage — Button, TextField, Toast, Chip, SettingsPrimitives'
 * SettingRow, Skeleton (+SkeletonCard), ScreenHeader, BackHeader, ModalHeader
 * — follows the useAppStore accessibility slice LIVE, with no remount and no
 * app restart, generalising the Card.test.js "restart-free" pattern
 * (src/components/__tests__/Card.test.js) to the rest of Stage 1's file
 * list. Card itself already has its own dedicated per-theme suite; this file
 * is the shared, mechanical pass over the remaining primitives so each one
 * gets at least one live-flip assertion.
 *
 * Not covered here: BottomSheet.js (excluded from this task — a concurrent
 * agent is adopting @gorhom/bottom-sheet on that file) and PressableCard.js
 * (no colour/fontSize token usage at all — nothing to migrate, see the
 * CP-10 stage 1 completion notes).
 */
import { create, act } from 'react-test-renderer';
import { Text, StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import Button from '../Button';
import TextField from '../TextField';
import Chip from '../Chip';
import { SkeletonCard } from '../Skeleton';
import ScreenHeader from '../ScreenHeader';
import BackHeader from '../BackHeader';
import ModalHeader from '../ModalHeader';
import { SettingRow } from '../SettingsPrimitives';
import { ToastProvider, useToast } from '../Toast';
import * as theme from '../../styles/theme';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

function setTheme(themeName, extra = {}) {
  act(() => {
    useAppStore.setState({
      accessibility: {
        ...useAppStore.getState().accessibility,
        theme: themeName,
        higherContrast: false,
        colorBlindSafe: false,
        largerText: false,
        ...extra,
      },
    });
  });
}

function flat(node) {
  return StyleSheet.flatten(node.props.style);
}

describe('CP-10 stage 1: migrated primitives flip live, no remount', () => {
  test('Button: primary fill colour flips light<->dark on the same mounted instance', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<Button title="Save" onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    const darkBg = flat(pressable).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.primaryFill);

    setTheme('light');
    const lightBg = flat(pressable).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });

  test('TextField: border colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<TextField label="Name" value="" onChangeText={() => {}} />); });
    const label = tree.root.findAllByType(Text).find((n) => n.props.children === 'Name');
    // The field View is the sibling wrapping the TextInput; walk up from label's parent (container).
    const container = label.parent;
    const fieldView = container.children[1];
    const darkBorder = flat(fieldView).borderColor;

    setTheme('light');
    const lightBorder = flat(fieldView).borderColor;
    expect(lightBorder).not.toBe(darkBorder);
  });

  test('Chip: selected fill colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<Chip label="Bulk" selected onPress={() => {}} />); });
    const pressable = tree.root.findByProps({ accessibilityRole: 'button' });
    const darkBg = flat(pressable).backgroundColor;

    setTheme('light');
    const lightBg = flat(pressable).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });

  test('SettingRow: icon backing colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => {
      tree = create(<SettingRow icon="person" label="Profile" onPress={() => {}} />);
    });
    const label = tree.root.findAllByType(Text).find((n) => n.props.children === 'Profile');
    const darkColor = flat(label).color;

    setTheme('light');
    const lightColor = flat(label).color;
    expect(lightColor).not.toBe(darkColor);
  });

  test('Skeleton / SkeletonCard: fill colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<SkeletonCard />); });
    const json = tree.toJSON();
    const darkBg = flat(json).backgroundColor;

    setTheme('light');
    const lightBg = flat(tree.toJSON()).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });

  test('ScreenHeader: title colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<ScreenHeader title="Today" />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Today');
    const darkColor = flat(title).color;

    setTheme('light');
    const lightColor = flat(title).color;
    expect(lightColor).not.toBe(darkColor);
  });

  test('BackHeader: title colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<BackHeader title="Details" />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Details');
    const darkColor = flat(title).color;

    setTheme('light');
    const lightColor = flat(title).color;
    expect(lightColor).not.toBe(darkColor);
  });

  test('ModalHeader: title colour flips on a theme change with no remount', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<ModalHeader title="Choose date" onClose={() => {}} />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Choose date');
    const darkColor = flat(title).color;

    setTheme('light');
    const lightColor = flat(title).color;
    expect(lightColor).not.toBe(darkColor);
  });

  describe('Toast', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

    test('a NEW toast created after a theme flip uses the current tint (DEFAULTS is not stale)', () => {
      setTheme('dark');
      function Probe() {
        const toast = useToast();
        return (
          <Text onPress={() => toast.show('hi', { variant: 'info' })} testID="fire">fire</Text>
        );
      }
      let tree;
      act(() => {
        tree = create(
          <ToastProvider>
            <Probe />
          </ToastProvider>,
        );
      });

      setTheme('light');
      act(() => { tree.root.findByProps({ testID: 'fire' }).props.onPress(); });

      const toastText = tree.root.findAllByType(Text).find((n) => n.props.children === 'hi');
      // The toast's icon colour is current.tint, sourced from a FRESH
      // DEFAULTS built off the (now light) theme's colors.primary — not a
      // frozen import-time value.
      const iconColorHolder = toastText.parent.parent.findByType(
        require('@expo/vector-icons/Ionicons'),
      );
      expect(iconColorHolder.props.color).toBe(theme.resolveTheme({ theme: 'light' }).colors.primary);
      act(() => { tree.unmount(); });
    });
  });
});
