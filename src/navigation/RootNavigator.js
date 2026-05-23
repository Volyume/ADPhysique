import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StackActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

export const navigationRef = createNavigationContainerRef();
import { View, Text, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SPLASH_HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;
const SPLASH_W = Math.round(Dimensions.get('window').width * 0.7);
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontWeight, spacing } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getSupabaseClient } from '../lib/supabase';
import { initDatabase } from '../lib/database';
import { seedExercisesIfNeeded } from '../lib/seedExercises';
import { configureNotificationHandler, restoreNotifications } from '../lib/notifications';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import BuildWorkoutScreen from '../screens/BuildWorkoutScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import VolumeHeatmapScreen from '../screens/VolumeHeatmapScreen';
import PRWallScreen from '../screens/PRWallScreen';
import BodyMetricsScreen from '../screens/BodyMetricsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AthleteHubScreen from '../screens/AthleteHubScreen';
import PlansScreen from '../screens/PlansScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import MesocycleBuilderScreen from '../screens/MesocycleBuilderScreen';
import ShareCardScreen from '../screens/ShareCardScreen';
import ManualBuilderScreen from '../screens/ManualBuilderScreen';
import NutritionTargetsScreen from '../screens/NutritionTargetsScreen';
import PlanLibraryScreen from '../screens/PlanLibraryScreen';
import FirstRunScreen from '../screens/FirstRunScreen';
import WeeklyCheckInScreen from '../screens/WeeklyCheckInScreen';
import CoachOutputScreen from '../screens/CoachOutputScreen';
import ProGoalSetupScreen from '../screens/ProGoalSetupScreen';
import GoalChangeSummaryScreen from '../screens/GoalChangeSummaryScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ImportScreen from '../screens/ImportScreen';
import CoachingRemindersScreen from '../screens/CoachingRemindersScreen';
import ProOnboardingScreen from '../screens/ProOnboardingScreen';
import ProSetupCompleteScreen from '../screens/ProSetupCompleteScreen';
import ProUpgradeScreen from '../screens/ProUpgradeScreen';
import CoachHeldHistoryScreen from '../screens/CoachHeldHistoryScreen';
import CoachReviewScreen from '../screens/CoachReviewScreen';
import BlockReflectionScreen from '../screens/BlockReflectionScreen';
import YearOfLiftsScreen from '../screens/YearOfLiftsScreen';
import WellbeingCheckScreen from '../screens/WellbeingCheckScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import DebugLogScreen from '../screens/DebugLogScreen';
import NutritionEducationScreen from '../screens/NutritionEducationScreen';
import SubscriptionPolicyScreen from '../screens/SubscriptionPolicyScreen';
import { withProGuard } from '../components/ProGate';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Pro-only screens. The guard renders an upgrade prompt for free users,
// enforcing Pro access no matter how the route is reached.
const GatedWeeklyCheckIn    = withProGuard(WeeklyCheckInScreen, 'Weekly check-in');
const GatedNutritionTargets = withProGuard(NutritionTargetsScreen, 'Nutrition targets');
const GatedBodyMetrics      = withProGuard(BodyMetricsScreen, 'Body metrics');
const GatedCoachOutput      = withProGuard(CoachOutputScreen, 'Your week');
const GatedProGoalSetup     = withProGuard(ProGoalSetupScreen, 'Pro goal setup');
const GatedCoachingReminders = withProGuard(CoachingRemindersScreen, 'Coaching reminders');

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
  cardStyle: { backgroundColor: colors.background },
};

// Hero-zoom transition for screens that "expand" out of a card on the
// previous screen (ActiveWorkout opening from the Continue / Next
// Session hero on Home, WorkoutSummary appearing after a finished
// session). The destination fades in while scaling from 0.92 to 1.0
// so it reads as the source card growing into a full screen rather
// than a flat slide. Matches the Whoop / Apple Health pattern of
// "tap a card → it expands".
const heroZoomTransition = {
  cardStyleInterpolator: ({ current }) => {
    // Defensive: react-navigation can call this with current.progress
    // missing during certain pop/back gestures, which throws an
    // "interpolate of undefined" the user reads as an app crash on
    // first session-start. Fall back to the default opacity behaviour
    // so the transition still completes cleanly.
    if (!current?.progress) {
      return { cardStyle: { opacity: 1 } };
    }
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1],
    });
    return { cardStyle: { opacity, transform: [{ scale }] } };
  },
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 280 } },
    close: { animation: 'timing', config: { duration: 200 } },
  },
};

