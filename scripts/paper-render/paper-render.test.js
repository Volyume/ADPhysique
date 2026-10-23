/**
 * scripts/paper-render/paper-render.test.js
 *
 * The paper-render harness. NOT picked up by `npm test` -- package.json's
 * jest.testMatch only matches `**\/__tests__/**` and `**\/tests/**`, and
 * this file lives directly under scripts/paper-render/ (proved by `npx
 * jest --listTests | grep -c paper-render` printing 0, see README.md).
 * Run via run.sh, or:
 *   npx jest --config scripts/paper-render/jest.config.js
 *
 * MOUNTING: this is screen-mount.test.js's own mock preamble
 * (mockPreamble.js, copied with paths adjusted for this folder), with the
 * data-layer change the brief asks for -- expo-sqlite is a real node:sqlite
 * shim (expoSqliteShim.js) instead of the in-memory stub, so src/lib/database.js
 * runs its own schema + migrations and every screen reads back real rows,
 * seeded through the app's own write functions (seedPersona.js) -- plus a
 * handful of mount-fidelity fixes mockPreamble.js's own header calls out
 * (useFocusEffect actually firing chief among them; screen-mount's crash
 * sweep never needed it to).
 *
 * WHAT IS RENDERED. The list of screens is not kept here: screenPlan.js
 * reads src/navigation/RootNavigator.js as text and returns every screen the
 * app registers (all navigators, de-duplicated by component), each with its
 * group, the route params it reads and where the tab bar sits. The tab-bar
 * fixture below (TAB_DEFS) is an explicit copy of RootNavigator's five tabs,
 * and the first test fails if RootNavigator.js and the fixture ever disagree,
 * which is how the harness went stale when D231 changed the tabs.
 *
 * Test blocks, in order (all share one seeded database):
 *   0.  the fixture matches RootNavigator.js; no dormant billing screen is
 *       registered.
 *   1.  seeds the persona ("Alex") and mounts EVERY registered screen in the
 *       dark theme with the params it reads, plus each screen's extra states
 *       (Community hub segments, the finished-session reopen, the recap
 *       variants, the coaching set-up route, the sign-up sheet). Screens in a
 *       tab's stack get that tab's real VolyumeTabBar docked beneath them.
 *   1b. the day-zero variants (suffix '-day0'): a second, brand-new user
 *       (seedDayZeroPersona()) with no plan, session, food entry or weight
 *       entry at all, same dark theme.
 *   1c. the Welcome screen's product captures, 1d. the store listing
 *       screenshots (both unchanged in method; see their blocks).
 *   1e. Nutrition with a planned day (the real day-plan generator, removed
 *       again afterwards).
 *   2.  the light-theme variants: these screens' StyleSheet.create calls read
 *       the theme.js legacy singleton at MODULE-LOAD time, so a correct light
 *       render needs jest.resetModules() + a fresh applyAccessibility({theme:
 *       'light'}) BEFORE the screen module is re-required.
 *   3.  after one more module reload back to the dark theme: this week's
 *       check-in and a completed coaching decision are saved, then Today
 *       (the coaching-decision line) and Coach (This week's decision) are
 *       rendered. Last, because it changes the persona's data.
 *
 * Per-screen failures are caught and recorded into report-data.json (which
 * shoot.js turns into report.md, and phoneSet.js into manifest.json) rather
 * than failing the whole file -- "if a screen will not mount, record why and
 * move on" is the brief's own rule.
 */
'use strict';

require('./mockPreamble');

// ChallengeScreen: the challenge RPC layer is the one network edge the
// screen has (src/lib/challenges/api.js -> Community transport -> Supabase),
// so it is mocked here with plausible data: an active gym challenge the persona
// has joined, a score of 64 of 100 split per src/lib/challenges/copy.js
// (core 40/15/15/10, coaching 10/6/4), and an eight-entry board by handle.
// jest.mock factories may not close over module variables, hence the literals.
jest.mock('../../src/lib/challenges/api', () => {
  const id = 'ch-paper-render-1';
  const challenge = {
    id, title: 'Summer Strength Challenge', gym_name: 'Ironworks Gym, Leeds', status: 'active', total: 64,
    starts_on: '2026-10-05', ends_on: '2026-11-29', days_left: 40,
    main_threshold: 80, second_threshold: 50,
    terms_url: 'https://volyume.app/challenge-terms',
  };
  const score = {
    total: 64, withheld: false, tier: 'second', to_main: 16, to_second: 0,
    parts: { train: 30, week: 11, stronger: 9, community: 6, checkin: 5, food: 2, weighin: 1 },
    max: { train: 40, week: 15, stronger: 15, community: 10, checkin: 10, food: 6, weighin: 4 },
    detail: {
      training_days: 22, target_days: 29, weeks_hit: 5, weeks: 8, lifts_beaten: 3, posts_weeks: 4,
      checkins: 4, checkins_target: 8, food_days: 12, food_cap: 36, weighin_weeks: 2,
    },
  };
  const board = {
    top: [
      { name: 'iron_mara', score: 91 }, { name: 'liftwithsam', score: 86 }, { name: 'dev_squats', score: 79 },
      { name: 'alexlifts', score: 64, me: true }, { name: 'hannah_h', score: 61 }, { name: 'bigtom88', score: 57 },
      { name: 'pushpull_pri', score: 52 }, { name: 'gymrat_jo', score: 48 },
    ],
    me: { in_top: true, score: 64 },
    counts: { main: 3, second: 9 },
  };
  return {
    CHALLENGE_CONSENT_VERSION: 'challenge_consent_v2',
    CHALLENGE_ERROR_CODES: ['not_found', 'not_allowed', 'invalid_input', 'network', 'unavailable'],
    ChallengeError: class ChallengeError extends Error {},
    myChallenges: jest.fn(async () => [challenge]),
    challengeScore: jest.fn(async () => score),
    challengeBoard: jest.fn(async () => board),
    setChallengeTarget: jest.fn(async () => ({ planned_per_week: 4 })),
    withdrawFromChallenge: jest.fn(async () => ({ withdrawn: true })),
    getPublicChallenge: jest.fn(async () => null),
    lookupChallenge: jest.fn(async () => ({ ...challenge, joined: false, withdrawn: false })),
    joinChallenge: jest.fn(async () => ({ challenge_id: id, joined: true })),
    challengeForMyGym: jest.fn(async () => null),
  };
});
const MOCK_CHALLENGE_ID = 'ch-paper-render-1';

