import { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import {
  Card,
  calculateTonightPlan,
  Empty,
  Hypnogram,
  LineChart,
  NavRow,
  Ring,
  Screen,
  SectionLabel,
  parsePinnedWakeMinute,
  parsePlanningWindowMinute,
  Stat,
  TonightBand,
  tonightEfficiencyPercent,
} from '../ui/components';
import { colors, fonts, sleepStageColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { Band, BAND_LABEL, bandColors } from '../metrics/sleepBands';
import { formatClock, formatDuration, startOfDayMs } from '../util/time';
import { DayRail } from './DayScreen';
import type { DailyMetricRow } from '../db/database';
import { napCreditMin, parseNapDetail } from '../metrics/naps';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';
import { kvGet } from '../db/database';
import { autoSleepAtSafetyCeiling } from '../metrics/sleepEvidence';

const BASE_NEED_MIN = 480;

// WHOOP "Last Night" stage order, % is of TIME IN BED (verified against the app).
const STAGE_EDU = [
  { key: 'awake', name: 'Awake', color: sleepStageColors.awake, desc: 'Brief wake-ups. A few are normal; many fragment recovery.' },
  { key: 'light', name: 'Light', color: sleepStageColors.light, desc: 'Estimated sleep outside the stronger deep or REM patterns.' },
  { key: 'deep', name: 'Deep', color: sleepStageColors.deep, desc: 'Estimated from lower heart rate, higher HRV and low movement.' },
  { key: 'rem', name: 'REM', color: sleepStageColors.rem, desc: 'Estimated from relative heart rate, HRV and low movement.' },
  { key: 'unknown', name: 'Unscored', color: sleepStageColors.unknown, desc: 'No usable heart-rate sample. This time is not counted as sleep or wake.' },
] as const;

export function SleepScreen({ nav }: { nav: Nav }) {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const perf = useStoreSelector(appStore, (s) => s.sleepPerformance);
  const tonightNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const sleepGoal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const sleepSchedule = useStoreSelector(appStore, (s) => s.sleepSchedule);
  const consistency = useStoreSelector(appStore, (s) => s.sleepConsistency);
  const stress = useStoreSelector(appStore, (s) => s.sleepStress);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const [nightHr, setNightHr] = useState<Array<number | null>>([]);
  const [pinnedWakeMinute, setPinnedWakeMinute] = useState<number | null>(null);
  const [planningWindowMin, setPlanningWindowMin] = useState(30);

  useEffect(() => {
    void appStore.lastNightHr().then(setNightHr);
  }, [sleep]);
  useEffect(() => {
    void Promise.all([kvGet('wakeTime'), kvGet('wakeTimePinned'), kvGet('smartWakeWindowMin')]).then(([wake, pinned, window]) => {
      setPinnedWakeMinute(parsePinnedWakeMinute(wake, pinned));
      setPlanningWindowMin(parsePlanningWindowMinute(window));
    });
  }, []);

  const tib = sleep?.inBedMin || 1;
  const lastNightNeed = useMemo(() => storedSleepNeed(today?.sleepDetail), [today?.sleepDetail]);
  const neededMin = lastNightNeed?.neededMin ?? sleep?.neededMin ?? BASE_NEED_MIN;
  const days = useMemo(() => orderedDays(today, recentDays), [today, recentDays]);
  const debtExcludedNights = useMemo(() => lowTrustDebtNightCount(recentDays, today?.day), [recentDays, today?.day]);
  const todayStart = startOfDayMs(Date.now());
  const naps = cardio.filter((c) => c.source === 'nap' && c.startTs >= todayStart).slice(0, 4);
  const perfScore = perf ? displayPct(perf.score) : null;
  const surplusSleepMin = sleep ? Math.max(0, sleep.asleepMin - neededMin) : 0;
  const stageEstimateAvailable = !!sleep?.hypnogram.some((segment) => segment.minutes > 0);
  const autoWindowNeedsReview = autoSleepAtSafetyCeiling(sleep);
  const tonightFocus = sleepFocus({
    sleep,
    sleepNeed: tonightNeed,
    stress,
    consistency,
  });
  const efficiencySamples = recentDays
    .filter((d) => sleepTrustTier(d.sleepDetail) !== 'low')
    .map((d) => d.sleepDetail?.efficiency)
    .filter((v): v is number => v != null && v > 0);
  const tonightPlan = calculateTonightPlan({
    neededMinutes: tonightNeed?.neededMin ?? BASE_NEED_MIN,
    goal: sleepGoal,
    wakeMinute: pinnedWakeMinute ?? sleepSchedule.wakeMin,
    planningWindowMinutes: planningWindowMin,
    expectedEfficiencyPercent: tonightEfficiencyPercent(efficiencySamples),
  });

  // Trailing typical share per stage (% of TIB) for the "typical range" markers.
  const typical = stageTypicals(recentDays.filter((d) => d.day !== today?.day && sleepTrustTier(d.sleepDetail) !== 'low'));

  return (
    <Screen title="Sleep" onBack={nav.canBack ? nav.back : undefined} tint={colors.sleepTeal}>
      <DayRail
        days={days}
        selected={today?.day ?? ''}
        onSelect={(selected) => nav.navigate({ name: 'day', day: selected })}
      />

      <TonightBand
        targetMinutes={tonightPlan.targetMinutes}
        bedMinute={tonightPlan.bedMinute}
        wakeMinute={tonightPlan.wakeMinute}
        onPress={() => nav.navigate({ name: 'sleepCoach' })}
      />

      {/* Sleep Performance composite ring */}
      <Card style={{ alignItems: 'center', paddingVertical: 24 }} onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}>
        <Ring
          value={perfScore != null ? perfScore / 100 : 0}
          color={colors.sleepTeal}
          centerTop="Sleep Performance"
          centerMain={perfScore != null ? `${perfScore}%` : '—'}
          centerSub={sleep ? formatDuration(sleep.asleepMin) : 'awaiting last night'}
        />
      </Card>

      {/* The four Sleep Performance contributors with Poor / Sufficient / Optimal bands */}
      <SectionLabel>Performance contributors</SectionLabel>
      <Card>
        {perf ? (
          <>
            {perf.contributors.map((c) => (
              <ContribBand
                key={c.key}
                label={c.label}
                value={c.value}
                band={c.band}
                suffix={c.key === 'highStress' ? '%' : '%'}
              />
            ))}
            {surplusSleepMin > 0 ? (
              <Text style={styles.surplusNote}>
                You slept {formatDuration(surplusSleepMin)} beyond last night's calculated need; Sleep Performance is capped at 100%.
              </Text>
            ) : null}
          </>
        ) : (
          <Empty text="Your Sleep Performance and its four contributors appear after a night with the strap." />
        )}
        <View style={styles.legend}>
          <LegendDot band="poor" />
          <LegendDot band="sufficient" />
          <LegendDot band="optimal" />
        </View>
      </Card>

      <SectionLabel>Tonight focus</SectionLabel>
      <Card>
        <View style={styles.focusHead}>
          <View style={[styles.focusIcon, { backgroundColor: tonightFocus.color }]}>
            <Text style={styles.focusIconText}>{tonightFocus.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTitle}>{tonightFocus.title}</Text>
            <Text style={styles.focusBody}>{tonightFocus.body}</Text>
          </View>
        </View>
      </Card>

      {/* Last night's sleep */}
      <SectionLabel>Last night's sleep</SectionLabel>
      <Card>
        {sleep ? (
          <>
            <View style={styles.headRow}>
              <Text style={styles.bigHours}>{formatDuration(sleep.asleepMin)}</Text>
              <Text style={styles.headSub}>asleep · {formatDuration(sleep.inBedMin)} in bed</Text>
            </View>
            {autoWindowNeedsReview ? (
              <View style={styles.ceilingNotice}>
                <Text style={styles.ceilingTitle}>Automatic window reached the 11-hour review limit</Text>
                <Text style={styles.ceilingBody}>
                  This may be the strongest 11 hours of a longer low-activity period. Treat the duration as provisional and trim the window below if the timeline includes quiet wakefulness.
                </Text>
              </View>
            ) : null}
            <LineChart values={nightHr} color={colors.sleepTeal} leftLabel={formatClock(sleep.startTs)} rightLabel={formatClock(sleep.endTs)} />
            {stageEstimateAvailable ? (
              <>
                <Text style={styles.timelineTitle}>Estimated sleep stages</Text>
                <Hypnogram segments={sleep.hypnogram} showLabels startTs={sleep.startTs} endTs={sleep.endTs} />
              </>
            ) : null}
            {stageEstimateAvailable ? (
              <View style={{ marginTop: 14 }}>
                {STAGE_EDU.map((s) => (
                  <StageBar
                    key={s.key}
                    name={s.name}
                    color={s.color}
                    minutes={s.key === 'unknown' ? sleep.unscoredMin : sleep.stages[s.key]}
                    total={tib}
                    typicalPct={s.key === 'unknown' ? null : typical[s.key]}
                  />
                ))}
              </View>
            ) : (
              <Empty text="Stage detail is limited for this night. Use timing and duration for now." />
            )}
            <NavRow
              label="Adjust and rescan"
              icon="create"
              iconColor={colors.sleepTeal}
              value="bed and final wake"
              onPress={() => nav.navigate({ name: 'editSleep', day: today?.day })}
              last
            />
          </>
        ) : (
          <>
            <Empty text="No sleep recorded last night. Wear the strap to bed, then reconnect to retrieve stored history, or enter your bed and wake times manually." />
            <NavRow
              label="Log sleep manually"
              icon="create"
              iconColor={colors.sleepTeal}
              value="bed and wake times"
              onPress={() => nav.navigate({ name: 'editSleep' })}
              last
            />
          </>
        )}
      </Card>

      {/* Key metrics */}
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Est. restorative" value={sleep && stageEstimateAvailable ? formatDuration(sleep.restorativeMin) : '—'} color={sleepStageColors.rem} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Wake events" value={sleep ? sleep.wakeEvents : '—'} />
        </Card>
      </View>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Sleep latency" value={sleep ? formatDuration(sleep.latencyMin) : '—'} />
        </Card>
        <Card style={styles.half}>
          <Stat label="Respiratory rate" value={today?.resp != null ? Math.round(today.resp * 10) / 10 : '—'} unit={today?.resp != null ? 'rpm' : undefined} />
        </Card>
      </View>

      {/* Sleep Need breakdown */}
      <SectionLabel>Last night's sleep need</SectionLabel>
      <Card>
        <NeedRow label="Baseline" value={formatDuration(lastNightNeed?.baselineMin ?? BASE_NEED_MIN)} />
        <NeedRow label="Recent naps" value={`−${formatDuration(lastNightNeed?.napMin ?? 0)}`} />
        <NeedRow label="Recent strain" value={`+${formatDuration(lastNightNeed?.strainMin ?? 0)}`} />
        <NeedRow label="Sleep debt" value={`+${formatDuration(lastNightNeed?.debtMin ?? 0)}`} />
        <View style={styles.divider} />
        <NeedRow label="Sleep needed" value={formatDuration(neededMin)} strong />
        {sleep ? <NeedRow label="Hours of sleep" value={formatDuration(sleep.asleepMin)} strong /> : null}
        {debtExcludedNights > 0 ? (
          <Text style={styles.needNote}>
            Sleep debt is based on trusted nights; {debtExcludedNights} low-confidence night{debtExcludedNights === 1 ? '' : 's'} are waiting for stronger overnight capture before changing the carry.
          </Text>
        ) : null}
      </Card>

      <SectionLabel>Naps</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {naps.length ? (
          naps.map((nap, i) => {
            const detail = parseNapDetail(nap.notes);
            const credit = napCreditMin(nap);
            const episodeLabel = (detail?.inBedMin ?? 0) > 90 ? 'Additional sleep' : 'Nap';
            const label = `${formatClock(nap.startTs)} ${episodeLabel}`;
            const source = detail?.autoDetected ? 'auto' : 'timer';
            return (
              <NavRow
                key={nap.id}
                label={label}
                icon="cafe"
                iconColor={colors.recoveryYellow}
                value={`${formatDuration(credit)} credit / ${source}`}
                onPress={() => nav.navigate({ name: 'activity', id: nap.id })}
                last={i === naps.length - 1}
              />
            );
          })
        ) : (
          <Empty text="No naps logged or auto-detected today." />
        )}
      </Card>

    </Screen>
  );
}

// Average share (% of time in bed) per stage over recent nights, for typical markers.
function stageTypicals(days: Pick<DailyMetricRow, 'deepMin' | 'remMin' | 'lightMin' | 'awakeMin'>[]): Record<'awake' | 'light' | 'deep' | 'rem', number | null> {
  const acc = { awake: [] as number[], light: [] as number[], deep: [] as number[], rem: [] as number[] };
  for (const d of days) {
    const t = (d.deepMin ?? 0) + (d.remMin ?? 0) + (d.lightMin ?? 0) + (d.awakeMin ?? 0);
    if (t <= 0) continue;
    acc.awake.push(((d.awakeMin ?? 0) / t) * 100);
    acc.light.push(((d.lightMin ?? 0) / t) * 100);
    acc.deep.push(((d.deepMin ?? 0) / t) * 100);
    acc.rem.push(((d.remMin ?? 0) / t) * 100);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { awake: avg(acc.awake), light: avg(acc.light), deep: avg(acc.deep), rem: avg(acc.rem) };
}

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function storedSleepNeed(
  detail: DailyMetricRow['sleepDetail'] | undefined,
): NonNullable<ReturnType<typeof appStore.getState>['sleepNeed']> | null {
  if (detail?.needMin == null) return null;
  const minutes = (value: number | null | undefined, fallback = 0) =>
    Math.max(0, Math.round(value ?? fallback));
  return {
    baselineMin: minutes(detail.baselineMin, BASE_NEED_MIN),
    strainMin: minutes(detail.strainMin),
    debtMin: minutes(detail.debtMin),
    napMin: minutes(detail.napMin),
    neededMin: minutes(detail.needMin, BASE_NEED_MIN),
  };
}

function sleepFocus(input: {
  sleep: ReturnType<typeof appStore.getState>['lastSleep'];
  sleepNeed: ReturnType<typeof appStore.getState>['sleepNeed'];
  stress: ReturnType<typeof appStore.getState>['sleepStress'];
  consistency: ReturnType<typeof appStore.getState>['sleepConsistency'];
}): {
  badge: string;
  title: string;
  body: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  if (!input.sleep) {
    return {
      badge: 'PLAN',
      title: 'Set tonight’s sleep target',
      body: `Plan around ${formatDuration(input.sleepNeed?.neededMin ?? BASE_NEED_MIN)} of sleep and keep your wake time steady.`,
      actionLabel: 'Plan tonight',
      actionValue: formatDuration(input.sleepNeed?.neededMin ?? BASE_NEED_MIN),
      icon: 'moon',
      color: colors.sleepTeal,
      route: { name: 'sleepCoach' },
    };
  }

  if (
    autoSleepAtSafetyCeiling(input.sleep) ||
    input.sleep.unscoredMin >= Math.max(30, Math.ceil(input.sleep.inBedMin * 0.15))
  ) {
    return {
      badge: 'CHECK',
      title: 'Review the detected sleep window',
      body: 'The timeline contains a detector limit or a substantial unscored gap. Confirm bed and final wake before using this night as a trend.',
      actionLabel: 'Adjust and rescan',
      actionValue: formatDuration(input.sleep.inBedMin),
      icon: 'create',
      color: colors.recoveryYellow,
      route: { name: 'editSleep' },
    };
  }

  const debtMin = input.sleepNeed?.debtMin ?? 0;
  if (debtMin >= 60) {
    return {
      badge: 'DEBT',
      title: 'Pay down sleep debt',
      body: `You are carrying ${formatDuration(debtMin)} of debt. The biggest win is shifting bedtime earlier enough to bank real asleep time.`,
      actionLabel: 'Plan tonight',
      actionValue: formatDuration(input.sleepNeed?.neededMin ?? BASE_NEED_MIN),
      icon: 'moon',
      color: colors.recoveryYellow,
      route: { name: 'sleepCoach' },
    };
  }

  if ((input.stress?.highPct ?? 0) >= 20) {
    return {
      badge: 'CALM',
      title: 'Lower overnight stress',
      body: `${input.stress?.highPct ?? 0}% of the night was high stress. Prioritise an earlier wind-down, lighter late training and a cooler room.`,
      actionLabel: 'Open sleep planner',
      actionValue: 'wind-down',
      icon: 'moon',
      color: colors.recoveryYellow,
      route: { name: 'sleepCoach' },
    };
  }

  if (input.consistency && input.consistency.score < 70) {
    return {
      badge: 'TIME',
      title: 'Stabilise your sleep schedule',
      body: `Your consistency is ${input.consistency.score}%. Keeping bed and wake times tighter is the highest-leverage regularity move.`,
      actionLabel: 'Set wake target',
      actionValue: `${input.consistency.score}%`,
      icon: 'alarm',
      color: colors.sleepTeal,
      route: { name: 'sleepCoach' },
    };
  }

  if (input.sleep.efficiency < 0.85 || input.sleep.wakeEvents >= 4) {
    return {
      badge: 'REST',
      title: 'Protect sleep continuity',
      body: `Efficiency was ${Math.round(input.sleep.efficiency * 100)}% with ${input.sleep.wakeEvents} wake events. Review timing and reduce late disruptions.`,
      actionLabel: 'Review sleep window',
      actionValue: `${Math.round(input.sleep.efficiency * 100)}% eff.`,
      icon: 'create',
      color: colors.sleepTeal,
      route: { name: 'editSleep' },
    };
  }

  return {
    badge: 'KEEP',
    title: 'Hold the routine',
    body: 'The main sleep signals look usable. Keep the same wake target and let the trend view show whether this pattern holds.',
    actionLabel: 'View sleep trends',
    actionValue: 'trend',
    icon: 'trending-up',
    color: colors.recoveryGreen,
    route: { name: 'sleepTrends' },
  };
}

function ContribBand({ label, value, band, suffix }: { label: string; value: number | null; band: Band | null; suffix: string }) {
  const order: Band[] = ['poor', 'sufficient', 'optimal'];
  return (
    <View style={styles.contribRow}>
      <Text style={styles.contribLabel}>{label}</Text>
      <View style={styles.segWrap}>
        {order.map((seg) => (
          <View
            key={seg}
            style={[styles.seg, { backgroundColor: band === seg ? bandColors[seg] : colors.surface }]}
          />
        ))}
      </View>
      <Text style={styles.contribValue}>{value == null ? '—' : `${value}${suffix}`}</Text>
    </View>
  );
}

function LegendDot({ band }: { band: Band }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSquare, { backgroundColor: bandColors[band] }]} />
      <Text style={styles.legendText}>{BAND_LABEL[band]}</Text>
    </View>
  );
}

