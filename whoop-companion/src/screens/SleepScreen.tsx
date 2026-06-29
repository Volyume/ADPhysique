import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, Card, Empty, Hypnogram, Ring, Screen, SectionLabel, Stat } from '../ui/components';
import { colors } from '../ui/theme';
import { formatClock, formatDuration } from '../util/time';

export function SleepScreen() {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);

  if (!sleep) {
    return (
      <Screen title="Sleep">
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ring value={0} color={colors.sleepTeal} centerTop="Sleep" centerMain="—" centerSub="no sleep yet" />
        </Card>
        <Card>
          <Empty text="No sleep detected yet. Wear the strap overnight with the app connected (it keeps a background Bluetooth link), then recalculate from the Today tab." />
        </Card>
      </Screen>
    );
  }

  const total = sleep.inBedMin || 1;
  const perfPct = sleep.performance != null ? Math.round(sleep.performance * 100) : null;
  const debtMin = Math.max(0, sleep.neededMin - sleep.asleepMin);

  return (
    <Screen title="Sleep">
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={sleep.performance ?? 0}
          color={colors.sleepTeal}
          centerTop="Sleep performance"
          centerMain={perfPct != null ? `${perfPct}%` : '—'}
          centerSub={formatDuration(sleep.asleepMin)}
        />
      </Card>

      <SectionLabel>Last night</SectionLabel>
      <Card>
        <Hypnogram segments={sleep.hypnogram} />
        <View style={styles.legend}>
          <Legend color="#1E40AF" label="Deep" />
          <Legend color="#6D28D9" label="REM" />
          <Legend color={colors.sleepTeal} label="Light" />
          <Legend color={colors.textTertiary} label="Awake" />
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Stat label="Lights out" value={formatClock(sleep.startTs)} />
          <Stat label="Woke" value={formatClock(sleep.endTs)} />
          <Stat label="Efficiency" value={`${Math.round(sleep.efficiency * 100)}`} unit="%" />
        </View>
      </Card>

      <SectionLabel>Stages</SectionLabel>
      <Card>
        <Bar label="Deep" value={sleep.stages.deep / total} color="#1E40AF" right={formatDuration(sleep.stages.deep)} />
        <Bar label="REM" value={sleep.stages.rem / total} color="#6D28D9" right={formatDuration(sleep.stages.rem)} />
        <Bar label="Light" value={sleep.stages.light / total} color={colors.sleepTeal} right={formatDuration(sleep.stages.light)} />
        <Bar label="Awake" value={sleep.stages.awake / total} color={colors.textTertiary} right={formatDuration(sleep.stages.awake)} />
      </Card>

      <SectionLabel>Need &amp; debt</SectionLabel>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Sleep need" value={formatDuration(sleep.neededMin)} color={colors.sleepTeal} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Sleep debt" value={formatDuration(debtMin)} color={debtMin > 60 ? colors.recoveryYellow : colors.text} />
        </Card>
      </View>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Time asleep" value={formatDuration(sleep.asleepMin)} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Time in bed" value={formatDuration(sleep.inBedMin)} />
        </Card>
      </View>

      <Empty text="Stages are inferred from overnight heart rate + movement (approximate, not WHOOP's proprietary staging). Sleep need = an 8h baseline adjusted by debt; this refines as more nights are recorded." />
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendLabel: { color: colors.textSecondary, fontSize: 11 },
});
