import { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import {
  Card,
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
import { Band, BAND_LABEL, bandColors, consistencyBand } from '../metrics/sleepBands';
import { longAutoSleepNeedsCorroboration, sleepEvidencePct, sleepHasCorroboration, sleepStateWakeConflict, sleepStateWakeDisplay, sleepStateWakeLikeMin } from '../metrics/sleepEvidence';
import { formatClock, formatDuration, startOfDayMs } from '../util/time';
import { DayRail } from './DayScreen';
import type { DailyMetricRow } from '../db/database';
import { napCreditMin, parseNapDetail } from '../metrics/naps';
import { sleepConfidenceColor, sleepConfidenceLabel, sleepCoverageColor } from '../ui/sleepTrust';
import { sleepNeedsMoreSync, sleepSyncActionValue } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

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
  const sleepScore = useStoreSelector(appStore, (s) => s.sleepScore);
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const regularity = useStoreSelector(appStore, (s) => s.sleepReg);
  const consistency = useStoreSelector(appStore, (s) => s.sleepConsistency);
  const stress = useStoreSelector(appStore, (s) => s.sleepStress);
  const capture = useStoreSelector(appStore, (s) => s.sleepCapture);
  const sleepGoal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const [nightHr, setNightHr] = useState<number[]>([]);

  useEffect(() => {
    void appStore.lastNightHr().then(setNightHr);
  }, [sleep]);

  const tib = sleep?.inBedMin || 1;
  const neededMin = sleepNeed?.neededMin ?? BASE_NEED_MIN;
  const week = recentDays.slice(0, 7).reverse();
  const days = useMemo(() => orderedDays(today, recentDays), [today, recentDays]);
  const effectiveSync = historySync ?? lastHistorySync;
  const todayStart = startOfDayMs(Date.now());
  const naps = cardio.filter((c) => c.source === 'nap' && c.startTs >= todayStart).slice(0, 4);
  const captureAction = capture ? sleepCaptureAction(capture) : null;
  const captureSummary = capture ? sleepEvidenceSummary(capture) : null;
  const trustStrip = capture ? sleepTrustStrip(capture, !!perf?.cappedByConfidence) : null;
  const perfScore = perf ? displayPct(perf.score) : null;
  const surplusSleepMin = sleep ? Math.max(0, sleep.asleepMin - neededMin) : 0;
  const largeSurplusSleepMin = sleep ? Math.max(0, sleep.asleepMin - Math.round(neededMin * 1.1)) : 0;
  const scoreDrivers = useMemo(
    () => sleepScoreDrivers({ perf, sleepScore, sleep, capture, sleepNeed, stress }),
    [perf, sleepScore, sleep, capture, sleepNeed, stress],
  );
  const stageQuality = useMemo(() => stageQualityCheck(sleep, capture), [sleep, capture]);
  const verdict = sleepVerdict({ sleep, capture, perfCapped: !!perf?.cappedByConfidence, rmssd: today?.rmssd ?? null, rhr: today?.rhr ?? null });
  const tonightFocus = sleepFocus({
    sleep,
    capture,
    perfCapped: !!perf?.cappedByConfidence,
    sleepNeed,
    stress,
    consistency,
  });

  // Trailing typical share per stage (% of TIB) for the "typical range" markers.
  const typical = stageTypicals(recentDays.filter((d) => d.day !== today?.day));

  return (
    <Screen title="Sleep" onBack={nav.canBack ? nav.back : undefined} tint={colors.sleepTeal}>
      <DayRail
        days={days}
        selected={today?.day ?? ''}
        onSelect={(selected) => nav.navigate({ name: 'day', day: selected })}
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
        {perf ? <Text style={styles.estimate}>composite estimate · contributors shown separately</Text> : null}
        {trustStrip ? (
          <View style={[styles.trustStrip, { borderColor: trustStrip.color }]}>
            <View style={styles.trustStripHead}>
              <Text style={styles.trustStripLabel}>Score trust</Text>
              <Text style={[styles.trustStripValue, { color: trustStrip.color }]}>{trustStrip.label}</Text>
            </View>
            <View style={styles.trustTrack}>
              <View style={[styles.trustFill, { width: `${trustStrip.score}%`, backgroundColor: trustStrip.color }]} />
            </View>
            <Text style={styles.trustStripBody}>{trustStrip.body}</Text>
          </View>
        ) : null}
        {capture ? (
          <View style={styles.ringQuality}>
            <Stat label="Confidence" value={sleepConfidenceLabel(capture.confidence)} color={sleepConfidenceColor(capture.confidence)} />
            <Stat label="Coverage" value={`${capture.coveragePct}%`} color={sleepCoverageColor(capture.coveragePct)} />
            <Stat label="Signal" value={capture.signalMin} unit="min" />
          </View>
        ) : null}
        {perf?.cappedByConfidence ? (
          <Text style={styles.capNote}>
            Score capped at {perf.confidenceCapPct}% until overnight coverage or sleep-state corroboration improves.
          </Text>
        ) : null}
      </Card>

      <SectionLabel>Result check</SectionLabel>
      <Card>
        <View style={styles.verdictHead}>
          <View style={[styles.verdictBadge, { backgroundColor: verdict.color }]}>
            <Text style={styles.verdictBadgeText}>{verdict.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verdictTitle}>{verdict.title}</Text>
            <Text style={styles.verdictBody}>{verdict.body}</Text>
          </View>
        </View>
        <View style={styles.verdictStats}>
          <Stat label="Window" value={sleep ? formatDuration(sleep.inBedMin) : '-'} />
          <Stat label="Asleep" value={sleep ? formatDuration(sleep.asleepMin) : '-'} color={colors.sleepTeal} />
          <Stat label="Vitals" value={verdict.vitalsLabel} color={verdict.vitalsColor} />
        </View>
        <NavRow
          label={verdict.actionLabel}
          icon={verdict.icon}
          iconColor={verdict.color}
          value={verdict.actionValue}
          onPress={() => nav.navigate(verdict.route)}
          last
        />
      </Card>

      {/* The four Sleep Performance contributors with Poor / Sufficient / Optimal bands */}
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
                You slept {formatDuration(surplusSleepMin)} beyond today's calculated need; Sleep Performance is capped at 100%.
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

      <SectionLabel>Quality factors</SectionLabel>
      <Card>
        {sleepScore ? (
          <>
            <View style={styles.qualityHead}>
              <View>
                <Text style={styles.qualityLabel}>Sleep Quality</Text>
                <Text style={styles.qualitySub}>Oura-style blend of duration, stages, efficiency and restfulness</Text>
              </View>
              <Text style={[styles.qualityScore, { color: sleepQualityColor(sleepScore.score) }]}>{sleepScore.score}</Text>
            </View>
            {sleepScore.contributors.map((c) => (
              <ScoreRow key={c.key} label={c.label} value={c.score} detail={c.detail} />
            ))}
            {sleepScore.cappedByConfidence ? (
              <Text style={styles.surplusNote}>
                Sleep Quality is capped by capture confidence until auto sync fills in stronger overnight coverage.
              </Text>
            ) : null}
            {largeSurplusSleepMin > 0 ? (
              <Text style={styles.surplusNote}>
                Sleep Quality tapers very long sleep by {formatDuration(largeSurplusSleepMin)} beyond the normal surplus range, because that can mean awake time was included.
              </Text>
            ) : null}
          </>
        ) : (
          <Empty text="Quality factors appear after a scored sleep." />
        )}
      </Card>

      {scoreDrivers.length ? (
        <>
          <SectionLabel>Why it scored this way</SectionLabel>
          <Card>
            {scoreDrivers.map((d, i) => (
              <DriverRow key={`${d.tone}-${d.label}`} driver={d} last={i === scoreDrivers.length - 1} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Quick actions */}
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Sleep Planner" icon="moon" iconColor={colors.sleepTeal} value={`${Math.round(((neededMin * sleepGoal) / 60) * 10) / 10} h goal`} onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <NavRow label="Log / adjust sleep" icon="create" onPress={() => nav.navigate({ name: 'editSleep' })} last />
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
        <NavRow
          label={tonightFocus.actionLabel}
          icon={tonightFocus.icon}
          iconColor={tonightFocus.color}
          value={tonightFocus.actionValue}
          onPress={() => nav.navigate(tonightFocus.route)}
          last
        />
      </Card>

      <SectionLabel>Capture quality</SectionLabel>
      <Card>
        {capture ? (
          <>
            {captureSummary ? (
              <View style={[styles.evidencePanel, { borderColor: captureSummary.color }]}>
                <View style={styles.evidenceHeader}>
                  <View style={[styles.evidenceBadge, { backgroundColor: captureSummary.color }]}>
                    <Text style={styles.evidenceBadgeText}>{captureSummary.badge}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evidenceTitle}>{captureSummary.title}</Text>
                    <Text style={styles.evidenceBody}>{captureSummary.body}</Text>
                  </View>
                </View>
                <EvidenceMeter
                  label="HR coverage"
                  value={capture.coveragePct}
                  detail={`${capture.signalMin}/${capture.windowMin} min`}
                  color={sleepCoverageColor(capture.coveragePct)}
                />
                <EvidenceMeter
                  label="Still corroboration"
                  value={Math.round((capture.stillMin / Math.max(1, capture.windowMin)) * 100)}
                  detail={`${capture.stillMin} still min`}
                  color={capture.stillMin >= Math.max(45, capture.windowMin * 0.2) ? colors.recoveryGreen : colors.recoveryYellow}
                />
                <EvidenceMeter
                  label="Decoded state"
                  value={capture.sleepStateMin > 0 ? Math.round((sleepStateWakeLikeMin(capture) / Math.max(1, capture.sleepStateMin)) * 100) : 0}
                  detail={capture.sleepStateMin > 0 ? sleepStateWakeDisplay(capture) : 'no state rows'}
                  color={sleepStateWakeConflict(capture) ? colors.recoveryRed : capture.sleepStateMin > 0 ? colors.recoveryGreen : colors.textTertiary}
                  inverse
                />
              </View>
            ) : null}
            <View style={styles.grid}>
              <Stat label="HR coverage" value={`${capture.coveragePct}%`} color={sleepCoverageColor(capture.coveragePct)} />
              <Stat label="R-R beats" value={capture.rrCount} />
            </View>
            <View style={[styles.grid, { marginTop: 12 }]}>
              <Stat label="Signal minutes" value={capture.signalMin} />
              <Stat label="Confidence" value={sleepConfidenceLabel(capture.confidence)} color={sleepConfidenceColor(capture.confidence)} />
              <Stat label="Source" value={sourceLabel(capture.source)} />
            </View>
            <View style={[styles.grid, { marginTop: 12 }]}>
              <Stat label="Still evidence" value={capture.stillMin} />
              <Stat label="Moving minutes" value={capture.movingMin} />
              <Stat label="Sleep-state evidence" value={capture.sleepStateMin} />
            </View>
            {capture.sleepStateMin > 0 ? (
              <View style={[styles.grid, { marginTop: 12 }]}>
                <Stat label="State wake" value={capture.sleepStateWakeMin} color={stateEvidenceColor(capture, 'wake')} />
                <Stat label="State still" value={capture.sleepStateStillMin} color={stateEvidenceColor(capture, 'still')} />
                <Stat label="State asleep" value={capture.sleepStateAsleepMin} color={stateEvidenceColor(capture, 'asleep')} />
              </View>
            ) : null}
            <View style={[styles.grid, { marginTop: 12 }]}>
              <Stat label="History rows" value={effectiveSync?.decodedRecords ?? '-'} />
              <Stat label="Raw vitals" value={effectiveSync?.rawVitalSamples ?? '-'} />
            </View>
            <Text style={styles.captureSource}>
              {formatDecodedRange(effectiveSync?.firstSampleTs, effectiveSync?.lastSampleTs)}
            </Text>
            <Text style={styles.captureNote}>{capture.note}</Text>
            {captureAction ? (
              <NavRow
                label={captureAction.label}
                icon={captureAction.icon}
                iconColor={captureAction.color}
                value={captureAction.value}
                onPress={() => nav.navigate(captureAction.route)}
                last
              />
            ) : null}
          </>
        ) : (
          <Empty text="Capture quality appears after the first metric refresh." />
        )}
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
            <Hypnogram segments={sleep.hypnogram} showLabels />
            {stageQuality ? (
              <View style={[styles.stageQuality, { borderColor: stageQuality.color }]}>
                <View style={[styles.stageQualityDot, { backgroundColor: stageQuality.color }]} />
                <Text style={styles.stageQualityText}>
                  <Text style={{ color: stageQuality.color, fontFamily: fonts.textBold }}>{stageQuality.label}</Text>
                  {` · ${stageQuality.body}`}
                </Text>
              </View>
            ) : null}
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
          </>
        ) : (
          <Empty text="No sleep recorded last night. Wear the strap to bed, then reconnect to sync stored history; you can also log it manually above." />
        )}
      </Card>

      {/* Key metrics */}
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Restorative (deep+REM)" value={sleep ? formatDuration(sleep.restorativeMin) : '—'} color={sleepStageColors.rem} />
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
      <SectionLabel>How sleep need is calculated</SectionLabel>
      <Card>
        <NeedRow label="Baseline" value={formatDuration(sleepNeed?.baselineMin ?? BASE_NEED_MIN)} />
        <NeedRow label="Recent naps" value={`−${formatDuration(sleepNeed?.napMin ?? 0)}`} />
        <NeedRow label="Recent strain" value={`+${formatDuration(sleepNeed?.strainMin ?? 0)}`} />
        <NeedRow label="Sleep debt" value={`+${formatDuration(sleepNeed?.debtMin ?? 0)}`} />
        <View style={styles.divider} />
        <NeedRow label="Sleep needed" value={formatDuration(neededMin)} strong />
        {sleep ? <NeedRow label="Hours of sleep" value={formatDuration(sleep.asleepMin)} strong /> : null}
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

      {/* Sleep Stress */}
      <SectionLabel>Sleep stress</SectionLabel>
      <Card>
        {stress ? (
          <>
            <StressBar label="High" color="#FFA722" pct={stress.highPct} minutes={stress.highMin} />
            <StressBar label="Medium" color="#00F19F" pct={stress.medPct} minutes={stress.medMin} />
            <StressBar label="Low" color={colors.sleepTeal} pct={stress.lowPct} minutes={stress.lowMin} />
          </>
        ) : (
          <Empty text="Overnight stress (0–3) is derived from your heart-rate variability and heart rate through the night." />
        )}
      </Card>

      {/* Sleep Consistency */}
      <SectionLabel>Sleep schedule</SectionLabel>
      <Card>
        {consistency ? (
          <>
            <View style={styles.headRow}>
              <Text style={styles.bigHours}>{consistency.score}%</Text>
              <Text style={[styles.headSub, { color: bandColors[consistencyBand(consistency.score)] }]}>{BAND_LABEL[consistencyBand(consistency.score)]}</Text>
            </View>
            <Text style={styles.consSub}>
              Typical bed {fmtMin(consistency.bedMedianMin)} · wake {fmtMin(consistency.wakeMedianMin)} over {consistency.nights} nights
            </Text>
          </>
        ) : (
          <Empty text="Sleep consistency compares your bed and wake times across nights — it appears after ~3 nights." />
        )}
      </Card>

      {/* Recent sleep → full Trend View */}
      <SectionLabel right={<Text style={styles.trendLink}>Trends ›</Text>}>Recent sleep</SectionLabel>
      <Card onPress={() => nav.navigate({ name: 'sleepTrends' })}>
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
          <Empty text="Your last 7 nights chart here as you wear the strap overnight." />
        )}
      </Card>

      {regularity ? (
        <>
          <SectionLabel>Long-term regularity</SectionLabel>
          <Card>
            <ScheduleRow label="14-night regularity" value={`${regularity.score}%`} detail={`${regularity.nights} nights`} />
            <ScheduleRow label="Bedtime spread" value={formatDuration(regularity.bedSdMin)} detail="lower is better" />
            <ScheduleRow label="Wake spread" value={formatDuration(regularity.wakeSdMin)} detail="lower is better" last />
          </Card>
        </>
      ) : null}

      <Empty text="Sleep stages, stress and the composite Sleep Performance are inferred on-device from overnight heart rate and HRV (approximate — WHOOP also uses motion and raw optical data, and computes the composite on its servers)." />
    </Screen>
  );
}

