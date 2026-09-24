/**
 * WorkoutHistoryScreen.progressAudit20260924.test.js
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass).
 *
 * A3: a user with more than 50 completed sessions used to see a wrong
 * header total (workouts.length, capped at the loaded 50-row page) and an
 * older calendar month with no trained-day dots (LB-7 bounds the list to
 * the most recent 50; the calendar inherited that bound with nothing to
 * correct it). Pins: (a) the header shows the TRUE completed count
 * (getCompletedWorkoutCount), falling back to the loaded length only when
 * that read is unavailable; (b) "Show more" pages forward with a keyset
 * cursor ({ attributedAt, id }, not a plain timestamp -- a tie on the exact
 * millisecond would otherwise skip a session) and appends; (c) (reworked
 * per lead review) the calendar's trained-day dots and the card list under
 * it come from the SAME month-range read (getCompletedWorkoutsBetween,
 * full rows), so a dotted day always has a matching card and vice versa --
 * the first version of this fix read day-keys only, which could dot a day
 * with no session actually loaded for the list under it.
 *
 * A4: the history tonnage chip passed no exercise-type map to
 * calculateTonnage, so a distance/duration exercise's metres x seconds were
 * added as kilograms. Pins that exerciseTypeById (built from allExercises,
 * same shape LiftProgressScreen.js builds) now excludes them.
 *
 * A5: the collapsed row's accessibilityLabel exposed only the expand state,
 * dropping the visible duration and set-count chips from screen readers.
 * Pins that the label now carries both, in the same wording.
 */
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/PeekMenu', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../components/BackHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ title }) => React.createElement(Text, null, title);
});
jest.mock('../../components/PressableCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('../../components/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('../../components/Chip', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ label, onPress, accessibilityLabel, accessibilityRole }) => (
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityLabel, accessibilityRole },
      React.createElement(Text, null, label),
    )
  );
});
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, accessibilityLabel, loading }) => (
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityLabel, accessibilityState: { busy: !!loading } },
      React.createElement(Text, null, title),
    )
  );
});
jest.mock('../../components/Illustrations', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { EmptyWorkoutsIllustration: () => React.createElement(Text, null, 'empty illustration') };
});
jest.mock('../../components/Skeleton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { SkeletonRow: () => React.createElement(Text, null, 'loading row') };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AnimatedEntrance', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
// A3(b)/A4/A5: unlike the loadState.test.js mock (which only needs the
// header/empty text and never inspects an individual row), this one also
// renders ListFooterComponent AND actually calls renderItem per row --
// needed to reach into a card's own accessibilityLabel and tonnage text.
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data = [], renderItem, keyExtractor, ListEmptyComponent, ListHeaderComponent, ListFooterComponent, refreshControl,
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(
      View,
      { refreshControl },
      ListHeaderComponent,
      data.length === 0
        ? ListEmptyComponent
        : data.map((item, index) => React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, index }),
        )),
      ListFooterComponent,
    );
  },
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' }, startWorkout: jest.fn(), session: null, units: 'kg',
  })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/database', () => ({
  getRecentCompletedWorkouts: jest.fn(),
  getCompletedWorkoutCount: jest.fn(),
  getCompletedWorkoutsBetween: jest.fn(),
  getWorkoutSetsForWorkoutIds: jest.fn(),
  getAllExercises: jest.fn(),
  createWorkout: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  deleteWorkoutAndSets: jest.fn(),
}));
jest.mock('../../lib/syncQueue', () => ({ enqueueSyncOp: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import { create, act } from 'react-test-renderer';
import WorkoutHistoryScreen from '../WorkoutHistoryScreen';
import PressableCard from '../../components/PressableCard';
import { appAlert } from '../../components/AppAlert';
import {
  getRecentCompletedWorkouts, getCompletedWorkoutCount, getCompletedWorkoutsBetween,
  getWorkoutSetsForWorkoutIds, getAllExercises, getWorkoutSetsForWorkout, deleteWorkoutAndSets,
} from '../../lib/database';
import { formatNumber, formatWithUnit } from '../../lib/format';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function workout(id, overrides = {}) {
  return {
    id, userId: 'u1', startedAt: Date.now() - 1000, endedAt: Date.now(),
    isCompleted: true, name: `Session ${id}`, durationMinutes: 42,
    ...overrides,
  };
}

async function mount() {
  let tree;
  await act(async () => { tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />); });
  await flush();
  return tree;
}

describe('A3(a): header shows the TRUE completed count', () => {
  afterEach(() => jest.clearAllMocks());

  test('a user with more than 50 completed sessions sees the true total, not the loaded page length', async () => {
    const page = Array.from({ length: 50 }, (_, i) => workout(`w${i}`, {
      startedAt: Date.now() - i * 3600000, endedAt: Date.now() - i * 3600000 + 60000,
    }));
    getRecentCompletedWorkouts.mockResolvedValue(page);
    getCompletedWorkoutCount.mockResolvedValue(137);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('137 sessions');
    expect(text).not.toContain('50 sessions');
  });

  test('falls back to the loaded page length when the count read is unavailable, never "undefined sessions"', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w1')]);
    getCompletedWorkoutCount.mockRejectedValue(new Error('offline'));
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    const tree = await mount();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('1 session');
    expect(text).not.toContain('undefined');
  });
});

describe('A3(b): "Show more" pages forward from the loaded page and appends', () => {
  afterEach(() => jest.clearAllMocks());

  test('the calm line and control show only once more sessions exist, and disappear once everything is loaded', async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) => workout(`w${i}`, {
      startedAt: Date.now() - i * 3600000, endedAt: Date.now() - i * 3600000 + 60000,
    }));
    const secondPage = [workout('w-older', {
      startedAt: Date.now() - 999 * 3600000, endedAt: Date.now() - 999 * 3600000 + 60000,
    })];
    getRecentCompletedWorkouts
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);
    getCompletedWorkoutCount.mockResolvedValue(51);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    const tree = await mount();

    let text = flattenText(tree.toJSON());
    expect(text).toContain('Showing the latest 50 of 51 sessions');

    const showMore = tree.root.findByProps({ accessibilityLabel: 'Show more sessions' });
    await act(async () => { showMore.props.onPress(); });
    await flush();

    // Pages forward using the LAST loaded row's own keyset cursor
    // ({ attributedAt, id }), the same pair getRecentCompletedWorkouts
    // sorts and pages on -- not a plain timestamp (a tie on the exact
    // millisecond would otherwise skip a session).
    expect(getRecentCompletedWorkouts).toHaveBeenCalledTimes(2);
    expect(getRecentCompletedWorkouts).toHaveBeenNthCalledWith(
      2, 'u1', 50, { attributedAt: firstPage[49].endedAt, id: firstPage[49].id },
    );

    text = flattenText(tree.toJSON());
    expect(text).toContain('51 sessions');
    expect(text).not.toContain('Showing the latest');
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Show more sessions' }).length).toBe(0);
  });
});

