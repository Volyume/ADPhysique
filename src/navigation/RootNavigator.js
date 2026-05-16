import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../styles/theme';
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
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import WorkoutSummaryScreen from '../screens/WorkoutSummaryScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import VolumeHeatmapScreen from '../screens/VolumeHeatmapScreen';
import PRWallScreen from '../screens/PRWallScreen';
import BodyMetricsScreen from '../screens/BodyMetricsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RoutineBuilderScreen from '../screens/RoutineBuilderScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import MesocycleBuilderScreen from '../screens/MesocycleBuilderScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
  cardStyle: { backgroundColor: colors.background },
};

function WorkoutStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Workouts' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ title: 'Workout', headerShown: false }} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ title: 'Session Complete' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
    </Stack.Navigator>
  );
}

function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="VolumeHeatmap" component={VolumeHeatmapScreen} options={{ title: 'Volume Heatmap' }} />
      <Stack.Screen name="PRWall" component={PRWallScreen} options={{ title: 'Personal Records' }} />
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} options={{ title: 'Body Metrics' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profile & Settings' }} />
      <Stack.Screen name="RoutineBuilder" component={RoutineBuilderScreen} options={{ title: 'My Routines' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Edit Routine' }} />
      <Stack.Screen name="MesocycleBuilder" component={MesocycleBuilderScreen} options={{ title: 'Mesocycles' }} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
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
            WorkoutTab: focused ? 'barbell' : 'barbell-outline',
            AnalyticsTab: focused ? 'stats-chart' : 'stats-chart-outline',
            ProfileTab: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Train' }} />
      <Tab.Screen name="WorkoutTab" component={WorkoutStack} options={{ title: 'Log' }} />
      <Tab.Screen name="AnalyticsTab" component={AnalyticsStack} options={{ title: 'Progress' }} />
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

const LOCAL_USER_KEY = '@volyume_local_user_id';

export default function RootNavigator() {
  const { user, isAuthLoading, setUser, setSession, setAuthLoading } = useAppStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        // Init DB + seed in background — errors are non-fatal
        initDatabase()
          .then(() => seedExercisesIfNeeded().catch(console.warn))
          .catch(console.warn);

        // 1. Try Supabase auth (works when credentials are configured)
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

        // 2. Check for an existing local user (persisted across restarts)
        try {
          const localId = await AsyncStorage.getItem(LOCAL_USER_KEY);
          if (localId) {
            setUser({ id: localId, email: 'local@device', isLocal: true });
          }
        } catch (_e) {}
      } catch (err) {
        console.error('bootstrap failed:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    bootstrap().catch(console.error);

    // Still subscribe to Supabase auth changes (works when credentials are present)
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

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
