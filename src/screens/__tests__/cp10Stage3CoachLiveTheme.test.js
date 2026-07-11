/**
 * CP-10 stage 3, Coach-half batch (campaign item 1, docs/ux-world-class-
 * audit-2026-07-09/CAMPAIGN-2026-07-10-APPROVED-SLATE.md item 1; theming
 * plan CP-10-restart-free-theming-plan.md): pins the "restart-free -- flips
 * live on the SAME mounted instance, no remount" contract for the five
 * Coach screens + CoachDailyBrief migrated onto useTheme()/buildLiveStyles
 * in commit 0ac5de9, following the exact pattern already established by
 * src/components/__tests__/cp10Stage3HomeLiveTheme.test.js and
 * src/screens/__tests__/cp10Stage3WorkoutShellsLiveTheme.test.js: real
 * useAppStore (not mocked) + a `setTheme()` helper that flips
 * accessibility.theme via setState, asserting a themed element's flattened
 * style changes on the SAME tree with no unmount/remount in between.
 *
 * Every one of the four renderable screens below shares one universal
 * representative element -- the top-level `<SafeAreaView style={[styles.safe,
 * live.safe]}>` every screen state (loading/error/empty/loaded) renders
 * through, with buildLiveStyles' `safe: { backgroundColor: t.colors.background }`
 * -- so the loading state (the screen's first synchronous render, before any
 * async load resolves) is enough to pin the contract without needing a full
 * data-fixture render of every branch. CoachDailyBrief has no SafeAreaView
 * (it is a nested strip, not a screen), so its own outer wrap View stands in.
 *
 * CoachOutputScreen (3,470 lines) is NOT mounted here. It cannot be safely
 * require'd/rendered in Jest without a live zustand store deep enough to
 * satisfy every hook the module calls on import (no existing mock scaffold
 * covers this -- see CoachOutputScreen.trainingPlanLink.test.js's header
 * comment and CoachOutputScreen.profileMerge.guard.test.js /
 * progressScanCoachIsolation.guard.test.js, which pin this exact screen's
 * contracts by reading the raw source instead of rendering it). Its
 * live-theme contract is pinned the same way below: a source-guard check
 * that its loading-state SafeAreaView carries the live style append and that
 * buildLiveStyles' `safe` key is genuinely derived from the live `t.colors`
 * (not the frozen static import), for both of its early-return SafeAreaViews
 * (loading and load-error).
 */
jest.mock('../../lib/database', () => ({
  getBlockReflectionData: jest.fn(() => new Promise(() => {})), // never resolves: stays in the loading branch
  getAllWorkouts: jest.fn(() => new Promise(() => {})),
  getCompletedWorkoutSets: jest.fn(() => Promise.resolve([])),
  getAllExercises: jest.fn(() => Promise.resolve([])),
  getRecentCheckins: jest.fn(() => Promise.resolve([])),
  saveWeeklyCheckin: jest.fn(async () => 'row-1'),
  getLatestCheckin: jest.fn(async () => null),
  getMorningWeightsLast14Days: jest.fn(() => new Promise(() => {})),
  getWeeklySessionStats: jest.fn(async () => ({ completed: 0, planned: 0 })),
  getWeeklyPRCount: jest.fn(async () => 0),
  getWeeklyVolumeByMuscle: jest.fn(async () => []),
  getNutritionTargets: jest.fn(async () => null),
  getUserBodyProfile: jest.fn(async () => ({ sex: 'male' })),
  getCardioLogRange: jest.fn(async () => []),
  activityDayKey: jest.fn((ms) => new Date(ms ?? Date.now()).toISOString().slice(0, 10)),
  getLatestCoachOutput: jest.fn(async () => null),
}));
jest.mock('../../lib/notifications', () => ({
  requestNotificationPermissions: jest.fn(async () => {}),
  getNotificationPermissionStatus: jest.fn(async () => 'granted'),
  scheduleNextCheckinReminder: jest.fn(async () => {}),
  scheduleWeeklyCoachReady: jest.fn(async () => {}),
  scheduleMissedCheckinFollowups: jest.fn(async () => {}),
}));
jest.mock('../../lib/food/db', () => ({
  getRollupsForRange: jest.fn(async () => []),
  getPlannedDaysInRange: jest.fn(async () => []),
  confirmPlannedDay: jest.fn(async () => {}),
}));
jest.mock('../../lib/cyclePrefs', () => ({
  getCycleTracking: jest.fn(async () => false),
  shouldShowCycleQuestion: jest.fn(() => false),
}));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));
jest.mock('../../lib/progressScanStore', () => ({ getProgressScanCoachSummary: jest.fn(() => new Promise(() => {})) }));
jest.mock('../../lib/progressScanCoachResolver', () => ({ resolveProgressScanCoachNote: jest.fn(() => null) }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../components/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress }) => (
    <TouchableOpacity accessibilityLabel={title} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), getParent: jest.fn() }),
}));

