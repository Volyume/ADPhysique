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
import CoachBuilderScreen from '../screens/CoachBuilderScreen';
import NutritionTargetsScreen from '../screens/NutritionTargetsScreen';
import PlanLibraryScreen from '../screens/PlanLibraryScreen';
import FirstRunScreen from '../screens/FirstRunScreen';
import OnboardingQuizScreen from '../screens/OnboardingQuizScreen';
import WeeklyCheckInScreen from '../screens/WeeklyCheckInScreen';
import CoachOutputScreen from '../screens/CoachOutputScreen';
import ProGoalSetupScreen from '../screens/ProGoalSetupScreen';
import GoalChangeSummaryScreen from '../screens/GoalChangeSummaryScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
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
import { withProGuard } from '../components/ProGate';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Pro-only screens. The guard renders an upgrade prompt for free users,
// enforcing Pro access no matter how the route is reached.
const GatedCoachBuilder     = withProGuard(CoachBuilderScreen, 'Coach Builder');
const GatedWeeklyCheckIn    = withProGuard(WeeklyCheckInScreen, 'Weekly check-in');
const GatedNutritionTargets = withProGuard(NutritionTargetsScreen, 'Nutrition targets');
const GatedBodyMetrics      = withProGuard(BodyMetricsScreen, 'Body metrics');
const GatedCoachOutput      = withProGuard(CoachOutputScreen, 'Your week');
const GatedProGoalSetup     = withProGuard(ProGoalSetupScreen, 'Pro goal setup');

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
  cardStyle: { backgroundColor: colors.background },
};

function HomeStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={stackOptions}>
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
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Plans" component={PlansScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: 'Plan' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Edit Workout' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="ManualBuilder" component={ManualBuilderScreen} options={{ title: 'Build a Plan' }} />
      <Stack.Screen name="CoachBuilder" component={GatedCoachBuilder} options={{ headerShown: false }} />
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
    <Stack.Navigator screenOptions={stackOptions}>
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
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AthleteHub" component={AthleteHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="NutritionTargets" component={GatedNutritionTargets} options={{ title: 'Nutrition Targets' }} />
      <Stack.Screen name="BodyMetrics" component={GatedBodyMetrics} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="WeeklyCheckIn" component={GatedWeeklyCheckIn} options={{ title: 'Weekly Check-In' }} />
      <Stack.Screen name="CoachOutput" component={GatedCoachOutput} options={{ title: 'Your Week' }} />
      <Stack.Screen name="CoachHeldHistory" component={CoachHeldHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BlockReflection" component={BlockReflectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProGoalSetup" component={GatedProGoalSetup} options={{ headerShown: false }} />
      <Stack.Screen name="GoalChangeSummary" component={GoalChangeSummaryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="WellbeingCheck" component={WellbeingCheckScreen} options={{ title: 'Wellbeing check' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DebugLog" component={DebugLogScreen} options={{ headerShown: false }} />
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
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function FirstRunStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="FirstRunBranch" component={FirstRunScreen} />
      <Stack.Screen name="OnboardingQuiz" component={OnboardingQuizScreen} />
      <Stack.Screen name="CoachBuilder" component={CoachBuilderScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
    </Stack.Navigator>
  );
}

function ProOnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="ProOnboarding" component={ProOnboardingScreen} />
      <Stack.Screen name="OnboardingQuiz" component={OnboardingQuizScreen} />
      <Stack.Screen name="CoachBuilder" component={CoachBuilderScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="ProSetupComplete" component={ProSetupCompleteScreen} />
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
        checkTier().catch(console.warn);

        try {
          const client = getSupabaseClient();
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (session?.user) {
              setSession(session);
              setUser(session.user);
              // Server-authoritative tier — enforcement point after beta
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
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
        });
        subscription = data.subscription;
      }
    } catch (_e) {}

    return () => subscription?.unsubscribe();
  }, []);

  if (isAuthLoading || !splashReady || !firstRunChecked || !tierChecked) {
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
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroScale    = useRef(new Animated.Value(0.86)).current;
  const heroY        = useRef(new Animated.Value(16)).current;
  const wordOpacity  = useRef(new Animated.Value(0)).current;
  const wordY        = useRef(new Animated.Value(12)).current;
  const accentScaleX = useRef(new Animated.Value(0)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
