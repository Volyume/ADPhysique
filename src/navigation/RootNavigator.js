import { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StackActions } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef();
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SPLASH_HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;
const SPLASH_W = Math.round(Dimensions.get('window').width * 0.7);
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, resolvedTheme } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getSupabaseClient } from '../lib/supabase';
import { initDatabase, cleanupOrphanRoutineExercises } from '../lib/database';
import { seedExercisesIfNeeded, topUpNewExercisesIfNeeded, backfillExerciseMetadataIfNeeded, rederiveExerciseMetadataIfNeeded } from '../lib/seedExercises';
import {
  configureNotificationHandler,
  installNotificationListeners,
  restoreNotifications,
  routeForNotificationType,
} from '../lib/notifications';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import QuizScreen from '../screens/QuizScreen';
import PlanPreviewScreen from '../screens/PlanPreviewScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import BuildWorkoutScreen from '../screens/BuildWorkoutScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import VolumeHeatmapScreen from '../screens/VolumeHeatmapScreen';
import BodyMetricsScreen from '../screens/BodyMetricsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SettingsAccountScreen from '../screens/SettingsAccountScreen';
import SettingsProfileScreen from '../screens/SettingsProfileScreen';
import SettingsCoachingScreen from '../screens/SettingsCoachingScreen';
import SettingsNotificationsScreen from '../screens/SettingsNotificationsScreen';
import SettingsDisplayScreen from '../screens/SettingsDisplayScreen';
import SettingsHealthScreen from '../screens/SettingsHealthScreen';
import SettingsDataScreen from '../screens/SettingsDataScreen';
import SnapshotsScreen from '../screens/SnapshotsScreen';
import SettingsPrivacyScreen from '../screens/SettingsPrivacyScreen';
import SettingsAboutScreen from '../screens/SettingsAboutScreen';
import LiftProgressScreen from '../screens/LiftProgressScreen';
import ConsistencyScreen from '../screens/ConsistencyScreen';
import YouScreen from '../screens/YouScreen';
import PlansScreen from '../screens/PlansScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import MesocycleBuilderScreen from '../screens/MesocycleBuilderScreen';
import ShareCardScreen from '../screens/ShareCardScreen';
import ManualBuilderScreen from '../screens/ManualBuilderScreen';
import NutritionTargetsScreen from '../screens/NutritionTargetsScreen';
import PlanLibraryScreen from '../screens/PlanLibraryScreen';
import FirstRunScreen from '../screens/FirstRunScreen';
import FreeStarterScreen from '../screens/FreeStarterScreen';
import Article9ConsentScreen from '../screens/Article9ConsentScreen';
import WeeklyCheckInScreen from '../screens/WeeklyCheckInScreen';
import CoachOutputScreen from '../screens/CoachOutputScreen';
import MethodologyScreen from '../screens/MethodologyScreen';
import ProGoalSetupScreen from '../screens/ProGoalSetupScreen';
import PlanUpdateScreen from '../screens/PlanUpdateScreen';
import GoalChangeSummaryScreen from '../screens/GoalChangeSummaryScreen';
import GoalLockConsentScreen from '../screens/GoalLockConsentScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import CascadeGateScreen from '../screens/CascadeGateScreen';
import PaywallScreen from '../screens/PaywallScreen';
import CreditsScreen from '../screens/CreditsScreen';
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
import DiaryScreen from '../screens/DiaryScreen';
import AddCustomFoodScreen from '../screens/AddCustomFoodScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import MealPlanScreen from '../screens/MealPlanScreen';
import ScanBarcodeScreen from '../screens/ScanBarcodeScreen';
import ScanLabelScreen from '../screens/ScanLabelScreen';
import LogCardioScreen from '../screens/LogCardioScreen';
import CardioHistoryScreen from '../screens/CardioHistoryScreen';
import FoodInsightsScreen from '../screens/FoodInsightsScreen';
import MyRecipesScreen from '../screens/MyRecipesScreen';
import MyMealsScreen from '../screens/MyMealsScreen';
import RecipeBuilderScreen from '../screens/RecipeBuilderScreen';
import { withProGuard } from '../components/ProGate';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// AUTH-4 (I2): supabase fires SIGNED_IN and INITIAL_SESSION for the same
// session on one launch (and rapid sign-out/sign-in produces repeats). The
// run-lock already dedupes the syncAll, but the rest of the enter pipeline
// (cloud restore, tier refresh, cross-user wipe) needn't run twice. Track the
// last enter so a repeat for the same uid within a short window is skipped.
let _lastAuthEnter = { uid: null, at: 0 };