const fs = require('fs');
const path = require('path');
import { create, act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import * as theme from '../../styles/theme';
import MethodologyScreen from '../MethodologyScreen';
import BlockReflectionScreen from '../BlockReflectionScreen';
import CoachReviewScreen from '../CoachReviewScreen';
import WeeklyCheckInScreen from '../WeeklyCheckInScreen';
import CoachDailyBrief from '../../components/CoachDailyBrief';
import { buildCoachLedger } from '../../lib/coachLedger';

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

const nav = { navigate: jest.fn(), goBack: jest.fn() };

describe('CP-10 stage 3 (Coach half): flips live, no remount', () => {
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' }, units: 'kg', userProfile: { sex: 'male' }, bodyWeightUnits: 'kg' });
  });

  test('MethodologyScreen: SafeAreaView background flips live on the same mounted instance', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<MethodologyScreen route={{ params: {} }} />); });
    const safe = tree.root.findByType('SafeAreaView');
    const darkBg = flat(safe).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.background);

    setTheme('light');
    const lightBg = flat(tree.root.findByType('SafeAreaView')).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(lightBg).toBe(theme.resolveTheme({ theme: 'light' }).colors.background);
    act(() => { tree.unmount(); });
  });

  test('BlockReflectionScreen: SafeAreaView background flips live on the same mounted instance (loading state)', () => {
    setTheme('dark');
    let tree;
    act(() => {
      tree = create(
        <BlockReflectionScreen navigation={nav} route={{ params: { mesocycleId: 'm1' } }} />,
      );
    });
    const safe = tree.root.findByType('SafeAreaView');
    const darkBg = flat(safe).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.background);

    setTheme('light');
    const lightBg = flat(tree.root.findByType('SafeAreaView')).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(lightBg).toBe(theme.resolveTheme({ theme: 'light' }).colors.background);
    act(() => { tree.unmount(); });
  });

  test('CoachReviewScreen: SafeAreaView background flips live on the same mounted instance (loading state)', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<CoachReviewScreen />); });
    const safe = tree.root.findByType('SafeAreaView');
    const darkBg = flat(safe).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.background);

    setTheme('light');
    const lightBg = flat(tree.root.findByType('SafeAreaView')).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(lightBg).toBe(theme.resolveTheme({ theme: 'light' }).colors.background);
    act(() => { tree.unmount(); });
  });

  test('WeeklyCheckInScreen: SafeAreaView background flips live on the same mounted instance (loading state)', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<WeeklyCheckInScreen navigation={nav} />); });
    const safe = tree.root.findByType('SafeAreaView');
    const darkBg = flat(safe).backgroundColor;
    expect(darkBg).toBe(theme.resolveTheme({ theme: 'dark' }).colors.background);

    setTheme('light');
    const lightBg = flat(tree.root.findByType('SafeAreaView')).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(lightBg).toBe(theme.resolveTheme({ theme: 'light' }).colors.background);
    act(() => { tree.unmount(); });
  });

  test('CoachDailyBrief: runway title ink flips live on the same mounted instance', () => {
    setTheme('dark');
    const ledger = buildCoachLedger({
      weighIns7d: 2,
      completedSessions: 1,
      firstWeightAt: Date.now() - 200 * 86400000,
      checkinDay: 0,
      now: Date.now(),
    });
    let tree;
    act(() => { tree = create(<CoachDailyBrief ledger={ledger} />); });
    const title = tree.root.findByProps({ children: 'Since your check-in' });
    const darkColor = flat(title).color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textMuted);

    setTheme('light');
    const lightColor = flat(tree.root.findByProps({ children: 'Since your check-in' })).color;
    expect(lightColor).not.toBe(darkColor);
    expect(lightColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textMuted);
    act(() => { tree.unmount(); });
  });
});

describe('CP-10 stage 3 (Coach half): CoachOutputScreen source guard', () => {
  // CoachOutputScreen cannot be safely mounted in this suite (see the file
  // header comment above); pin its live-theme wiring by reading the source,
  // the same convention CoachOutputScreen.trainingPlanLink.test.js and the
  // profileMerge/progressScanCoachIsolation guard tests already use for this
  // exact screen.
  const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

  test('both early-return SafeAreaViews (loading, load-error) carry the live style append', () => {
    const loadingBlock = SCREEN.slice(SCREEN.indexOf('// ── Loading state'), SCREEN.indexOf('// ── Load error state'));
    expect(loadingBlock).toMatch(/<SafeAreaView style=\{\[styles\.safe, live\.safe\]\}/);

    const errorStart = SCREEN.indexOf('// ── Load error state');
    const errorBlock = SCREEN.slice(errorStart, SCREEN.indexOf('// ── Insufficient data state'));
    expect(errorBlock).toMatch(/<SafeAreaView style=\{\[styles\.safe, live\.safe\]\}/);
  });

  test('buildLiveStyles derives `safe` from the live t.colors, not the frozen static import', () => {
    const fnStart = SCREEN.indexOf('function buildLiveStyles(t) {');
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = SCREEN.indexOf('\n}', fnStart);
    const fnBody = SCREEN.slice(fnStart, fnEnd);
    expect(fnBody).toMatch(/safe:\s*\{\s*backgroundColor:\s*t\.colors\.background\s*\}/);
  });

  test('the top-level screen calls useTheme() and memoises the derived live styles', () => {
    expect(SCREEN).toMatch(/const t = useTheme\(\);\s*\n\s*const live = useMemo\(\(\) => buildLiveStyles\(t\), \[t\]\);/);
  });
});
