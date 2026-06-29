import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { MetricKey, Nav } from '../ui/navigation';
import { Vital } from '../metrics/healthMonitor';
import { RhythmResult } from '../metrics/afib';

const RHYTHM_COLOR: Record<string, string> = {
  regular: colors.recoveryGreen,
  monitor: colors.recoveryYellow,
  irregular: colors.recoveryRed,
  insufficient: colors.textTertiary,
};
const RHYTHM_LABEL: Record<string, string> = {
  regular: 'Regular',
  monitor: 'Monitor',
  irregular: 'Irregular beats',
  insufficient: 'Calibrating',
};

export function HealthScreen({ nav }: { nav: Nav }) {
  // Recompute reactively when today's metrics change.
  const today = useStoreSelector(appStore, (s) => s.today);
  const recent = useStoreSelector(appStore, (s) => s.recentDays);
  const hm = useMemo(() => appStore.healthMonitor(), [today, recent]);
  const [rhythm, setRhythm] = useState<RhythmResult | null>(null);
  useEffect(() => {
    void appStore.rhythmScreen().then(setRhythm);
  }, [today]);

  const tint =
    hm.measuredCount === 0
      ? colors.textSecondary
      : hm.inRangeCount === hm.measuredCount
      ? colors.recoveryGreen
      : colors.recoveryYellow;

  return (
    <Screen title="Health Monitor" onBack={nav.back} tint={tint}>
      <Card>
        <Text style={styles.summaryLabel}>WITHIN TYPICAL RANGE</Text>
        <Text style={[styles.summaryValue, { color: tint }]}>
          {hm.measuredCount > 0 ? `${hm.inRangeCount} of ${hm.measuredCount}` : '—'}
        </Text>
        <Text style={styles.summarySub}>
          {hm.measuredCount > 0
            ? 'metrics within your 30-day typical range'
            : 'Wear your strap overnight to populate your vitals'}
        </Text>
      </Card>

      <SectionLabel>Vitals</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {hm.vitals.map((v, i) => (
          <VitalRow
            key={v.key}
            vital={v}
            last={i === hm.vitals.length - 1}
            onPress={() => nav.navigate({ name: 'metric', key: v.key as MetricKey })}
          />
        ))}
      </Card>

      <SectionLabel>Heart rhythm screen</SectionLabel>
      <Card>
        <View style={styles.rhythmHead}>
          <View style={[styles.dot, { backgroundColor: RHYTHM_COLOR[rhythm?.status ?? 'insufficient'] }]} />
          <Text style={[styles.rhythmStatus, { color: RHYTHM_COLOR[rhythm?.status ?? 'insufficient'] }]}>
            {RHYTHM_LABEL[rhythm?.status ?? 'insufficient']}
          </Text>
        </View>
        <Text style={styles.rhythmNote}>
          {rhythm?.note ?? 'Screening your resting heart-beat timing for irregular rhythm.'}
        </Text>
      </Card>

      <Text style={styles.footnote}>
        Blood Oxygen and Skin Temperature need the strap’s raw optical/thermistor stream, which this
        build can’t yet decode over Bluetooth — they’re shown for parity but not measured. The heart
        rhythm screen is a wellness feature, not an ECG or a medical diagnosis.
      </Text>
    </Screen>
  );
}

function VitalRow({ vital, last, onPress }: { vital: Vital; last: boolean; onPress: () => void }) {
  const statusColor = !vital.available
    ? colors.textTertiary
    : vital.inRange == null
    ? colors.textTertiary
    : vital.inRange
    ? colors.recoveryGreen
    : colors.recoveryYellow;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, last && styles.last, pressed && { opacity: 0.6 }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.vLabel}>{vital.label}</Text>
        <Text style={styles.vRange}>
          {!vital.available
            ? 'Not measured on this build'
            : vital.range
            ? `Typical ${vital.range.lo}–${vital.range.hi} ${vital.unit}`
            : 'Needs overnight data'}
        </Text>
      </View>
      <Text style={[styles.vValue, { color: vital.available ? colors.text : colors.textTertiary }]}>
        {vital.value != null ? `${vital.value}` : '—'}
        <Text style={styles.vUnit}>{vital.available && vital.value != null ? ` ${vital.unit}` : ''}</Text>
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summaryLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 1.4 },
  summaryValue: { fontSize: 40, fontFamily: fonts.black, marginTop: 6 },
  summarySub: { color: colors.textTertiary, fontSize: 13, marginTop: 2, fontFamily: fonts.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  vLabel: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  vRange: { color: colors.textTertiary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  vValue: { fontSize: 20, fontFamily: fonts.bold },
  vUnit: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.text },
  footnote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 16, fontFamily: fonts.text },
  rhythmHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rhythmStatus: { fontSize: 20, fontFamily: fonts.black },
  rhythmNote: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, fontFamily: fonts.text },
});