const fs = require('node:fs');
const path = require('node:path');

// The every-screen pass mounts ~120 screens in one go.
jest.setTimeout(1800000);

// ── Paths ──────────────────────────────────────────────────────────────
const { WORK_DIR } = require('./paths');
const HTML_DIR = path.join(WORK_DIR, 'html');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');
process.env.PAPER_RENDER_SQLITE_DIR = path.join(WORK_DIR, 'db');

fs.mkdirSync(HTML_DIR, { recursive: true });

const { treeToHtml } = require('./treeToHtml');
const {
  seedPersona, seedDayZeroPersona, seedClientState, seedThisWeekDecision, NOW_MS, DAY_MS,
} = require('./seedPersona');
const { buildPlan } = require('./screenPlan');
const registry = require('./registry');

// PAPER_RENDER_ONLY="HomeScreen,CoachOutputScreen": a quick look at a few
// screens. Only the every-screen pass runs, and only for these.
const ONLY = (process.env.PAPER_RENDER_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const QUICK = ONLY.length > 0;
const full = QUICK ? test.skip : test;

// ── Mutable "current module set", reloaded for the light-theme pass and the
// decision pass.
const ENV = {
  React: require('react'),
  TestRenderer: require('react-test-renderer'),
  useAppStore: require('../../src/store/useAppStore').default,
};

const REPORT = {
  dataLayerNote: null,
  bypassedWrites: [],
  seedNotes: [],
  screens: [],
  plan: [],
  registered: null,
  converterStats: { unknownTypes: {}, converterFallbacks: {} },
  nowMs: NOW_MS,
};

function mergeConverterStats(stats) {
  for (const [k, v] of Object.entries(stats.unknownTypes || {})) {
    REPORT.converterStats.unknownTypes[k] = (REPORT.converterStats.unknownTypes[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(stats.converterFallbacks || {})) {
    REPORT.converterStats.converterFallbacks[k] = (REPORT.converterStats.converterFallbacks[k] || 0) + v;
  }
}

// ── react-test-renderer tree -> toJSON()-shaped plain object, without
// calling the library's own toJSON(): a screen that passes a real
// `<RefreshControl>` element as its ScrollView's `refreshControl` prop makes
// react-test-renderer's toJSON() throw walking that unrendered element
// (the exact issue src/screens/__tests__/*.guard tests in this repo work
// around with the same tree.root/findAll traversal used here, see e.g.
// the "toJSON() chokes on the circular refreshControl element" comment in
// screen-mount.test.js). This walk never touches non-visual props (no
// onPress/onRefresh/refreshControl), so it cannot hit that cycle.
const SAFE_PROPS = new Set([
  'style', 'value', 'placeholder', 'placeholderTextColor', 'testID', 'accessibilityLabel',
  'accessibilityRole', 'numberOfLines', 'trackColor', 'thumbColor', 'source', 'name', 'size', 'color',
  'visible', 'tintColor', 'contentFit', 'resizeMode', 'contentContainerStyle',
  'd', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'viewBox',
  'points', 'offset', 'stopColor', 'stopOpacity', 'id', 'opacity', 'transform', 'fillOpacity',
  'fillRule', 'clipRule', 'textAnchor',
]);
function manualWalk(instance) {
  if (instance === null || instance === undefined) return null;
  if (typeof instance === 'string' || typeof instance === 'number') return instance;
  if (typeof instance.type !== 'string') {
    // Composite: transparent, flatten straight through to its own rendered
    // children (mirrors toJSON()'s own collapsing of composites).
    const kids = (instance.children || []).map(manualWalk).filter((k) => k !== null);
    if (kids.length === 1) return kids[0];
    if (kids.length === 0) return null;
    return kids;
  }
  const props = {};
  for (const [k, v] of Object.entries(instance.props || {})) {
    if (SAFE_PROPS.has(k)) props[k] = v;
  }
  const rawChildren = instance.children || [];
  const children = [];
  for (const c of rawChildren) {
    if (typeof c === 'string' || typeof c === 'number') { children.push(c); continue; }
    const walked = manualWalk(c);
    if (walked === null) continue;
    if (Array.isArray(walked)) children.push(...walked); else children.push(walked);
  }
  return { type: instance.type, props, children: children.length ? children : null };
}
function safeTreeJSON(tree) {
  try {
    return { json: tree.toJSON(), fallback: false };
  } catch (e) {
    return { json: manualWalk(tree.root), fallback: true, error: e.message };
  }
}

// What a rendered tree says, for the manifest's "state" column (loading,
// empty, offline, content): its text, and whether a spinner is on it. The
// reading itself is phoneSet.js's job; this only records the evidence.
function treeSignals(json) {
  const out = []; let spinners = 0;
  const walk = (n) => {
    if (n === null || n === undefined) return;
    if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'ActivityIndicator') spinners += 1;
    if (n.type === 'Ionicons') return;
    (Array.isArray(n.children) ? n.children : (n.children ? [n.children] : [])).forEach(walk);
  };
  walk(json);
  const text = out.join(' | ').replace(/\s+/g, ' ').trim();
  return { spinners, textLength: text.length, text: text.slice(0, 1500) };
}

// ── mountScreen: screen-mount.test.js's own helper, verbatim behaviour,
// paths adjusted, flush loop lengthened (real SQLite reads chain through
// more promise turns than the mocked DB screen-mount was written against).
function makeNav() {
  const nav = {
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn(), pop: jest.fn(),
    popToTop: jest.fn(), reset: jest.fn(), setOptions: jest.fn(), setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}), removeListener: jest.fn(), canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true), getId: jest.fn(() => 'test-route'),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
  nav.getParent = jest.fn(() => nav);
  return nav;
}

