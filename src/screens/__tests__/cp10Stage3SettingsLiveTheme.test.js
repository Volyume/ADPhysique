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
    // RE-ANCHORED (card sweep, D165 law 2, 2026-09-17): a settings section is
    // a hairline-separated group on the page's ground now, not a filled box,
    // so the live colour it carries is the hairline's. The contract this case
    // pins -- fresh colours from the live theme, no remount -- is unchanged.
    expect(captured.section.borderTopColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.borderSubtle);
    const darkRule = captured.section.borderTopColor;

    // Flip the SAME store, without unmounting/re-requiring anything -- the
    // still-mounted Probe re-renders and `captured` is overwritten in place,
    // same "restart-free" contract as Card.test.js / cp10Stage1LiveTheme.
    setTheme('light');
    expect(captured.section.borderTopColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.borderSubtle);
    expect(captured.section.borderTopColor).not.toBe(darkRule);
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
    // RE-ANCHORED (card sweep, D165 law 2, 2026-09-17): the section used to be
    // found by its card radius; it has none now. It is the group carrying the
    // hairline in the dark theme's borderSubtle, and the live contract is that
    // the hairline recolours on the flip.
    const darkRule = theme.resolveTheme({ theme: 'dark' }).colors.borderSubtle;
    const sections = tree.root.findAll(
      (n) => typeof n.type !== 'string' && n.props.style && Array.isArray(n.props.style)
        && StyleSheet.flatten(n.props.style).borderTopColor === darkRule,
    );
    // Fall back to any host View carrying the section's hairline if the
    // composite-node search above finds nothing (react-test-renderer host
    // nodes use string types).
    const hostSections = tree.root.findAll(
      (n) => n.props.style && StyleSheet.flatten(n.props.style).borderTopColor === darkRule,
    );
    const target = sections.length ? sections[0] : hostSections[0];
    expect(target).toBeTruthy();
    expect(flat(target).borderTopColor).toBe(darkRule);

    setTheme('light');
    const lightRule = flat(target).borderTopColor;
    expect(lightRule).toBe(theme.resolveTheme({ theme: 'light' }).colors.borderSubtle);
    expect(lightRule).not.toBe(darkRule);
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
    // RE-ANCHORED (D174 amber sweep): this row's glyph was `colors.primary` and
    // is `colors.textSecondary` now -- a settings-list icon is wayfinding, not
    // a state, so it sits outside amber discipline 1's ceiling. THIS SUITE'S
    // INTENT IS UNCHANGED and is not about the amber: it proves the colour is
    // read from the LIVE theme and flips on a preference change with no
    // remount. It still proves exactly that, on the token the row now uses.
    const icon = tree.root.findByProps({ name: 'nutrition-outline' });
    const darkColor = icon.props.color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textSecondary);

    setTheme('light');
    const lightColor = tree.root.findByProps({ name: 'nutrition-outline' }).props.color;
    expect(lightColor).not.toBe(darkColor);
    expect(lightColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textSecondary);
    act(() => { tree.unmount(); });
  });
});
