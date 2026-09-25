/**
 * WorkoutSummaryScreen.allowRating.test.js
 *
 * Progress-tab audit 2026-09-24, F3 / P3(a), ruled by D200 item 2. Pins
 * the new `allowRating` mode (honoured only together with `readOnly:
 * true`) that ReadinessCards' "Rate your last session" button opens into:
 * stored ratings prefill and count as real, the rating card renders
 * expanded, Close saves ONLY the touched rating keys through the same
 * updateWorkout call the live path uses (never a notes key, never the
 * weekly_checkins sleep write), and every live-only side effect (ambient
 * publish, the share offer, the contextual feedback sheet) stays off
 * exactly as a plain readOnly reopen keeps them off today.
 *
 * A full render, not a source-grep: this file's sibling guard tests
 * (WorkoutSummaryScreen.feedback.guard.test.js and others) pin copy and
 * layout by source text because a full mount was judged not worth it for
 * THOSE narrow findings; this brief's behaviour (prefill, expanded
 * rendering, the exact updateWorkout payload, "never invoked") cannot be
 * pinned that way, so every screen dependency is mocked here instead,
 * following the same isolation convention those suites and
 * ConsistencyScreen.blockProgress.test.js already use.
 */
import { create, act } from 'react-test-renderer';

jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    units: 'kg',
    userProfile: {},
    session: { user: { id: 'u1' } },
    hasUnseenCoachChange: false,
    accessibility: { reduceMotion: true },
  })),
}));

jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/RollingNumber', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children, style }) => <View style={style}>{children}</View>;
});
jest.mock('../../components/BottomSheet', () => () => null);
jest.mock('../../components/TextField', () => () => null);
jest.mock('../../components/PRCelebration', () => ({ MilestoneBurst: () => null }));
jest.mock('../../components/ProgressPhotoPrompt', () => () => null);
// A thin stand-in exposing title/onPress/accessibilityLabel/disabled
// without Button's own PressableCard/Reanimated/haptics machinery, which
// this suite has no need to exercise.
jest.mock('../../components/Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockButton({ title, onPress, accessibilityLabel, disabled }) {
    return (
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        onPress={disabled ? undefined : onPress}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});
// mock-prefixed so Jest's hoisting rules let the factories below close
// over them (standard jest convention for shared spy references).
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
const mockFeedbackOpen = jest.fn();
jest.mock('../../components/FeedbackSheet', () => ({ useFeedback: () => ({ open: mockFeedbackOpen }) }));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getAllWorkouts: jest.fn(),
  updateWorkout: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  saveWeeklyCheckin: jest.fn(),
  saveNextTimeNote: jest.fn(),
  getRoutineWorkoutTonnages: jest.fn(),
  getRoutineById: jest.fn(),
  getWorkoutById: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
  getSessionConstraintEffect: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
}));
jest.mock('../../lib/wellbeing', () => ({ isCalm: jest.fn(() => false), WELLBEING_KEY: '@volyume_wellbeing_mode' }));
jest.mock('../../lib/milestones', () => ({ claimMilestones: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), prAchieved: jest.fn() }));
jest.mock('../../lib/feedback', () => ({ shouldPrompt: jest.fn().mockResolvedValue(false) }));
jest.mock('../../lib/effectiveLandmarks', () => ({ getEffectiveLandmarks: jest.fn().mockResolvedValue(null) }));
jest.mock('../../lib/sync', () => ({ syncWorkout: jest.fn() }));
jest.mock('../../lib/storeReview', () => ({
  incrementSessionCount: jest.fn().mockResolvedValue(undefined),
  shouldPromptReview: jest.fn().mockResolvedValue(false),
  requestReview: jest.fn(),
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/community', () => ({
  loadMe: jest.fn(),
  hasProfile: jest.fn(),
  readCachedMe: jest.fn(),
  readShareSettings: jest.fn(),
  writeShareSettings: jest.fn(),
  publishConsistency: jest.fn(),
  publishAmbientItems: jest.fn(),
  flushPendingAmbientItems: jest.fn(),
  hasSeenSessionShareOffer: jest.fn(),
  recordSessionShareOfferSeen: jest.fn(),
}));

import WorkoutSummaryScreen from '../WorkoutSummaryScreen';
import * as database from '../../lib/database';
import * as community from '../../lib/community';

async function flush() {
  await act(async () => {
    for (let i = 0; i < 25; i++) await Promise.resolve();
  });
}

function buildRoute(extra = {}) {
  return {
    params: {
      workoutId: 'w1', durationMinutes: 45, exerciseCount: 0, setCount: 0,
      workingSetCount: 0, tonnage: 0, exerciseNames: [],
      startedAt: Date.now() - 3600000, endedAt: Date.now() - 3000000,
      routineId: null, routineName: null,
      readOnly: true,
      ...extra,
    },
  };
}

async function renderScreen(routeExtra = {}, navOverrides = {}) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), popToTop: jest.fn(), ...navOverrides };
  const route = buildRoute(routeExtra);
  let tree;
  await act(async () => {
    tree = create(<WorkoutSummaryScreen navigation={navigation} route={route} />);
  });
  await flush();
  return { tree, navigation };
}

