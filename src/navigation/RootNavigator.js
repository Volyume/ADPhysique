import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontWeight, spacing } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import { getSupabaseClient } from '../lib/supabase';
import { initDatabase } from '../lib/database';
import { seedExercisesIfNeeded } from '../lib/seedExercises';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

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
import PeakWeekScreen from '../screens/PeakWeekScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
  cardStyle: { backgroundColor: colors.background },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuildWorkout" component={BuildWorkoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete' }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
    </Stack.Navigator>
  );
}

function PlansStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Plans" component={PlansScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: 'Plan' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Edit Workout' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="ManualBuilder" component={ManualBuilderScreen} options={{ title: 'Build a Plan' }} />
      <Stack.Screen name="CoachBuilder" component={CoachBuilderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ title: 'Plan Library' }} />
    </Stack.Navigator>
  );
}

function ProgressStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Workout History' }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete' }} />
      <Stack.Screen name="VolumeHeatmap" component={VolumeHeatmapScreen} options={{ title: 'Volume Heatmap' }} />
      <Stack.Screen name="PRWall" component={PRWallScreen} options={{ title: 'Personal Records' }} />
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Lift Progress' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share Card' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AthleteHub" component={AthleteHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="NutritionTargets" component={NutritionTargetsScreen} options={{ title: 'Nutrition Targets' }} />
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} options={{ title: 'Body Metrics' }} />
      <Stack.Screen name="PRWall" component={PRWallScreen} options={{ title: 'Personal Records' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="MesocycleBuilder" component={MesocycleBuilderScreen} options={{ title: 'Training Blocks' }} />
      <Stack.Screen name="PeakWeek" component={PeakWeekScreen} options={{ title: 'Peak Week' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
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
      <Stack.Screen name="CoachBuilder" component={CoachBuilderScreen} />
      <Stack.Screen name="PlanLibrary" component={PlanLibraryScreen} options={{ headerShown: true, title: 'Plan Library' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ headerShown: true, title: 'Plan' }} />
    </Stack.Navigator>
  );
}

const SPLASH_MIN_MS = 2000;

export default function RootNavigator() {
  const {
    user, isAuthLoading, setUser, setSession, setAuthLoading, initLocalUser,
    firstRunComplete, firstRunChecked, checkFirstRun,
  } = useAppStore();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashReady(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        initDatabase()
          .then(() => seedExercisesIfNeeded().catch(console.warn))
          .catch(console.warn);

        checkFirstRun().catch(console.warn);

        try {
          const client = getSupabaseClient();
          if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (session?.user) {
              setSession(session);
              setUser(session.user);
              setAuthLoading(false);
              return;
            }
          }
        } catch (_e) {}

        // No cloud session — auto-restore or create a local user (no login screen)
        await initLocalUser();
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

  if (isAuthLoading || !splashReady || !firstRunChecked) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
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
      {/* Auth gate removed for local-first phase — re-enable when cloud sync is added.
          First-run gate: unified onboarding until completed. */}
      {firstRunComplete ? <MainTabs /> : <FirstRunStack />}
    </NavigationContainer>

  );
}

function SplashScreen() {
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.7)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Mark fades + scales in
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(markScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Small pause, then wordmark slides up + fades in
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Tagline fades in last
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
        <VolyumeMark size={64} />
      </Animated.View>
      <Animated.Text
        style={[
          splashStyles.wordmark,
          { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkY }] },
        ]}
      >
        Volyume
      </Animated.Text>
      <Animated.Text style={[splashStyles.tagline, { opacity: taglineOpacity }]}>
        Intelligent Hypertrophy Logbook
      </Animated.Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.3,
    fontWeight: fontWeight.medium,
  },
});
