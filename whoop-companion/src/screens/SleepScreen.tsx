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
  WeeklyBars,
} from '../ui/components';
import { colors, fonts, sleepStageColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { fourTier } from '../metrics/bands';
import { formatClock, formatDuration } from '../util/time';

const BASE_NEED_MIN = 480; // 8h baseline

const STAGE_EDU = [
  { name: 'Awake', color: sleepStageColors.awake, desc: 'Brief wake-ups in the night. A few are normal; many fragment recovery.' },
  { name: 'Light', color: sleepStageColors.light, desc: 'The bridge between wake and deep — usually the largest share of the night.' },
  { name: 'REM', color: sleepStageColors.rem, desc: 'Dreaming sleep. Consolidates memory, learning and mood. Restorative.' },
  { name: 'SWS (Deep)', color: sleepStageColors.deep, desc: 'Slow-wave sleep. Physical repair, growth hormone, immune function. Restorative.' },
];

export function SleepScreen({ nav }: { nav: Nav }) {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const sleepScore = useStoreSelector(appStore, (s) => s.sleepScore);
  const sleepReg = useStoreSelector(appStore, (s) => s.sleepReg);
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const sleepGoal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const [nightHr, setNightHr] = useState<number[]>([]);

  useEffect(() => {
    void appStore.lastNightHr().then(setNightHr);
  }, [sleep]);

  const total = sleep?.inBedMin || 1;
  const perfPct = sleep?.performance != null ? Math.round(sleep.performance * 100) : null;
  const hoursNeededPct = sleep && sleep.neededMin > 0 ? (sleep.asleepMin / sleep.neededMin) * 100 : null;
  const effPct = sleep ? Math.round(sleep.efficiency * 100) : null;
  const wakeEvents = sleep ? sleep.hypnogram.filter((s) => s.stage === 'awake').length : null;
  const restorativeMin = sleep ? sleep.stages.deep + sleep.stages.rem : null;
  const neededMin = sleepNeed?.neededMin ?? BASE_NEED_MIN;
  const week = recentDays.slice(0, 7).reverse();

  return (
    <Screen title="Sleep" onBack={nav.canBack ? nav.back : undefined} tint={colors.sleepTeal}>
      {/* Performance ring */}
      <Card style={{ alignItems: 'center', paddingVertical: 24 }} onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}>
        <Ring
          value={sleep?.performance ?? 0}
          color={colors.sleepTeal}
          centerTop="Sleep Performance"
          centerMain={perfPct != null ? `${perfPct}%` : '—'}
          centerSub={sleep ? formatDuration(sleep.asleepMin) : 'awaiting last night'}
        />
      </Card>

      {/* Quick actions — always present */}
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Sleep Coach" icon="moon" iconColor={colors.sleepTeal} value={`${Math.round((neededMin * sleepGoal) / 60 * 10) / 10} h goal`} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <NavRow label="Sleep need" icon="bed" iconColor={colors.sleepTeal} value={formatDuration(neededMin)} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <NavRow label="Log / adjust sleep" icon="create" onPress={() => nav.navigate({ name: 'editSleep' })} last />
      </Card>

      {/* Sleep Score */}
      <SectionLabel right={sleepScore ? <Text style={styles.scoreWord}>{fourTier(sleepScore.score).label}</Text> : undefined}>
        {sleepScore ? `Sleep Score · ${sleepScore.score}` : 'Sleep Score'}
      </SectionLabel>
      <Card>
        {sleepScore ? (
          sleepScore.contributors.map((c) => (
            <ContributorRow key={c.key} label={c.label} percent={c.score} value={`${fourTier(c.score).label} · ${c.detail}`} color={fourTier(c.score).color} />
          ))
        ) : (
          <Empty text="Your Sleep Score appears after a night with the strap. It blends total sleep vs need, efficiency, REM, deep (SWS) and restfulness into one 0–100 figure." />
        )}
      </Card>

      {/* Contributors */}
      <SectionLabel>Sleep contributors</SectionLabel>
      <Card>
        <ContributorRow label="Hours vs. needed" percent={hoursNeededPct} value={hoursNeededPct == null ? 'awaiting data' : undefined} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <ContributorRow label="Sleep efficiency" percent={effPct} value={effPct == null ? 'awaiting data' : undefined} />
        <ContributorRow
          label="Sleep regularity"
          percent={sleepReg?.score ?? null}
          value={sleepReg ? `${fourTier(sleepReg.score).label} · ±${sleepReg.bedSdMin}m bed` : 'needs ~5 nights'}
          color={sleepReg ? fourTier(sleepReg.score).color : undefined}
        />
        <BandLegend />
      </Card>

      {/* Last night */}
      <SectionLabel>Last night's sleep</SectionLabel>
      <Card>
        {sleep ? (
          <>
            <View style={styles.headRow}>
              <Text style={styles.bigHours}>{formatDuration(sleep.asleepMin)}</Text>
              <Text style={styles.headSub}>asleep · {formatDuration(sleep.inBedMin)} in bed</Text>
            </View>
            <LineChart values={nightHr} color={colors.sleepTeal} leftLabel={formatClock(sleep.startTs)} rightLabel={formatClock(sleep.endTs)} />
          </>
        ) : (
          <Empty text="No sleep recorded last night. Wear the strap to bed with the app connected, then tap ‘Recalculate today’ on Home. Detected automatically from your overnight heart rate." />
        )}
      </Card>

      {/* Stages — data (if any) + always-on education */}
      <SectionLabel>Sleep stages</SectionLabel>
      <Card>
        {sleep ? (
          <>
            <Hypnogram segments={sleep.hypnogram} />
            <View style={{ marginTop: 12 }}>
              <StageRow name="SWS (Deep)" color={sleepStageColors.deep} minutes={sleep.stages.deep} total={total} />
              <StageRow name="REM" color={sleepStageColors.rem} minutes={sleep.stages.rem} total={total} />
              <StageRow name="Light" color={sleepStageColors.light} minutes={sleep.stages.light} total={total} />
              <StageRow name="Awake" color={sleepStageColors.awake} minutes={sleep.stages.awake} total={total} />
            </View>
          </>
        ) : (
          <Empty text="Once a night is recorded you’ll see a full hypnogram and time in each stage here." />
        )}
      </Card>
      <Card>
        {STAGE_EDU.map((s) => (
          <View key={s.name} style={styles.eduRow}>
            <View style={[styles.eduDot, { backgroundColor: s.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eduName}>{s.name}</Text>
              <Text style={styles.eduDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Key metrics */}
      <SectionLabel>Key metrics</SectionLabel>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Restorative (deep+REM)" value={restorativeMin != null ? formatDuration(restorativeMin) : '—'} color={sleepStageColors.rem} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Wake events" value={wakeEvents ?? '—'} />
        </Card>
      </View>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Efficiency" value={effPct ?? '—'} unit={effPct != null ? '%' : undefined} color={colors.sleepTeal} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Respiratory rate" value={today?.resp != null ? Math.round(today.resp * 10) / 10 : '—'} unit={today?.resp != null ? 'rpm' : undefined} />
        </Card>
      </View>

      {/* Sleep need breakdown — always */}
      <SectionLabel>How sleep need is calculated</SectionLabel>
      <Card>
        <NeedRow label="Baseline" value={formatDuration(sleepNeed?.baselineMin ?? BASE_NEED_MIN)} />
        <NeedRow label="Recent strain" value={`+${formatDuration(sleepNeed?.strainMin ?? 0)}`} />
        <NeedRow label="Sleep debt" value={`+${formatDuration(sleepNeed?.debtMin ?? 0)}`} />
        <NeedRow label="Recent naps" value={`−${formatDuration(sleepNeed?.napMin ?? 0)}`} />
        <View style={styles.divider} />
        <NeedRow label="Sleep needed" value={formatDuration(neededMin)} strong />
        {sleep ? <NeedRow label="Hours of sleep" value={formatDuration(sleep.asleepMin)} strong /> : null}
      </Card>

      {/* Recent sleep */}
      <SectionLabel>Recent sleep</SectionLabel>
      <Card>
        {week.some((d) => d.sleepMin != null) ? (
          <WeeklyBars
            data={week.map((d) => ({
              label: new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
              value: d.sleepMin,
              display: d.sleepMin != null ? `${Math.round((d.sleepMin / 60) * 10) / 10}` : '',
              color: colors.sleepTeal,
            }))}
          />
        ) : (
          <Empty text="Your last 7 nights will chart here as you wear the strap overnight." />
        )}
      </Card>

      {/* Naps */}
      <SectionLabel>Naps</SectionLabel>
      <Card>
        <Empty text="No naps logged today. A nap reduces tonight’s sleep need — tap ‘Log a sleep or nap’ above to record one." />
      </Card>

      <Empty text="Sleep stages are inferred from overnight heart rate (approximate — WHOOP’s staging also uses motion and raw optical data, which aren’t available over Bluetooth)." />
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
  bigHours: { color: colors.text, fontSize: 32, fontFamily: fonts.black },
  headSub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text },
  stage: { marginVertical: 6 },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageName: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  stageDur: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  stageTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  stageFill: { height: 8, borderRadius: 4 },
  eduRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9 },
  eduDot: { width: 10, height: 10, borderRadius: 3, marginRight: 10, marginTop: 4 },
  eduName: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  eduDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 1, fontFamily: fonts.text },
  needRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  needLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  needValue: { color: colors.text, fontSize: 14, fontFamily: fonts.text },
  needStrong: { color: colors.text, fontFamily: fonts.bold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  scoreWord: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textBold },
});
