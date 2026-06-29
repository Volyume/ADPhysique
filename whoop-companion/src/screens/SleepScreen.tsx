import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import {
  BandLegend,
  Card,
  ContributorRow,
  Empty,
  Hypnogram,
  LineChart,
  NavRow,
  Ring,
  Screen,
  SectionLabel,
  Stat,
} from '../ui/components';
import { colors, sleepStageColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { fourTier } from '../metrics/bands';
import { formatClock, formatDuration } from '../util/time';

const HEALTHY_MIN = 480; // 8h baseline ("Healthy Minimum")

export function SleepScreen({ nav }: { nav: Nav }) {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const sleepScore = useStoreSelector(appStore, (s) => s.sleepScore);
  const [nightHr, setNightHr] = useState<number[]>([]);

  useEffect(() => {
    void appStore.lastNightHr().then(setNightHr);
  }, [sleep]);

  if (!sleep) {
    return (
      <Screen title="Sleep" onBack={nav.canBack ? nav.back : undefined} tint={colors.sleepTeal}>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ring value={0} color={colors.sleepTeal} centerTop="Sleep performance" centerMain="—" centerSub="no sleep yet" />
        </Card>
        <Card style={{ paddingVertical: 2 }}>
          <NavRow label="Sleep Coach" icon="moon" iconColor={colors.sleepTeal} onPress={() => nav.navigate({ name: 'sleepCoach' })} last />
        </Card>
        <Card>
          <Empty text="No sleep detected yet. Wear the strap overnight with the app connected, then recalculate from the Today tab. The full breakdown appears once a night is recorded." />
        </Card>
      </Screen>
    );
  }

  const total = sleep.inBedMin || 1;
  const perfPct = sleep.performance != null ? Math.round(sleep.performance * 100) : null;
  const hoursNeededPct = sleep.neededMin > 0 ? (sleep.asleepMin / sleep.neededMin) * 100 : null;
  const effPct = Math.round(sleep.efficiency * 100);
  const wakeEvents = sleep.hypnogram.filter((s) => s.stage === 'awake').length;
  const restorativeMin = sleep.stages.deep + sleep.stages.rem;
  const debtMin = Math.max(0, sleep.neededMin - sleep.asleepMin);

  return (
    <Screen title="Sleep" onBack={nav.canBack ? nav.back : undefined} tint={colors.sleepTeal}>
      {/* Performance ring */}
      <Card style={{ alignItems: 'center', paddingVertical: 24 }} onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}>
        <Ring
          value={sleep.performance ?? 0}
          color={colors.sleepTeal}
          centerTop="Sleep performance"
          centerMain={perfPct != null ? `${perfPct}%` : '—'}
          centerSub={formatDuration(sleep.asleepMin)}
        />
      </Card>

      {/* Contributors */}
      <Card>
        <ContributorRow label="Hours vs. needed" percent={hoursNeededPct} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <ContributorRow label="Sleep efficiency" percent={effPct} />
        <ContributorRow label="Sleep consistency" percent={null} value="needs nights" />
        <BandLegend />
      </Card>

      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Sleep Coach &amp; sleep need" icon="moon" iconColor={colors.sleepTeal} onPress={() => nav.navigate({ name: 'sleepCoach' })} last />
      </Card>

      {/* Oura-style Sleep Score with banded contributors */}
      {sleepScore ? (
        <>
          <SectionLabel right={<Text style={styles.scoreWord}>{fourTier(sleepScore.score).label}</Text>}>
            Sleep Score · {sleepScore.score}
          </SectionLabel>
          <Card>
            {sleepScore.contributors.map((c) => (
              <ContributorRow key={c.key} label={c.label} percent={c.score} value={`${fourTier(c.score).label} · ${c.detail}`} color={fourTier(c.score).color} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Last night's sleep — overnight HR + window */}
      <SectionLabel>Last night's sleep</SectionLabel>
      <Card>
        <View style={styles.headRow}>
          <Text style={styles.bigHours}>{formatDuration(sleep.asleepMin)}</Text>
          <Text style={styles.headSub}>asleep · {formatDuration(sleep.inBedMin)} in bed</Text>
        </View>
        <LineChart
          values={nightHr}
          color={colors.sleepTeal}
          leftLabel={formatClock(sleep.startTs)}
          rightLabel={formatClock(sleep.endTs)}
        />
      </Card>

      {/* Stages */}
      <SectionLabel>Stages</SectionLabel>
      <Card>
        <Hypnogram segments={sleep.hypnogram} />
        <View style={{ marginTop: 12 }}>
          <StageRow name="SWS (Deep)" color={sleepStageColors.deep} minutes={sleep.stages.deep} total={total} />
          <StageRow name="REM" color={sleepStageColors.rem} minutes={sleep.stages.rem} total={total} />
          <StageRow name="Light" color={sleepStageColors.light} minutes={sleep.stages.light} total={total} />
          <StageRow name="Awake" color={sleepStageColors.awake} minutes={sleep.stages.awake} total={total} />
        </View>
      </Card>

      {/* Restorative + efficiency */}
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Restorative (deep+REM)" value={formatDuration(restorativeMin)} color={sleepStageColors.rem} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Wake events" value={wakeEvents} />
        </Card>
      </View>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Efficiency" value={effPct} unit="%" color={colors.sleepTeal} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Lights out → woke" value={`${formatClock(sleep.startTs)}–${formatClock(sleep.endTs)}`} />
        </Card>
      </View>

      {/* Sleep need breakdown */}
      <SectionLabel>Hours vs. needed</SectionLabel>
      <Card>
        <NeedRow label="Healthy minimum" value={formatDuration(HEALTHY_MIN)} />
        <NeedRow label="Sleep debt" value={`+${formatDuration(debtMin)}`} />
        <View style={styles.divider} />
        <NeedRow label="Sleep needed" value={formatDuration(sleep.neededMin)} strong />
        <NeedRow label="Hours of sleep" value={formatDuration(sleep.asleepMin)} strong />
      </Card>

      <Empty text="Stages are inferred from overnight heart rate + movement (approximate, not WHOOP's proprietary staging). Sleep consistency needs several nights of bed/wake times to populate." />
    </Screen>
  );
}

function StageRow({ name, color, minutes, total }: { name: string; color: string; minutes: number; total: number }) {
  const pct = Math.round((minutes / total) * 100);
  return (
    <View style={styles.stage}>
      <View style={styles.stageHead}>
        <Text style={styles.stageName}>
          {name} <Text style={{ color }}>{pct}%</Text>
        </Text>
        <Text style={styles.stageDur}>{formatDuration(minutes)}</Text>
      </View>
      <View style={styles.stageTrack}>
        <View style={[styles.stageFill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function NeedRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.needRow}>
      <Text style={[styles.needLabel, strong && styles.needStrong]}>{label}</Text>
      <Text style={[styles.needValue, strong && styles.needStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  bigHours: { color: colors.text, fontSize: 32, fontWeight: '800' },
  headSub: { color: colors.textSecondary, fontSize: 13 },
  stage: { marginVertical: 6 },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  stageDur: { color: colors.text, fontSize: 14, fontWeight: '700' },
  stageTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  stageFill: { height: 8, borderRadius: 4 },
  needRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  needLabel: { color: colors.textSecondary, fontSize: 14 },
  needValue: { color: colors.text, fontSize: 14 },
  needStrong: { color: colors.text, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  scoreWord: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
});