function StageBar({ name, color, minutes, total, typicalPct }: { name: string; color: string; minutes: number; total: number; typicalPct: number | null }) {
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
        {typicalPct != null ? (
          <View style={[styles.typicalMark, { left: `${Math.max(0, Math.min(98, typicalPct))}%` }]} />
        ) : null}
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

function lowTrustDebtNightCount(days: DailyMetricRow[], todayDay: string | undefined): number {
  return days
    .filter((d) => d.day !== todayDay && d.sleepMin != null)
    .slice(0, 14)
    .filter((d) => sleepTrustTier(d.sleepDetail) === 'low').length;
}

function displayPct(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const styles = StyleSheet.create({
  surplusNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  focusIcon: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  focusIconText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  focusTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  focusBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  contribRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  contribLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold, flex: 1 },
  segWrap: { flexDirection: 'row', gap: 4, width: 96, marginHorizontal: 10 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  contribValue: { color: colors.text, fontSize: 16, fontFamily: fonts.bold, width: 56, textAlign: 'right' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSquare: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.text },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  bigHours: { color: colors.text, fontSize: 32, fontFamily: fonts.black },
  headSub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text },
  ceilingNotice: { borderLeftWidth: 3, borderLeftColor: colors.recoveryYellow, paddingLeft: 10, paddingVertical: 4, marginBottom: 12 },
  ceilingTitle: { color: colors.text, fontSize: 13, fontFamily: fonts.textBold },
  ceilingBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3, fontFamily: fonts.text },
  timelineTitle: { color: colors.text, fontSize: 13, fontFamily: fonts.textBold, marginTop: 16 },
  stage: { marginVertical: 6 },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageName: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  stageDur: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  stageTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'visible', justifyContent: 'center' },
  stageFill: { height: 8, borderRadius: 4 },
  typicalMark: { position: 'absolute', width: 2, height: 14, backgroundColor: colors.textSecondary, top: -3, opacity: 0.7 },
  needRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  needLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  needValue: { color: colors.text, fontSize: 14, fontFamily: fonts.text },
  needStrong: { color: colors.text, fontFamily: fonts.bold },
  needNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 8, fontFamily: fonts.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});
