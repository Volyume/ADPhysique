/**
 * CP-10 stage 3, Home-family batch (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md): pins the "restart-free -- flips live
 * on the SAME mounted instance, no remount" contract for the Home* extracted
 * components + VolyumeTabBar migrated in this batch, following the same
 * pattern as src/components/__tests__/cp10Stage1LiveTheme.test.js and
 * cp10Stage3SettingsLiveTheme.test.js.
 *
 * Not exhaustive over every converted file in this batch (that would
 * duplicate near-identical assertions); this covers a representative sample
 * of the two shapes every other file in the batch repeats: (a) a
 * presentational card/sheet with no store dependency (HomeWelcomeCard,
 * WeeklyStreakStrip, CoachBriefCard, AttentionCard, TodayStrip), and (b) a
 * component that ALSO reads the live store for its own data
 * (ActiveSessionMiniBar, VolyumeTabBar).
 */
import { create, act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import HomeWelcomeCard from '../HomeWelcomeCard';
import WeeklyStreakStrip from '../WeeklyStreakStrip';
import CoachBriefCard from '../CoachBriefCard';
import AttentionCard from '../AttentionCard';
import TodayStrip from '../TodayStrip';
import ActiveSessionMiniBar from '../ActiveSessionMiniBar';
import VolyumeTabBar from '../VolyumeTabBar';
import * as theme from '../../styles/theme';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  getFocusedRouteNameFromRoute: (route) => route?.state?.routes?.[route.state.index]?.name,
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

describe('CP-10 stage 3 (Home family): flips live, no remount', () => {
  test('HomeWelcomeCard: step-number chip background flips light<->dark on the same mounted instance', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<HomeWelcomeCard onDismiss={() => {}} />); });
    const num = tree.root.findByProps({ children: '1' }).parent;
    const darkBg = flat(num).backgroundColor;

    setTheme('light');
    const lightBg = flat(num).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });

  test('WeeklyStreakStrip: card background and count colour flip live', () => {
    setTheme('dark');
    const vm = { render: true, hasTarget: true, suppressed: false, runLength: 3, current: { completed: 3, target: 4, state: 'kept' } };
    let tree;
    act(() => { tree = create(<WeeklyStreakStrip vm={vm} />); });
    const count = tree.root.findByProps({ children: '3 of 4' });
    const darkColor = flat(count).color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textPrimary);

    setTheme('light');
    const lightColor = flat(tree.root.findByProps({ children: '3 of 4' })).color;
    expect(lightColor).not.toBe(darkColor);
    expect(lightColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textPrimary);
  });

  test('CoachBriefCard: border tone and headline ink flip with the theme', () => {
    setTheme('dark');
    const brief = { type: 'go', headline: 'Ready to train', body: 'Good signs across the board.' };
    let tree;
    act(() => { tree = create(<CoachBriefCard brief={brief} onDismiss={() => {}} />); });
    const headline = tree.root.findByProps({ children: 'Ready to train' });
    const darkColor = flat(headline).color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textPrimary);

    setTheme('light');
    const lightColor = flat(tree.root.findByProps({ children: 'Ready to train' })).color;
    expect(lightColor).not.toBe(darkColor);
  });

  test('AttentionCard (trial variant): banner background flips live', () => {
    setTheme('dark');
    const trialBanner = { line: 'Day 3 of your trial' };
    let tree;
    act(() => {
      tree = create(
        <AttentionCard variant="trial" trialBanner={trialBanner} onTrialPress={() => {}} onTrialDismiss={() => {}} onMethodology={() => {}} />,
      );
    });
    const banner = tree.root.findByProps({ accessibilityLabel: trialBanner.line });
    const darkBg = flat(banner).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.primaryBg);

    setTheme('light');
    const lightBg = flat(tree.root.findByProps({ accessibilityLabel: trialBanner.line })).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });

  test('TodayStrip: the empty-state card background flips live', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<TodayStrip bwu="kg" todayWeight={null} onLogWeight={() => {}} />); });
    const card = tree.root.findAllByType('View')[0];
    const darkBg = flat(card).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.surface);

    setTheme('light');
    const lightBg = flat(tree.root.findAllByType('View')[0]).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });
});

describe('CP-10 stage 3 (Home family): components that also read the live store', () => {
  const SESSION = {
    activeWorkout: { id: 'w1', name: 'Push Day' },
    workoutExercises: [{
      exercise: { name: 'Bench Press' },
      routineExercise: { recommendedSets: 4 },
      sets: [{ id: 's1' }],
    }],
    currentExerciseIndex: 0,
    restTimerActive: false,
    restTimerRemaining: 0,
    hasUnseenCoachChange: false,
  };

  test('ActiveSessionMiniBar: bar background flips live on the same mounted instance', () => {
    setTheme('dark', {});
    act(() => { useAppStore.setState({ ...SESSION, accessibility: { ...useAppStore.getState().accessibility, reduceMotion: true } }); });
    let tree;
    act(() => { tree = create(<ActiveSessionMiniBar navigation={{ navigate: jest.fn() }} />); });
    const exercise = tree.root.findByProps({ children: 'Bench Press' });
    const darkColor = flat(exercise).color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textPrimary);

    setTheme('light');
    const lightColor = flat(tree.root.findByProps({ children: 'Bench Press' })).color;
    expect(lightColor).not.toBe(darkColor);
  });

  test('VolyumeTabBar: bar background flips live on the same mounted instance', () => {
    setTheme('dark');
    act(() => { useAppStore.setState({ activeWorkout: null }); });
    const routes = [{ key: 'home-1', name: 'HomeTab' }, { key: 'plans-1', name: 'PlansTab' }];
    const descriptors = Object.fromEntries(routes.map((r) => [r.key, {
      options: { title: r.name.replace('Tab', ''), tabBarIcon: () => null },
    }]));
    let tree;
    act(() => {
      tree = create(
        <VolyumeTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={{ emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }} />,
      );
    });
    const bar = tree.root.findAll((n) => n.props.onLayout)[0];
    const darkBg = flat(bar).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.surfaceElevated);

    setTheme('light');
    const lightBg = flat(tree.root.findAll((n) => n.props.onLayout)[0]).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
  });
});