async function mountScreen(Screen, props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg, ..._rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode|react-test-renderer is deprecated/i.test(text)) return;
    errors.push(text);
  };
  const navigation = makeNav();
  const route = { params: props.params || {}, name: props.routeName || 'Test', key: `${props.routeName || 'Test'}-1` };
  // useNavigation() / useRoute() read these (mockPreamble.js).
  global.__PAPER_RENDER_NAV__ = navigation;
  global.__PAPER_RENDER_ROUTE__ = route;
  let tree = null;
  try {
    await ENV.TestRenderer.act(async () => {
      tree = ENV.TestRenderer.create(
        ENV.React.createElement(props.__rootType || Wrap, {},
          ENV.React.createElement(props.Screen, { navigation, route }),
          props.extra || null,
        ),
      );
    });
    await ENV.TestRenderer.act(async () => {
      for (let round = 0; round < 6; round += 1) {
        for (let i = 0; i < 25; i += 1) await Promise.resolve();
        await new Promise((r) => setImmediate(r));
      }
    });
  } finally {
    console.error = origErr;
  }
  return { tree, errors };
}
function Wrap(props) { return ENV.React.createElement(ENV.React.Fragment, null, props.children); }

// ── Tab bar fixture ───────────────────────────────────────────────────────
// RootNavigator.js's MainTabs (D231): five tabs, with its own route names,
// titles and icons. Block 0 below fails if the navigator and this copy part.
const TAB_DEFS = [
  { key: 'HomeTab-1', name: 'HomeTab', title: 'Today', icon: 'today', iconOutline: 'today-outline' },
  { key: 'PlansTab-1', name: 'PlansTab', title: 'Train', icon: 'barbell', iconOutline: 'barbell-outline' },
  { key: 'DiaryTab-1', name: 'DiaryTab', title: 'Nutrition', icon: 'nutrition', iconOutline: 'nutrition-outline' },
  { key: 'ProfileTab-1', name: 'ProfileTab', title: 'Coach', icon: 'pulse', iconOutline: 'pulse-outline' },
  { key: 'CommunityTab-1', name: 'CommunityTab', title: 'Community', icon: 'people', iconOutline: 'people-outline' },
];
function buildTabBarElement(focusedIndex, nestedRouteName) {
  const Ionicons = require('@expo/vector-icons/Ionicons');
  const VolyumeTabBar = require('../../src/components/VolyumeTabBar').default;
  const routes = TAB_DEFS.map((d, i) => (
    i === focusedIndex && nestedRouteName
      ? { key: d.key, name: d.name, state: { index: 0, routes: [{ name: nestedRouteName }] } }
      : { key: d.key, name: d.name }
  ));
  const descriptors = Object.fromEntries(TAB_DEFS.map((d) => [d.key, {
    options: {
      title: d.title,
      tabBarIcon: ({ focused, color }) => ENV.React.createElement(Ionicons, {
        name: focused ? d.icon : d.iconOutline, size: 22, color,
      }),
    },
  }]));
  const navigation = { emit: () => ({ defaultPrevented: false }), navigate: () => {} };
  return ENV.React.createElement(VolyumeTabBar, { state: { index: focusedIndex, routes }, descriptors, navigation });
}

// ── Persona store state ───────────────────────────────────────────────────
function personaStoreState(seed, overrides = {}) {
  return {
    user: { id: seed.userId, email: 'alex@example.com', isLocal: false },
    session: { user: { id: seed.userId } },
    tier: 'pro',
    firstRunComplete: true,
    // Article 9 health-data consent, already given (mirrors gdprConsented:
    // true on the seeded DB rows). Community's own transport layer fails
    // CLOSED on this exact store field (assertCommunityGates,
    // src/lib/community/transport.js) -- unset it reads as unresolved and
    // CommunityHubScreen renders "Could not load Community" for every
    // request, seeded data or not. Not a weakening of the RootNavigator
    // gate itself (untouched, and this harness never mounts it): this is
    // the same "already onboarded" characterisation firstRunComplete above
    // already gives the persona, just for the field Community reads.
    healthConsent: true,
    units: 'kg',
    bodyWeightUnits: 'kg',
    userProfile: {
      firstName: 'Alex', sex: 'male', goal: 'lean_gain', trainingFocus: 'hypertrophy',
      units: 'kg', coachAutonomy: 'collaborative', coachTone: 'automatic',
      // CoachOutputScreen reads userProfile.phaseStartedAt (store field, set
      // by ProOnboardingScreen at real onboarding time) STRAIGHT from the
      // store, not from a DB row, to compute weeksInPhase for the real
      // runWeeklyCoach() engine call: `weeksInPhase >= 2` is one half of the
      // engine's own `hasEnoughData` gate (src/lib/weeklyCoach.js). Left
      // unset, weeksInPhase defaults to 1 and the engine correctly (this is
      // the real ED-safety baseline-building gate, working exactly as
      // designed) reports "Building your baseline" for every week
      // regardless of how much workout/weight history is seeded underneath
      // it. 16 days ago clears the >=2 threshold with room to spare, and
      // narratively fits "started the block/phase, now in week 2 of 6".
      phaseStartedAt: NOW_MS - 16 * DAY_MS,
    },
    accessibility: {
      reduceMotion: true, higherContrast: false, largerText: false, colorBlindSafe: false,
      theme: 'dark', energyUnit: 'kcal',
    },
    accessibilityLoaded: true,
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    restTimerActive: false,
    hasUnseenCoachChange: false,
    ...overrides,
  };
}

function activeWorkoutOverride(seed) {
  const [ex0, ex1, ex2, ex3, ex4, ex5] = seed.upperExercises;
  const asExercise = (e) => ({ id: e.id, name: e.name, equipment: e.equipment || 'Barbell', primaryMuscle: e.primaryMuscle });
  const upcoming = (e, sets) => ({
    exercise: asExercise(e),
    routineExercise: { id: `re-${e.id}`, recommendedSets: 3, recommendedRepsMin: 6, recommendedRepsMax: 10 },
    sets,
  });
  return {
    activeWorkout: { id: 'paper-render-active', userId: seed.userId, routineId: seed.routines.upperA, startedAt: NOW_MS - 12 * 60 * 1000, isCompleted: false },
    workoutStartTime: NOW_MS - 12 * 60 * 1000,
    currentExerciseIndex: 1,
    restTimerActive: false,
    restTimerRemaining: 0,
    workoutExercises: [
      upcoming(ex0, [
        { id: 's-0-1', exerciseId: ex0.id, workoutId: 'paper-render-active', setNumber: 1, setType: 'straight', actualReps: 8, weight: 75 },
      ]),
      upcoming(ex1, [
        { id: 's-1-1', exerciseId: ex1.id, workoutId: 'paper-render-active', setNumber: 1, setType: 'warmup', actualReps: 10, weight: 40 },
        { id: 's-1-2', exerciseId: ex1.id, workoutId: 'paper-render-active', setNumber: 2, setType: 'straight', actualReps: 8, weight: 70 },
      ]),
      upcoming(ex2, []),
      upcoming(ex3, []),
      upcoming(ex4, []),
      upcoming(ex5, []),
    ],
  };
}

