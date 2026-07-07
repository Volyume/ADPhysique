import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore, activityUsesGps } from '../state/appStore';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { ACTIVITY_CATALOGUE, ACTIVITY_CATEGORIES } from '../data/activities';

const QUICK_ACTIVITIES = ['Walking', 'Running', 'Strength Training', 'Cycling', 'Yoga'];

export function StartScreen({ nav }: { nav: Nav }) {
  const [picking, setPicking] = useState(false);
  const [starting, setStarting] = useState(false);

  const startWorkout = async (label: string) => {
    if (starting) return;
    setStarting(true);
    try {
      await appStore.startSession('workout', label, activityUsesGps(label));
      nav.back();
      nav.navigate({ name: 'liveSession' });
    } finally {
      setStarting(false);
    }
  };
  const startKind = async (kind: 'sleep' | 'nap', label: string) => {
    if (starting) return;
    setStarting(true);
    try {
      await appStore.startSession(kind, label);
      nav.back();
      nav.navigate({ name: 'liveSession' });
    } finally {
      setStarting(false);
    }
  };

  if (picking) {
    const quick = QUICK_ACTIVITIES.map((name) => ACTIVITY_CATALOGUE.find((a) => a.name === name)).filter(
      (a): a is NonNullable<typeof a> => a != null,
    );
    return (
      <Screen title="Select activity" onBack={() => setPicking(false)} tint={colors.strainBlue}>
        <SectionLabel>Quick picks</SectionLabel>
        <Card>
          <View style={styles.quickGrid}>
            {quick.map((a) => (
              <Pressable key={a.name} onPress={() => void startWorkout(a.name)} style={[styles.quickPick, starting && styles.disabled]}>
                <View style={[styles.quickIcon, { backgroundColor: `${activityColor(a.strain)}22` }]}>
                  <Ionicons name={a.icon} size={18} color={activityColor(a.strain)} />
                </View>
                <Text style={styles.quickText}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {ACTIVITY_CATEGORIES.map((cat) => (
          <View key={cat}>
            <SectionLabel>{cat}</SectionLabel>
            <Card>
              <View style={styles.chips}>
                {ACTIVITY_CATALOGUE.filter((a) => a.category === cat).map((a) => (
                  <Pressable key={a.name} onPress={() => void startWorkout(a.name)} style={[styles.chip, starting && styles.disabled]}>
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
      <Big icon="walk" color={colors.recoveryGreen} title="Start Walk" sub="Steps, GPS route, pace, HR zones & strain" onPress={() => void startWorkout('Walking')} disabled={starting} />
      <Big icon="flash" color={colors.strainBlue} title="Start Workout" sub="Choose sport; records steps, GPS, HR, zones & laps" onPress={() => setPicking(true)} />
      <Big icon="repeat" color={colors.strainBlue} title="Structured Workout" sub="Interval & tempo plans, step-by-step" onPress={() => { nav.back(); nav.navigate({ name: 'workouts' }); }} />

      <SectionLabel>Sleep and logs</SectionLabel>
      <Big icon="moon" color={colors.sleepTeal} title="Sleep Planner" sub="Set tonight's target; sleep backfills automatically after reconnect" onPress={() => { nav.back(); nav.navigate({ name: 'sleepCoach' }); }} />
      <Big icon="bed" color={colors.sleepTeal} title="Log / adjust sleep" sub="Correct bed and wake times for the synced overnight data" onPress={() => { nav.back(); nav.navigate({ name: 'editSleep' }); }} />
      <Big icon="cafe" color={colors.recoveryYellow} title="Start Nap" sub="Short nap timer; counts toward today's sleep need" onPress={() => void startKind('nap', 'Nap')} disabled={starting} />
      <Big icon="add-circle" color={colors.textSecondary} title="Add past activity" sub="Enter a workout you've already done" onPress={() => { nav.back(); nav.navigate({ name: 'logActivity' }); }} />
      <Big icon="book" color={colors.recoveryYellow} title="Journal" sub="Log today's behaviours" onPress={() => { nav.back(); nav.navigate({ name: 'journal' }); }} />
    </Screen>
  );
}

function activityColor(strain: 'cardio' | 'muscular' | 'noncardio'): string {
  if (strain === 'muscular') return colors.recoveryYellow;
  if (strain === 'noncardio') return colors.recoveryGreen;
  return colors.strainBlue;
}

function Big({ icon, color, title, sub, onPress, disabled }: { icon: string; color: string; title: string; sub: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Card onPress={disabled ? undefined : onPress}>
      <View style={[styles.bigRow, disabled && styles.disabled]}>
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
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickPick: { width: '30%', minWidth: 96, flexGrow: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 8 },
  quickIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickText: { color: colors.text, fontSize: 12, textAlign: 'center', fontFamily: fonts.textSemibold },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  disabled: { opacity: 0.55 },
});
