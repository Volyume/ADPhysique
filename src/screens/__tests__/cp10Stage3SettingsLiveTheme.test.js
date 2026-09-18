/**
 * CP-10 stage 3, Settings-family batch (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md): pins the settingsStyles unfreeze
 * (`useSettingsStyles()`, src/components/SettingsPrimitives.js) and a sample
 * of the ~14 Settings sub-screens that consume it directly, following the
 * same "restart-free -- flips live on the SAME mounted instance, no remount"
 * pattern as src/components/__tests__/cp10Stage1LiveTheme.test.js and
 * cp10Stage2LiveChrome.test.js.
 *
 * Not exhaustive over every converted screen (that would duplicate near-
 * identical assertions 14 times); this covers the shared hook/page chrome
 * plus one screen that reads settingsStyles.* raw (bypassing SettingRow,
 * SettingsAccountScreen) and one screen with its own colour-bearing local
 * styles (SettingsDietaryScreen), which are the two shapes every other
 * converted screen in this batch repeats.
 */
import { create, act } from 'react-test-renderer';
import { Text, StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import { useSettingsStyles, SettingsPage } from '../../components/SettingsPrimitives';
import SettingsAccountScreen from '../SettingsAccountScreen';
import SettingsDietaryScreen from '../SettingsDietaryScreen';
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
jest.mock('../../hooks/useAccountActions', () => () => ({
  signingOut: false, deletingAccount: false, handleSignOut: jest.fn(), handleDeleteAccount: jest.fn(),
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

describe('CP-10 stage 3 (Settings family): useSettingsStyles() flips live, no remount', () => {
  test('useSettingsStyles() itself derives fresh colours from the live theme', () => {
    setTheme('dark');
    let captured;
    function Probe() {
      captured = useSettingsStyles();
      return null;
    }
    let tree;
    act(() => { tree = create(<Probe />); });
    expect(captured.section.backgroundColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.surface);
    const darkBg = captured.section.backgroundColor;

    // Flip the SAME store, without unmounting/re-requiring anything -- the
    // still-mounted Probe re-renders and `captured` is overwritten in place,
    // same "restart-free" contract as Card.test.js / cp10Stage1LiveTheme.
    setTheme('light');
    expect(captured.section.backgroundColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.surface);
    expect(captured.section.backgroundColor).not.toBe(darkBg);
    act(() => { tree.unmount(); });
  });

  test('SettingsPage: page background flips light<->dark on the same mounted instance', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<SettingsPage title="Test"><Text>body</Text></SettingsPage>); });
    const safeArea = tree.root.findAll(
      (n) => Array.isArray(n.props.edges) && n.props.edges.includes('top') && n.props.style,
    )[0];
    const darkBg = flat(safeArea).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.background);

    setTheme('light');
    const lightBg = flat(safeArea).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(lightBg).toBe(theme.resolveTheme({ theme: 'light' }).colors.background);
    act(() => { tree.unmount(); });
  });

  test('SettingsAccountScreen: reads settingsStyles.section directly (bypassing SettingRow) and still flips live', () => {
    setTheme('dark');
    useAppStore.setState({ user: { id: 'u1', email: 'a@b.com' }, tier: 'free' });
    let tree;
    act(() => { tree = create(<SettingsAccountScreen navigation={{ navigate: jest.fn() }} />); });
    const sections = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.style && Array.isArray(n.props.style)
        && StyleSheet.flatten(n.props.style).borderRadius === theme.radius.lg,
    );
    // Fall back to any host View carrying the section's borderRadius if the
    // composite-node search above finds nothing (react-test-renderer host
    // nodes use string types).
    const hostSections = tree.root.findAll(
      (n) => n.props.style && StyleSheet.flatten(n.props.style).borderRadius === theme.radius.lg,
    );
    const target = sections.length ? sections[0] : hostSections[0];
    const darkBg = flat(target).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.surface);

    setTheme('light');
    const lightBg = flat(target).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    act(() => { tree.unmount(); });
  });

  test('SettingsDietaryScreen: its own liveText (Ionicons colour) flips live', () => {
    setTheme('dark');
    useAppStore.setState({
      userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: [] },
      setDietPreference: jest.fn(),
      setAllergenExcludes: jest.fn(),
      removeMealPlanExcludedFood: jest.fn(),
    });
    let tree;
    act(() => { tree = create(<SettingsDietaryScreen />); });
    const icon = tree.root.findByProps({ name: 'nutrition-outline' });
    const darkColor = icon.props.color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.primary);

    setTheme('light');
    const lightColor = tree.root.findByProps({ name: 'nutrition-outline' }).props.color;
    expect(lightColor).not.toBe(darkColor);
    expect(lightColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.primary);
    act(() => { tree.unmount(); });
  });
});
