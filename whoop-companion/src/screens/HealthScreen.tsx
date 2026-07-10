import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, NavRow, Screen, SectionLabel, Stat } from '../ui/components';
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
  const today = useStoreSelector(appStore, (s) => s.today);
  const recent = useStoreSelector(appStore, (s) => s.recentDays);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const hm = useMemo(() => appStore.healthMonitor(), [today, recent]);
  const [rhythm, setRhythm] = useState<RhythmResult | null>(null);
  const effectiveSync = historySync ?? lastHistorySync;
  const readiness = healthDataReadiness(hm);

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
          {hm.measuredCount > 0 ? `${hm.inRangeCount} of ${hm.measuredCount}` : '-'}
        </Text>
        <Text style={styles.summarySub}>
          {hm.measuredCount > 0
            ? hm.candidateCount > 0
              ? `includes ${hm.candidateCount} decoded raw channel${hm.candidateCount === 1 ? '' : 's'}`
              : 'metrics within your 30-day typical range'
            : hm.valueCount > 0
            ? 'overnight values found; personal ranges are still calibrating'
            : 'Wear your strap overnight and complete a full sync to populate your vitals'}
        </Text>
      </Card>

      <SectionLabel>Data readiness</SectionLabel>
      <Card>
        <View style={styles.readinessHead}>
          <View style={[styles.readinessBadge, { backgroundColor: readiness.color }]}>
            <Text style={styles.readinessBadgeText}>{readiness.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.readinessTitle}>{readiness.title}</Text>
            <Text style={styles.readinessBody}>{readiness.body}</Text>
          </View>
        </View>
        <View style={styles.sourceRow}>
          <Stat label="Recovery vitals" value={`${readiness.recoveryReady}/3`} color={readiness.recoveryReady === 3 ? colors.recoveryGreen : colors.recoveryYellow} />
          <Stat label="Skin temp" value={readiness.skinReady ? 'ready' : 'pending'} color={readiness.skinReady ? colors.recoveryGreen : colors.textTertiary} />
          <Stat label="Blood oxygen" value="withheld" color={colors.textTertiary} />
        </View>
        <NavRow
          label={readiness.actionLabel}
          icon={readiness.icon}
          iconColor={readiness.color}
          value={readiness.actionValue}
          onPress={() => nav.navigate(readiness.route)}
          last
        />
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

      <SectionLabel>Source</SectionLabel>
      <Card>
        <View style={styles.sourceRow}>
          <Stat label="HR samples" value={effectiveSync?.hrSamples ?? '-'} />
          <Stat label="R-R beats" value={effectiveSync?.rrSamples ?? '-'} />
          <Stat label="Sensor packets" value={effectiveSync?.rawSensorRecords ?? '-'} />
        </View>
        <Text style={styles.sourceNote}>
          {effectiveSync
            ? `${formatDecodedRange(effectiveSync.firstSampleTs, effectiveSync.lastSampleTs)} / ${effectiveSync.status}`
            : 'No history sync summary yet.'}
        </Text>
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
        Skin Temperature comes from validated WHOOP 5 v18 history. Blood Oxygen remains unavailable until its Gen5 mapping is validated. Rhythm screening is not a medical diagnostic.
      </Text>
    </Screen>
  );
}

function VitalRow({ vital, last, onPress }: { vital: Vital; last: boolean; onPress: () => void }) {
  const statusColor = !vital.available
    ? colors.textTertiary
    : vital.experimental
    ? colors.textSecondary
    : vital.inRange == null
    ? colors.textTertiary
    : vital.inRange
    ? colors.recoveryGreen
    : colors.recoveryYellow;
  const rangeText = !vital.available
    ? vital.experimental ? 'Decoder not validated' : 'Needs trusted overnight data'
    : vital.experimental && vital.range
    ? `Decoded typical ${vital.range.lo}-${vital.range.hi} ${vital.unit}`
    : vital.experimental
    ? 'Decoded raw channel'
    : vital.range
    ? `Typical ${vital.range.lo}-${vital.range.hi} ${vital.unit}`
    : 'Needs overnight data';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, last && styles.last, pressed && { opacity: 0.6 }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.vLabel}>{vital.label}</Text>
        <Text style={styles.vRange}>{rangeText}</Text>
      </View>
      <Text style={[styles.vValue, { color: vital.available ? colors.text : colors.textTertiary }]}>
        {vital.value != null ? `${vital.value}` : '-'}
        <Text style={styles.vUnit}>{vital.available && vital.value != null ? ` ${vital.unit}` : ''}</Text>
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

function healthDataReadiness(hm: ReturnType<typeof appStore.healthMonitor>) {
  const recoveryReady = hm.vitals.filter(
    (v) => (v.key === 'rhr' || v.key === 'hrv' || v.key === 'respiratory') && v.value != null,
  ).length;
  const skinReady = hm.vitals.some((v) => v.key === 'skin_temp' && v.value != null);

  if (recoveryReady < 3) {
    return {
      badge: 'SYNC',
      color: colors.strainBlue,
      title: 'Recovery vitals need a fuller night',
      body: 'RHR, HRV and respiratory rate need more clean overnight heart-rate and R-R signal.',
      recoveryReady,
      skinReady,
      actionLabel: 'Sync overnight history',
      actionValue: `${recoveryReady}/3 ready`,
      icon: 'sync',
      route: { name: 'device' } as const,
    };
  }

  if (!skinReady) {
    return {
      badge: 'SYNC',
      color: colors.sleepTeal,
      title: 'Skin temperature needs a full night',
      body: 'The validated temperature channel is ready; finish an overnight history sync to build its nightly value.',
      recoveryReady,
      skinReady,
      actionLabel: 'Sync overnight history',
      actionValue: 'temperature pending',
      icon: 'sync',
      route: { name: 'device' } as const,
    };
  }

  return {
    badge: '4/4',
    color: colors.recoveryGreen,
    title: 'Measured health data is ready',
    body: 'RHR, HRV, respiratory rate and skin temperature are available. Blood Oxygen stays blank until its mapping is validated.',
    recoveryReady,
    skinReady,
    actionLabel: 'Open trends',
    actionValue: 'health',
    icon: 'trending-up',
    route: { name: 'trends' } as const,
  };
}

function formatDecodedRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'No decoded range yet';
  const first = new Date(firstTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const last = new Date(lastTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `Decoded ${first}-${last}`;
}

const styles = StyleSheet.create({
  summaryLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 1.4 },
  summaryValue: { fontSize: 40, fontFamily: fonts.black, marginTop: 6 },
  summarySub: { color: colors.textTertiary, fontSize: 13, marginTop: 2, fontFamily: fonts.text },
  readinessHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  readinessBadge: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  readinessBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  readinessTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  readinessBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
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
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sourceNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
});