// The selected radio's own accessibilityLabel ("<value>, <word label>"),
// or null when the RatingRow shows no selection -- reads the SAME
// accessibilityRole="radiogroup"/"radio" contract RatingRow renders,
// rather than a brittle text search.
function selectedRadioLabel(tree, groupLabel) {
  const group = tree.root.findByProps({ accessibilityRole: 'radiogroup', accessibilityLabel: groupLabel });
  const radios = group.findAllByProps({ accessibilityRole: 'radio' });
  const selected = radios.find((r) => r.props.accessibilityState?.selected);
  return selected ? selected.props.accessibilityLabel : null;
}

function pressRadio(tree, groupLabel, radioLabel) {
  const group = tree.root.findByProps({ accessibilityRole: 'radiogroup', accessibilityLabel: groupLabel });
  const radio = group.findAllByProps({ accessibilityRole: 'radio' }).find((r) => r.props.accessibilityLabel === radioLabel);
  act(() => { radio.props.onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue([]);
  database.getAllWorkouts.mockResolvedValue([]);
  database.getWorkoutSetsForWorkout.mockResolvedValue([]);
  database.getSessionConstraintEffect.mockResolvedValue(null);
  database.getActivePlan.mockResolvedValue(null);
  database.getCurrentMesocycleWeek.mockResolvedValue(null);
  database.updateWorkout.mockResolvedValue(undefined);
});

describe('WorkoutSummaryScreen readOnly + allowRating (D200-2/P3(a))', () => {
  test('stored ratings prefill and count as real, the rating card renders expanded, and Close saves only the touched rating keys with no notes key', async () => {
    database.getWorkoutById.mockResolvedValue({
      id: 'w1', sessionDifficulty: 3, overallPump: 2, jointDiscomfort: 1, fatigueLevel: null,
    });
    const { tree, navigation } = await renderScreen({ allowRating: true });

    // (ii) expanded on open -- the toggle already reads "Hide", and every
    // RatingRow's radiogroup is reachable (it would throw otherwise).
    expect(tree.root.findByProps({ accessibilityLabel: 'Hide workout rating' })).toBeTruthy();

    // (i) prefill: stored answers show as real selections; the field the
    // workout never carried (fatigueLevel) shows no selection at all.
    expect(selectedRadioLabel(tree, 'Difficulty')).toBe('3, Moderate');
    expect(selectedRadioLabel(tree, 'Muscle engagement')).toBe('2, Mild');
    expect(selectedRadioLabel(tree, 'Joint discomfort')).toBe('1, Slight');
    expect(selectedRadioLabel(tree, 'Fatigue')).toBe(null);

    // (iii) a fresh rating change goes through the same rateFeedback path.
    pressRadio(tree, 'Fatigue', '4, High');
    expect(selectedRadioLabel(tree, 'Fatigue')).toBe('4, High');

    // (iv) Close: updateWorkout carries only the touched/stored rating
    // keys (prefill's three plus the one just touched), never notes.
    const doneBtn = tree.root.findByProps({ accessibilityLabel: 'Done' });
    await act(async () => { doneBtn.props.onPress(); });
    await flush();

    expect(database.updateWorkout).toHaveBeenCalledTimes(1);
    expect(database.updateWorkout).toHaveBeenCalledWith('w1', {
      sessionDifficulty: 3, overallPump: 2, jointDiscomfort: 1, fatigueLevel: 4,
    });
    expect(database.saveWeeklyCheckin).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.popToTop).not.toHaveBeenCalled();

    // (v) every live-only side effect stayed off, same as a plain
    // readOnly reopen.
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(community.readShareSettings).not.toHaveBeenCalled();
    expect(community.hasSeenSessionShareOffer).not.toHaveBeenCalled();
    expect(mockFeedbackOpen).not.toHaveBeenCalled();
    expect(database.createAdaptationEvent).not.toHaveBeenCalled();
  });

  test('a save failure shows the existing calm toast/error card and stays on screen (no goBack)', async () => {
    database.getWorkoutById.mockResolvedValue({ id: 'w1' });
    database.updateWorkout.mockRejectedValue(new Error('disk full'));
    const { tree, navigation } = await renderScreen({ allowRating: true });

    const doneBtn = tree.root.findByProps({ accessibilityLabel: 'Done' });
    await act(async () => { doneBtn.props.onPress(); });
    await flush();

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Could not save your session yet. Try Close again.',
      { variant: 'error' },
    );
    expect(tree.root.findByProps({ accessibilityLabel: 'Done' })).toBeTruthy();
  });
});

describe('WorkoutSummaryScreen readOnly alone (no allowRating): unchanged', () => {
  test('the rating card is entirely absent, and Close saves nothing before going straight back', async () => {
    // Even a workout that already carries stored ratings must not surface
    // them here: this mode never renders the card that would show them.
    database.getWorkoutById.mockResolvedValue({ id: 'w1', sessionDifficulty: 3, fatigueLevel: 2 });
    const { tree, navigation } = await renderScreen({});

    expect(() => tree.root.findByProps({ accessibilityLabel: 'Rate this workout' })).toThrow();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Hide workout rating' })).toThrow();

    const doneBtn = tree.root.findByProps({ accessibilityLabel: 'Done' });
    await act(async () => { doneBtn.props.onPress(); });
    await flush();

    expect(database.updateWorkout).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(database.getWorkoutById).not.toHaveBeenCalled();
  });
});
