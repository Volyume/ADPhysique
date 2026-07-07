import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from './src/state/appStore';
import { useStoreSelector } from './src/state/store';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecoveryScreen } from './src/screens/RecoveryScreen';
import { SleepScreen } from './src/screens/SleepScreen';
import { StrainScreen } from './src/screens/StrainScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { DeviceScreen } from './src/screens/DeviceScreen';
import { HealthScreen } from './src/screens/HealthScreen';
import { StressScreen } from './src/screens/StressScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SleepCoachScreen } from './src/screens/SleepCoachScreen';
import { MetricDetailScreen } from './src/screens/MetricDetailScreen';
import { LogActivityScreen } from './src/screens/LogActivityScreen';
import { ResilienceScreen } from './src/screens/ResilienceScreen';
import { IllnessScreen } from './src/screens/IllnessScreen';
import { EditSleepScreen } from './src/screens/EditSleepScreen';
import { SleepTrendsScreen } from './src/screens/SleepTrendsScreen';
import { ActivityDetailScreen } from './src/screens/ActivityDetailScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { ReadinessScreen } from './src/screens/ReadinessScreen';
import { EnergyReserveScreen } from './src/screens/EnergyReserveScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { StartScreen } from './src/screens/StartScreen';
import { LiveSessionScreen } from './src/screens/LiveSessionScreen';
import { DayScreen } from './src/screens/DayScreen';
import { colors } from './src/ui/theme';
import { fonts, useWhoopFonts } from './src/ui/fonts';
import { Nav, Route, TabKey, TABS } from './src/ui/navigation';

// Apply WHOOP's Proxima Nova as the base font for all text.
const ThemedText = Text as unknown as { defaultProps?: { style?: unknown } };
ThemedText.defaultProps = ThemedText.defaultProps ?? {};
ThemedText.defaultProps.style = { fontFamily: fonts.text, color: colors.text };

export default function App() {
  const [tab, setTabState] = useState<TabKey>('today');
  const [stack, setStack] = useState<Route[]>([{ name: 'today' }]);
  const ready = useStoreSelector(appStore, (s) => s.ready);
  const fontsLoaded = useWhoopFonts();

  useEffect(() => {
    void appStore.init();
  }, []);

  const nav: Nav = useMemo(
    () => ({
      navigate: (route: Route) => setStack((s) => [...s, route]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      setTab: (t: TabKey) => {
        setTabState(t);
        setStack([{ name: t }]);
      },
      get canBack() {
        return stack.length > 1;
      },
      tab,
    }),
    [stack.length, tab],
  );

  const current = stack[stack.length - 1] as Route;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {!ready || !fontsLoaded ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.recoveryGreen} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Router route={current} nav={nav} />
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} style={styles.tab} onPress={() => nav.setTab(t.key)}>
                <Ionicons
                  name={(active ? t.icon : `${t.icon}-outline`) as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={active ? colors.text : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

function Router({ route, nav }: { route: Route; nav: Nav }) {
  switch (route.name) {
    case 'today':
      return <HomeScreen nav={nav} />;
    case 'recovery':
      return <RecoveryScreen nav={nav} />;
    case 'sleep':
      return <SleepScreen nav={nav} />;
    case 'strain':
      return <StrainScreen nav={nav} />;
    case 'more':
      return <MoreScreen nav={nav} />;
    case 'health':
      return <HealthScreen nav={nav} />;
    case 'stress':
      return <StressScreen nav={nav} />;
    case 'trends':
      return <TrendsScreen nav={nav} />;
    case 'journal':
      return <JournalScreen nav={nav} />;
    case 'device':
      return <DeviceScreen nav={nav} />;
    case 'settings':
      return <SettingsScreen nav={nav} />;
    case 'sleepCoach':
      return <SleepCoachScreen nav={nav} />;
    case 'logActivity':
      return <LogActivityScreen nav={nav} />;
    case 'resilience':
      return <ResilienceScreen nav={nav} />;
    case 'illness':
      return <IllnessScreen nav={nav} />;
    case 'editSleep':
      return <EditSleepScreen nav={nav} day={route.day} />;
    case 'sleepTrends':
      return <SleepTrendsScreen nav={nav} />;
    case 'training':
      return <TrainingScreen nav={nav} />;
    case 'readiness':
      return <ReadinessScreen nav={nav} />;
    case 'energyReserve':
      return <EnergyReserveScreen nav={nav} />;
    case 'workouts':
      return <WorkoutsScreen nav={nav} />;
    case 'startMenu':
      return <StartScreen nav={nav} />;
    case 'liveSession':
      return <LiveSessionScreen nav={nav} />;
    case 'day':
      return <DayScreen nav={nav} day={route.day} />;
    case 'metric':
      return <MetricDetailScreen nav={nav} metricKey={route.key} />;
    case 'activity':
      return <ActivityDetailScreen nav={nav} id={route.id} />;
    default:
      return <HomeScreen nav={nav} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  tabLabel: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.textSemibold },
  tabLabelActive: { color: colors.text },
});