function workoutSummaryParams(seed) {
  const { bench, row, ohp, curl, squat } = seed.exercises;
  return {
    workoutId: 'paper-render-summary', routineId: seed.routines.upperB,
    durationMinutes: 58, exerciseCount: 5, setCount: 15, workingSetCount: 13, tonnage: 6120,
    exerciseNames: [bench.name, row.name, ohp.name, curl.name, squat.name],
    detectedPRs: [{ exerciseName: bench.name, kind: 'weight', value: 82.5 }],
    exerciseData: [
      { exerciseId: bench.id, name: bench.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 75, reps: 8, setType: 'straight' }, { weight: 80, reps: 8, setType: 'straight' }, { weight: 82.5, reps: 6, setType: 'straight' },
      ] },
      { exerciseId: row.id, name: row.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 70, reps: 8, setType: 'straight' }, { weight: 72.5, reps: 8, setType: 'straight' }, { weight: 72.5, reps: 8, setType: 'straight' },
      ] },
      { exerciseId: ohp.id, name: ohp.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 45, reps: 8, setType: 'straight' }, { weight: 47.5, reps: 8, setType: 'straight' }, { weight: 47.5, reps: 8, setType: 'straight' },
      ] },
      { exerciseId: curl.id, name: curl.name, recommendedSets: 3, repsMin: 8, repsMax: 12, loggedSets: [
        { weight: 20, reps: 10, setType: 'straight' }, { weight: 22.5, reps: 10, setType: 'straight' }, { weight: 22.5, reps: 10, setType: 'straight' },
      ] },
      { exerciseId: squat.id, name: squat.name, recommendedSets: 3, repsMin: 5, repsMax: 8, loggedSets: [
        { weight: 100, reps: 5, setType: 'straight' }, { weight: 105, reps: 5, setType: 'straight' }, { weight: 110, reps: 5, setType: 'straight' },
      ] },
    ],
  };
}

// ── Prepare steps (state a screen needs that the seed does not carry) ─────
// ProOnboardingScreen holds its step in local state and resumes from the
// per-user draft the wizard itself saves (proOnboardingDraft.saveDraft), so
// the training-style step (7) is reached by saving a draft the app's own way.
// The persona is signed in, so the wizard starts past the account step.
async function prepareOnboardingStep7(seed) {
  const { saveDraft } = require('../../src/lib/proOnboardingDraft');
  await saveDraft(seed.userId, 7, {
    firstName: 'Alex', localBWUnits: 'kg', bodyWeight: '82', bodyFat: '', localHeightUnits: 'metric',
    sex: 'male', age: '29', heightCm: '180', experience: 'intermediate',
    sessionLengthMinutes: 60, daysPerWeek: 4, equipment: 'full_gym',
    trainingGoal: 'general', trainingPhase: 'lean_gain', planWeakPoints: [],
  });
}
async function clearOnboardingDraft(seed) {
  await require('../../src/lib/proOnboardingDraft').clearDraft(seed.userId);
}
// The Debug log screen lists the app's own error log. Under the harness that
// log is the mocks' noise (a file system that is not there, a server that
// never answers), not anything the app did, so it is emptied first and the
// screen shows its empty state.
async function clearDebugLog() {
  const errorLog = require('../../src/lib/errorLog');
  await errorLog.clearErrors();
  await errorLog.clearCrashLog();
}
// Community: earlier screens' mounts each run Community's background refresh
// against the mocked-empty transport, which overwrites the seeded "me" cache;
// the hub would then show the logged-out Join card. Write the seeded cache
// again just before the mount (same key, same value seedPersona wrote).
async function restoreCommunityMe(seed) {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const communityProfile = require('../../src/lib/community/profile');
  await AsyncStorage.setItem(communityProfile.meCacheKey(seed.userId), JSON.stringify(seed.communityMe));
}
// A hub segment is remembered per device (CommunityHubScreen HUB_SEGMENT_KEY)
// and a route param then wins over it; clear the memory so each variant is
// exactly the segment its param names.
async function prepareHubSegment(seed) {
  await restoreCommunityMe(seed);
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('community.hub.segment');
}
// The camera screens read the permission through the vision-camera mock
// (mockPreamble.js); this is the prompt a person sees before granting it.
async function prepareCameraPermission() { global.__PAPER_RENDER_CAMERA_PERMISSION__ = 'not-determined'; }
async function clearCameraPermission() { global.__PAPER_RENDER_CAMERA_PERMISSION__ = undefined; }
const VARIANT_PREPARE = { hubSegment: prepareHubSegment, cameraPermission: prepareCameraPermission };
// The real, deterministic day-plan generator, from the persona's saved
// nutrition target (fixed seed so the plan is the same on every run).
async function prepareDayMealPlan(seed) {
  const { generateAndSaveDayPlan } = require('../../src/lib/food/mealPlanService');
  const res = await generateAndSaveDayPlan(seed.userId, ENV.useAppStore.getState().userProfile, { seed: 7 });
  if (res && res.error) throw new Error(`meal plan seed failed: ${res.error}`);
}
// Remove the plan again (the app's own deleteMealPlan), so only the screens
// that are meant to show a planned day do.
async function clearDayMealPlan(seed) {
  const { getActiveMealPlan, deleteMealPlan } = require('../../src/lib/food/db');
  const active = await getActiveMealPlan(seed.userId);
  if (active && active.id) await deleteMealPlan(seed.userId, active.id);
}

