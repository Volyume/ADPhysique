/**
 * CP-10 stage 3, workout-shells FINAL batch (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md): pins the "restart-free -- flips live
 * on the SAME mounted instance, no remount" contract for the two remaining
 * giant screen shells, ActiveWorkoutScreen.js and WorkoutSummaryScreen.js,
 * following the same pattern as src/components/__tests__/cp10Stage1LiveTheme.
 * test.js, cp10Stage3HomeLiveTheme.test.js and cp10Stage3SettingsLiveTheme.
 * test.js.
 *
 * Both screens have a wide live dependency surface (SQLite, notifications,
 * Live Activity, haptics -- see e.g. ActiveWorkoutScreen.nextExerciseButton.
 * guard.test.js's own header comment on why its own suite reads source
 * rather than mounting), so importing either module at all requires the
 * same mock surface src/__tests__/screen-mount.test.js already established
 * for mounting these two screens; the subset below is copied from there
 * (mocks only what these two screens' own import graphs actually need, not
 * the widest surface in that file).
 *
 * Rather than mount the whole screen, this pins ONE representative element
 * per screen, each exported specifically for this purpose (see the "Named
 * export" comments at their definitions):
 *   - LoggedSetRow (src/components/workout/LoggedSetRow.js since the D43 S1
 *     extraction; ActiveWorkoutScreen.js re-exports it): pure props-in/
 *     JSX-out, no store dependency at all.
 *   - StatBox (WorkoutSummaryScreen.js): one store field (reduceMotion) plus
 *     primitive props.
 *
 * Every other element in both files follows the exact same
 * `const t = useTheme(); const live = buildLiveStyles(t);` +
 * `style={[styles.KEY, live.KEY]}` mechanism pinned here, so this is not
 * exhaustive over every converted line (that would duplicate near-identical
 * assertions hundreds of times) -- it is the generalising sample, same as
 * the other cp10Stage3*LiveTheme test files.
 */
jest.mock('expo-sqlite');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-application');
jest.mock('expo-constants');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
  })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
}));

// Local native modules referenced by package.json file: deps.
jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));

jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

jest.mock('../../components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
});

import { create, act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
// Re-pinned for D43 S1 extraction: LoggedSetRow moved out of
// ActiveWorkoutScreen.js into src/components/workout/LoggedSetRow.js (pure
// extraction, no behaviour/visual change). ActiveWorkoutScreen.js still
// re-exports it (`export { LoggedSetRow };`), but this suite now imports the
// real module directly.
import { LoggedSetRow } from '../../components/workout/LoggedSetRow';
import { StatBox } from '../WorkoutSummaryScreen';
import * as theme from '../../styles/theme';

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

describe('CP-10 stage 3 (workout shells FINAL batch): flips live, no remount', () => {
  test('ActiveWorkoutScreen/LoggedSetRow: row background and chevron ink flip live on the same mounted instance', () => {
    setTheme('dark');
    const set = { id: 's1', weight: 100, actualReps: 8, setType: 'straight', leftReps: null, rightReps: null };
    let tree;
    act(() => {
      tree = create(
        <LoggedSetRow set={set} units="kg" progressNum={1} exerciseType="weight_reps" onEdit={() => {}} />,
      );
    });
    // Phase 2B re-anchor: the row's own surface fill is deliberately GONE
    // (a completed set is a quiet line, not a container), so the live-flip
    // contract is pinned on the inks that remain: the set text and the
    // chevron. Same mounted instance, no remount.
    const rowText = tree.root.findByProps({ numberOfLines: 1 });
    const darkInk = flat(rowText).color;
    expect(darkInk).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textPrimary);
    const chevron = tree.root.findByProps({ name: 'chevron-forward' });
    const darkChevron = chevron.props.color;
    expect(darkChevron).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textMuted);

    setTheme('light');
    const lightInk = flat(tree.root.findByProps({ numberOfLines: 1 })).color;
    expect(lightInk).not.toBe(darkInk);
    expect(lightInk).toBe(theme.resolveTheme({ theme: 'light' }).colors.textPrimary);
    const lightChevron = tree.root.findByProps({ name: 'chevron-forward' }).props.color;
    expect(lightChevron).not.toBe(darkChevron);
    act(() => { tree.unmount(); });
  });

  // RE-ANCHORED 2026-09-17 (D186): D165 law 2 (a number is not an object)
  // removed StatBox's own fill/corner/border -- the tile no longer carries a
  // `borderColor` at all, so "the box background flips live" has nothing
  // left to find (the hairline moved to the parent statsGrid row, outside
  // this standalone mount). Same pattern as LoggedSetRow's own re-anchor
  // above ("the row's own surface fill is deliberately GONE ... the
  // live-flip contract is pinned on the inks that remain"): the icon ink
  // flip stays, the label ink flip stands in for the box, and a new
  // assertion pins the absence itself so a reverted sweep is caught.
  test('WorkoutSummaryScreen/StatBox: icon and label ink flip live on the same mounted instance; the tile itself carries no fill or border', () => {
    setTheme('dark', { reduceMotion: true });
    let tree;
    act(() => {
      tree = create(<StatBox icon="stats-chart-outline" value="8,432 kg" label="Total volume" />);
    });
    const icon = tree.root.findByProps({ name: 'stats-chart-outline' });
    const darkIconColor = icon.props.color;
    expect(darkIconColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textSecondary);
    const label = tree.root.findByProps({ children: 'Total volume' });
    const darkLabelColor = flat(label).color;
    expect(darkLabelColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textSecondary);
    // D186: no node in the tile carries a borderColor any more -- the fill,
    // corner and border are gone outright, not just re-coloured.
    expect(tree.root.findAll((n) => n.props.style && StyleSheet.flatten(n.props.style).borderColor).length).toBe(0);

    setTheme('light', { reduceMotion: true });
    const lightIconColor = tree.root.findByProps({ name: 'stats-chart-outline' }).props.color;
    expect(lightIconColor).not.toBe(darkIconColor);
    expect(lightIconColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textSecondary);
    const lightLabelColor = flat(tree.root.findByProps({ children: 'Total volume' })).color;
    expect(lightLabelColor).not.toBe(darkLabelColor);
    expect(lightLabelColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textSecondary);
    act(() => { tree.unmount(); });
  });
});
