/**
 * E15 bottom band (mini-bar + custom tab bar, greenlit 2026-07-02). Pins,
 * against the real components:
 *   - the mini-bar renders ONLY while a workout is live, shows the current
 *     exercise, and its status slot shows the rest countdown while resting
 *     and honest set progress otherwise (never "Set N of fewer" — past the
 *     recommended count it reads plain sets-done);
 *   - tapping the mini-bar returns to ActiveWorkout via the parent-tab form
 *     WITH initial: false (the F4 silent-drop + lazy-tab rules);
 *   - the tab bar renders every route, marks the focused tab selected,
 *     emits tabPress exactly like the stock bar (so the M1 haptic and NAV-5
 *     listeners keep firing) and only navigates when the press is neither
 *     focused nor prevented;
 *   - the whole band returns null while ActiveWorkout is focused (the
 *     session screen owns the full height, mini-bar absent by design).
 *   - T2: the Coach tab (ProfileTab) carries a calm badge, and an updated
 *     accessibility label, when the store's hasUnseenCoachChange flag is
 *     set, and only that tab, never another one.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  getFocusedRouteNameFromRoute: (route) => route?.state?.routes?.[route.state.index]?.name,
}));

import useAppStore from '../../store/useAppStore';
import ActiveSessionMiniBar from '../ActiveSessionMiniBar';
import VolyumeTabBar from '../VolyumeTabBar';

const SESSION = {
  activeWorkout: { id: 'w1', name: 'Push Day' },
  workoutExercises: [{
    exercise: { name: 'Bench Press' },
    routineExercise: { recommendedSets: 4 },
    sets: [{ id: 's1' }, { id: 's2' }],
  }],
  currentExerciseIndex: 0,
  restTimerActive: false,
  restTimerRemaining: 0,
  accessibility: { reduceMotion: true }, // deterministic: no entering/exiting
};

function setStore(overrides = {}) {
  const state = { ...SESSION, ...overrides };
  useAppStore.mockImplementation((sel) => sel(state));
}

const texts = (tree) => JSON.stringify(tree.toJSON() ?? '');

function pressables(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.onPress === 'function');
}

describe('ActiveSessionMiniBar', () => {
  test('absent with no live workout', () => {
    setStore({ activeWorkout: null });
    expect(create(<ActiveSessionMiniBar navigation={{ navigate: jest.fn() }} />).toJSON()).toBeNull();
  });

  test('shows the current exercise and set progress mid-session', () => {
    setStore();
    const tree = create(<ActiveSessionMiniBar navigation={{ navigate: jest.fn() }} />);
    const txt = texts(tree);
    expect(txt).toContain('Bench Press');
    expect(txt).toContain('Set 3 of 4');
  });

  test('past the recommended count the progress reads plain sets-done, never "Set 5 of 4"', () => {
    setStore({
      workoutExercises: [{
        exercise: { name: 'Bench Press' },
        routineExercise: { recommendedSets: 2 },
        sets: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      }],
    });
    const txt = texts(create(<ActiveSessionMiniBar navigation={{ navigate: jest.fn() }} />));
    expect(txt).toContain('3 sets done');
    expect(txt).not.toContain('of 2');
  });

  test('the rest countdown owns the slot while resting', () => {
    setStore({ restTimerActive: true, restTimerRemaining: 83 });
    const txt = texts(create(<ActiveSessionMiniBar navigation={{ navigate: jest.fn() }} />));
    expect(txt).toContain('1:23');
    expect(txt).not.toContain('Set 3 of 4');
  });

  test('tapping returns to ActiveWorkout via the parent-tab form with initial: false', async () => {
    setStore();
    const navigate = jest.fn();
    const tree = create(<ActiveSessionMiniBar navigation={{ navigate }} />);
    await act(async () => { pressables(tree)[0].props.onPress(); });
    expect(navigate).toHaveBeenCalledWith('HomeTab', { screen: 'ActiveWorkout', initial: false });
  });
});

describe('VolyumeTabBar', () => {
  const routes = [
    { key: 'home-1', name: 'HomeTab' },
    { key: 'plans-1', name: 'PlansTab' },
    { key: 'diary-1', name: 'DiaryTab' },
  ];
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, {
    options: {
      title: r.name === 'HomeTab' ? 'Today' : r.name === 'PlansTab' ? 'Train' : r.name === 'DiaryTab' ? 'Nutrition' : r.name.replace('Tab', ''),
      tabBarIcon: () => null,
    },
  }]));

  function makeNav() {
    return {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };
  }

  // The RN jest mock renders a Pressable as two nested hosts carrying the
  // same props; match the outer node only.
  const tabNodes = (tree) => tree.root.findAll((n) => n.type === 'Pressable' && n.props?.accessibilityRole === 'tab');

  test('renders every route with the focused one selected', () => {
    setStore({ activeWorkout: null });
    const tree = create(
      <VolyumeTabBar state={{ index: 1, routes }} descriptors={descriptors} navigation={makeNav()} />
    );
    const tabs = tabNodes(tree);
    expect(tabs).toHaveLength(3);
    expect(tabs[1].props.accessibilityState).toEqual({ selected: true });
    expect(texts(tree)).toContain('Train');
  });

  test('a press emits tabPress (M1 haptic + NAV-5 both ride this) and navigates when unfocused', async () => {
    setStore({ activeWorkout: null });
    const nav = makeNav();
    const tree = create(
      <VolyumeTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={nav} />
    );
    const tabs = tabNodes(tree);
    await act(async () => { tabs[2].props.onPress(); });
    expect(nav.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'diary-1', canPreventDefault: true });
    expect(nav.navigate).toHaveBeenCalledWith('DiaryTab', undefined);
  });

  test('a re-press of the focused tab emits (NAV-5 pops to root) but never navigates', async () => {
    setStore({ activeWorkout: null });
    const nav = makeNav();
    const tree = create(
      <VolyumeTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={nav} />
    );
    const tabs = tabNodes(tree);
    await act(async () => { tabs[0].props.onPress(); });
    expect(nav.emit).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('a prevented tabPress never navigates', async () => {
    setStore({ activeWorkout: null });
    const nav = { emit: jest.fn(() => ({ defaultPrevented: true })), navigate: jest.fn() };
    const tree = create(
      <VolyumeTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={nav} />
    );
    const tabs = tabNodes(tree);
    await act(async () => { tabs[1].props.onPress(); });
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('the whole band hides while ActiveWorkout is focused', () => {
    setStore(); // live session
    const focusedHome = {
      key: 'home-1', name: 'HomeTab',
      state: { index: 1, routes: [{ name: 'Home' }, { name: 'ActiveWorkout' }] },
    };
    const tree = create(
      <VolyumeTabBar
        state={{ index: 0, routes: [focusedHome, routes[1], routes[2]] }}
        descriptors={{ ...descriptors, 'home-1': descriptors['home-1'] }}
        navigation={makeNav()}
      />
    );
    expect(tree.toJSON()).toBeNull();
  });

  test('mid-session on another tab, the mini-bar docks above the tab row', () => {
    setStore(); // live session, Nutrition focused
    const tree = create(
      <VolyumeTabBar state={{ index: 2, routes }} descriptors={descriptors} navigation={makeNav()} />
    );
    const txt = texts(tree);
    expect(txt).toContain('Bench Press'); // mini-bar present
    expect(tabNodes(tree)).toHaveLength(3);
  });

  describe('T2: unseen-coach-change badge on the Coach tab', () => {
    const routesWithProfile = [
      { key: 'home-1', name: 'HomeTab' },
      { key: 'profile-1', name: 'ProfileTab' },
    ];
    const descriptorsWithProfile = Object.fromEntries(routesWithProfile.map((r) => [r.key, {
      options: { title: r.name === 'ProfileTab' ? 'Coach' : r.name.replace('Tab', ''), tabBarIcon: () => null },
    }]));
    // The badge is a plain RN View; TabIcon's own wrapper is Animated.View (a
    // distinct host type in the reanimated mock), so counting 'View' nodes
    // inside a tab isolates the badge without depending on style values.
    const viewCount = (node) => node.findAll((n) => n.type === 'View').length;

    test('shows the badge and appends the a11y hint when a coach change is unseen', () => {
      setStore({ activeWorkout: null, hasUnseenCoachChange: true });
      const tree = create(
        <VolyumeTabBar state={{ index: 0, routes: routesWithProfile }} descriptors={descriptorsWithProfile} navigation={makeNav()} />
      );
      const tabs = tabNodes(tree);
      expect(tabs[1].props.accessibilityLabel).toBe('Coach, new coaching update');
      expect(viewCount(tabs[1])).toBe(viewCount(tabs[0]) + 1);
    });

    test('no badge and the plain label when there is nothing unseen', () => {
      setStore({ activeWorkout: null, hasUnseenCoachChange: false });
      const tree = create(
        <VolyumeTabBar state={{ index: 0, routes: routesWithProfile }} descriptors={descriptorsWithProfile} navigation={makeNav()} />
      );
      const tabs = tabNodes(tree);
      expect(tabs[1].props.accessibilityLabel).toBe('Coach');
      expect(viewCount(tabs[1])).toBe(viewCount(tabs[0]));
    });

    test('the badge never rides on another tab even while the flag is set', () => {
      setStore({ activeWorkout: null, hasUnseenCoachChange: true });
      const tree = create(
        <VolyumeTabBar state={{ index: 0, routes: routesWithProfile }} descriptors={descriptorsWithProfile} navigation={makeNav()} />
      );
      const tabs = tabNodes(tree);
      expect(tabs[0].props.accessibilityLabel).toBe('Home');
    });
  });
});
