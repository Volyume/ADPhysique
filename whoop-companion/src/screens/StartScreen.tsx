import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore, activityUsesGps } from '../state/appStore';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { ACTIVITY_CATALOGUE, ACTIVITY_CATEGORIES } from '../data/activities';

export function StartScreen({ nav }: { nav: Nav }) {
  const [picking, setPicking] = useState(false);

  const startWorkout = (label: string) => {
    appStore.startSession('workout', label, activityUsesGps(label));
    nav.back(); // pop the start menu
    nav.navigate({ name: 'liveSession' });
  };
  const startKind = (kind: 'sleep' | 'nap', label: string) => {
    appStore.startSession(kind, label);
    nav.back();
    nav.navigate({ name: 'liveSession' });
  };

  if (picking) {
    return (
      <Screen title="Select activity" onBack={() => setPicking(false)} tint={colors.strainBlue}>
        {ACTIVITY_CATEGORIES.map((cat) => (
          <View key={cat}>
            <SectionLabel>{cat}</SectionLabel>
            <Card>
              <View style={styles.chips}>
                {ACTIVITY_CATALOGUE.filter((a) => a.category === cat).map((a) => (
                  <Pressable key={a.name} onPress={() => startWorkout(a.name)} style={styles.chip}>
                    <Ionicons name={a.icon} size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.chipText}>{a.name}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>
        ))}
      </Screen>
    );
  }

  return (
    <Screen title="Start" onBack={nav.back}>
      <SectionLabel>Workout tracking</SectionLabel>
      <Big icon="walk" color={colors.recoveryGreen} title="Start Walk" sub="Steps, GPS route, pace, HR zones & strain" onPress={() => startWorkout('Walking')} />
      <Big icon="flash" color={colors.strainBlue} title="Start Workout" sub="Choose sport; records steps, GPS, HR, zones & laps" onPress={() => setPicking(true)} />
      <Big icon="repeat" color={colors.strainBlue} title="Structured Workout" sub="Interval & tempo plans, step-by-step" onPress={() => { nav.back(); nav.navigate({ name: 'workouts' }); }} />

      <SectionLabel>Sleep and logs</SectionLabel>
      <Big icon="moon" color={colors.sleepTeal} title="Sleep Planner" sub="Set tonight's target; sleep backfills automatically after reconnect" onPress={() => { nav.back(); nav.navigate({ name: 'sleepCoach' }); }} />
      <Big icon="bed" color={colors.sleepTeal} title="Log / adjust sleep" sub="Correct bed and wake times for the synced overnight data" onPress={() => { nav.back(); nav.navigate({ name: 'editSleep' }); }} />
      <Big icon="cafe" color={colors.recoveryYellow} title="Start Nap" sub="Short nap timer; counts toward today's sleep need" onPress={() => startKind('nap', 'Nap')} />
      <Big icon="add-circle" color={colors.textSecondary} title="Add past activity" sub="Enter a workout you've already done" onPress={() => { nav.back(); nav.navigate({ name: 'logActivity' }); }} />
      <Big icon="book" color={colors.recoveryYellow} title="Journal" sub="Log today's behaviours" onPress={() => { nav.back(); nav.navigate({ name: 'journal' }); }} />
    </Screen>
  );
}

function Big({ icon, color, title, sub, onPress }: { icon: string; color: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.bigRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>{title}</Text>
          <Text style={styles.bigSub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bigRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  bigTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  bigSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
});
