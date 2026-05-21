import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StackActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

const navigationRef = createNavigationContainerRef();
import { View, Text, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SPLASH_HERO = require('../../assets/volyume-splash-hero.png');
const HERO_ASPECT = 941 / 1672;
const SPLASH_W = Math.round(Dimensions.get('window').width * 0.55);
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
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete' }} />
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
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete' }} />
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
  return (
    <Tab.Navigator
      lazy={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: 4,
          height: 60,
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
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
    </Stack.Navigator>
  );
}

function ProOnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="ProOnboarding" component={ProOnboardingScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
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
      if (type === 'weekly_checkin') {
        const tryNavigate = (attempts = 0) => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('ProfileTab', { screen: 'WeeklyCheckIn' });
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
        initDatabase()
          .then(() => seedExercisesIfNeeded().catch(console.warn))
          .catch(console.warn);

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

        // No cloud session — auto-restore or create a local user (no login screen)
        await initLocalUser();
        try {
          const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
          if (raw) {
            const restoredUserId = useAppStore.getState().user?.id ?? null;
            restoreNotifications(JSON.parse(raw), restoredUserId).catch(() => {});
          }
        } catch (_e) {}
      } catch (err) {
        console.error('bootstrap failed:', err);
        // Failsafe: ensure auth loading clears even if initLocalUser throws
        await initLocalUser().catch(() => setAuthLoading(false));
      }
    }

    bootstrap().catch(console.error);

    let subscription;
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data } = client.auth.onAuthStateChange(async (event, session) => {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logInfo('auth.event', event, { uid: session?.user?.id ?? null }); } catch (_) {}
          setSession(session);
          setUser(session?.user ?? null);
          // On a fresh sign-in (email OR OAuth), pull the cloud profile
          // before the navigator routes. Otherwise a returning user whose
          // local AsyncStorage was wiped on sign-out gets routed back
          // through onboarding because firstRunComplete is still false.
          if (event === 'SIGNED_IN' && session?.user?.id) {
            // Cloud restore runs asynchronously without flipping
            // isAuthLoading. The splash gate no longer reads that flag, so
            // there's nothing to gate on — the currently-rendered screen
            // stays mounted while the cloud restore runs in the background.
            // 8s race timeout still applies to keep the await bounded.
            try {
              await Promise.race([
                useAppStore.getState().restoreSessionFromCloud(session.user.id),
                new Promise(resolve => setTimeout(resolve, 8000)),
              ]);
              refreshTierFromCloud(client, session.user.id).catch(() => {});

              // If cloud profile was missing AND the user had no local tier
              // picked, restoreSessionFromCloud leaves tier=null. Reset
              // navigation to Welcome so they re-enter enrollment like a
              // brand-new user instead of staying on Login.
              const tierAfter = useAppStore.getState().tier;
              if (!tierAfter && navigationRef.isReady()) {
                try {
                  navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                } catch (_) {}
              }
            } catch (_) {
              // restoreSessionFromCloud already catches its own errors;
              // this is just belt-and-braces for the race timeout path.
            }
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

      <Animated.Text
        style={[
          splashStyles.wordmark,
          { opacity: wordOpacity, transform: [{ translateY: wordY }] },
        ]}
      >
        Volyume
      </Animated.Text>

      <Animated.View style={[splashStyles.accent, { transform: [{ scaleX: accentScaleX }] }]} />

      <Animated.Text style={[splashStyles.tagline, { opacity: tagOpacity }]}>
        Less thinking. More lifting.
      </Animated.Text>
    </View>
  );
}

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