describe('A3(c): calendar dots and the card list under them are the SAME data', () => {
  afterEach(() => jest.clearAllMocks());

  function findTrainedDayCells(tree) {
    return tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.endsWith(', trained'),
    );
  }

  function findCardsWithLabel(tree, needle) {
    return tree.root.findAll(
      (n) => n.type === PressableCard
        && typeof n.props.accessibilityLabel === 'string'
        && n.props.accessibilityLabel.includes(needle),
    );
  }

  test('a session beyond the loaded page renders BOTH its dot and its card once the month loads, and tapping its day lists it', async () => {
    // Only ONE completed session is actually loaded (LB-7's 50-row page),
    // dated "now" -- day 5 of an arbitrary older month is never in it, so a
    // dot AND a card there can only come from getCompletedWorkoutsBetween.
    getRecentCompletedWorkouts.mockResolvedValue([workout('w-loaded')]);
    getCompletedWorkoutCount.mockResolvedValue(1);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);
    getCompletedWorkoutsBetween.mockImplementation(async (userId, startMs) => {
      const d = new Date(startMs);
      d.setDate(5);
      return [workout('w-month-old', { startedAt: d.getTime(), endedAt: d.getTime(), durationMinutes: 77 })];
    });

    const tree = await mount();

    const toggle = tree.root.findByProps({ accessibilityLabel: 'Switch to calendar view' });
    await act(async () => { toggle.props.onPress(); });
    await flush();

    // Page back a month: the ranged read is called for that (older) month.
    const prevBtn = tree.root.findByProps({ accessibilityLabel: 'Previous month' });
    await act(async () => { prevBtn.props.onPress(); });
    await flush();

    expect(getCompletedWorkoutsBetween).toHaveBeenCalledWith('u1', expect.any(Number), expect.any(Number));
    expect(findTrainedDayCells(tree).length).toBeGreaterThan(0);
    // The card for w-month-old (identified by its distinctive duration) is
    // in the rendered list, not just a dot with nothing behind it.
    expect(findCardsWithLabel(tree, '77 min').length).toBe(1);

    // Tapping the dotted day lists it -- never "No session on <date>" for a
    // day the grid itself just said was trained.
    const day5 = tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && /^5 \w+, trained$/.test(n.props.accessibilityLabel),
    )[0];
    await act(async () => { day5.props.onPress(); });
    await flush();

    expect(findCardsWithLabel(tree, '77 min').length).toBe(1);
    const text = flattenText(tree.toJSON());
    expect(text).not.toMatch(/No session on/);
  });

  test('falls back to the loaded page for BOTH dots and cards while the month read is unavailable', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w-loaded', { durationMinutes: 33 })]);
    getCompletedWorkoutCount.mockResolvedValue(1);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);
    getCompletedWorkoutsBetween.mockRejectedValue(new Error('offline'));

    const tree = await mount();

    const toggle = tree.root.findByProps({ accessibilityLabel: 'Switch to calendar view' });
    await act(async () => { toggle.props.onPress(); });
    await flush();

    // The loaded page's own session (dated "now", so within the current,
    // initially-visible month) still shows a dot and its card -- exactly
    // the pre-fix behaviour, never a blank grid because the ranged read
    // failed.
    expect(findTrainedDayCells(tree).length).toBeGreaterThan(0);
    expect(findCardsWithLabel(tree, '33 min').length).toBe(1);
  });

  test('deleting a session while its month is open removes BOTH its dot and its card (monthReloadKey)', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w-loaded')]);
    getCompletedWorkoutCount.mockResolvedValue(2);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);
    deleteWorkoutAndSets.mockResolvedValue(true);

    // getCompletedWorkoutsBetween returns the session for every call up to
    // the delete; the test flips this once the delete fires, standing in
    // for the real read no longer finding the (now-deleted) row.
    let monthHasTheSession = true;
    getCompletedWorkoutsBetween.mockImplementation(async (userId, startMs) => {
      if (!monthHasTheSession) return [];
      const d = new Date(startMs);
      d.setDate(5);
      return [workout('w-month-old', { startedAt: d.getTime(), endedAt: d.getTime(), durationMinutes: 77 })];
    });

    const tree = await mount();

    const toggle = tree.root.findByProps({ accessibilityLabel: 'Switch to calendar view' });
    await act(async () => { toggle.props.onPress(); });
    await flush();

    const prevBtn = tree.root.findByProps({ accessibilityLabel: 'Previous month' });
    await act(async () => { prevBtn.props.onPress(); });
    await flush();

    // Confirm the dot and the card render before the delete, same as the
    // first test above.
    expect(findTrainedDayCells(tree).length).toBeGreaterThan(0);
    expect(findCardsWithLabel(tree, '77 min').length).toBe(1);
    const callsBeforeDelete = getCompletedWorkoutsBetween.mock.calls.length;

    // Drive the delete path: tap the card's own Delete control, then the
    // confirm dialog's "Delete" action (appAlert is mocked, so its buttons
    // never fire themselves -- the confirm action is invoked directly, the
    // same way handleDeleteWorkout's appAlert(...) call wires it).
    monthHasTheSession = false;
    const deleteBtn = tree.root.findByProps({ accessibilityLabel: 'Delete workout' });
    await act(async () => { deleteBtn.props.onPress(); });
    expect(appAlert).toHaveBeenCalled();
    const [, , buttons] = appAlert.mock.calls[appAlert.mock.calls.length - 1];
    const deleteAction = buttons.find((b) => b.text === 'Delete');
    await act(async () => { await deleteAction.onPress(); });
    await flush();
    await flush();

    // The visible month's own deps (viewMode/month/user.id) do not change
    // on a delete, so only monthReloadKey explains a second fetch here.
    expect(getCompletedWorkoutsBetween.mock.calls.length).toBeGreaterThan(callsBeforeDelete);
    expect(findTrainedDayCells(tree).length).toBe(0);
    expect(findCardsWithLabel(tree, '77 min').length).toBe(0);
  });
});