// Pulled from the store at render time so toggling Reduce Motion takes
// effect on the next navigation push without an app restart. Returns an
// override merged into the per-stack screenOptions in each navigator.
function useStackMotionOverride() {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  return reduceMotion ? { animationEnabled: false } : null;
}

function HomeStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuildWorkout" component={BuildWorkoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ headerShown: false, ...heroZoomTransition }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete', ...heroZoomTransition }} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Workout History' }} />
      <Stack.Screen name="VolumeHeatmap" component={VolumeHeatmapScreen} options={{ title: 'Volume' }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
      <Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ title: 'Weekly Review' }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function PlansStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Plans" component={PlansScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: 'Plan' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Edit Workout' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="ManualBuilder" component={ManualBuilderScreen} options={{ title: 'Build a Plan' }} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ title: 'Plan Library' }} />
      <Stack.Screen name="MesocycleBuilder" component={MesocycleBuilderScreen} options={{ title: 'Training Blocks' }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function ProgressStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Workout History' }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete', ...heroZoomTransition }} />
      <Stack.Screen name="VolumeHeatmap" component={VolumeHeatmapScreen} options={{ title: 'Volume Heatmap' }} />
      <Stack.Screen name="PRWall" component={PRWallScreen} options={{ title: 'Personal Records' }} />
      <Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ title: 'Weekly Review' }} />
      <Stack.Screen name="BodyMetrics" component={GatedBodyMetrics} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Lift Progress' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="YearOfLifts" component={YearOfLiftsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function ProfileStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="AthleteHub" component={AthleteHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="NutritionTargets" component={GatedNutritionTargets} options={{ title: 'Nutrition Targets' }} />
      <Stack.Screen name="NutritionEducation" component={NutritionEducationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BodyMetrics" component={GatedBodyMetrics} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="WeeklyCheckIn" component={GatedWeeklyCheckIn} options={{ headerShown: false }} />
      <Stack.Screen name="CoachOutput" component={GatedCoachOutput} options={{ title: 'Your Week' }} />
      <Stack.Screen name="CoachHeldHistory" component={CoachHeldHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BlockReflection" component={BlockReflectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProGoalSetup" component={GatedProGoalSetup} options={{ headerShown: false }} />
      <Stack.Screen name="GoalChangeSummary" component={GoalChangeSummaryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Import history' }} />
      <Stack.Screen name="CoachingReminders" component={GatedCoachingReminders} options={{ title: 'Coaching reminders' }} />
      <Stack.Screen name="WellbeingCheck" component={WellbeingCheckScreen} options={{ title: 'Wellbeing check' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DebugLog" component={DebugLogScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SubscriptionPolicy" component={SubscriptionPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  // Android 15 (targetSdk 35) and iOS both draw the app edge-to-edge under
  // the system nav / home indicator. Pad the tab bar by the bottom inset so
  // the icons and labels don't collide with the OS chrome.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      lazy={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: 4 + insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab: focused ? 'home' : 'home-outline',
            PlansTab: focused ? 'list' : 'list-outline',
            ProgressTab: focused ? 'stats-chart' : 'stats-chart-outline',
            ProfileTab: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Train' }} />
      <Tab.Screen name="PlansTab" component={PlansStack} options={{ title: 'Plans' }} />
      <Tab.Screen name="ProgressTab" component={ProgressStack} options={{ title: 'Progress' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'You' }} />
    </Tab.Navigator>
  );
}

function WelcomeStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function FirstRunStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="FirstRunBranch" component={FirstRunScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={heroZoomTransition} />
    </Stack.Navigator>
  );
}

function ProOnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="ProOnboarding" component={ProOnboardingScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={heroZoomTransition} />
      <Stack.Screen name="ProSetupComplete" component={ProSetupCompleteScreen} />
      {/* Registered here too so the onboarding hand-off screen can link
          straight into the nutrition guide without leaving the flow. */}
      <Stack.Screen name="NutritionEducation" component={NutritionEducationScreen} />
    </Stack.Navigator>
  );
}

const SPLASH_MIN_MS = 2500;

export default function RootNavigator() {
  // Subscribe only to the fields whose change should reroute. Without a
  // selector this re-rendered the entire navigator on every store
  // mutation (rest timer ticks, PR celebrations, set saves, profile
  // tweaks, etc.) — a slow leak that compounded throughout a workout.
  const user = useAppStore(s => s.user);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const firstRunComplete = useAppStore(s => s.firstRunComplete);
  const firstRunChecked = useAppStore(s => s.firstRunChecked);
  const tier = useAppStore(s => s.tier);
  const tierChecked = useAppStore(s => s.tierChecked);
  // restoringSession removed — restoreSessionFromCloud is now
  // optimistic (routes on local cues, syncs cloud in background).
  // Actions are stable references in zustand so destructuring them once
  // outside the render is safe and doesn't cause re-renders.
  const setUser = useAppStore(s => s.setUser);
  const setSession = useAppStore(s => s.setSession);
  const setAuthLoading = useAppStore(s => s.setAuthLoading);
  const initLocalUser = useAppStore(s => s.initLocalUser);
  const checkFirstRun = useAppStore(s => s.checkFirstRun);
  const checkTier = useAppStore(s => s.checkTier);
  const refreshTierFromCloud = useAppStore(s => s.refreshTierFromCloud);
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashReady(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    function handleNotificationResponse(response) {
      const type = response?.notification?.request?.content?.data?.type;
      const routeFor = (t) => {
        if (t === 'weekly_checkin') return ['ProfileTab', 'WeeklyCheckIn'];
        if (t === 'year_of_lifts_unlock') return ['ProgressTab', 'YearOfLifts'];
        return null;
      };
      const target = routeFor(type);
      if (target) {
        const tryNavigate = (attempts = 0) => {
          if (navigationRef.isReady()) {
            navigationRef.navigate(target[0], { screen: target[1] });
          } else if (attempts < 20) {
            setTimeout(() => tryNavigate(attempts + 1), 150);
          }
        };
        tryNavigate();
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    // Handle cold-start tap (app launched via notification)
    Notifications.getLastNotificationResponseAsync()
      .then(r => { if (r) handleNotificationResponse(r); })
      .catch(() => {});

    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Await the SQLite init so subsequent reads (checkFirstRun,
        // checkTier, getSession-driven hydrators) can't race against a
        // half-open database. Failure here is rare but catastrophic, so
        // surface it via the log layer.
        try {
          await initDatabase();
          seedExercisesIfNeeded().catch(console.warn);
        } catch (e) {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('RootNavigator.bootstrap.initDb', e); } catch (_) {}
        }

        checkFirstRun().catch(console.warn);
        // AWAIT checkTier so the local 'pro' value is in the store before
        // refreshTierFromCloud (below) reads it for the beta-demotion
        // guard. Without this they raced: the cloud refresh would see
        // tier=null, fail the "currentTier === 'pro'" check, and accept
        // the cloud's spurious 'free' value. Result was Pro users being
        // silently demoted to Free on every app launch.
        await checkTier().catch(console.warn);

        try {
          const client = getSupabaseClient();
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (session?.user) {
              setSession(session);
              setUser(session.user);

              // Hydrate userProfile + units + barWeight from local
              // AsyncStorage so name, units, plate weight all survive an
              // app restart for cloud-signed-in users. Previously the
              // bootstrap path skipped this entirely if a cloud session
              // existed — the result was firstName disappearing and the
              // user seeing their email everywhere instead. The
              // restoreSessionFromCloud handler only fires on the
              // SIGNED_IN event (fresh sign-in), not on session-restore.
              try {
                const PROFILE_KEY_PFX = '@volyume_user_profile_';
                const raw = await AsyncStorage.getItem(PROFILE_KEY_PFX + session.user.id);
                if (raw) {
                  // eslint-disable-next-line global-require
                  const { migrateProfileGoals } = require('../lib/coachingGoals');
                  const profile = migrateProfileGoals(JSON.parse(raw));
                  useAppStore.setState({
                    userProfile: profile,
                    units: profile?.units || useAppStore.getState().units,
                    barWeight: profile?.barWeight || useAppStore.getState().barWeight,
                    bodyWeightUnits: profile?.bodyWeightUnits || useAppStore.getState().bodyWeightUnits,
                  });
                }
              } catch (_) {
                // Corrupt or missing — fall through; user can re-onboard
                // or the cloud restore will fill it in on next SIGNED_IN.
              }

              // Server-authoritative tier — enforcement point after beta.
              // During beta this guards against spurious pro → free
              // demotion (see useAppStore.refreshTierFromCloud).
              refreshTierFromCloud(client, session.user.id).catch(() => {});
              setAuthLoading(false);
              return;
            }
          }
        } catch (_e) {}

        // No cloud session. Validate local state before deciding what to
        // render: if a tier was previously saved but the user never
        // completed first-run setup, treat the local state as an
        // abandoned setup. Clear the stale tier so the navigator falls
        // back to WelcomeStack for a clean restart. Without this guard,
        // closing the app on WelcomeScreen and reopening would silently
        // re-route past Welcome based on stale AsyncStorage values.
        try {
          const savedTier = await AsyncStorage.getItem('@volyume_tier');
          const firstRunDone = await AsyncStorage.getItem('@volyume_first_run_complete');
          if (savedTier && firstRunDone !== 'true') {
            await AsyncStorage.removeItem('@volyume_tier').catch(() => {});
            useAppStore.setState({ tier: null });
          }
        } catch (_e) {}

        // Only RESTORE a previously-established local user. Never
        // auto-create one in the bootstrap path. A fresh install (no
        // LOCAL_USER_KEY in AsyncStorage) must route through Welcome
        // first, where tapping Free explicitly calls initLocalUser.
        // This prevents a phantom local user appearing on every cold
        // launch and silently logging the user in as Free.
        const existingLocalId = await AsyncStorage.getItem('@volyume_local_user_id');
        if (existingLocalId) {
          await initLocalUser();
        } else {
          setAuthLoading(false);
        }
        try {
          const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
          if (raw) {
            const restoredUserId = useAppStore.getState().user?.id ?? null;
            restoreNotifications(JSON.parse(raw), restoredUserId).catch(() => {});
          }
        } catch (_e) {}
      } catch (err) {
        console.error('bootstrap failed:', err);
        // Failsafe: release auth loading so the splash doesn't hang.
        // Don't fall back to initLocalUser — fresh installs should land
        // on Welcome, not be auto-created into a Free user.
        setAuthLoading(false);
      }
    }

    bootstrap().catch(console.error);

    let subscription;
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data } = client.auth.onAuthStateChange(async (event, session) => {
          // CRITICAL: capture the local user id BEFORE setUser
          // replaces it with the cloud session user. Without this, the
          // migrateLocalUserId check below ("are these different?") is
          // always false on OAuth signin, the local rows never get
          // re-keyed to the supabase user id, and bulkUploadLocalData
          // ends up querying SQLite with the supabase id (which
          // matches nothing) so the user's history never reaches the
          // cloud. This was the cross-device data loss bug the user
          // flagged five times.
          const localUserIdBeforeSignIn = useAppStore.getState().user?.id ?? null;
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logInfo('auth.event', event, { uid: session?.user?.id ?? null, prevLocal: localUserIdBeforeSignIn }); } catch (_) {}
          // Bind / unbind the Sentry user so errors are searchable by
          // who hit them. Safe no-op if Sentry isn't installed yet.
          try {
            // eslint-disable-next-line global-require
            const { setSentryUser } = require('../lib/sentry');
            setSentryUser(session?.user
              ? { id: session.user.id, email: session.user.email }
              : null);
          } catch (_) {}
          // Tell observability about the user id too so every
          // breadcrumb + event from here on carries it as context.
          try {
            // eslint-disable-next-line global-require
            const { setCurrentUserId } = require('../lib/observability');
            setCurrentUserId(session?.user?.id ?? null);
          } catch (_) {}
          setSession(session);
          setUser(session?.user ?? null);
          // On a fresh sign-in (email OR OAuth), pull the cloud profile
          // before the navigator routes. Otherwise a returning user whose
          // local AsyncStorage was wiped on sign-out gets routed back
          // through onboarding because firstRunComplete is still false.
          // Run the full restore + pull pipeline on BOTH events that
          // bring a user into the app:
          //   - 'SIGNED_IN' fires on explicit sign-in
          //   - 'INITIAL_SESSION' fires on cold launch when a session
          //     was restored from SecureStore (no user action needed)
          //
          // Previously only SIGNED_IN triggered pullFromCloud, so a
          // returning user on the same device saw stale local data
          // until they pull-to-refresh'd or navigated to a screen
          // that refetched. Including INITIAL_SESSION means every
          // launch with a valid session auto-syncs.
          const isAuthEnter =
            (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
            session?.user?.id;
          if (isAuthEnter) {
            // Optimistic sign-in: kick off the cloud restore but DON'T
            // await it. restoreSessionFromCloud makes its routing
            // decision synchronously at the top (per-uid cache OR
            // created_at heuristic) so firstRunComplete + tier are
            // already set by the time the navigator next renders.
            // The cloud read itself runs to completion on its own.
            useAppStore.getState().restoreSessionFromCloud(session.user.id, session.user)
              .catch(e => {
                // eslint-disable-next-line global-require
                try { require('../lib/errorLog').logError('RootNavigator.restoreSessionFromCloud', e, { userId: session.user.id }); } catch (_) {}
              });
            refreshTierFromCloud(client, session.user.id)
              .catch(e => {
                // eslint-disable-next-line global-require
                try { require('../lib/errorLog').logError('RootNavigator.refreshTierFromCloud', e, { userId: session.user.id }); } catch (_) {}
              });

            // Bring local-only state up to the cloud and re-key any
            // rows that were owned by the pre-sign-in local UUID. Two
            // legs:
            //   1) migrateLocalUserId rewrites every "WHERE user_id ="
            //      table from the local UUID to the supabase user.id
            //      so future pushes match RLS on the right key.
            //   2) bulkUploadLocalData pushes the now-correctly-keyed
            //      rows up. Without this, an OAuth sign-up never
            //      uploaded the user's local history, so a sign-in on
            //      a new device pulled an empty cloud and the screens
            //      showed the "No active plan" empty state.
            // Both run fire-and-forget; failures fall through to the
            // sync queue's retry pass on next foreground.
            (async () => {
              try {
                // eslint-disable-next-line global-require
                const log = require('../lib/errorLog');
                // Use the captured pre-setUser value, NOT the
                // post-setUser one (which is already the supabase id).
                if (localUserIdBeforeSignIn && localUserIdBeforeSignIn !== session.user.id) {
                  // eslint-disable-next-line global-require
                  const { migrateLocalUserId } = require('../lib/database');
                  try {
                    await migrateLocalUserId(localUserIdBeforeSignIn, session.user.id);
                    log.logInfo('SignIn.migrate.ok', `localUid=${localUserIdBeforeSignIn} -> cloudUid=${session.user.id}`);
                  } catch (e) {
                    log.logError('SignIn.migrate.fail', e, { localUid: localUserIdBeforeSignIn, cloudUid: session.user.id });
                  }
                }
                // Always re-key with the cloud id after migrate (or
                // directly if there was no local user). Both args are
                // now the supabase id; bulkUpload reads local SQLite
                // by user_id and pushes to cloud.
                // eslint-disable-next-line global-require
                const { bulkUploadLocalData } = require('../lib/sync');
                try {
                  await bulkUploadLocalData(session.user.id, session.user.id);
                  log.logInfo('SignIn.bulkUpload.ok', `uid=${session.user.id}`);
                } catch (e) {
                  log.logError('SignIn.bulkUpload.fail', e, { uid: session.user.id });
                }
              } catch (_) {}
            })();

            // Pull workouts / plans / routines / check-ins from cloud
            // into local SQLite. Returning users on a new device see
            // their data populate empty states as inserts complete.
            // Status is surfaced via the store so screens can show a
            // "Restoring your data" banner and re-fetch when it lands.
            // eslint-disable-next-line global-require
            const { pullFromCloud } = require('../lib/sync');
            const store = useAppStore.getState();
            store.markCloudSyncing();
            pullFromCloud(session.user.id)
              .then(() => useAppStore.getState().markCloudSyncComplete())
              .catch((err) => useAppStore.getState().markCloudSyncError(err?.message));
          }
        });
        subscription = data.subscription;
      }
    } catch (_e) {}

    return () => subscription?.unsubscribe();
  }, []);

  // Splash self-heal: if we ever land in a state where the user is gone
  // but a "checked" flag has been flipped back to false, re-run the
  // checks so we don't sit on the splash forever. Belt-and-braces guard
  // against any future refactor that might reset checked-flags mid-session.
  // Also: if isAuthLoading got stuck true with no user, release it.
  useEffect(() => {
    if (!user && !tierChecked) checkTier().catch(() => {});
    if (!user && !firstRunChecked) checkFirstRun().catch(() => {});
    if (!user && isAuthLoading) setAuthLoading(false);
  }, [user, tierChecked, firstRunChecked, isAuthLoading, checkTier, checkFirstRun, setAuthLoading]);

  // Splash gate fires ONLY during initial bootstrap — before splashReady,
  // firstRunChecked, and tierChecked have completed their first pass.
  // Deliberately not gated on isAuthLoading: that flag flips true during
  // every SIGNED_IN event, and showing the splash mid-flow unmounts the
  // currently-rendered stack (ProOnboardingStack in particular), wiping
  // the screen's step state. The result was an OAuth loop on Step 1.
  // The store updates (tier, firstRunComplete, user) re-trigger this
  // render naturally, so seamless transitions happen without a splash.
  if (!splashReady || !firstRunChecked || !tierChecked) {
    return <SplashScreen />;
  }

  // While a cloud restore is in flight (right after SIGNED_IN, before
  // we know whether the user has a profile in the cloud), park on
  // the splash. Without this, the navigator routes on stale local
  // state — tier='pro' is set instantly by the beta override but
  // firstRunComplete is still false from clearAuthStateForSignOut,
  // which mounts ProOnboardingStack briefly until the cloud read
  // confirms firstRunComplete=true. That gap was the "I started the
  // wizard and got booted out" bug.
  // No blocking splash for sign-in any more — optimistic routing
  // means the navigator already has firstRunComplete + tier set
  // correctly by the time control reaches here. Cloud sync runs in
  // the background, populating empty states on each screen as data
  // arrives.

  // Navigation priority:
  // 1. No tier chosen yet → WelcomeScreen (tier selection)
  // 2. Pro + first-run not done → ProOnboardingStack (guided 5-step setup)
  // 3. Free + first-run not done → FirstRunStack (quick setup)
  // 4. Both done → MainTabs
  function renderNavigator() {
    if (!tier) return <WelcomeStack />;
    if (!firstRunComplete) {
      return tier === 'pro' ? <ProOnboardingStack /> : <FirstRunStack />;
    }
    return <MainTabs />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Wire the observability layer's screen-tracking. Emits a
        // breadcrumb on every navigation so any error fired later
        // in the session carries the user's path. Idempotent —
        // re-mounting the navigator (e.g. signing out and back in)
        // re-subscribes cleanly.
        try {
          // eslint-disable-next-line global-require
          const { instrumentNavigation } = require('../lib/observability');
          instrumentNavigation(navigationRef);
        } catch (_) { /* tolerate */ }
      }}
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      {renderNavigator()}
    </NavigationContainer>
  );
}

