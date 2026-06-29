import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { appStore } from '../state/appStore';
import { Card, PrimaryButton, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';

const ACTIVITIES = [
  'Running', 'Cycling', 'Weightlifting', 'Strength Training', 'Walking', 'Swimming',
  'HIIT', 'Yoga', 'Pilates', 'Rowing', 'Football', 'Boxing', 'Tennis', 'Hiking',
  'Functional Fitness', 'Spin', 'Elliptical', 'Stairmaster', 'Basketball', 'Other',
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function LogActivityScreen({ nav }: { nav: Nav }) {
  const [activity, setActivity] = useState('Running');
  const [duration, setDuration] = useState(45);
  const [avgHr, setAvgHr] = useState('140');
  const [done, setDone] = useState(false);

  const save = () => {
    const end = Date.now();
    const start = end - duration * 60000;
    void appStore.addCardio({
      activity,
      startTs: start,
      endTs: end,
      avgHr: avgHr ? Number(avgHr) : null,
      source: 'manual',
    });
    setDone(true);
    setTimeout(() => nav.back(), 700);
  };

  return (
    <Screen title="Add Activity" onBack={nav.back} tint={colors.strainBlue}>
      <SectionLabel>Select your activity</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {ACTIVITIES.map((a) => (
            <Pressable
              key={a}
              onPress={() => setActivity(a)}
              style={[styles.chip, activity === a && styles.chipActive]}
            >
              <Text style={[styles.chipText, activity === a && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionLabel>Duration</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              style={[styles.chip, duration === d && styles.chipActive]}
            >
              <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{d} min</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionLabel>Average heart rate</SectionLabel>
      <Card>
        <View style={styles.hrRow}>
          <TextInput
            value={avgHr}
            onChangeText={setAvgHr}
            keyboardType="number-pad"
            style={styles.hrInput}
            placeholder="140"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.hrUnit}>bpm</Text>
        </View>
        <Text style={styles.note}>
          Activity strain is computed from your average heart rate, duration and heart-rate zones
          (Edwards TRIMP on a 0–21 scale). If the strap is connected during the activity, log it from
          your live heart rate for best accuracy.
        </Text>
      </Card>

      <PrimaryButton title={done ? 'Saved ✓' : 'Save activity'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textSemibold },
  chipTextActive: { color: '#000' },
  hrRow: { flexDirection: 'row', alignItems: 'center' },
  hrInput: { color: colors.text, fontSize: 28, fontFamily: fonts.black, minWidth: 80 },
  hrUnit: { color: colors.textSecondary, fontSize: 14, marginLeft: 8, fontFamily: fonts.text },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
});