// C-2 safety net (trial-subscription audit): after the cloud tier read, check
// Play directly for a paid_pro user and downgrade if the subscription has
// lapsed (the RTDN Pub/Sub push that would normally report this is a separate
// console step). No-op on the stub provider, on a failed Play read, and for any
// user who is not paid_pro — see cascade.reconcilePaidEntitlement for the guards.
function _reconcilePaidEntitlement(userId = null) {
  try {
    // eslint-disable-next-line global-require
    const { reconcilePaidEntitlement } = require('../lib/payments/cascade');
    return Promise.resolve(reconcilePaidEntitlement(useAppStore.getState().userProfile))
      .then((result) => {
        // COMP-025-A: an authoritative paid_pro→free lapse arms the post-churn
        // win-back loop; a confirmed-active result clears it. Fire-and-forget —
        // it must never block or alter the tier refresh. lapseDetect makes no
        // entitlement decision; it only reads this result.
        try {
          // eslint-disable-next-line global-require
          const { handlePotentialLapse } = require('../lib/payments/lapseDetect');
          handlePotentialLapse(result, userId ?? useAppStore.getState().user?.id ?? null).catch(() => {});
        } catch (_) { /* best-effort */ }
        return result;
      });
  } catch (_) {
    return Promise.resolve();
  }
}

// Pro-only screens. The guard renders an upgrade prompt for free users,
// enforcing Pro access no matter how the route is reached.
const GatedWeeklyCheckIn    = withProGuard(WeeklyCheckInScreen, 'Weekly check-in');
const GatedNutritionTargets = withProGuard(NutritionTargetsScreen, 'Nutrition targets');
const GatedBodyMetrics      = withProGuard(BodyMetricsScreen, 'Body metrics');
const GatedCoachOutput      = withProGuard(CoachOutputScreen, 'Your week');
const GatedProGoalSetup     = withProGuard(ProGoalSetupScreen, 'Pro goal setup');
const GatedPlanUpdate       = withProGuard(PlanUpdateScreen, 'Update training');
const GatedCoachingReminders = withProGuard(CoachingRemindersScreen, 'Coaching reminders');
// Diary domain is Pro (free is Plan Library, custom training, Progress, You).
// Gating the Diary tab root covers the food sub-screens, which are only reached
// from it; cardio screens are gated directly because they are also registered in
// the Home and Progress stacks, so they need the guard at every entry point.
const GatedDiary            = withProGuard(DiaryScreen, 'Food diary');
const GatedLogCardio        = withProGuard(LogCardioScreen, 'Cardio');
const GatedCardioHistory    = withProGuard(CardioHistoryScreen, 'Cardio');

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
  cardStyle: { backgroundColor: colors.background },
  // No header sync indicator. Founder call 2026-05-31: sync is automatic and
  // failures surface in logs and Sentry, so a permanent status badge in the
  // header was noise (and its transient red "error" state was alarming).
  // Overrides the old PRODUCTION_READINESS_LOCKED.md § 1 "visible in the UI"
  // requirement; see that doc for the recorded override.
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

