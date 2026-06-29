import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, Card, Empty, PrimaryButton, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { formatDuration } from '../util/time';
import type { HrZone } from '../metrics/strain';

const ACTIVITIES = ['Run', 'Cycle', 'Walk', 'Strength', 'Row', 'HIIT', 'Swim', 'Other'];
const ZONE_COLORS = ['#3B82F6', '#22D3EE', '#16C47F', '#FFB020', '#FF4D4D'];

export function StrainScreen() {
  const today = useStoreSelector(appStore, (s) => s.today);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);

  const [zones, setZones] = useState<HrZone[]>([]);
  const [activity, setActivity] = useState('Run');
  const [duration, setDuration] = useState('30');
  const [avgHr, setAvgHr] = useState('');

  useEffect(() => {
    void appStore.todayZones().then(setZones);
  }, [today]);

  const zoneMax = Math.max(1, ...zones.map((z) => z.minutes));

  const logCardio = () => {
    const mins = parseInt(duration, 10);
    if (!mins || mins <= 0) return;
    const now = Date.now();
    void appStore
      .addCardio({
        activity,
        startTs: now - mins * 60000,
        endTs: now,
        avgHr: avgHr ? parseInt(avgHr, 10) : null,
        source: 'manual',
      })
      .then(() => {
        setDuration('30');
        setAvgHr('');
      });
  };

  return (
    <Screen title="Strain">
      <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={styles.bigStrain}>{today?.strain != null ? today.strain.toFixed(1) : '—'}</Text>
        <Text style={styles.strainLabel}>day strain · 0–21</Text>
      </Card>

      <SectionLabel>Time in heart-rate zones</SectionLabel>
      <Card>
        {zones.length === 0 ? (
          <Empty text="No heart-rate data logged today yet." />
        ) : (
          zones.map((z, i) => (
            <Bar
              key={z.zone}
              label={`Z${z.zone}`}
              value={z.minutes / zoneMax}
              color={ZONE_COLORS[i] ?? colors.strainBlue}
              right={formatDuration(z.minutes)}
            />
          ))
        )}
      </Card>

      <SectionLabel>Log a session</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {ACTIVITIES.map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, activity === a && styles.chipActive]}
              onPress={() => setActivity(a)}
            >
              <Text style={[styles.chipText, activity === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Duration (min)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Avg HR (optional)</Text>
            <TextInput
              style={styles.input}
              value={avgHr}
              onChangeText={setAvgHr}
              keyboardType="number-pad"
              placeholder="bpm"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
        <PrimaryButton title="Add session" onPress={logCardio} />
      </Card>

      <SectionLabel>Recent sessions</SectionLabel>
      <Card>
        {cardio.length === 0 ? (
          <Empty text="No sessions logged yet." />
        ) : (
          cardio.map((c) => (
            <View key={c.id} style={styles.sessionRow}>
              <Text style={styles.sessionName}>{c.activity}</Text>
              <Text style={styles.sessionMeta}>
                {formatDuration(Math.round((c.endTs - c.startTs) / 60000))}
                {c.avgHr ? ` · ${c.avgHr} bpm` : ''}
                {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigStrain: { color: colors.strainBlue, fontSize: 56, fontWeight: '800' },
  strainLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.amber, backgroundColor: '#2A2412' },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.amber, fontWeight: '600' },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.button,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  sessionRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sessionMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
