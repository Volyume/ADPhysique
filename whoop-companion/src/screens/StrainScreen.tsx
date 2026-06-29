import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import {
  Bar,
  Card,
  Empty,
  MetricRow,
  PrimaryButton,
  Ring,
  Screen,
  SectionLabel,
  StrainCurve,
  WeeklyBars,
} from '../ui/components';
import { colors, radius, strainZoneColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatDuration } from '../util/time';
import { formatDistance } from '../sensors/location';
import type { HrZone } from '../metrics/strain';

const ACTIVITIES = ['Run', 'Cycle', 'Walk', 'Strength', 'Row', 'HIIT', 'Swim', 'Other'];
const ZONE_COLORS = strainZoneColors;

function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function dow(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

export function StrainScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const bandSteps = useStoreSelector(appStore, (s) => s.bandSteps);

  const [zones, setZones] = useState<HrZone[]>([]);
  const [curve, setCurve] = useState<Array<{ tsMs: number; strain: number }>>([]);
  const [activity, setActivity] = useState('Run');
  const [duration, setDuration] = useState('30');
  const [avgHr, setAvgHr] = useState('');

  useEffect(() => {
    void appStore.todayZones().then(setZones);
    void appStore.todayStrainCurve().then(setCurve);
  }, [today]);

  const strain = today?.strain ?? null;
  const z13 = zones.filter((z) => z.zone <= 3).reduce((a, b) => a + b.minutes, 0);
  const z45 = zones.filter((z) => z.zone >= 4).reduce((a, b) => a + b.minutes, 0);
  const sod = new Date().setHours(0, 0, 0, 0);
  const todayCardio = cardio.filter((c) => c.startTs >= sod);
  const strengthMin = todayCardio
    .filter((c) => c.activity === 'Strength')
    .reduce((a, c) => a + Math.round((c.endTs - c.startTs) / 60000), 0);
  const zoneMax = Math.max(1, ...zones.map((z) => z.minutes));
  const week = recentDays.slice(0, 7).reverse();

  const rec = today?.recovery ?? null;
  const optimal =
    rec == null ? '—' : rec >= 67 ? '10.0–14.0' : rec >= 34 ? '8.0–12.0' : '6.0–10.0';

  const logCardio = () => {
    const mins = parseInt(duration, 10);
    if (!mins || mins <= 0) return;
    const now = Date.now();
    void appStore
      .addCardio({ activity, startTs: now - mins * 60000, endTs: now, avgHr: avgHr ? parseInt(avgHr, 10) : null, source: 'manual' })
      .then(() => {
        setDuration('30');
        setAvgHr('');
        void appStore.todayStrainCurve().then(setCurve);
      });
  };

  return (
    <Screen title="Strain" onBack={nav.canBack ? nav.back : undefined} tint={colors.strainBlue}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={strain != null ? strain / 21 : 0}
          color={colors.strainBlue}
          centerTop="Day Strain"
          centerMain={strain != null ? strain.toFixed(1) : '—'}
          centerSub="0–21"
        />
      </Card>

      <Card>
        <MetricRow label="Heart rate zones 0–3" display={hm(z13)} current={z13} prior={null} />
        <MetricRow label="Heart rate zones 4–5" display={hm(z45)} current={z45} prior={null} />
        <MetricRow label="Strength activity time" display={hm(strengthMin)} current={strengthMin} prior={null} />
        <MetricRow
          label="Steps (band · beta)"
          display={bandSteps != null ? `${bandSteps}` : '—'}
          current={bandSteps}
          prior={null}
        />
      </Card>

      <Empty
        text={
          rec == null
            ? 'Optimal strain target appears once recovery is available.'
            : `Your body is ready for a day strain around ${optimal} today.`
        }
      />

      <SectionLabel>Strain through the day</SectionLabel>
      <Card>
        <StrainCurve points={curve} />
      </Card>

      <SectionLabel>Today's activities</SectionLabel>
      <Card>
        {todayCardio.length === 0 ? (
          <Empty text="No activities logged today." />
        ) : (
          todayCardio.map((c) => (
            <View key={c.id} style={styles.sessionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{c.activity}</Text>
                <Text style={styles.sessionMeta}>
                  {formatDuration(Math.round((c.endTs - c.startTs) / 60000))}
                  {c.distanceM != null ? ` · ${formatDistance(c.distanceM)}` : ''}
                  {c.avgHr ? ` · ${c.avgHr} bpm` : ''}
                  {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Delete activity', `Remove this ${c.activity} activity?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => void appStore.removeCardio(c.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <SectionLabel>Time in heart-rate zones</SectionLabel>
      <Card>
        {zones.length === 0 ? (
          <Empty text="No heart-rate data logged today yet." />
        ) : (
          zones.map((z, i) => (
            <Bar key={z.zone} label={`Z${z.zone}`} value={z.minutes / zoneMax} color={ZONE_COLORS[i] ?? colors.strainBlue} right={formatDuration(z.minutes)} />
          ))
        )}
      </Card>

      <SectionLabel>Weekly trends</SectionLabel>
      <Card>
        <SectionLabel>Strain</SectionLabel>
        {week.length === 0 ? (
          <Empty text="No history yet." />
        ) : (
          <WeeklyBars
            data={week.map((d) => ({
              label: dow(d.day),
              value: d.strain,
              display: d.strain != null ? d.strain.toFixed(1) : '',
              color: colors.strainBlue,
            }))}
          />
        )}
      </Card>

      <SectionLabel>Log a session</SectionLabel>
      <Card>
        <View style={styles.chips}>
          {ACTIVITIES.map((a) => (
            <TouchableOpacity key={a} style={[styles.chip, activity === a && styles.chipActive]} onPress={() => setActivity(a)}>
              <Text style={[styles.chipText, activity === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Duration (min)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholderTextColor={colors.textTertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Avg HR (optional)</Text>
            <TextInput style={styles.input} value={avgHr} onChangeText={setAvgHr} keyboardType="number-pad" placeholder="bpm" placeholderTextColor={colors.textTertiary} />
          </View>
        </View>
        <PrimaryButton title="Add session" onPress={logCardio} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.white, backgroundColor: colors.white },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#000', fontWeight: '600' },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.button, color: colors.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sessionMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