function DiaryStack({ navigation }) {
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      navigation.dispatch(StackActions.popToTop());
    });
  }, [navigation]);
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Diary" component={GatedDiary} options={{ headerShown: false }} />
      <Stack.Screen
        name="MealPlan"
        component={MealPlanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FoodSearch"
        component={FoodSearchScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddCustomFood"
        component={AddCustomFoodScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ScanBarcode"
        component={ScanBarcodeScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ScanLabel"
        component={ScanLabelScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="LogCardio"
        component={GatedLogCardio}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="CardioHistory"
        component={GatedCardioHistory}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FoodInsights"
        component={FoodInsightsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyRecipes"
        component={MyRecipesScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="MyMeals"
        component={MyMealsScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="RecipeBuilder"
        component={RecipeBuilderScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
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
      {/* Cardio is launched from the Train tab's CardioCard. Registering it here
          keeps the modal in this stack so saving returns to Train, not the Diary. */}
      <Stack.Screen name="LogCardio" component={GatedLogCardio} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
      {/* B2: the free starter micro-quiz, reached from the no-plan card. */}
      <Stack.Screen name="FreeStarter" component={FreeStarterScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="PlanUpdate" component={GatedPlanUpdate} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: 'Plan' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Edit Workout' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="ManualBuilder" component={ManualBuilderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ title: 'Plan Library' }} />
      <Stack.Screen name="MesocycleBuilder" component={MesocycleBuilderScreen} options={{ title: 'Training Blocks' }} />
      <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} options={{ headerShown: false, presentation: 'modal' }} />
      {/* B2: the free starter micro-quiz, reached from the no-plan card. */}
      <Stack.Screen name="FreeStarter" component={FreeStarterScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ title: 'Weekly Review' }} />
      <Stack.Screen name="BodyMetrics" component={GatedBodyMetrics} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="LiftProgress" component={LiftProgressScreen} options={{ title: 'Lifts' }} />
      <Stack.Screen name="Consistency" component={ConsistencyScreen} options={{ title: 'Consistency' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="YearOfLifts" component={YearOfLiftsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RecapStory" component={YearOfLiftsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
      {/* Cardio is launched from the Progress tab (AnalyticsScreen). Registering
          both here keeps them in this stack so save/back return to Progress. */}
      <Stack.Screen name="LogCardio" component={GatedLogCardio} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="CardioHistory" component={GatedCardioHistory} options={{ headerShown: false }} />
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
      <Stack.Screen name="You" component={YouScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="SettingsAccount" component={SettingsAccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="SettingsProfile" component={SettingsProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="SettingsCoaching" component={SettingsCoachingScreen} options={{ title: 'Coaching' }} />
      <Stack.Screen name="SettingsNotifications" component={SettingsNotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="SettingsDisplay" component={SettingsDisplayScreen} options={{ title: 'Display & accessibility' }} />
      <Stack.Screen name="SettingsHealth" component={SettingsHealthScreen} options={{ title: 'Health' }} />
      <Stack.Screen name="SettingsData" component={SettingsDataScreen} options={{ title: 'Your data' }} />
      <Stack.Screen name="Snapshots" component={SnapshotsScreen} options={{ title: 'Restore a snapshot' }} />
      <Stack.Screen name="SettingsPrivacy" component={SettingsPrivacyScreen} options={{ title: 'Privacy & legal' }} />
      <Stack.Screen name="SettingsAbout" component={SettingsAboutScreen} options={{ title: 'Help & about' }} />
      <Stack.Screen name="NutritionTargets" component={GatedNutritionTargets} options={{ title: 'Nutrition Targets' }} />
      <Stack.Screen name="NutritionEducation" component={NutritionEducationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BodyMetrics" component={GatedBodyMetrics} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="WeeklyCheckIn" component={GatedWeeklyCheckIn} options={{ headerShown: false }} />
      <Stack.Screen name="CoachOutput" component={GatedCoachOutput} options={{ title: 'Precision Coaching™' }} />
      <Stack.Screen name="Methodology" component={MethodologyScreen} options={{ title: 'How Precision Coaching works' }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
      <Stack.Screen name="CoachHeldHistory" component={CoachHeldHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BlockReflection" component={BlockReflectionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProGoalSetup" component={GatedProGoalSetup} options={{ headerShown: false }} />
      <Stack.Screen name="GoalChangeSummary" component={GoalChangeSummaryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoalLockConsent" component={GoalLockConsentScreen} options={{ title: 'Goal lock' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Import history' }} />
      <Stack.Screen name="CoachingReminders" component={GatedCoachingReminders} options={{ title: 'Coaching reminders' }} />
      <Stack.Screen name="WellbeingCheck" component={WellbeingCheckScreen} options={{ title: 'Wellbeing check' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DebugLog" component={DebugLogScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SubscriptionPolicy" component={SubscriptionPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CascadeGate" component={CascadeGateScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="Credits" component={CreditsScreen} options={{ headerShown: false }} />
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
        // Tokenised so the labels scale with the larger-text accessibility
        // setting (read at render time, after applyAccessibility).
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            HomeTab: focused ? 'home' : 'home-outline',
            PlansTab: focused ? 'list' : 'list-outline',
            DiaryTab: focused ? 'restaurant' : 'restaurant-outline',
            ProgressTab: focused ? 'stats-chart' : 'stats-chart-outline',
            ProfileTab: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Train' }} />
      <Tab.Screen name="PlansTab" component={PlansStack} options={{ title: 'Plans' }} />
      <Tab.Screen name="DiaryTab" component={DiaryStack} options={{ title: 'Diary' }} />
      <Tab.Screen name="ProgressTab" component={ProgressStack} options={{ title: 'Progress' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'You' }} />
    </Tab.Navigator>
  );
}

function WelcomeStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      {/* COMP-030: quiz-first pre-account screens. Registered always (harmless);
          only reached when ONBOARDING_QUIZ_FIRST is on and the user picks Pro. */}
      <Stack.Screen name="QuizTraining" component={QuizScreen} />
      <Stack.Screen name="PlanPreview" component={PlanPreviewScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function FirstRunStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="FirstRunBranch" component={FirstRunScreen} />
      {/* B2: free guided on-ramp (founder decision 4a). Three plain questions
          straight after the name screen install + activate a difficulty-0
          starter plan, so the new free user lands on Home with today's
          session already answered. Skipping completes first run as before. */}
      <Stack.Screen name="FreeStarter" component={FreeStarterScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={heroZoomTransition} />
    </Stack.Navigator>
  );
}

// Article 9 consent gate. Single-screen stack; the consent screen
// itself doesn't navigate anywhere -- on submission the store flips
// healthConsent to true and the navigator re-renders into the
// normal flow (FirstRunStack / ProOnboardingStack / MainTabs).
function Article9ConsentStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false, ...(useStackMotionOverride() || {}) }}>
      <Stack.Screen name="Article9Consent" component={Article9ConsentScreen} />
      {/* Registered here so the consent gate can show the policy in-app
          (native PrivacyPolicyScreen, with its own BackHeader) rather than
          bouncing the user out to the system browser mid-consent. */}
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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
      {/* Goal lock consent gate -- fires from ProOnboardingScreen
          step 3 when the user picks a competition-tier goal. The
          onContinue route param chains back into the step machine. */}
      <Stack.Screen name="GoalLockConsent" component={GoalLockConsentScreen} options={{ headerShown: true, title: 'Goal lock' }} />
    </Stack.Navigator>
  );
}

const SPLASH_MIN_MS = 1600;

// CODE-001: route bootstrap fire-and-forget rejections through the error log,
// not raw console.*, so every fault is captured with a scope and shipped like
// the rest. Lazy-require keeps this file's no-top-level-errorLog idiom and can
// never throw out of a boot path.
function _bootLog(level, scope, err) {
  try {
    // eslint-disable-next-line global-require
    const log = require('../lib/errorLog');
    if (level === 'error') log.logError(scope, err);
    else log.logWarn(scope, err?.message ?? String(err ?? ''));
  } catch (_) { /* never let logging break boot */ }
}

export default function RootNavigator() {
  // Subscribe only to the fields whose change should reroute. Without a
  // selector this re-rendered the entire navigator on every store
  // mutation (rest timer ticks, PR celebrations, set saves, profile
  // tweaks, etc.), a slow leak that compounded throughout a workout.
  const user = useAppStore(s => s.user);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const firstRunComplete = useAppStore(s => s.firstRunComplete);
  const firstRunChecked = useAppStore(s => s.firstRunChecked);
  const healthConsent = useAppStore(s => s.healthConsent);
  const healthConsentChecked = useAppStore(s => s.healthConsentChecked);
  const tier = useAppStore(s => s.tier);
  const tierChecked = useAppStore(s => s.tierChecked);
  // restoringSession removed, restoreSessionFromCloud is now
  // optimistic (routes on local cues, syncs cloud in background).
  // Actions are stable references in zustand so destructuring them once
  // outside the render is safe and doesn't cause re-renders.
  const setUser = useAppStore(s => s.setUser);
  const setSession = useAppStore(s => s.setSession);
  const setAuthLoading = useAppStore(s => s.setAuthLoading);
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
    // Routing for a tapped notification. The listeners module owns the expo
    // wiring and the telemetry firings; the navigator owns only "given a
    // target, navigate". The data_type -> target mapping is the pure
    // routeForNotificationType helper (tested separately) so every scheduled
    // notification type has a route and none dead-ends.
    function onTap(response) {
      const data = response?.notification?.request?.content?.data;
      const type = data?.type;
      const target = routeForNotificationType(type, data);
      if (!target) return;
      const tryNavigate = (attempts = 0) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(target.tab, {
            screen: target.screen,
            ...(target.params ? { params: target.params } : {}),
          });
        } else if (attempts < 20) {
          setTimeout(() => tryNavigate(attempts + 1), 150);
        }
      };
      tryNavigate();
    }

    return installNotificationListeners({ onTap });
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
          seedExercisesIfNeeded()
            .then(() => topUpNewExercisesIfNeeded())
            .then(() => backfillExerciseMetadataIfNeeded())
            .then(() => rederiveExerciseMetadataIfNeeded())
            .catch((e) => _bootLog('warn', 'RootNavigator.bootstrap.seedExercises', e));
          cleanupOrphanRoutineExercises().catch((e) => _bootLog('warn', 'RootNavigator.bootstrap.cleanupOrphanRoutines', e));
          // OpenFoodFacts UK snapshot import. Idempotent + safe;
          // logs to errorLog at every fault boundary. Fire-and-
          // forget -- doesn't block app boot. On failure, the food
          // layer falls back to live OFF / USDA / manual.
          // eslint-disable-next-line global-require
          require('../lib/food/seed').importOffSnapshotIfNeeded()
            .catch((err) => _bootLog('warn', 'RootNavigator.bootstrap.offSnapshot', err));
          // CoFID UK generic foods (~3k rows). Static dataset, runs
          // once per snapshot version. Fills the gap OFF leaves on
          // raw/unbranded items (chicken breast raw, plain oats, etc.).
          // eslint-disable-next-line global-require
          require('../lib/food/seed').importCofidSnapshotIfNeeded()
            .catch((err) => _bootLog('warn', 'RootNavigator.bootstrap.cofidSnapshot', err));
          // Food library delta pull (step 3): refresh local foods
          // cache against cloud foods that were updated since the
          // last pull. Throttled to once per 6 hours by default;
          // skipped silently if no session. Same fire-and-forget
          // pattern as the snapshot import.
          // eslint-disable-next-line global-require
          require('../lib/food/libraryDelta').pullFoodLibraryDelta()
            .catch((err) => _bootLog('warn', 'RootNavigator.bootstrap.libraryDelta', err));
        } catch (e) {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('RootNavigator.bootstrap.initDb', e); } catch (_) {}
        }

        checkFirstRun().catch((e) => _bootLog('warn', 'RootNavigator.bootstrap.checkFirstRun', e));
        // AWAIT checkTier so the local 'pro' value is in the store before
        // refreshTierFromCloud (below) reads it for the beta-demotion
        // guard. Without this they raced: the cloud refresh would see
        // tier=null, fail the "currentTier === 'pro'" check, and accept
        // the cloud's spurious 'free' value. Result was Pro users being
        // silently demoted to Free on every app launch.
        await checkTier().catch((e) => _bootLog('warn', 'RootNavigator.bootstrap.checkTier', e));

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
              // existed, the result was firstName disappearing and the
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
                // Corrupt or missing, fall through; user can re-onboard
                // or the cloud restore will fill it in on next SIGNED_IN.
              }

              // Server-authoritative tier, enforcement point after beta.
              // During beta this guards against spurious pro → free
              // demotion (see useAppStore.refreshTierFromCloud).
              refreshTierFromCloud(client, session.user.id)
                .then(() => _reconcilePaidEntitlement(session.user.id))
                .catch(() => {});

              // Initialise Google Play Billing with the user's auth uid
              // as the obfuscated account ID. No-op if the native
              // module isn't linked in this build; the stub provider
              // stays in place and purchase taps surface a clean
              // "provider not injected" error rather than crashing.
              try {
                // eslint-disable-next-line global-require
                const playBilling = require('../lib/payments/playBilling');
                playBilling.initialise({ appUserID: session.user.id }).catch(() => {});
              } catch (_) { /* lib not loadable in this env */ }

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

        // No anonymous mode per IDENTITY_AND_OWNERSHIP_LOCKED.md
        // rule 1 + anti-patterns: no LOCAL_USER_KEY restore, no
        // initLocalUser bootstrap. Any legacy `@volyume_local_user_id`
        // value sitting in AsyncStorage from an older build is
        // ignored; the user lands on Welcome and must sign in or
        // sign up against a real account. This is what the locked
        // spec's scenario A ('Fresh install, signs up') and scenario
        // F ('Uninstall, reinstall') both depend on.
        setAuthLoading(false);
        try {
          const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
          if (raw) {
            const restoredUserId = useAppStore.getState().user?.id ?? null;
            restoreNotifications(JSON.parse(raw), restoredUserId).catch(() => {});
          }
        } catch (_e) {}
      } catch (err) {
        _bootLog('error', 'RootNavigator.bootstrap.failed', err);
        // Failsafe: release auth loading so the splash doesn't hang.
        // No anonymous-mode fallback (spec rule 1), the user lands
        // on Welcome and signs in/up against a real account.
        setAuthLoading(false);
      }
    }

    bootstrap().catch((e) => _bootLog('error', 'RootNavigator.bootstrap.unhandled', e));

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
          // AUTH-4: clear the enter-dedup on sign-out so a genuine re-sign-in
          // (even of the SAME account within the 3s window) still runs the enter
          // pipeline. Without this, a sign-out -> sign-in-same-account without a
          // bundle reload (dev / Expo Go) would skip the restore + tier + sync.
          if (event === 'SIGNED_OUT') {
            _lastAuthEnter = { uid: null, at: 0 };
          }
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
          if (event === 'SIGNED_IN' && session?.user?.id) {
            // Funnel telemetry: sign_in fires only on a real sign-in,
            // not on INITIAL_SESSION (which is a session restore on
            // cold launch). account_created piggybacks on the same
            // event when session.user.created_at is within the last
            // 5 minutes (universal across email-auto-confirm + OAuth
            // signup; misses email-confirm-later sign-ins where the
            // user takes more than 5 min to follow the confirm link,
            // which is acceptable noise for funnel ratios). Fire-and-
            // forget; the local rows are in the queue and the flush
            // below pushes them.
            try {
              // eslint-disable-next-line global-require
              const { track } = require('../lib/engineTelemetry');
              const provider = session.user.app_metadata?.provider ?? 'unknown';
              track(session.user.id, 'sign_in', { provider }).catch(() => {});
              const createdAtMs = session.user.created_at
                ? new Date(session.user.created_at).getTime()
                : NaN;
              if (Number.isFinite(createdAtMs) && (Date.now() - createdAtMs) < 5 * 60 * 1000) {
                track(session.user.id, 'account_created', { provider }).catch(() => {});
              }
            } catch (_) {}
          }
          if (isAuthEnter) {
            // AUTH-4: skip a duplicate enter for the same uid fired moments ago
            // (SIGNED_IN + INITIAL_SESSION on one launch). 3s window.
            const _enterUid = session.user.id;
            const _enterNow = Date.now();
            if (_lastAuthEnter.uid === _enterUid && (_enterNow - _lastAuthEnter.at) < 3000) {
              return;
            }
            _lastAuthEnter = { uid: _enterUid, at: _enterNow };

            // COMP-009: a cross-account sign-in is gated behind an explicit
            // choice BEFORE any restore / sync / wipe side-effect runs, so the
            // whole sign-in body below is wrapped in this async IIFE. "Keep this
            // device's data" aborts cleanly (sign back out, touch nothing);
            // "Switch accounts" snapshots first, then the existing flow runs.
            // Same-account and first-ever sign-ins fall straight through with no
            // modal. The existing cross-user wipe + last-account key write
            // further down are unchanged — the gate is purely additive.
            (async () => {
              try {
                const _lastUid = await AsyncStorage.getItem('@volyume_last_supabase_user_id').catch(() => null);
                if (_lastUid && _lastUid !== session.user.id) {
                  // eslint-disable-next-line global-require
                  const { appAlert } = require('../components/AppAlert');
                  const choice = await new Promise(resolve => {
                    let settled = false;
                    const pick = (v) => { if (!settled) { settled = true; resolve(v); } };
                    appAlert(
                      'You\'re signing in to a different account',
                      'This device currently holds data for a different account. Switching will replace what\'s on this device with the account you\'re signing into. We\'ll save a snapshot first, so nothing is gone for good. You can restore it from Settings, Your data.',
                      [
                        { text: 'Keep this device\'s data', style: 'cancel', onPress: () => pick('keep') },
                        { text: 'Switch accounts', style: 'destructive', onPress: () => pick('switch') },
                      ],
                      { cancelable: false },
                    );
                  });
                  if (choice !== 'switch') {
                    // Keep: never wipe, restore, or re-stamp. Sign the new
                    // account back out — the SIGNED_OUT event resets routing but
                    // does NOT wipe local SQLite (only an explicit sign-out
                    // button does) — leaving this device's data intact and the
                    // last-account key unchanged, so signing back in is silent.
                    try { await client.auth.signOut(); } catch (_) {}
                    // eslint-disable-next-line global-require
                    try { require('../lib/errorLog').logInfo('SignIn.accountSwitch.kept', `aborted sign-in to ${session.user.id}; device data kept`); } catch (_) {}
                    return;
                  }
                  // Switch: snapshot this device's data before the existing wipe.
                  try {
                    // eslint-disable-next-line global-require
                    const { snapshotBeforeAccountSwitch } = require('../lib/dbSnapshot');
                    await snapshotBeforeAccountSwitch();
                  } catch (_) {}
                }
              } catch (_) { /* gate best-effort; fall through to the normal flow */ }

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
              .then(() => _reconcilePaidEntitlement(session.user.id))
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
                // IDENTITY_AND_OWNERSHIP_LOCKED.md: the cross-user
                // migrateLocalUserId call that used to live here was
                // the source of the 42501 cascade. A real account A's
                // local rows were being re-stamped to a real account
                // B's user_id on sign-in, then push failed because
                // cloud still owned them under A. The legitimate
                // anonymous-to-account migration is now handled
                // ONCE per account in LoginScreen.handleEmailAuth
                // under the signup branch only. Sign-out wipes local
                // SQLite (clearAuthStateForSignOut), so cross-user
                // sign-in finds local already empty and has nothing
                // to migrate.
                //
                // Cross-user safety net: if a different supabase
                // account previously signed in on this device AND
                // their data is still in local SQLite (e.g. a build
                // crashed mid sign-out before the wipe), wipe it
                // here before the new account pulls.
                const lastSignedInUserId = await AsyncStorage.getItem('@volyume_last_supabase_user_id').catch(() => null);
                if (lastSignedInUserId && lastSignedInUserId !== session.user.id) {
                  try {
                    // eslint-disable-next-line global-require
                    const { wipeAllUserData } = require('../lib/database');
                    await wipeAllUserData(lastSignedInUserId);
                    log.logInfo('SignIn.crossUserWipe.ok',
                      `previous account ${lastSignedInUserId} wiped, new account ${session.user.id} pulling fresh`);
                  } catch (e) {
                    log.logError('SignIn.crossUserWipe.failed', e, { previous: lastSignedInUserId, incoming: session.user.id });
                  }
                }
                try { await AsyncStorage.setItem('@volyume_last_supabase_user_id', session.user.id); } catch (_) {}

                // Article 9 health-data consent check. Local cache
                // first (set after a successful grant in the consent
                // screen), then cloud fallback for cross-device
                // restore. Result drives the renderNavigator gate.
                try {
                  const cacheKey = `@volyume_health_consent_${session.user.id}`;
                  const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
                  if (cached === 'true') {
                    useAppStore.getState().setHealthConsent(true, true);
                  } else {
                    // No local cache; ask cloud. RLS keeps this
                    // scoped to the signed-in user.
                    const { data, error } = await client
                      .from('users_profile')
                      .select('health_data_consent')
                      .eq('id', session.user.id)
                      .maybeSingle();
                    if (error) {
                      // A transient cloud-read failure must NOT re-fire
                      // the (un-skippable) Article 9 gate. New users
                      // still hit the dedicated consent step during
                      // onboarding; this branch only runs for a returning
                      // / cross-device sign-in whose local cache is
                      // absent. Leave consent unresolved (null, not
                      // false) so the gate stays closed and we re-check
                      // next session, rather than re-prompting a user who
                      // already consented just because the network blipped.
                      useAppStore.getState().setHealthConsent(null, true);
                    } else {
                      const granted = data?.health_data_consent === true;
                      useAppStore.getState().setHealthConsent(granted, true);
                      if (granted) {
                        try { await AsyncStorage.setItem(cacheKey, 'true'); } catch (_) {}
                      }
                    }
                  }
                } catch (e) {
                  log.logWarn('SignIn.healthConsentCheck.failed', e?.message);
                  // Resolve to null (unresolved), NOT false, on a transient
                  // failure. renderNavigator only routes to the Article 9 gate
                  // when healthConsent === false, so false here would bounce a
                  // user who already consented back into the (un-skippable)
                  // consent screen just because a read threw. null leaves the
                  // gate closed and re-checks next session. This matches the
                  // sibling `error` branch above; A2-014 reconciles the two.
                  useAppStore.getState().setHealthConsent(null, true);
                }

                // Local-only edits made while signed out are pushed by
                // the syncAll() restore kicked off below. syncAll runs
                // the push track (food + legacy) before the pull, so a
                // separate bulkUploadLocalData here would double the push
                // (the race App.js's run-lock was added to avoid). Left
                // to syncAll so food rides the same cycle as everything
                // else and the push happens before the pull.
                // Drain any unpushed engine telemetry from the local
                // queue (Move #3). Events written while offline or
                // pre-sign-in land in SQLite via the track() helper;
                // this is the first opportunity to ship them.
                try {
                  // eslint-disable-next-line global-require
                  const { flushPendingTelemetry } = require('../lib/engineTelemetry');
                  await flushPendingTelemetry();
                } catch (_) {}
              } catch (_) {}
            })();

            // Restore from cloud into local SQLite. Routed through
            // syncAll (push track then pull track), not the legacy
            // pullFromCloud, because the food domain and the other
            // migrated tables only move on the registry/transport path:
            // a plain pullFromCloud never restores the user's meals,
            // water or nutrition targets on sign-in (the food round-trip
            // bug). syncAll pushes any local-only edits first, then pulls
            // everything. Returning users on a new device see their data
            // populate empty states as inserts complete; status drives
            // the "Restoring your data" banner.
            // eslint-disable-next-line global-require
            const { syncAll } = require('../lib/sync');
            const store = useAppStore.getState();
            store.markCloudSyncing();
            syncAll({ userId: session.user.id, localUserId: session.user.id, triggeredBy: 'sign_in' })
              .then(() => useAppStore.getState().markCloudSyncComplete())
              .catch((err) => useAppStore.getState().markCloudSyncError(err?.message));

            // Register this device for remote push (subscription
            // payment-failure pushes, fired by the Play Billing RTDN
            // webhook). No-ops cleanly when permission isn't granted or
            // app.json has no extra.eas.projectId; local notifications
            // are unaffected either way. Fire-and-forget.
            // eslint-disable-next-line global-require
            require('../lib/notifications')
              .registerPushToken(session.user.id)
              .catch(() => {});
            })();
          }
        });
        subscription = data.subscription;
      }
    } catch (_e) {}

    return () => subscription?.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Splash gate fires ONLY during initial bootstrap, before splashReady,
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
  // state, tier='pro' is set instantly by the beta override but
  // firstRunComplete is still false from clearAuthStateForSignOut,
  // which mounts ProOnboardingStack briefly until the cloud read
  // confirms firstRunComplete=true. That gap was the "I started the
  // wizard and got booted out" bug.
  // No blocking splash for sign-in any more, optimistic routing
  // means the navigator already has firstRunComplete + tier set
  // correctly by the time control reaches here. Cloud sync runs in
  // the background, populating empty states on each screen as data
  // arrives.

  // Navigation priority:
  // 1. Not signed in → WelcomeScreen (tier selection) + Login
  // 2. Signed-in + Article 9 consent missing → Article9ConsentStack
  //    (compliance gate per IDENTITY_AND_OWNERSHIP_LOCKED.md +
  //    PRIVACY_CONSENT_LOCKED.md). Blocks the rest of the app until
  //    the user explicitly agrees to health-data processing. The Article 9
  //    step is where start_cascade grants the 14-day Pro trial, which sets
  //    tier='pro' for a new user.
  // 3. Pro + first-run not done → ProOnboardingStack (guided setup)
  // 4. Free + first-run not done → FirstRunStack (quick setup)
  // 5. Both done → MainTabs
  function renderNavigator() {
    // Gate on whether the user is SIGNED IN, not on tier. Post-beta a
    // freshly authenticated account has no tier yet (no cloud profile row,
    // and the PRO_BETA_ACTIVE override that used to force tier='pro' is
    // gone). Keying this on `!tier` parked a signed-in user back on the
    // login screen forever: signed in at Supabase, stuck at Login in the
    // app. Identity is cloud-only (no anonymous mode per
    // IDENTITY_AND_OWNERSHIP_LOCKED.md), so a non-null `user` means signed
    // in. A null/free tier from here resolves through the Article 9 trial
    // grant (→ pro) or falls to the free setup.
    if (!user) return <WelcomeStack />;
    // ONB-001 / ONB-002: hold a real (cloud) signed-in account on a blocking
    // resolver until the Article 9 consent check has resolved, instead of
    // letting it fall through to an onboarding branch. While the check is in
    // flight (healthConsentChecked === false) a brand-new Pro-path account
    // has tier=null and firstRunComplete=false, so the branch below would
    // route it into FirstRunStack (the free "name only" flow) and flash it
    // before the consent gate and the trial grant land. Routing only once
    // consent is resolved also stops the Article 9 screen reading as a late
    // reroute. This wait always ends: the consent check runs on SIGNED_IN and
    // INITIAL_SESSION and sets healthConsentChecked=true in every branch
    // (granted, ungranted, or transient read failure), and the flag only
    // resets on sign-out (clearAuthStateForSignOut). Returning users who have
    // already finished setup (firstRunComplete) skip the wait and route on.
    if (user && !user.isLocal && !firstRunComplete && !healthConsentChecked) {
      return <SplashScreen />;
    }
    if (user && !user.isLocal && healthConsentChecked && healthConsent === false) {
      return <Article9ConsentStack />;
    }
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
        // in the session carries the user's path. Idempotent
        // re-mounting the navigator (e.g. signing out and back in)
        // re-subscribes cleanly.
        try {
          // eslint-disable-next-line global-require
          const { instrumentNavigation } = require('../lib/observability');
          instrumentNavigation(navigationRef);
        } catch (_) { /* tolerate */ }
      }}
      theme={{
        dark: resolvedTheme !== 'light',
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          accessibilityLabel="Volyume"
        />
      </Animated.View>

      <Animated.View style={[splashStyles.accent, { transform: [{ scaleX: accentScaleX }] }]} />

      <Animated.Text style={[splashStyles.tagline, { opacity: tagOpacity }]}>
        Less thinking. More lifting.
      </Animated.Text>
    </View>
  );
}

// SigningInSplash removed, restoreSessionFromCloud is now optimistic
// (routes immediately based on local cues, syncs cloud in background)
// so no sign-in splash is needed. The brand splash (SplashScreen) is
// still used for cold-launch bootstrap before tierChecked /
// firstRunChecked are set.

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    // Brand background, matches the rest of the app so there's no black
    // seam at splash hand-off (was hardcoded #000000).
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accent: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.4,
    fontWeight: fontWeight.regular,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