describe('A4: tonnage excludes distance/duration sets via exerciseTypeById', () => {
  afterEach(() => jest.clearAllMocks());

  test('a weight_reps set and a distance set together show the correct kg lifted, not the metres x seconds figure', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w1')]);
    getCompletedWorkoutCount.mockResolvedValue(1);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { workoutId: 'w1', exerciseId: 'ex-bench', setType: 'straight', weight: 100, actualReps: 10 },
      { workoutId: 'w1', exerciseId: 'ex-row-erg', setType: 'straight', weight: 2000, actualReps: 600 },
    ]);
    getAllExercises.mockResolvedValue([
      { id: 'ex-bench', name: 'Bench Press', exercise_type: 'weight_reps' },
      { id: 'ex-row-erg', name: 'Row erg', exercise_type: 'distance' },
    ]);
    getWorkoutSetsForWorkout.mockResolvedValue([]);

    const tree = await mount();

    const card = tree.root.findByType(PressableCard);
    await act(async () => { card.props.onPress(); }); // expand -- the tonnage chip only shows expanded
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain(`${formatWithUnit(formatNumber(1000), 'kg')} lifted`);
    expect(text).not.toContain('1,201,000');
  });
});

describe('A5: collapsed-row accessibility label carries duration and set count', () => {
  afterEach(() => jest.clearAllMocks());

  test('the label matches the visible chips (duration, working-set count), before the expand state', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w1', { durationMinutes: 45 })]);
    getCompletedWorkoutCount.mockResolvedValue(1);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([
      { workoutId: 'w1', exerciseId: 'ex-bench', setType: 'straight', weight: 60, actualReps: 8 },
      { workoutId: 'w1', exerciseId: 'ex-bench', setType: 'straight', weight: 60, actualReps: 8 },
      { workoutId: 'w1', exerciseId: 'ex-bench', setType: 'warmup', weight: 20, actualReps: 10 },
    ]);
    getAllExercises.mockResolvedValue([{ id: 'ex-bench', name: 'Bench Press', exercise_type: 'weight_reps' }]);
    getWorkoutSetsForWorkout.mockResolvedValue([]);

    const tree = await mount();

    const card = tree.root.findByType(PressableCard);
    // 2 working sets (the warmup is excluded from workingSetCount), 45 min.
    expect(card.props.accessibilityLabel).toMatch(/^Workout on \d{1,2} \w+ \d{4}, 45 min, 2 sets, collapsed$/);

    await act(async () => { card.props.onPress(); });
    await flush();
    expect(tree.root.findByType(PressableCard).props.accessibilityLabel).toMatch(
      /^Workout on \d{1,2} \w+ \d{4}, 45 min, 2 sets, expanded$/,
    );
  });
});