function SplashScreen() {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // Reduce Motion: start every animated value at its end state so the splash
  // appears instantly without the hero scale / fade / accent-bar sweep.
  const heroOpacity  = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroScale    = useRef(new Animated.Value(reduceMotion ? 1 : 0.86)).current;
  const heroY        = useRef(new Animated.Value(reduceMotion ? 0 : 16)).current;
  const wordOpacity  = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const wordY        = useRef(new Animated.Value(reduceMotion ? 0 : 12)).current;
  const accentScaleX = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const tagOpacity   = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(heroY, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wordY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(accentScaleX, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View
        style={{
          opacity: heroOpacity,
          transform: [{ scale: heroScale }, { translateY: heroY }],
        }}
      >
        <Image
          source={SPLASH_HERO}
          style={{ width: SPLASH_W, height: Math.round(SPLASH_W / HERO_ASPECT) }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[splashStyles.accent, { transform: [{ scaleX: accentScaleX }] }]} />

      <Animated.Text style={[splashStyles.tagline, { opacity: tagOpacity }]}>
        Less thinking. More lifting.
      </Animated.Text>
    </View>
  );
}

// SigningInSplash removed — restoreSessionFromCloud is now optimistic
// (routes immediately based on local cues, syncs cloud in background)
// so no sign-in splash is needed. The brand splash (SplashScreen) is
// still used for cold-launch bootstrap before tierChecked /
// firstRunChecked are set.

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 34,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  accent: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.4,
    fontWeight: fontWeight.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