// ── Per-screen processing ────────────────────────────────────────────────
// `variant` (optional) lets a caller pick its own filename suffix and layer an
// extra store override on top of the config's own -- used by the day-zero pass
// (suffix '-day0', a swapped-in fresh userId + userProfile, still the dark
// theme) and by the extra states.
async function processScreen(config, seed, theme, variant = {}) {
  const suffix = variant.suffix !== undefined ? variant.suffix : (theme === 'light' ? '-light' : '');
  const label = `${config.n}-${config.name}${suffix}`;
  const entry = {
    n: config.n, name: config.name, theme, group: config.group || null,
    variant: suffix ? suffix.replace(/^-/, '') : (theme === 'light' ? 'light' : ''),
    route: config.route || null, stacks: config.stacks || [], note: variant.note || config.note || null,
    htmlPath: null, pngHint: `${label}.png`, mounted: false, error: null, pageHeightPx: null, treeFallback: false,
    signals: null,
  };
  let tree = null;
  try {
    const storeOverride = { ...(config.storeOverride || {}), ...(variant.storeOverride || {}) };
    ENV.useAppStore.setState(personaStoreState(seed, storeOverride));
    if (theme === 'light') ENV.useAppStore.setState({ accessibility: { ...ENV.useAppStore.getState().accessibility, theme: 'light' } });

    // Earlier mounts' background refresh overwrites the seeded Community "me"
    // cache with the mocked-empty server answer; write it back before every
    // persona render so the persona is a member on every screen (not for the
    // day-zero account, which has none).
    if (seed.communityMe && !variant.skipCommunityMe) await restoreCommunityMe(seed);
    const prepare = variant.prepare || config.prepare;
    if (prepare) await prepare(seed);
    // eslint-disable-next-line global-require
    const Screen = require(`../../src/screens/${config.name}`).default;
    const tabBar = variant.tabBar !== undefined ? variant.tabBar : config.tabBar;
    const tabBarEl = tabBar ? buildTabBarElement(tabBar.index, tabBar.nested) : null;

    const params = variant.params !== undefined ? variant.params : (config.params || {});
    const mounted = await mountScreen(Screen, { Screen, params, extra: tabBarEl, routeName: variant.route || config.route });
    tree = mounted.tree;
    const { errors } = mounted;
    if (!tree) { entry.error = `mount produced no tree${errors.length ? `: ${errors.join(' | ')}` : ''}`; return entry; }
    entry.mounted = true;
    if (errors.length) entry.renderErrors = errors.slice(0, 10);

    const { json, fallback, error } = safeTreeJSON(tree);
    entry.treeFallback = fallback;
    if (fallback) entry.treeFallbackError = error;
    entry.signals = treeSignals(json);

    // eslint-disable-next-line global-require
    const themeMod = require('../../src/styles/theme');
    const bg = theme === 'light' ? themeMod.resolveTheme({ theme: 'light' }).colors.background : themeMod.colors.background;
    const { html, stats } = treeToHtml(json, { theme, title: label, backgroundColor: bg, phone: variant.phone || null });
    mergeConverterStats(stats);
    entry.pageHeightPx = stats.estimatedHeightPx;

    const htmlPath = path.join(HTML_DIR, `${label}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    entry.htmlPath = htmlPath;
  } catch (e) {
    entry.error = `${e && e.message}\n${(e && e.stack || '').split('\n').slice(1, 6).join('\n')}`;
  } finally {
    if (tree) { try { await ENV.TestRenderer.act(() => { tree.unmount(); }); } catch (_) { /* best-effort teardown */ } }
    global.__PAPER_RENDER_NAV__ = undefined;
    global.__PAPER_RENDER_ROUTE__ = undefined;
    if (config.cleanup && !variant.noCleanup) {
      try { await config.cleanup(seed); } catch (_) { /* best-effort: the next screen must not inherit it */ }
    }
  }
  console.log(`[paper-render] ${entry.mounted ? 'OK  ' : 'FAIL'} ${label}${entry.error ? ` -- ${entry.error.split('\n')[0]}` : ''}`);
  return entry;
}

const fakeTimers = () => jest.useFakeTimers({
  now: NOW_MS,
  doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'nextTick', 'hrtime', 'performance'],
});

// ── Test 0: the fixture and the navigator agree ──────────────────────────
test('the tab-bar fixture matches RootNavigator.js and no billing screen is registered', () => {
  const { tabs, screens } = registry.registeredScreens();
  expect(tabs.map((t) => ({ name: t.name, title: t.title, icon: t.icon, iconOutline: t.iconOutline })))
    .toEqual(TAB_DEFS.map((d) => ({ name: d.name, title: d.title, icon: d.icon, iconOutline: d.iconOutline })));
  const dormant = ['ProUpgradeScreen', 'SubscriptionScreen', 'CascadeGateScreen', 'SubscriptionPolicyScreen'];
  expect(screens.map((s) => s.component).filter((c) => dormant.includes(c))).toEqual([]);
  // Every registered component has a file to mount.
  const missing = screens.map((s) => s.component).filter((c) => !fs.existsSync(path.join(__dirname, '..', '..', 'src', 'screens', `${c}.js`)));
  expect(missing).toEqual([]);
  REPORT.registered = { count: screens.length, components: screens.map((s) => s.component) };
});

// ── Plan state shared by the blocks below ────────────────────────────────
let PLAN = null; // { plan, width }
const planByName = (name) => PLAN.plan.find((p) => p.name === name);

// ── Test 1: seed + the every-screen dark pass ────────────────────────────
test('seed the persona and paper-render every registered screen in dark theme', async () => {
  fakeTimers();

  const seed = await seedPersona();
  REPORT.dataLayerNote = seed.dataLayer;
  REPORT.bypassedWrites = seed.bypassedWrites;
  REPORT.seedNotes = seed.notes;
  REPORT.userId = seed.userId;
  REPORT.lastWeekMonday = seed.lastWeekMonday;
  REPORT.diaryTotalKcal = seed.diaryTotalKcal;
  console.log('[paper-render] seed complete, userId =', seed.userId);

  // Ids the screens' params need that the seed does not hand back.
  const database = require('../../src/lib/database');
  const dayKey = require('../../src/lib/dayKey');
  const { topSetFromExerciseData, liftOptionsFromExerciseData, intensityTier } = require('../../src/lib/sessionShareData');
  const workouts = (await database.getAllWorkouts(seed.userId)).filter((w) => w.isCompleted);
  const mesocycles = await database.getAllMesocycles(seed.userId);
  const earliest = workouts.length ? Math.min(...workouts.map((w) => w.startedAt)) : null;
  const ids = {
    workoutId: workouts[0] ? workouts[0].id : null,
    olderWorkoutId: workouts[1] ? workouts[1].id : null,
    mesocycleId: mesocycles[0] ? mesocycles[0].id : null,
    todayKey: dayKey.localDayKey(NOW_MS),
    thisWeekMonday: dayKey.localWeekStartMs(NOW_MS),
  };
  const summaryParams = workoutSummaryParams(seed);
  const sessionData = {
    sessionName: 'Upper B',
    date: workouts[0] ? workouts[0].startedAt : NOW_MS - 3 * DAY_MS,
    duration: summaryParams.durationMinutes,
    workingSets: summaryParams.workingSetCount,
    exerciseCount: summaryParams.exerciseCount,
    tonnage: summaryParams.tonnage,
    prCount: summaryParams.detectedPRs.length,
    topSet: topSetFromExerciseData(summaryParams.exerciseData),
    liftOptions: liftOptionsFromExerciseData(summaryParams.exerciseData),
    highlightOptions: [],
    intensityTier: intensityTier(summaryParams.detectedPRs.length, summaryParams.tonnage, summaryParams.workingSetCount),
    units: 'kg',
  };
  // The summary as History opens it (WorkoutHistoryScreen's own params), built
  // from the finished session's stored rows.
  const historySets = ids.workoutId ? await database.getWorkoutSetsForWorkout(ids.workoutId) : [];
  const nameById = Object.fromEntries(Object.values(seed.exercises).filter(Boolean).map((e) => [e.id, e.name]));
  const historyWorking = historySets.filter((st) => st.setType !== 'warmup');
  const historyParams = workouts[0] ? {
    workoutId: workouts[0].id,
    durationMinutes: workouts[0].durationMinutes,
    exerciseCount: new Set(historySets.map((st) => st.exerciseId)).size,
    setCount: historySets.length,
    workingSetCount: historyWorking.length,
    tonnage: Math.round(historyWorking.reduce((sum, st) => sum + (Number(st.weight) || 0) * (Number(st.actualReps) || 0), 0)),
    exerciseNames: [...new Set(historySets.map((st) => nameById[st.exerciseId]).filter(Boolean))],
    startedAt: workouts[0].startedAt,
    endedAt: workouts[0].endedAt,
    routineId: workouts[0].routineId ?? null,
    routineName: workouts[0].routineName ?? null,
    readOnly: true,
  } : null;
  const { recentMonthRecapParams } = require('../../src/components/coach/CoachProgress');
  const monthRecapParams = recentMonthRecapParams(earliest);
  REPORT.ids = ids;

  PLAN = buildPlan({
    seed, ids, summaryParams, historyParams, sessionData, monthRecapParams, mockChallengeId: MOCK_CHALLENGE_ID,
    hooks: {
      ActiveWorkoutScreen: { storeOverride: activeWorkoutOverride(seed) },
      MealPlanScreen: { prepare: prepareDayMealPlan, cleanup: clearDayMealPlan },
      // The wizard's saved draft would make StartChoice skip itself.
      ProOnboardingScreen: { prepare: prepareOnboardingStep7, cleanup: clearOnboardingDraft },
      CommunityHubScreen: { prepare: restoreCommunityMe },
      DebugLogScreen: { prepare: clearDebugLog },
    },
  });
  REPORT.plan = PLAN.plan.map((p) => ({
    n: p.n, name: p.name, group: p.group, route: p.route, stacks: p.stacks, tabBar: p.tabBar,
    variants: p.variants.map((v) => v.suffix), hasParamsEntry: p.hasParamsEntry,
  }));
  REPORT.nPadWidth = PLAN.width;
  // A newly registered screen with no params entry still renders (empty
  // params); it is named here so the gap is visible rather than silent.
  REPORT.screensWithoutParamsEntry = PLAN.plan.filter((p) => !p.hasParamsEntry).map((p) => p.name);
  expect(PLAN.plan.length).toBe(REPORT.registered.count);

  const selected = QUICK ? PLAN.plan.filter((p) => ONLY.includes(p.name)) : PLAN.plan;
  expect(selected.length).toBeGreaterThan(0);

  for (const config of selected) {
    // eslint-disable-next-line no-await-in-loop
    REPORT.screens.push(await processScreen(config, seed, 'dark'));
    for (const v of config.variants) {
      const prepare = VARIANT_PREPARE[v.prepareKey] || config.prepare;
      // eslint-disable-next-line no-await-in-loop
      REPORT.screens.push(await processScreen(
        { ...config, route: v.route || config.route, cleanup: v.prepareKey === 'cameraPermission' ? clearCameraPermission : config.cleanup },
        seed, 'dark',
        { suffix: `-${v.suffix}`, params: v.params, prepare, tabBar: v.tabBar, note: v.note },
      ));
    }
  }
  // The segment memory the hub variants wrote must not leak into later passes.
  try { await require('@react-native-async-storage/async-storage').default.removeItem('community.hub.segment'); } catch (_) { /* best-effort */ }

  global.__PAPER_RENDER_SEED__ = seed;
  jest.useRealTimers();
});

// ── Test 1b: day-zero pass (fresh account, dark theme) ───────────────────
// Same live database, same module instances as test 1 (no jest.resetModules
// -- that only happens before the light pass below), a second user with a
// saved body profile + nutrition targets (seedDayZeroPersona's own header
// explains why those two writes and nothing else) and no plan, session, food
// entry or weight entry at all -- "the founder judges the app on a fresh
// account" (brief).
const DAY_ZERO_SCREENS = [
  'HomeScreen', 'YouScreen', 'DiaryScreen', 'PlansScreen', 'RecoveryScreen', 'ConsistencyScreen', 'VolumeHeatmapScreen',
];
full('paper-render the day-zero variant of Today, Coach, Nutrition, Train and the three progress screens', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();

  const dayZero = await seedDayZeroPersona();
  console.log('[paper-render] day-zero seed complete, userId =', dayZero.userId);
  const daySeed = { ...seed, userId: dayZero.userId };
  const dayZeroStoreOverride = {
    userProfile: {
      firstName: dayZero.firstName, sex: dayZero.sex, goal: 'lean_gain', trainingFocus: 'hypertrophy',
      units: 'kg', coachAutonomy: 'collaborative', coachTone: 'automatic',
    },
  };

  const before = REPORT.screens.length;
  for (const name of DAY_ZERO_SCREENS) {
    // eslint-disable-next-line no-await-in-loop
    const entry = await processScreen(planByName(name), daySeed, 'dark', {
      suffix: '-day0', storeOverride: dayZeroStoreOverride, skipCommunityMe: true, note: 'a brand-new account: no plan, session, food or weigh-in',
    });
    REPORT.screens.push(entry);
  }
  jest.useRealTimers();
  expect(REPORT.screens.length).toBe(before + DAY_ZERO_SCREENS.length);
});

// ── Test 1c: the Welcome screen's product captures ───────────────────────
// The first-launch Welcome screen shows three real captures of the app
// (register D145): Today, a set being logged, the day's nutrition. The
// founder, 2026-09-26: the captures were rendered by Claude Code, not taken
// by hand, so they are re-rendered here from the current app whenever it
// changes. The same persona and dark theme as test 1, laid out as one phone
// screen (treeToHtml opts.phone) with the real tab bar at its foot, on a
// clean account: the two one-time offers (the how-you-train offer on Today,
// the meal-reminder offer on Nutrition) are dismissed through the same
// storage keys their own "No thanks" and "Not now" buttons write, and the
// keys are removed again afterwards so the light pass below renders exactly
// as before. The entries go to REPORT.welcome, not REPORT.screens, so the
// contact sheet and its counts are unchanged; welcome.js shoots them.
const WELCOME_CAPTURES = [
  { name: 'HomeScreen', file: 'today' },
  { name: 'ActiveWorkoutScreen', file: 'workout' },
  { name: 'DiaryScreen', file: 'nutrition' },
];
// 480 x 940, the Welcome assets' own size, at 412 CSS pixels wide.
const WELCOME_PHONE_HEIGHT = Math.round(412 * (940 / 480));

full('paper-render the Welcome captures (Today, a set being logged, Nutrition)', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const { MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR } = require('../../src/lib/food/mealReminderOffer');
  const dismissed = [`@volyume_hyt_offer_${seed.userId}`, MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR(seed.userId)];
  for (const key of dismissed) {
    // eslint-disable-next-line no-await-in-loop
    await AsyncStorage.setItem(key, 'true');
  }

  REPORT.welcome = [];
  try {
    for (const capture of WELCOME_CAPTURES) {
      // eslint-disable-next-line no-await-in-loop
      const entry = await processScreen(planByName(capture.name), seed, 'dark', { suffix: '-welcome', phone: { height: WELCOME_PHONE_HEIGHT } });
      REPORT.welcome.push({ ...entry, file: capture.file, cssHeight: WELCOME_PHONE_HEIGHT });
    }
  } finally {
    for (const key of dismissed) {
      // eslint-disable-next-line no-await-in-loop
      await AsyncStorage.removeItem(key);
    }
    jest.useRealTimers();
  }
  expect(REPORT.welcome.every((e) => e.mounted)).toBe(true);
});

// ── Test 1d: the store listing screenshots (Play + App Store) ────────────
// D211's own "Open, founder-side" note: "The Play and App Store listing
// screenshots are separate uploads in the consoles and still show the July
// screens; the same harness can render a full store set on request." This
// test is that request. Same persona and dark theme as the Welcome pass
// above, on the same clean account (the same two offer-dismissal keys, set
// before and removed after); one phone screen per capture (treeToHtml
// opts.phone), with the real tab bar at the foot for every capture that is
// a tab root. Unlike the Welcome pass's single 480x940 asset size, a store
// listing needs two different phone aspect ratios -- Play (1080x1920,
// 9:16) and the App Store (1290x2796) -- so EACH capture is rendered
// TWICE, once per platform's own CSS height at the same 412 CSS px width
// (a taller/shorter phone shows a different amount of scrollable content,
// not a scaled photo of the same one). store.js shoots each HTML file at
// the device scale that gives that platform's target pixel width and
// crops/scales to the exact target size with CanvasKit. Entries go to
// REPORT.store, never REPORT.screens, so the per-screen counts stay what the
// every-screen pass says they are.
const STORE_PLATFORMS = [
  { key: 'play', targetWidth: 1080, targetHeight: 1920 },
  { key: 'appstore', targetWidth: 1290, targetHeight: 2796 },
].map((p) => ({ ...p, cssHeight: Math.round(412 * (p.targetHeight / p.targetWidth)) }));

// Store set v2 (D210 addendum 2): Recovery is shot twice, each starting at
// its own section (treeToHtml opts.phone.scrollToText): the muscle figure,
// and the "Your recovery speed" card the personal learner fills. Play takes
// at most eight phone screenshots; the founder picks which eight from these
// ten when uploading. D231: the Progress tab is gone; its capture is now the
// Coach tab, and Recovery is opened from the Coach tab's stack. `tabBar:
// null` keeps the captures that were taken without the bar bar-less.
const STORE_CAPTURES = [
  { n: '01', file: 'today', name: 'HomeScreen' }, // Today (tab 0)
  { n: '02', file: 'train', name: 'PlansScreen' }, // Train (tab 1)
  { n: '03', file: 'set-logged', name: 'ActiveWorkoutScreen' }, // no tab bar (the band hides itself)
  { n: '04', file: 'workout-summary', name: 'WorkoutSummaryScreen', tabBar: null },
  { n: '05', file: 'coach', name: 'YouScreen' }, // Coach (tab 3)
  { n: '06', file: 'recovery', name: 'RecoveryScreen', scrollToText: 'Recovery by muscle' }, // from Coach (tab 3)
  { n: '07', file: 'recovery-speed', name: 'RecoveryScreen', scrollToText: 'Your recovery speed' },
  { n: '08', file: 'nutrition', name: 'DiaryScreen' }, // Nutrition (tab 2)
  { n: '09', file: 'weekly-coaching', name: 'CoachOutputScreen', tabBar: null },
  { n: '10', file: 'community', name: 'CommunityHubScreen' }, // Community (tab 4)
];

full('paper-render the store listing screenshots (Play + App Store)', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const { MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR } = require('../../src/lib/food/mealReminderOffer');
  const dismissed = [`@volyume_hyt_offer_${seed.userId}`, MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR(seed.userId)];
  for (const key of dismissed) {
    // eslint-disable-next-line no-await-in-loop
    await AsyncStorage.setItem(key, 'true');
  }

  // The persona's history (seedPersona.js 4b) was generated at a recovery
  // speed faster than the start; the learner must find that on its own
  // from the seeded rows, through the app's own loader, or the Recovery
  // captures would show a card the persona did not earn.
  const { loadMuscleRecovery, __resetPersonalMemoForTests } = require('../../src/lib/recovery/load');
  __resetPersonalMemoForTests();
  const recoveryLoad = await loadMuscleRecovery(seed.userId, NOW_MS);
  REPORT.storePersonal = recoveryLoad.personal;
  console.log(`[paper-render] store persona recovery speed: ${JSON.stringify(recoveryLoad.personal)}`);
  expect(recoveryLoad.personal && recoveryLoad.personal.reason).toBe('adjusted');
  expect(recoveryLoad.personal.factor).toBeLessThan(recoveryLoad.personal.prior);

  REPORT.store = [];
  try {
    for (const capture of STORE_CAPTURES) {
      const base = planByName(capture.name);
      const config = capture.tabBar === null ? { ...base, tabBar: null } : base;
      for (const platform of STORE_PLATFORMS) {
        const suffix = `-store-${platform.key}-${capture.n}`;
        const phone = capture.scrollToText
          ? { height: platform.cssHeight, scrollToText: capture.scrollToText }
          : { height: platform.cssHeight };
        // eslint-disable-next-line no-await-in-loop
        const entry = await processScreen(config, seed, 'dark', { suffix, phone });
        REPORT.store.push({
          ...entry,
          n: capture.n,
          file: capture.file,
          platform: platform.key,
          cssHeight: platform.cssHeight,
          targetWidth: platform.targetWidth,
          targetHeight: platform.targetHeight,
        });
      }
    }
  } finally {
    for (const key of dismissed) {
      // eslint-disable-next-line no-await-in-loop
      await AsyncStorage.removeItem(key);
    }
    jest.useRealTimers();
  }
  expect(REPORT.store.every((e) => e.mounted)).toBe(true);
});

// ── Test 1e: Nutrition with a planned day ────────────────────────────────
// A day plan is generated by the app's own day-plan generator and written to
// TOMORROW's diary as planned meals (applyPlanDayMerging, the call "Add to
// diary" makes), then the Diary opens on that date. Tomorrow, because a day
// that already holds logged meals only takes the plan's unfilled meals; a
// whole planned day is the state worth looking at. Removed again afterwards.
full('paper-render Nutrition with planned meals', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();
  try {
    const dayKey = require('../../src/lib/dayKey');
    const tomorrow = dayKey.localDayKey(NOW_MS + DAY_MS);
    const { generateAndSaveDayPlan, applyPlanDayMerging } = require('../../src/lib/food/mealPlanService');
    const foodDb = require('../../src/lib/food/db');
    const config = planByName('DiaryScreen');
    REPORT.screens.push(await processScreen(
      {
        ...config,
        cleanup: async () => {
          await foodDb.clearPlannedDay(seed.userId, tomorrow);
          await clearDayMealPlan(seed);
        },
      },
      seed, 'dark',
      {
        suffix: '-planned',
        params: { date: tomorrow },
        prepare: async () => {
          const res = await generateAndSaveDayPlan(seed.userId, ENV.useAppStore.getState().userProfile, { seed: 7 });
          if (res && res.error) throw new Error(`meal plan seed failed: ${res.error}`);
          await applyPlanDayMerging(seed.userId, res.plan.days[0], { entryDate: tomorrow, replacePlanned: true });
        },
        note: 'tomorrow, with a generated day plan added as planned meals',
      },
    ));
  } finally {
    jest.useRealTimers();
  }
});

// ── Reload the module registry (the theme singleton is read at module
// load; AsyncStorage's mock loses its contents with it, so the persona's two
// client-only pieces are written again) ───────────────────────────────────
async function reloadModules(seed, themeName) {
  try { await require('../../src/lib/database').closeDatabase(); } catch (_) { /* best-effort */ }
  jest.resetModules();
  ENV.React = require('react');
  ENV.TestRenderer = require('react-test-renderer');
  ENV.useAppStore = require('../../src/store/useAppStore').default;
  // Re-open + re-verify the real (already-migrated, already-seeded) SQLite
  // file, then set the legacy theme singleton BEFORE any screen module that
  // reads it statically is required for the first time this pass.
  await require('../../src/lib/database').initDatabase();
  if (themeName === 'light') {
    require('../../src/styles/theme').applyAccessibility({ theme: 'light', higherContrast: false, colorBlindSafe: false, largerText: false });
  }
  await seedClientState(seed.userId);
}

// ── Test 2: light theme ──────────────────────────────────────────────────
const LIGHT_SCREENS = ['HomeScreen', 'YouScreen', 'DiaryScreen', 'RecoveryScreen', 'ConsistencyScreen', 'VolumeHeatmapScreen'];
full('paper-render the light theme variant of Today, Coach, Nutrition and the progress screens', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();

  // Close the dark pass's handle before the module registry that owns it
  // is discarded -- a stale open connection must never outlive its module.
  await reloadModules(seed, 'light');

  const before = REPORT.screens.length;
  for (const name of LIGHT_SCREENS) {
    // eslint-disable-next-line no-await-in-loop
    REPORT.screens.push(await processScreen(planByName(name), seed, 'light'));
  }
  jest.useRealTimers();
  expect(REPORT.screens.length).toBe(before + LIGHT_SCREENS.length);
});

