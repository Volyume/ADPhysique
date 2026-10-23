/**
 * scripts/paper-render/screenPlan.js
 *
 * The every-screen plan: one entry per screen component the app registers in
 * src/navigation/RootNavigator.js (all navigators, de-duplicated by
 * component), with its group, the route params it reads, where the tab bar
 * sits under it, and any extra states worth a render of their own.
 *
 * The list of screens comes from registry.js (RootNavigator.js read as text),
 * never from a hand-kept array here, so a newly registered screen is rendered
 * the next run (with empty params and a note) rather than silently missed.
 * The per-screen params are this file's hand-kept part: each was taken from
 * the screen's own `route.params` reads (the file and line are named beside
 * the entry when the shape is not obvious).
 *
 * Pure Node: no Jest, no React, no app imports. The seed's ids arrive in
 * `ctx`; anything that needs the app's store or database (a store override,
 * a prepare step) is passed in through `ctx.hooks` by paper-render.test.js.
 */
'use strict';

const { registeredScreens, parseStackScreens, PRE_MAIN_STACKS } = require('./registry');

const GROUP_ORDER = ['Today', 'Train', 'Nutrition', 'Coach', 'Community', 'Settings', 'Setup and sign-in', 'Other'];

// Settings and everything Settings opens: SettingsScreen.js's own
// navigate('...') targets, plus SetNewPassword (opened from
// SettingsSignInMethods). A screen here is grouped under Settings even when
// another tab's stack registers it first (SettingsWorkout is in Today's
// stack as well). PrivacyPolicy, DebugLog and Credits are reached from
// Settings, so they sit here too.
const SETTINGS_OPENS = new Set([
  'SettingsScreen', 'Snapshots', 'SetNewPassword', 'NotificationSettings', 'CoachingReminders',
  'Import', 'PrivacyPolicy', 'DebugLog', 'Credits', 'CommunityPrivacy',
]);

// The order a group is shown in where the navigator's own order is not the
// one a person meets: Settings first, then the sign-in-to-first-plan flow.
const FLOW_ORDER = [
  'SettingsScreen',
  'WelcomeScreen', 'LoginScreen', 'Article9ConsentScreen', 'StartChoiceScreen', 'ProOnboardingScreen', 'ProSetupCompleteScreen',
];

// The setup wizard is one component registered twice (ProOnboarding in the
// onboarding stack, CoachingSetup in Coach's): its home is setup.
const SETUP_SCREENS = new Set(['ProOnboardingScreen']);

function isSettings(componentName) {
  return /^Settings/.test(componentName.replace(/Screen$/, '')) || SETTINGS_OPENS.has(componentName)
    || SETTINGS_OPENS.has(componentName.replace(/Screen$/, ''));
}

/**
 * The group a screen is listed under:
 *  - Settings: Settings* screens and what Settings opens (above);
 *  - Setup and sign-in: the setup wizard and screens registered only in the
 *    signed-out, consent and onboarding stacks;
 *  - otherwise the FIRST tab (in tab order) whose stack registers it;
 *  - Other: anything none of those place.
 */
function groupFor(entry) {
  if (SETUP_SCREENS.has(entry.component)) return 'Setup and sign-in';
  if (isSettings(entry.component)) return 'Settings';
  if (entry.firstTab) return entry.firstTab;
  if (entry.stacks.length && entry.stacks.every((s) => PRE_MAIN_STACKS.has(s))) return 'Setup and sign-in';
  return 'Other';
}

/**
 * Where the tab bar goes. Screens in a tab's stack show that tab's bar under
 * them on a device (it is the Tab navigator's, not the screen's); the
 * ActiveWorkout route hides the band itself (VolyumeTabBar returns null for
 * it). Setup, sign-in and consent stacks have no tab bar. Settings screens
 * sit in Coach's stack. Returns { index, nested } where `nested` is the
 * route to show as focused inside the tab, or undefined for the tab's root.
 */