// Average share (% of time in bed) per stage over recent nights, for typical markers.
function stageTypicals(days: { deepMin: number | null; remMin: number | null; lightMin: number | null; awakeMin: number | null }[]): Record<'awake' | 'light' | 'deep' | 'rem', number | null> {
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
      actionLabel: 'Sync stored history',
      actionValue: `${capture.coveragePct}% coverage`,
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }

  if (!sleep) {
    return {
      badge: 'WAIT',
      title: 'Sleep is not scored yet',
      body: capture
        ? 'The app has seen some overnight evidence, but not enough reliable signal to close a sleep result.'
        : 'Reconnect the strap and let stored history finish syncing before judging recovery.',
      vitalsLabel,
      vitalsColor,
      actionLabel: 'Sync stored history',
      actionValue: capture ? `${capture.coveragePct}% coverage` : 'device',
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }

  if (capture && (sleepNeedsMoreSync(capture) || input.perfCapped)) {
    const needsSync = sleepNeedsMoreSync(capture);
    return {
      badge: 'PART',
      title: 'Treat this as partial',
      body: 'The sleep window exists, but the score is still data-limited. Let auto-sync continue or review the window if the timing looks wrong.',
      vitalsLabel,
      vitalsColor,
      actionLabel: needsSync ? 'Sync more data' : 'Review window',
      actionValue: needsSync ? sleepSyncActionValue(capture) : sleepConfidenceLabel(capture.confidence),
      icon: needsSync ? 'sync' : 'create',
      color: colors.recoveryYellow,
      route: needsSync ? { name: 'device' } : { name: 'editSleep' },
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
      actionLabel: 'Open device sync',
      actionValue: capture ? `${capture.signalMin} min signal` : 'sync',
      icon: 'sync',
      color: colors.recoveryYellow,
      route: { name: 'device' },
    };
  }

  return {
    badge: 'GOOD',
    title: 'Result looks usable',
    body: 'Sleep, capture quality and recovery vitals are aligned enough to use today. Keep auto-sync running so trends stay complete.',
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
      body: 'Decoded strap-state evidence is mostly wake. Let sync finish, then adjust the window if you know you were asleep.',
      actionLabel: 'Adjust sleep window',
      actionValue: sleepStateWakeDisplay(capture),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }
  if (!input.sleep) {
    return {
      badge: 'SYNC',
      title: 'Get a complete overnight sync',
      body: 'Sleep scoring starts with stored strap history. Reconnect after waking and let auto-sync finish before judging recovery.',
      actionLabel: 'Open device sync',
      actionValue: capture ? `${capture.coveragePct}% coverage` : 'needs data',
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
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
      body: 'Tonight’s score is limited by partial overnight signal, so recovery and readiness may move once more history backfills.',
      actionLabel: needsSync ? 'Sync more data' : 'Review sleep window',
      actionValue: needsSync ? sleepSyncActionValue(capture) : sleepConfidenceLabel(capture.confidence),
      icon: needsSync ? 'sync' : 'create',
      color: needsSync ? colors.strainBlue : colors.sleepTeal,
      route: needsSync ? { name: 'device' } : { name: 'editSleep' },
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
          ? 'Partial overnight history is the biggest uncertainty in this result.'
          : 'Usable signal, but more synced minutes can still refine sleep and recovery.',
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
  } else if (input.sleep && input.sleep.restorativeMin >= 120) {
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
): { label: string; body: string; color: string } | null {
  if (!sleep || !capture) return null;
  const evidencePct = sleepEvidencePct(capture);
  if (sleepStateWakeConflict(capture)) {
    return {
      label: 'Stage estimate',
      body: 'decoded strap state is mostly wake; review timing before trusting stages.',
      color: colors.recoveryRed,
    };
  }
  const tier = sleepTrustTier(capture);
  if (tier === 'low') {
    return {
      label: 'Stage estimate',
      body: 'partial signal; use timing before REM/deep detail.',
      color: colors.recoveryRed,
    };
  }
  if (tier === 'medium' || !sleepHasCorroboration(capture)) {
    return {
      label: 'Stage estimate',
      body: `${capture.coveragePct}% coverage, ${evidencePct}% corroborating evidence.`,
      color: colors.recoveryYellow,
    };
  }
  return {
    label: 'Stage confidence',
    body: `${capture.coveragePct}% coverage with ${evidencePct}% corroborating evidence.`,
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
  key: 'wake' | 'still' | 'asleep',
): string {
  if (capture.sleepStateMin <= 0) return colors.textTertiary;
  const wakeLike = sleepStateWakeLikeMin(capture);
  if (key === 'wake') return wakeLike / capture.sleepStateMin >= 0.85 ? colors.recoveryRed : colors.textSecondary;
  if (key === 'asleep') return capture.sleepStateAsleepMin > 0 ? colors.recoveryGreen : colors.textTertiary;
  return capture.sleepStateStillMin > 0 ? colors.recoveryYellow : colors.textTertiary;
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
      body: 'Long HR-only window with sparse still-worn or decoded sleep-state evidence. Keep sync running or adjust the window.',
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
      body: 'Good enough to guide the day, but more synced minutes can still refine stages and recovery.',
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
      body: `The decoded strap-state stream is mostly wake (${sleepStateWakeDisplay(capture)}). Pulse should not treat this as final sleep until sync completes or the window is reviewed.`,
      color: colors.recoveryRed,
    };
  }
  if (longHrOnlyCapture(capture)) {
    return {
      badge: 'SYNC',
      title: 'HR-only candidate needs more proof',
      body: 'A long overnight HR window is present, but still-worn or decoded sleep-state corroboration is sparse. Keep auto-sync connected or review the window before trusting duration.',
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
      badge: 'SYNC',
      title: 'Evidence is still partial',
      body: 'The strap has not backfilled enough unique overnight minutes yet. Keep auto-sync running before judging the score.',
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
      label: 'Sync more overnight data',
      value: `${capture.coveragePct}% coverage`,
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }
  if (sleepNeedsMoreSync(capture)) {
    return {
      label: 'Sync more overnight data',
      value: sleepSyncActionValue(capture),
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
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
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});
