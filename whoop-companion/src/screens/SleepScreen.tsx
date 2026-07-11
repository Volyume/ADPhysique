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
  SleepConfidenceStatus,
  parsePinnedWakeMinute,
  parsePlanningWindowMinute,
  Stat,
  TonightBand,
  tonightEfficiencyPercent,
} from '../ui/components';
import { colors, fonts, sleepStageColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { Band, BAND_LABEL, bandColors } from '../metrics/sleepBands';
import { longAutoSleepNeedsCorroboration, sleepEvidencePct, sleepHasCorroboration, sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { formatClock, formatDuration, startOfDayMs } from '../util/time';
import { DayRail } from './DayScreen';
import type { DailyMetricRow } from '../db/database';
import { napCreditMin, parseNapDetail } from '../metrics/naps';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepConfidenceLabel } from '../ui/sleepTrust';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';
import { kvGet } from '../db/database';

const BASE_NEED_MIN = 480;

// WHOOP "Last Night" stage order, % is of TIME IN BED (verified against the app).
const STAGE_EDU = [
  { key: 'awake', name: 'Awake', color: sleepStageColors.awake, desc: 'Brief wake-ups. A few are normal; many fragment recovery.' },
  { key: 'light', name: 'Light', color: sleepStageColors.light, desc: 'The bridge between wake and deep — usually the largest share.' },
  { key: 'deep', name: 'SWS (Deep)', color: sleepStageColors.deep, desc: 'Slow-wave sleep: physical repair, growth hormone, immunity. Restorative.' },
  { key: 'rem', name: 'REM', color: sleepStageColors.rem, desc: 'Dreaming sleep: memory, learning and mood. Restorative.' },
] as const;

export function SleepScreen({ nav }: { nav: Nav }) {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const perf = useStoreSelector(appStore, (s) => s.sleepPerformance);
  const tonightNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const sleepGoal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const sleepSchedule = useStoreSelector(appStore, (s) => s.sleepSchedule);
  const consistency = useStoreSelector(appStore, (s) => s.sleepConsistency);
  const stress = useStoreSelector(appStore, (s) => s.sleepStress);
  const capture = useStoreSelector(appStore, (s) => s.sleepCapture);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const [nightHr, setNightHr] = useState<number[]>([]);
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
  const stagesTrusted = today?.sleepDetail?.restorativeMin != null;
  const tonightFocus = sleepFocus({
    sleep,
    capture,
    perfCapped: !!perf?.cappedByConfidence,
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

      <SleepConfidenceStatus
        confidence={capture ? confidenceStatusTier(capture) : null}
        reason={sleepConfidenceReason(capture)}
        onDetails={capture ? () => nav.navigate({ name: 'editSleep' }) : undefined}
        detailsLabel="Review"
      />

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
            <LineChart values={nightHr} color={colors.sleepTeal} leftLabel={formatClock(sleep.startTs)} rightLabel={formatClock(sleep.endTs)} />
            {stagesTrusted ? <Hypnogram segments={sleep.hypnogram} showLabels /> : null}
            {stagesTrusted ? (
              <View style={{ marginTop: 14 }}>
                {STAGE_EDU.map((s) => (
                  <StageBar
                    key={s.key}
                    name={s.name}
                    color={s.color}
                    minutes={sleep.stages[s.key]}
                    total={tib}
                    typicalPct={typical[s.key]}
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
          <Stat label="Restorative (deep+REM)" value={sleep && stagesTrusted ? formatDuration(sleep.restorativeMin) : '—'} color={sleepStageColors.rem} />
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
            const label = `${formatClock(nap.startTs)} Nap`;
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

function sleepConfidenceReason(capture: ReturnType<typeof appStore.getState>['sleepCapture']): string {
  if (!capture) return 'Waiting for a complete overnight record.';
  if (sleepStateWakeConflict(capture)) return 'The sleep window may include awake time.';
  if (sleepNeedsMoreSync(capture)) return 'Overnight capture is incomplete; decoded coverage is insufficient.';
  if (!sleepHasCorroboration(capture)) return 'Timing is usable, but the sleep state is still provisional.';
  return 'The overnight record is strong enough to use.';
}

function confidenceStatusTier(source: Parameters<typeof sleepTrustTier>[0]): 'high' | 'medium' | 'low' | null {
  const tier = sleepTrustTier(source);
  return tier === 'none' ? null : tier;
}

function sleepVerdict(input: {
  sleep: ReturnType<typeof appStore.getState>['lastSleep'];
  capture: ReturnType<typeof appStore.getState>['sleepCapture'];
  perfCapped: boolean;
  rmssd: number | null;
  rhr: number | null;
}): {
  badge: string;
  title: string;
  body: string;
  vitalsLabel: string;
  vitalsColor: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  const { sleep, capture } = input;
  const vitalsReady = input.rmssd != null && input.rhr != null;
  const vitalsLabel = vitalsReady ? 'ready' : 'limited';
  const vitalsColor = vitalsReady ? colors.recoveryGreen : colors.recoveryYellow;

  if (capture && sleepStateWakeConflict(capture)) {
    return {
      badge: 'CHECK',
      title: sleep ? 'Sleep window needs review' : 'Sleep candidate rejected',
      body: sleep
        ? 'Decoded strap-state evidence is mostly wake, so this result is capped until the window is reviewed or more history arrives.'
        : 'Decoded strap-state evidence is mostly wake, so Pulse is not treating the HR window as sleep automatically.',
      vitalsLabel,
      vitalsColor,
      actionLabel: 'Review sleep window',
      actionValue: sleepStateWakeDisplay(capture),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }

  if (!sleep && capture && longHrOnlyCapture(capture)) {
    return {
      badge: 'WAIT',
      title: 'Sleep candidate needs corroboration',
      body: 'Pulse found a long HR-shaped overnight window, but it is not scoring it as sleep until coverage is stronger or band still-state evidence appears.',
      vitalsLabel,
      vitalsColor,
      actionLabel: 'Review capture',
      actionValue: `${capture.coveragePct}% coverage`,
      icon: 'create',
      color: colors.strainBlue,
      route: { name: 'editSleep' },
    };
  }

  if (!sleep) {
    return {
      badge: 'WAIT',
      title: 'Sleep is not scored yet',
      body: capture
        ? 'Overnight capture is incomplete, with insufficient decoded coverage to close a sleep result.'
        : 'No overnight record is available yet. Reconnect the strap before judging recovery.',
      vitalsLabel,
      vitalsColor,
      actionLabel: capture ? 'Review capture' : 'Open device',
      actionValue: capture ? `${capture.coveragePct}% coverage` : 'no overnight record',
      icon: capture ? 'create' : 'sync',
      color: colors.strainBlue,
      route: capture ? { name: 'editSleep' } : { name: 'device' },
    };
  }

  if (capture && (sleepNeedsMoreSync(capture) || input.perfCapped)) {
    const needsSync = sleepNeedsMoreSync(capture);
    return {
      badge: 'PART',
      title: 'Treat this as partial',
      body: 'The sleep window exists, but overnight capture is incomplete. Review the capture if the timing looks wrong.',
      vitalsLabel,
      vitalsColor,
      actionLabel: needsSync ? 'Review capture' : 'Review window',
      actionValue: needsSync ? `${capture.coveragePct}% coverage` : 'review timing',
      icon: 'create',
      color: colors.recoveryYellow,
      route: { name: 'editSleep' },
    };
  }

  const longAutoWindow = sleep.source === 'auto_hr' && sleep.inBedMin >= 10 * 60 && sleep.efficiency >= 0.92;
  const weakLongAutoEvidence = capture ? !sleepHasCorroboration(capture) : true;
  if (longAutoWindow && weakLongAutoEvidence) {
    return {
      badge: 'CHECK',
      title: 'Window may be too generous',
      body: 'This was a long, high-efficiency auto window with limited still-state evidence. If you were awake in bed, trim it once and the score will recompute.',
      vitalsLabel,
      vitalsColor,
      actionLabel: 'Adjust sleep window',
      actionValue: formatDuration(sleep.inBedMin),
      icon: 'create',
      color: colors.sleepTeal,
      route: { name: 'editSleep' },
    };
  }

  if (!vitalsReady) {
    return {
      badge: 'VITAL',
      title: 'Sleep scored, vitals limited',
      body: 'Duration and stages are usable, but recovery will improve once enough clean overnight R-R and heart-rate samples are available.',
      vitalsLabel,
      vitalsColor,
      actionLabel: capture ? 'Review capture' : sleep ? 'Review sleep window' : 'Open device',
      actionValue: capture ? `${capture.signalMin} min signal` : sleep ? formatDuration(sleep.inBedMin) : 'no overnight record',
      icon: capture || sleep ? 'create' : 'sync',
      color: colors.recoveryYellow,
      route: capture || sleep ? { name: 'editSleep' } : { name: 'device' },
    };
  }

  return {
    badge: 'GOOD',
    title: 'Result looks usable',
    body: 'Sleep, capture quality and recovery vitals are aligned enough to use today. Review the capture later if more history becomes available.',
    vitalsLabel,
    vitalsColor,
    actionLabel: 'View trends',
    actionValue: 'sleep',
    icon: 'trending-up',
    color: colors.recoveryGreen,
    route: { name: 'sleepTrends' },
  };
}

function sleepFocus(input: {
  sleep: ReturnType<typeof appStore.getState>['lastSleep'];
  capture: ReturnType<typeof appStore.getState>['sleepCapture'];
  perfCapped: boolean;
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
  const capture = input.capture;
  if (capture && sleepStateWakeConflict(capture)) {
    return {
      badge: 'CHECK',
      title: 'Review the sleep window',
      body: 'Decoded strap-state evidence is mostly wake. Review the window if you know you were asleep.',
      actionLabel: 'Adjust sleep window',
      actionValue: sleepStateWakeDisplay(capture),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }
  if (!input.sleep) {
    return {
      badge: capture ? 'DATA' : 'WAIT',
      title: capture ? 'Overnight capture needs review' : 'No overnight record yet',
      body: capture
        ? 'Sleep scoring is limited by insufficient decoded coverage. Review the capture before judging recovery.'
        : 'Sleep scoring starts with stored strap history. Reconnect the strap before judging recovery.',
      actionLabel: capture ? 'Review capture' : 'Open device',
      actionValue: capture ? `${capture.coveragePct}% coverage` : 'no overnight record',
      icon: capture ? 'create' : 'sync',
      color: colors.strainBlue,
      route: capture ? { name: 'editSleep' } : { name: 'device' },
    };
  }

  if (capture && sleepStateWakeConflict(capture)) {
    return {
      badge: 'CHECK',
      title: 'Review the sleep window',
      body: 'The strap-state evidence is mostly wake. Fixing the window first will make sleep, recovery and readiness more trustworthy.',
      actionLabel: 'Adjust sleep window',
      actionValue: sleepStateWakeDisplay(capture),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }

  if (capture && (sleepNeedsMoreSync(capture) || input.perfCapped)) {
    const needsSync = sleepNeedsMoreSync(capture);
    return {
      badge: 'DATA',
      title: 'Improve capture confidence first',
      body: 'Tonight’s score is limited by partial overnight capture, so recovery and readiness may move if the window is rescanned.',
      actionLabel: needsSync ? 'Review capture' : 'Review sleep window',
      actionValue: needsSync ? `${capture.coveragePct}% coverage` : 'review timing',
      icon: 'create',
      color: needsSync ? colors.strainBlue : colors.sleepTeal,
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

type SleepDriver = {
  tone: 'limit' | 'help' | 'data';
  label: string;
  value: string;
  detail: string;
  color: string;
};

function sleepScoreDrivers(input: {
  perf: ReturnType<typeof appStore.getState>['sleepPerformance'];
  sleepScore: ReturnType<typeof appStore.getState>['sleepScore'];
  sleep: ReturnType<typeof appStore.getState>['lastSleep'];
  capture: ReturnType<typeof appStore.getState>['sleepCapture'];
  sleepNeed: ReturnType<typeof appStore.getState>['sleepNeed'];
  stress: ReturnType<typeof appStore.getState>['sleepStress'];
}): SleepDriver[] {
  const drivers: SleepDriver[] = [];
  const capture = input.capture;

  if (capture && sleepStateWakeConflict(capture)) {
    drivers.push({
      tone: 'data',
      label: 'Strap state',
      value: sleepStateWakeDisplay(capture, 'min'),
      detail: 'Decoded state evidence is mostly wake, so the sleep score stays capped until the window is reviewed or more history arrives.',
      color: colors.recoveryRed,
    });
  }

  if (capture && longHrOnlyCapture(capture)) {
    drivers.push({
      tone: 'data',
      label: 'Corroboration',
      value: `${capture.stillMin} still min`,
      detail: 'A long HR-only window needs still-worn or decoded sleep-state evidence before it should count as final sleep.',
      color: colors.strainBlue,
    });
  }

  if (capture && (capture.coveragePct < 80 || capture.signalMin < 240 || input.perf?.cappedByConfidence)) {
    drivers.push({
      tone: 'data',
      label: 'Capture confidence',
      value: `${capture.coveragePct}%`,
      detail:
        sleepNeedsMoreSync(capture)
          ? 'Partial overnight capture is the biggest uncertainty in this result.'
          : 'Usable signal, but more decoded minutes can still refine sleep and recovery.',
      color: sleepNeedsMoreSync(capture) ? colors.recoveryRed : colors.recoveryYellow,
    });
  }

  const perfContributors =
    input.perf?.contributors
      .filter((c) => c.value != null)
      .map((c) => ({
        label: c.label,
        value: c.value as number,
        inverse: c.inverse,
        badness: c.inverse ? c.value as number : 100 - (c.value as number),
      }))
      .sort((a, b) => b.badness - a.badness) ?? [];
  const weakestPerf = perfContributors[0];
  if (weakestPerf) {
    const limiting = weakestPerf.inverse ? weakestPerf.value >= 15 : weakestPerf.value < 80;
    if (limiting) {
      drivers.push({
        tone: 'limit',
        label: weakestPerf.label,
        value: `${Math.round(weakestPerf.value)}%`,
        detail: performanceDriverDetail(weakestPerf.label, weakestPerf.value, weakestPerf.inverse),
        color: colors.recoveryYellow,
      });
    }
  }

  const qualityContributors =
    input.sleepScore?.contributors.slice().sort((a, b) => a.score - b.score) ?? [];
  const weakestQuality = qualityContributors[0];
  if (weakestQuality && weakestQuality.score < 70) {
    drivers.push({
      tone: 'limit',
      label: weakestQuality.label,
      value: `${weakestQuality.score}`,
      detail: weakestQuality.detail,
      color: sleepQualityColor(weakestQuality.score),
    });
  }

  const debtMin = input.sleepNeed?.debtMin ?? 0;
  if (debtMin >= 45) {
    drivers.push({
      tone: 'limit',
      label: 'Sleep debt',
      value: formatDuration(debtMin),
      detail: 'Debt raises tonight’s need, so the same hours score lower until the deficit comes down.',
      color: debtMin >= 90 ? colors.recoveryRed : colors.recoveryYellow,
    });
  }

  if ((input.stress?.highPct ?? 0) >= 15) {
    drivers.push({
      tone: 'limit',
      label: 'High sleep stress',
      value: `${input.stress?.highPct ?? 0}%`,
      detail: 'More high-stress sleep lowers the performance blend even when duration is solid.',
      color: colors.recoveryYellow,
    });
  }

  const strongestPerf = [...perfContributors]
    .sort((a, b) => a.badness - b.badness)
    .find((c) => (c.inverse ? c.value <= 8 : c.value >= 85));
  if (strongestPerf) {
    drivers.push({
      tone: 'help',
      label: strongestPerf.label,
      value: `${Math.round(strongestPerf.value)}%`,
      detail: strongestPerf.inverse
        ? 'Low stress was a positive contributor.'
        : 'This contributor supported the sleep result.',
      color: colors.recoveryGreen,
    });
  } else if (
    input.sleep &&
    input.capture &&
    sleepTrustTier(input.capture) === 'high' &&
    input.capture.hrvMin >= 45 &&
    input.sleep.restorativeMin >= 120
  ) {
    drivers.push({
      tone: 'help',
      label: 'Restorative sleep',
      value: formatDuration(input.sleep.restorativeMin),
      detail: 'Deep and REM sleep gave the night a stronger recovery foundation.',
      color: colors.sleepTeal,
    });
  }

  return uniqueDrivers(drivers).slice(0, 4);
}

function performanceDriverDetail(label: string, value: number, inverse: boolean): string {
  if (inverse) return `${Math.round(value)}% of the night was in this limiting band.`;
  if (label === 'Hours vs Needed') return 'Duration was short against the current need estimate.';
  if (label === 'Sleep Efficiency') return 'More time awake inside the window pulled the score down.';
  if (label === 'Sleep Consistency') return 'Irregular bed and wake timing is still weighing on the blend.';
  return 'This contributor was below the current target band.';
}

function stageQualityCheck(
  sleep: ReturnType<typeof appStore.getState>['lastSleep'],
  capture: ReturnType<typeof appStore.getState>['sleepCapture'],
  stagesTrusted: boolean,
): { label: string; body: string; color: string } | null {
  if (!sleep || !capture) return null;
  if (!stagesTrusted) {
    return {
      label: 'Stage detail is limited',
      body: 'Use sleep timing and duration for now; stage detail will appear when the result is stronger.',
      color: colors.recoveryYellow,
    };
  }
  const evidencePct = sleepEvidencePct(capture);
  if (sleepStateWakeConflict(capture)) {
    return {
      label: 'Stage estimate',
      body: 'The sleep window may include awake time; review timing before relying on stages.',
      color: colors.recoveryRed,
    };
  }
  const tier = sleepTrustTier(capture);
  if (tier === 'low') {
    return {
      label: 'Stage estimate',
      body: 'The result is partial; use timing before relying on REM or deep-sleep detail.',
      color: colors.recoveryRed,
    };
  }
  if (tier === 'medium' || !sleepHasCorroboration(capture)) {
    return {
      label: 'Stage estimate',
      body: 'Stage detail is usable but still provisional.',
      color: colors.recoveryYellow,
    };
  }
  return {
    label: 'Stage confidence',
    body: 'Stage detail is ready to use alongside duration and timing.',
    color: colors.recoveryGreen,
  };
}

function uniqueDrivers(drivers: SleepDriver[]): SleepDriver[] {
  const seen = new Set<string>();
  return drivers.filter((d) => {
    const key = d.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function DriverRow({ driver, last }: { driver: SleepDriver; last?: boolean }) {
  const symbol = driver.tone === 'help' ? '+' : driver.tone === 'data' ? '!' : '-';
  return (
    <View style={[styles.driverRow, last && styles.driverRowLast]}>
      <View style={[styles.driverBadge, { backgroundColor: driver.color }]}>
        <Text style={styles.driverBadgeText}>{symbol}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.driverHead}>
          <Text style={styles.driverLabel}>{driver.label}</Text>
          <Text style={[styles.driverValue, { color: driver.color }]}>{driver.value}</Text>
        </View>
        <Text style={styles.driverDetail}>{driver.detail}</Text>
      </View>
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

function StressBar({ label, color, pct, minutes }: { label: string; color: string; pct: number; minutes: number }) {
  return (
    <View style={styles.stage}>
      <View style={styles.stageHead}>
        <Text style={styles.stageName}>
          {label} <Text style={{ color }}>{pct}%</Text>
        </Text>
        <Text style={styles.stageDur}>{formatDuration(minutes)}</Text>
      </View>
      <View style={styles.stageTrack}>
        <View style={[styles.stageFill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function EvidenceMeter({
  label,
  value,
  detail,
  color,
  inverse,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  inverse?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.evidenceMeter}>
      <View style={styles.evidenceMeterHead}>
        <Text style={styles.evidenceMeterLabel}>{label}</Text>
        <Text style={[styles.evidenceMeterValue, { color }]}>
          {pct}% <Text style={styles.evidenceMeterDetail}>{detail}</Text>
        </Text>
      </View>
      <View style={styles.evidenceTrack}>
        <View
          style={[
            styles.evidenceFill,
            {
              width: `${Math.max(2, pct)}%`,
              backgroundColor: color,
              opacity: inverse ? 0.55 : 1,
            },
          ]}
        />
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

function ScoreRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <View style={styles.scoreRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.scoreRowLabel}>{label}</Text>
        <Text style={styles.scoreRowDetail}>{detail}</Text>
      </View>
      <Text style={[styles.scoreRowValue, { color: sleepQualityColor(value) }]}>{value}</Text>
    </View>
  );
}

function ScheduleRow({ label, value, detail, last }: { label: string; value: string; detail: string; last?: boolean }) {
  return (
    <View style={[styles.scheduleRow, last && styles.scheduleRowLast]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.scheduleLabel}>{label}</Text>
        <Text style={styles.scheduleDetail}>{detail}</Text>
      </View>
      <Text style={styles.scheduleValue}>{value}</Text>
    </View>
  );
}

function sleepQualityColor(score: number): string {
  if (score >= 85) return colors.recoveryGreen;
  if (score >= 70) return colors.sleepTeal;
  if (score >= 55) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function displayPct(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fmtMin(minOfDay: number): string {
  const h = Math.floor(minOfDay / 60) % 24;
  const m = Math.round(minOfDay % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sourceLabel(source: 'auto_hr' | 'manual_hr' | 'manual_duration' | null): string {
  if (source === 'auto_hr') return 'Auto HR';
  if (source === 'manual_hr') return 'Manual HR';
  if (source === 'manual_duration') return 'Manual';
  return 'None';
}

function stateEvidenceColor(
  capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>,
  _key: 'wake' | 'still' | 'asleep',
): string {
  if (capture.sleepStateMin <= 0) return colors.textTertiary;
  return colors.recoveryYellow;
}

function longHrOnlyCapture(capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>): boolean {
  return longAutoSleepNeedsCorroboration(capture, false);
}

function sleepTrustStrip(
  capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>,
  cappedByConfidence: boolean,
): { score: number; label: string; body: string; color: string } {
  const stateConflict = sleepStateWakeConflict(capture);
  const longHrOnly = longHrOnlyCapture(capture);
  const coverage = Math.max(0, Math.min(100, capture.coveragePct));
  const signalScore = Math.max(0, Math.min(100, Math.round((capture.signalMin / 360) * 100)));
  const stillScore = Math.max(0, Math.min(100, Math.round(sleepEvidencePct(capture) * 3)));
  const base = Math.round(coverage * 0.55 + signalScore * 0.25 + stillScore * 0.2);
  const tier = sleepTrustTier(capture);
  const score = stateConflict
    ? Math.min(35, base)
    : longHrOnly
      ? Math.min(58, base)
      : cappedByConfidence || tier === 'low'
        ? Math.min(65, base)
        : tier === 'medium'
          ? Math.min(82, Math.max(55, base))
          : Math.max(88, base);

  if (stateConflict) {
    return {
      score,
      label: 'Review',
      body: `Mostly wake state evidence (${sleepStateWakeDisplay(capture)}). Review before trusting sleep, recovery or readiness.`,
      color: colors.recoveryRed,
    };
  }
  if (longHrOnly) {
    return {
      score,
      label: 'Needs proof',
      body: 'Long HR-only window with sparse still-worn or decoded sleep-state evidence. Review the capture or adjust the window.',
      color: colors.strainBlue,
    };
  }
  if (cappedByConfidence || tier === 'low') {
    return {
      score,
      label: 'Partial',
      body: `${coverage}% coverage and ${capture.signalMin} signal minutes. Treat the score as provisional.`,
      color: colors.recoveryYellow,
    };
  }
  if (tier === 'medium') {
    return {
      score,
      label: 'Usable',
      body: 'Good enough to guide the day, but more decoded minutes can still refine stages and recovery.',
      color: colors.recoveryYellow,
    };
  }
  return {
    score,
    label: 'Strong',
    body: 'Coverage, signal and corroboration are aligned enough to trust the result.',
    color: colors.recoveryGreen,
  };
}

function sleepEvidenceSummary(capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>): {
  badge: string;
  title: string;
  body: string;
  color: string;
} {
  if (sleepStateWakeConflict(capture)) {
    return {
      badge: 'CHECK',
      title: 'Sleep evidence conflicts',
      body: `The decoded strap-state stream is mostly wake (${sleepStateWakeDisplay(capture)}). Pulse should not treat this as final sleep until the window is reviewed.`,
      color: colors.recoveryRed,
    };
  }
  if (longHrOnlyCapture(capture)) {
    return {
      badge: 'DATA',
      title: 'HR-only candidate needs more proof',
      body: 'A long overnight HR window is present, but still-worn or decoded sleep-state corroboration is sparse. Review the capture before trusting duration.',
      color: colors.strainBlue,
    };
  }
  if (capture.confidence === 'high') {
    return {
      badge: 'GOOD',
      title: 'Evidence supports the result',
      body: 'HR coverage, R-R signal and still-worn corroboration are aligned enough for sleep, recovery and readiness.',
      color: colors.recoveryGreen,
    };
  }
  if (sleepNeedsMoreSync(capture)) {
    return {
      badge: 'DATA',
      title: 'Evidence is still partial',
      body: 'The overnight capture has insufficient decoded coverage. Review the capture before judging the score.',
      color: colors.strainBlue,
    };
  }
  return {
    badge: 'WATCH',
    title: 'Evidence is usable but limited',
    body: 'The result can guide the day, but more coverage or a reviewed window can still move stages, vitals and readiness.',
    color: colors.recoveryYellow,
  };
}

function sleepCaptureAction(capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>): {
  label: string;
  value: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} | null {
  if (capture.confidence === 'high') return null;
  if (longHrOnlyCapture(capture)) {
    return {
      label: 'Review capture',
      value: `${capture.coveragePct}% coverage`,
      icon: 'create',
      color: colors.strainBlue,
      route: { name: 'editSleep' },
    };
  }
  if (sleepNeedsMoreSync(capture)) {
    return {
      label: 'Review capture',
      value: `${capture.coveragePct}% coverage`,
      icon: 'create',
      color: colors.strainBlue,
      route: { name: 'editSleep' },
    };
  }
  return {
    label: 'Review sleep window',
    value: sleepConfidenceLabel(capture.confidence),
    icon: 'create',
    color: colors.sleepTeal,
    route: { name: 'editSleep' },
  };
}

function formatDecodedRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'No decoded history range yet';
  const first = new Date(firstTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const last = new Date(lastTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `Decoded ${first}-${last}`;
}

const styles = StyleSheet.create({
  estimate: { color: colors.textTertiary, fontSize: 11, marginTop: 8, fontFamily: fonts.text },
  trustStrip: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12, backgroundColor: colors.surface },
  trustStripHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 7 },
  trustStripLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textSemibold },
  trustStripValue: { fontSize: 13, fontFamily: fonts.textBold },
  trustStripBody: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 7, fontFamily: fonts.text },
  trustTrack: { height: 7, borderRadius: 4, backgroundColor: colors.card, overflow: 'hidden' },
  trustFill: { height: 7, borderRadius: 4 },
  ringQuality: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 16 },
  capNote: { color: colors.recoveryYellow, fontSize: 12, lineHeight: 17, marginTop: 10, textAlign: 'center', fontFamily: fonts.text },
  surplusNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  qualityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  qualityLabel: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  qualitySub: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  qualityScore: { fontSize: 30, fontFamily: fonts.black },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  verdictBadge: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  verdictBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  verdictTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  verdictBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  verdictStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  focusIcon: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  focusIconText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  focusTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  focusBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  scoreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  scoreRowLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  scoreRowDetail: { color: colors.textTertiary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  scoreRowValue: { fontSize: 18, fontFamily: fonts.bold },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  driverRowLast: { borderBottomWidth: 0 },
  driverBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  driverBadgeText: { color: '#000', fontSize: 16, fontFamily: fonts.black },
  driverHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  driverLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold, flex: 1 },
  driverValue: { fontSize: 14, fontFamily: fonts.bold },
  driverDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  scheduleRowLast: { borderBottomWidth: 0 },
  scheduleLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  scheduleDetail: { color: colors.textTertiary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  scheduleValue: { color: colors.text, fontSize: 17, fontFamily: fonts.bold },
  captureSource: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  captureNote: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  evidencePanel: { borderWidth: 1, borderRadius: 8, padding: 12, backgroundColor: colors.surface, marginBottom: 14 },
  evidenceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  evidenceBadge: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  evidenceBadgeText: { color: '#000', fontSize: 9, fontFamily: fonts.black },
  evidenceTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  evidenceBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  evidenceMeter: { marginTop: 9 },
  evidenceMeterHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  evidenceMeterLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textSemibold },
  evidenceMeterValue: { fontSize: 12, fontFamily: fonts.bold },
  evidenceMeterDetail: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.text },
  evidenceTrack: { height: 7, borderRadius: 4, backgroundColor: colors.card, overflow: 'hidden' },
  evidenceFill: { height: 7, borderRadius: 4 },
  trendLink: { color: colors.sleepTeal, fontSize: 12, fontFamily: fonts.textBold },
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
  consSub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text },
  stage: { marginVertical: 6 },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageName: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  stageDur: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  stageTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'visible', justifyContent: 'center' },
  stageFill: { height: 8, borderRadius: 4 },
  typicalMark: { position: 'absolute', width: 2, height: 14, backgroundColor: colors.textSecondary, top: -3, opacity: 0.7 },
  stageQuality: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12, backgroundColor: colors.surface },
  stageQualityDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  stageQualityText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.text },
  needRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  needLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  needValue: { color: colors.text, fontSize: 14, fontFamily: fonts.text },
  needStrong: { color: colors.text, fontFamily: fonts.bold },
  needNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 8, fontFamily: fonts.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});
