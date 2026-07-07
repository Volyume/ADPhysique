import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { appStore } from '../state/appStore';
import { Card, PrimaryButton, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { ACTIVITY_CATALOGUE, ACTIVITY_CATEGORIES } from '../data/activities';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const DAYS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: 1 },
  { label: '2 days ago', offset: 2 },
  { label: '3 days ago', offset: 3 },
];

export function LogActivityScreen({ nav }: { nav: Nav }) {
  const [activity, setActivity] = useState('Running');
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [endTime, setEndTime] = useState(defaultEndTime());
  const [avgHr, setAvgHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [steps, setSteps] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const end = endTimeForOffset(dayOffset, endTime);
    if (end == null) {
      setError('Enter the finish time as HH:mm, for example 18:30.');
      return;
    }
    const durationMin = customDuration.trim() ? parsePositiveNumber(customDuration) : duration;
    if (!durationMin || durationMin <= 0 || durationMin > 24 * 60) {
      setError('Enter a duration between 1 minute and 24 hours.');
      return;
    }
    const avg = parsePositiveNumber(avgHr);
    const max = parsePositiveNumber(maxHr);
    const stepCount = parsePositiveNumber(steps);
    const distance = parsePositiveNumber(distanceKm);
    const start = end - Math.round(durationMin) * 60000;
    setError(null);
    void appStore.addCardio({
      activity,
      startTs: start,
      endTs: end,
      avgHr: avg,
      maxHr: max,
      steps: stepCount,
      distanceM: distance != null ? distance * 1000 : null,
      stepSource: stepCount != null ? 'manual' : null,
      notes: notes.trim() || undefined,
      source: 'manual',
    });
    setDone(true);
    setTimeout(() => nav.back(), 700);
  };

  return (
    <Screen title="Add Activity" onBack={nav.back} tint={colors.strainBlue}>
      <SectionLabel>Select your activity</SectionLabel>
      {ACTIVITY_CATEGORIES.map((cat) => (
        <Card key={cat} style={{ marginBottom: 8 }}>
          <Text style={styles.catLabel}>{cat}</Text>
          <View style={styles.chips}>
            {ACTIVITY_CATALOGUE.filter((a) => a.category === cat).map((a) => (
              <Pressable
                key={a.name}
                onPress={() => setActivity(a.name)}
                style={[styles.chip, activity === a.name && styles.chipActive]}
              >
                <Text style={[styles.chipText, activity === a.name && styles.chipTextActive]}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}

      <SectionLabel>Duration</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                setDuration(d);
                setCustomDuration('');
              }}
              style={[styles.chip, !customDuration.trim() && duration === d && styles.chipActive]}
            >
              <Text style={[styles.chipText, !customDuration.trim() && duration === d && styles.chipTextActive]}>{d} min</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.detailField}>
          <Text style={styles.fieldLabel}>Custom minutes</Text>
          <TextInput
            value={customDuration}
            onChangeText={setCustomDuration}
            keyboardType="number-pad"
            style={styles.smallInput}
            placeholder="optional"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </Card>

      <SectionLabel>When</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {DAYS.map((d) => (
            <Pressable
              key={d.offset}
              onPress={() => setDayOffset(d.offset)}
              style={[styles.chip, dayOffset === d.offset && styles.chipActive]}
            >
              <Text style={[styles.chipText, dayOffset === d.offset && styles.chipTextActive]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.detailField}>
          <Text style={styles.fieldLabel}>Finished at</Text>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            keyboardType="numbers-and-punctuation"
            style={styles.smallInput}
            placeholder="18:30"
            placeholderTextColor={colors.textTertiary}
          />
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
            placeholder="optional"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.hrUnit}>bpm</Text>
        </View>
        <Text style={styles.note}>
          Enter average heart rate if you know it. Activity strain is only computed from real HR data
          (Edwards TRIMP on a 0-21 scale), so leaving this blank saves duration and details without
          inventing strain.
        </Text>
      </Card>

      <SectionLabel>Optional workout details</SectionLabel>
      <Card>
        <View style={styles.detailGrid}>
          <View style={styles.detailField}>
            <Text style={styles.fieldLabel}>Max HR</Text>
            <TextInput
              value={maxHr}
              onChangeText={setMaxHr}
              keyboardType="number-pad"
              style={styles.smallInput}
              placeholder="bpm"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.detailField}>
            <Text style={styles.fieldLabel}>Steps</Text>
            <TextInput
              value={steps}
              onChangeText={setSteps}
              keyboardType="number-pad"
              style={styles.smallInput}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
        <View style={styles.detailField}>
          <Text style={styles.fieldLabel}>Distance (km)</Text>
          <TextInput
            value={distanceKm}
            onChangeText={setDistanceKm}
            keyboardType="decimal-pad"
            style={styles.smallInput}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.detailField}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={styles.smallInput}
            placeholder="optional"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton title={done ? 'Saved' : 'Save activity'} onPress={save} disabled={done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  catLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textBold, letterSpacing: 0.6, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textSemibold },
  chipTextActive: { color: '#000' },
  hrRow: { flexDirection: 'row', alignItems: 'center' },
  hrInput: { color: colors.text, fontSize: 28, fontFamily: fonts.black, minWidth: 80 },
  hrUnit: { color: colors.textSecondary, fontSize: 14, marginLeft: 8, fontFamily: fonts.text },
  detailGrid: { flexDirection: 'row', gap: 12 },
  detailField: { flex: 1, marginBottom: 10 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4, fontFamily: fonts.text },
  smallInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: fonts.text },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 10, fontFamily: fonts.textSemibold },
});

function defaultEndTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function endTimeForOffset(dayOffset: number, value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const min = Number(match[2]);
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}