function tabBarFor(entry, group, tabs) {
  if (group === 'Setup and sign-in') return null;
  let index = entry.firstTabIndex;
  let route = entry.firstTabRoute;
  if (group === 'Settings') {
    const coachIndex = tabs.findIndex((t) => t.stack === 'ProfileStack');
    const hit = entry.routes.find((r) => r.stack === 'ProfileStack');
    if (coachIndex >= 0 && hit) { index = coachIndex; route = hit.route; }
  }
  if (index === null || index === undefined || !route) return null;
  const isRoot = tabs[index].rootComponent === entry.component;
  return { index, nested: isRoot ? undefined : route };
}

function pad(i, width) { return String(i).padStart(width, '0'); }

/**
 * @param {object} ctx
 * @param {object} ctx.seed        seedPersona() result
 * @param {object} ctx.ids         { workoutId, olderWorkoutId, mesocycleId, todayKey, thisWeekMonday }
 * @param {object} ctx.summaryParams  workoutSummaryParams(seed)
 * @param {object} ctx.sessionData the share card's session data
 * @param {string} ctx.mockChallengeId
 * @param {object} ctx.monthRecapParams the monthly recap's route params
 * @param {object} ctx.historyParams the summary params History opens a finished session with
 * @param {Record<string,{storeOverride?:object, prepare?:Function, cleanup?:Function}>} [ctx.hooks]
 */
