import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { appStore } from './src/state/appStore';
import { useStoreSelector } from './src/state/store';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecoveryScreen } from './src/screens/RecoveryScreen';
import { SleepScreen } from './src/screens/SleepScreen';
import { StrainScreen } from './src/screens/StrainScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { DeviceScreen } from './src/screens/DeviceScreen';
import { colors } from './src/ui/theme';

type TabKey = 'today' | 'recovery' | 'sleep' | 'strain' | 'journal' | 'device';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'recovery', label: 'Recover' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'strain', label: 'Strain' },
  { key: 'journal', label: 'Journal' },
  { key: 'device', label: 'Device' },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>('today');
  const ready = useStoreSelector(appStore, (s) => s.ready);

  useEffect(() => {
    void appStore.init();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.amber} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {tab === 'today' && <HomeScreen />}
            {tab === 'recovery' && <RecoveryScreen />}
            {tab === 'sleep' && <SleepScreen />}
            {tab === 'strain' && <StrainScreen />}
            {tab === 'journal' && <JournalScreen />}
            {tab === 'device' && <DeviceScreen />}
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
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
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: colors.amber },
});