// ── Test 3: this week's coaching decision (dark, after a reload) ─────────
// Last, because it saves this week's check-in and decision, which the earlier
// passes must not see (Weekly check-in would read "done", Today and Coach
// would already carry the decision).
full('paper-render Today and Coach with this week\'s coaching decision', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();
  fakeTimers();

  await reloadModules(seed, 'dark');
  await seedThisWeekDecision(seed.userId, jest);
  REPORT.bypassedWrites.push(
    'This week\'s check-in and coaching decision (the "decision" renders only) are saved through '
    + 'saveWeeklyCheckin() and saveCoachOutput(), with the same authored decision content the persona '
    + 'carries for last week -- not the output of running runWeeklyCoach().',
  );
  for (const name of ['HomeScreen', 'YouScreen']) {
    // eslint-disable-next-line no-await-in-loop
    REPORT.screens.push(await processScreen(planByName(name), seed, 'dark', {
      suffix: '-decision', note: 'this week\'s check-in is done and its coaching decision exists',
    }));
  }
  jest.useRealTimers();
});

afterAll(async () => {
  try { await require('../../src/lib/database').closeDatabase(); } catch (_) { /* best-effort */ }
  try { await require('./expoSqliteShim').__closeAllForTests(); } catch (_) { /* best-effort */ }
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(REPORT, null, 2), 'utf8');
  console.log('[paper-render] report data written to', REPORT_JSON);
});