function buildPlan(ctx) {
  const { tabs, screens } = registeredScreens();
  // The root of each tab: the first screen its stack registers.
  const rows = parseStackScreens();
  for (const t of tabs) {
    const first = rows.find((r) => r.stack === t.stack);
    t.rootComponent = first ? first.component : null;
  }

  // Order: tab stacks in tab order (a tab's root first), then the rest, each
  // component once; then stable-sorted by group.
  const seen = new Set();
  const ordered = [];
  const take = (component) => {
    if (seen.has(component)) return;
    const s = screens.find((x) => x.component === component);
    if (s) { seen.add(component); ordered.push(s); }
  };
  for (const t of tabs) rows.filter((r) => r.stack === t.stack).forEach((r) => take(r.component));
  rows.forEach((r) => take(r.component));

  const withGroup = ordered.map((s) => ({ ...s, group: groupFor(s) }));
  // Within a group the navigator's own order stands, except that Settings
  // opens with Settings itself and Setup and sign-in runs in the order a new
  // person meets it (a screen not named in FLOW_ORDER keeps its place).
  const flowRank = (s) => {
    const i = FLOW_ORDER.indexOf(s.component);
    return i >= 0 ? i : FLOW_ORDER.length;
  };
  withGroup.sort((a, b) => (GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)) || (flowRank(a) - flowRank(b)));

  const width = Math.max(2, String(withGroup.length).length);
  const { seed, ids } = ctx;
  const R = seed.routines;
  const bench = seed.exercises.bench;
  const defaultSlots = { mealSlot: 'lunch', entryDate: ids.todayKey };

  // Route params per screen, from each screen's own route.params reads.
  const PARAMS = {
    // Today
    WorkoutSummaryScreen: ctx.summaryParams,
    ShareCardScreen: { sessionData: ctx.sessionData, workoutId: ids.workoutId, prData: ctx.summaryParams.detectedPRs[0] ? {
      exerciseName: ctx.summaryParams.detectedPRs[0].exerciseName, kind: 'weight', value: ctx.summaryParams.detectedPRs[0].value,
    } : null },
    ClipCameraScreen: { workoutId: ids.workoutId, exerciseId: bench.id, exerciseName: bench.name, setNumber: 2 },
    CommunityComposeScreen: { kind: 'session', workoutId: ids.workoutId },
    CommunityPostScreen: { id: 'paper-render-post' },
    // Train
    PlanDetailScreen: { planId: seed.programmeId, isLibrary: false },
    RoutineDetailScreen: { routineId: R.upperA },
    ExerciseDetailScreen: { exerciseId: bench.id },
    // Nutrition
    MealPlanScreen: { entryDate: ids.todayKey },
    FoodSearchScreen: { ...defaultSlots },
    AddCustomFoodScreen: { ...defaultSlots },
    ScanBarcodeScreen: { ...defaultSlots },
    ScanLabelScreen: { ...defaultSlots },
    MyRecipesScreen: { ...defaultSlots },
    MyMealsScreen: { ...defaultSlots },
    RecipeBuilderScreen: { ...defaultSlots },
    // Coach
    CoachOutputScreen: { weekStart: seed.lastWeekMonday },
    BlockReflectionScreen: { mesocycleId: ids.mesocycleId },
    GoalChangeSummaryScreen: {
      previous: { goal: 'lean_gain', phase: 'lean_gain', approach: 'lbm', kcal: 2650, protein: 170, carbs: 313, fat: 80 },
      next: { goal: 'lean_gain', phase: 'maintenance', approach: 'lbm', kcal: 2500, protein: 170, carbs: 285, fat: 75 },
      planRerolled: false, planKeptReason: 'training_on_train',
    },
    GoalLockConsentScreen: { editMode: true },
    MethodologyScreen: { source: 'coach' },
    // Community (the server answers nothing here: whatever the screen shows
    // for an id it cannot find is the render)
    ChallengeJoinScreen: { code: 'IRON2026', source: 'link' },
    ChallengeScreen: { id: ctx.mockChallengeId },
    CommunityProfileScreen: { handle: 'iron_mara' },
    CommunityDimensionScreen: { kind: 'gym', key: 'ironworks-leeds', label: 'Ironworks Gym, Leeds' },
    CommunityBoardScreen: { scope: 'gym', scopeKey: 'ironworks-leeds', label: 'Ironworks Gym, Leeds' },
    CommunityGroupScreen: { id: 'paper-render-group' },
    CommunityGroupMembersScreen: { id: 'paper-render-group', name: 'Leeds lifters', myRole: 'admin' },
    CommunityPeopleListScreen: { mode: 'like_me', label: 'People like you' },
    CommunityConversationScreen: { id: 'paper-render-conversation', userId: 'paper-render-user' },
    CommunityGroupChatScreen: { id: 'paper-render-group', name: 'Leeds lifters' },
  };

  // Screens that read no route params, or only optional ones that change
  // nothing a first look needs (checked against each screen's route.params
  // use). A registered screen in neither PARAMS nor here is reported in
  // report-data.json as `screensWithoutParamsEntry`: it was rendered with
  // empty params and its params were never looked at.
  const NO_PARAMS = new Set([
    'HomeScreen', 'BuildWorkoutScreen', 'ActiveWorkoutScreen', 'WorkoutHistoryScreen', 'CoachReviewScreen',
    'HowYouTrainScreen', 'HowYouTrainAddScreen', 'TrainingConsiderationsScreen', 'AvoidedMovementsScreen',
    'PlansScreen', 'PlanUpdateScreen', 'ManualBuilderScreen', 'PlanLibraryScreen', 'MesocycleBuilderScreen',
    'VolumeHeatmapScreen', 'DiaryScreen', 'FoodInsightsScreen', 'YouScreen', 'NutritionTargetsScreen',
    'NutritionEducationScreen', 'BodyMetricsScreen', 'ProgressPhotosScreen', 'LiftProgressScreen',
    'ConsistencyScreen', 'RecoveryScreen', 'YearOfLiftsScreen', 'WeeklyCheckInScreen', 'WeeklyStoryScreen',
    'CoachHeldHistoryScreen', 'ProGoalSetupScreen', 'WellbeingCheckScreen', 'CommunityHubScreen',
    'CommunityJoinScreen', 'CommunityEditProfileScreen', 'CommunitySearchScreen', 'CommunityActivityScreen',
    'CommunityGroupCreateScreen', 'CommunityRulesScreen', 'CommunityModerationScreen', 'CommunityGymAddScreen',
    'CommunityFindPeopleScreen', 'CommunityTrainingProfileScreen', 'CommunityConversationsScreen',
    'CommunityFollowersScreen', 'CommunityConnectionsScreen', 'SettingsWorkoutScreen', 'SettingsScreen',
    'CommunityPrivacyScreen', 'SettingsAccountScreen', 'SettingsSignInMethodsScreen', 'SetNewPasswordScreen',
    'SettingsProfileScreen', 'SettingsCoachingScreen', 'SettingsDisplayScreen', 'SettingsUnitsScreen',
    'SettingsDataScreen', 'SettingsDietaryScreen', 'SnapshotsScreen', 'SettingsPrivacyScreen',
    'SettingsAboutScreen', 'SettingsFaqScreen', 'NotificationSettingsScreen', 'ImportScreen',
    'CoachingRemindersScreen', 'PrivacyPolicyScreen', 'DebugLogScreen', 'CreditsScreen', 'ProOnboardingScreen',
    'WelcomeScreen', 'LoginScreen', 'Article9ConsentScreen', 'StartChoiceScreen', 'ProSetupCompleteScreen',
  ]);

  // Extra states of a screen, rendered as `NN-ScreenName-variant`.
  const VARIANTS = {
    WorkoutSummaryScreen: [
      { suffix: 'history', params: ctx.historyParams || { workoutId: ids.workoutId, readOnly: true },
        note: 'a finished session reopened from history (readOnly)' },
    ],
    YearOfLiftsScreen: [
      { suffix: 'month', route: 'RecapStory', params: ctx.monthRecapParams, note: 'the monthly recap (RecapStory route)' },
      { suffix: 'block', route: 'RecapStory', params: { variant: 'block', mesocycleId: ids.mesocycleId, blockName: 'Upper Lower 4-Day' },
        note: 'the block recap (RecapStory route)' },
    ],
    ScanBarcodeScreen: [
      { suffix: 'permission', prepareKey: 'cameraPermission', note: 'before camera access is given' },
    ],
    ScanLabelScreen: [
      { suffix: 'permission', prepareKey: 'cameraPermission', note: 'before camera access is given' },
    ],
    LoginScreen: [
      { suffix: 'signup', params: { intent: 'pro_signup' }, note: 'the sign-up sheet' },
    ],
    ProOnboardingScreen: [
      { suffix: 'coaching', route: 'CoachingSetup', tabBarStack: 'ProfileStack', params: { mode: 'coaching' }, note: 'the coaching set-up (CoachingSetup route, Coach stack)' },
    ],
    CommunityHubScreen: [
      { suffix: 'feed', params: { segment: 'feed' }, prepareKey: 'hubSegment', note: 'segment Feed' },
      { suffix: 'people', params: { segment: 'people' }, prepareKey: 'hubSegment', note: 'segment People' },
      { suffix: 'groups', params: { segment: 'groups' }, prepareKey: 'hubSegment', note: 'segment Groups' },
      { suffix: 'you', params: { segment: 'you' }, prepareKey: 'hubSegment', note: 'segment You' },
    ],
  };

  const hooks = ctx.hooks || {};
  const plan = withGroup.map((s, i) => {
    const name = s.component;
    const group = s.group;
    const base = {
      n: pad(i + 1, width),
      name,
      component: name,
      group,
      stacks: s.stacks,
      routes: s.routes,
      route: (s.firstTabRoute && group !== 'Setup and sign-in') ? s.firstTabRoute : s.routes[0].route,
      tabBar: tabBarFor(s, group, tabs),
      params: PARAMS[name] || {},
      hasParamsEntry: Object.prototype.hasOwnProperty.call(PARAMS, name) || NO_PARAMS.has(name),
      storeOverride: hooks[name] && hooks[name].storeOverride,
      prepare: hooks[name] && hooks[name].prepare,
      cleanup: hooks[name] && hooks[name].cleanup,
    };
    base.variants = (VARIANTS[name] || []).map((v) => {
      // A variant on another route keeps the tab but names its own route as
      // the one in focus; one in another tab's stack (the Coach tab's
      // CoachingSetup) names that stack.
      let tabBar = base.tabBar;
      if (v.tabBarStack) {
        const index = tabs.findIndex((t) => t.stack === v.tabBarStack);
        tabBar = index >= 0 ? { index, nested: v.route } : null;
      } else if (v.route && base.tabBar) {
        tabBar = { ...base.tabBar, nested: v.route };
      }
      return { ...v, tabBar };
    });
    return base;
  });
  return { plan, tabs, width, groupOrder: GROUP_ORDER };
}

module.exports = { buildPlan, groupFor, GROUP_ORDER, SETTINGS_OPENS };
