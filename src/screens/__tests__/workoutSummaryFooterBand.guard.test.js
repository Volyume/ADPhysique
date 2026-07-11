/**
 * R2-5 / R2-6 (remediation 2026-07-11, founder device walk build 2684): the
 * STRUCTURAL fix of the workout-summary footer / scroll / tab-bar / mini-bar
 * system as ONE layout model, after three point-patches in two weeks failed.
 *
 * The layout contract this pins:
 *   1. No phantom band. On WorkoutSummary the VolyumeTabBar band is visible
 *      (the screen lives inside HomeStack/ProgressStack), but the
 *      ActiveSessionMiniBar above the tab row renders NOTHING once the session
 *      is finished, because the finish flow clears `activeWorkout` (endWorkout)
 *      BEFORE it shows the summary. A hidden mini-bar reserves no height, so
 *      there is no dead band between the sticky footer and the tab bar.
 *      (The founder's ~70dp band was NOT the mini-bar - it was the screen
 *      double-claiming the system bottom inset; refuted here + fixed by the
 *      edges=['top'] change pinned in bottomBarInset.guard.test.js.)
 *   2. Scroll content padding is independent of the footer's height. The sticky
 *      footer is a normal-flow SIBLING below the scroll, never an overlay, so
 *      the scroll's bottom padding is its own rhythm (styles.content ->
 *      spacing.xxxl) and the old footerHeight measurement plumbing is gone.
 *
 * The render section mounts the real VolyumeTabBar + ActiveSessionMiniBar in
 * the post-finish state; the source section pins the finish-flow ordering and
 * the food-design-standard compliance pass on the summary chrome. The whole
 * WorkoutSummaryScreen is impractical to mount (SQLite/wellbeing/mesocycle -
 * see its own guard tests' headers), so the layout model is pinned at the tab
 * band (render) plus source, exactly as bottomBarInset.guard.test.js does.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  getFocusedRouteNameFromRoute: (route) => route?.state?.routes?.[route.state.index]?.name,
}));

import useAppStore from '../../store/useAppStore';
import ActiveSessionMiniBar from '../../components/ActiveSessionMiniBar';
import VolyumeTabBar from '../../components/VolyumeTabBar';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const LIVE_SESSION = {
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
  const state = { ...LIVE_SESSION, ...overrides };
  useAppStore.mockImplementation((sel) => sel(state));
}

const texts = (tree) => JSON.stringify(tree.toJSON() ?? '');
const makeNav = () => ({ emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() });

// The tab bar, on the summary, with the summary nested under the focused tab.
const routes = [
  { key: 'home-1', name: 'HomeTab', state: { index: 1, routes: [{ name: 'Home' }, { name: 'WorkoutSummary' }] } },
  { key: 'plans-1', name: 'PlansTab' },
  { key: 'diary-1', name: 'DiaryTab' },
];
const descriptors = Object.fromEntries(routes.map((r) => [r.key, {
  options: { title: r.name.replace('Tab', ''), tabBarIcon: () => null },
}]));
const tabNodes = (tree) => tree.root.findAll((n) => n.type === 'Pressable' && n.props?.accessibilityRole === 'tab');

describe('WorkoutSummary footer/tab-band layout model (R2-5/R2-6, render)', () => {
  test('post-finish (activeWorkout cleared) the tab band renders but shows NO mini-bar - no phantom band', () => {
    setStore({ activeWorkout: null });
    const tree = create(
      <VolyumeTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={makeNav()} />
    );
    // The band itself is present on the summary (nested route is WorkoutSummary,
    // not ActiveWorkout), so the tab row renders...
    expect(tree.toJSON()).not.toBeNull();
    expect(tabNodes(tree)).toHaveLength(3);
    // ...but the mini-bar above it renders nothing: no exercise line, no
    // "Workout in progress" shell reserving height between footer and tab bar.
    expect(texts(tree)).not.toContain('Bench Press');
    expect(texts(tree)).not.toContain('Workout in progress');
  });

  test('the mini-bar reserves NO height when hidden (returns null, not an empty shell)', () => {
    setStore({ activeWorkout: null });
    expect(create(<ActiveSessionMiniBar navigation={makeNav()} />).toJSON()).toBeNull();
  });

  test('sanity: mid-session on another tab the mini-bar DOES dock (so the null above is meaningful)', () => {
    setStore(); // live session
    const tree = create(
      <VolyumeTabBar state={{ index: 2, routes }} descriptors={descriptors} navigation={makeNav()} />
    );
    expect(texts(tree)).toContain('Bench Press');
  });
});

describe('WorkoutSummary footer/tab-band layout model (R2-5/R2-6, source)', () => {
  const active = read('ActiveWorkoutScreen.js');
  const summary = read('WorkoutSummaryScreen.js');

  test('the finish flow clears activeWorkout (endWorkout) BEFORE it shows the summary', () => {
    // The mini-bar reads activeWorkout; if endWorkout ran AFTER the replace,
    // the summary would flash a stale "Workout in progress" mini-bar (the very
    // band the founder suspected). endWorkout() must precede the replace.
    const endIdx = active.indexOf('endWorkout();');
    const replaceIdx = active.indexOf("navigation.replace('WorkoutSummary'");
    expect(endIdx).toBeGreaterThan(-1);
    expect(replaceIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeLessThan(replaceIdx);
  });

  test('the mini-bar returns null (no reserved height) when there is no live workout', () => {
    const miniBar = read('../components/ActiveSessionMiniBar.js');
    expect(miniBar).toMatch(/if \(!hasActiveWorkout\) return null;/);
  });

  test('the summary owns only the top edge; scroll padding is footer-independent', () => {
    expect(summary).toMatch(/edges=\{\['top'\]\}/);
    expect(summary).not.toMatch(/edges=\{\['top', 'bottom'\]\}/);
    expect(summary).toMatch(/contentContainerStyle=\{styles\.content\}/);
    expect(summary).not.toMatch(/\[footerHeight, setFooterHeight\]/);
    expect(summary).not.toMatch(/setFooterHeight\(/);
  });
});

describe('WorkoutSummary food-design-standard compliance (remediation 2026-07-11)', () => {
  const summary = read('WorkoutSummaryScreen.js');

  test('no raw RN <Modal>: the template prompt is the shared BottomSheet (checklist 9)', () => {
    expect(summary).not.toMatch(/<Modal[\s>]/);
    expect(summary).not.toMatch(/ Modal,/); // not imported from react-native
    expect(summary).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet'/);
    expect(summary).toMatch(/<BottomSheet[\s\S]*?visible=\{templateModalVisible\}[\s\S]*?keyboardAvoiding/);
  });

  test('no blocking Alert on a non-destructive guard: it is a calm toast (checklist 11)', () => {
    expect(summary).not.toMatch(/appAlert/);
    expect(summary).toMatch(/toast\.show\('No exercise data to save as a template\.'/);
  });

  test('data numerals carry tabular figures (checklist 5)', () => {
    // hero tonnage, the three stat-tile values, and the exercise-breakdown
    // set/weight readouts all render through type.num (tabular-nums).
    expect(summary).toMatch(/heroValue:\s*\{ \.\.\.type\.num\('display'\)/);
    expect(summary).toMatch(/statValue:\s*\{ \.\.\.type\.num\('h3'\)/);
    expect(summary).toMatch(/exerciseListMeta:\s*\{\s*\n\s*\.\.\.type\.num\('caption'\)/);
    expect(summary).toMatch(/exerciseSetChip:\s*\{\s*\n\s*\.\.\.type\.num\('caption'\)/);
  });

  test('named card-class surfaces use radius.lg (checklist 1)', () => {
    // The three stat tiles and the save-error card are card-class per the lead
    // ruling; both moved off radius.md to the one card radius.
    expect(summary).toMatch(/statBox:\s*\{[\s\S]*?borderRadius:\s*radius\.lg/);
    expect(summary).toMatch(/saveErrorCard:\s*\{[\s\S]*?borderRadius:\s*radius\.lg/);
  });

  test('raw fontSize+fontWeight pairs that HAVE an exact role now use it (checklist 4)', () => {
    // The three clean 1:1 conversions in this pass. (Emphasis pairs with no
    // exact role - sm+semibold, md+bold, xs+medium - are a separate lead fork.)
    expect(summary).toMatch(/muscleName:\s*\{ flex: 1, \.\.\.type\.bodyStrong/);
    expect(summary).toMatch(/statusText:\s*\{ \.\.\.type\.captionStrong \}/);
    expect(summary).toMatch(/feedbackToggleBtnText:\s*\{ \.\.\.type\.bodyStrong/);
  });
});
