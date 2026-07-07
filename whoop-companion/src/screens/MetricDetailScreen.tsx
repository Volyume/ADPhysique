import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { DailyMetricRow } from '../db/database';
import { BaselineChart, Card, Empty, Ring, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { stdev } from '../metrics/ema';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { MetricKey, Nav } from '../ui/navigation';
import { nullableClampPct } from '../util/number';
import { computeEnergyReserve } from '../metrics/energyReserve';
import { formatDuration } from '../util/time';
import { sleepConfidenceColor, sleepConfidenceLabel, sleepCoverageColor } from '../ui/sleepTrust';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier, sleepTrustWeight } from '../metrics/sleepTrustWeight';

type Def = {
  title: string;
  unit: string;
  color: (v: number | null) => string;
  betterWhenLower?: boolean;
  decimals?: number;
  pick: (d: DailyMetricRow) => number | null;
  blurb: string;
  measured: boolean;
};

const NEUTRAL = colors.strainBlue;

function energyReserveScore(d: DailyMetricRow): number | null {
  const sleepPerformance = nullableClampPct(
    d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null),
  );
  const stress = d.sleepDetail?.stressHigh != null ? (d.sleepDetail.stressHigh / 100) * 3 : null;
  return (
    computeEnergyReserve({
      recovery: d.recovery,
      sleepPerformance,
      sleepDebtMin: d.sleepDetail?.debtMin ?? 0,
      hrvBalance: null,
      strain: d.strain,
      stress,
    })?.score ?? null
  );
}

const DEFS: Record<string, Def> = {
  hrv: {
    title: 'Heart Rate Variability',
    unit: 'ms',
    color: () => colors.recoveryGreen,
    pick: (d) => d.rmssd,
    measured: true,
    blurb:
      "Heart rate variability (HRV), the variance in time between heartbeats, is an indicator of how well your body can perform and adapt to its environment. Higher is generally better. WHOOP measures HRV during sleep; this build derives it from the strap's R-R intervals.",
  },
  rhr: {
    title: 'Resting Heart Rate',
    unit: 'bpm',
    color: () => colors.recoveryGreen,
    betterWhenLower: true,
    pick: (d) => d.rhr,
    measured: true,
    blurb:
      'Resting heart rate (RHR), the number of times your heart beats per minute at rest, is an indicator of cardiovascular health. Short-term increases can indicate fatigue; long-term decreases signal improved fitness.',
  },
  respiratory: {
    title: 'Respiratory Rate',
    unit: 'rpm',
    color: () => NEUTRAL,
    decimals: 1,
    pick: (d) => d.resp,
    measured: true,
    blurb:
      'Respiratory rate (RR), the breaths you take per minute at rest, is a general indicator of cardiovascular fitness and is typically very consistent over time. A high RR relative to your baseline may indicate illness or extreme fatigue. Derived from respiratory sinus arrhythmia in the R-R signal during sleep.',
  },
  spo2: {
    title: 'Blood Oxygen',
    unit: '%',
    color: () => NEUTRAL,
    pick: (d) => d.spo2,
    measured: true,
    blurb:
      'Blood oxygen (SpO2) measures how much oxygen your red blood cells are carrying. This build decodes it from WHOOP 5 v21 raw history records and includes it in Health Monitor once a personal range is available.',
  },
  skin_temp: {
    title: 'Skin Temperature',
    unit: 'C',
    color: () => NEUTRAL,
    decimals: 1,
    pick: (d) => d.skinTempC,
    measured: true,
    blurb:
      'Skin temperature indicates how your body regulates heat and varies day to day, unlike core body temperature. This build decodes it from WHOOP 5 v20 raw history records and includes it in Health Monitor once a personal range is available.',
  },
  recovery: {
    title: 'Recovery',
    unit: '%',
    color: (v) => recoveryColor(v),
    pick: (d) => d.recovery,
    measured: true,
    blurb:
      'Recovery (0-100%) is how prepared your body is to perform, derived from HRV, resting heart rate, respiratory rate and sleep. Green (>=67%) = primed; Yellow (34-66%) = maintaining; Red (<=33%) = needs rest.',
  },
  strain: {
    title: 'Day Strain',
    unit: '',
    color: () => colors.strainBlue,
    decimals: 1,
    pick: (d) => d.strain,
    measured: true,
    blurb:
      'Strain (0-21, logarithmic) is the cardiovascular load you accumulate over a day or activity, based on time spent in each heart-rate zone. It builds quickly at high heart rates and barely moves at rest.',
  },
  sleep_performance: {
    title: 'Sleep Performance',
    unit: '%',
    color: () => colors.sleepTeal,
    pick: (d) =>
      nullableClampPct(d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null)),
    measured: true,
    blurb:
      'Sleep Performance is a composite of four contributors: Hours vs Needed, Sleep Consistency, Sleep Efficiency and Sleep Stress. Sleep need is personalised from your baseline, recent strain, naps and accrued sleep debt.',
  },
  sleep_need: {
    title: 'Sleep Need',
    unit: 'min',
    color: () => colors.sleepTeal,
    pick: (d) => d.sleepDetail?.needMin ?? null,
    measured: true,
    blurb:
      'Sleep Need is the target amount of sleep for the night. It starts from your baseline, adds recent strain and sleep debt, then subtracts nap credit.',
  },
  sleep_debt: {
    title: 'Sleep Debt',
    unit: 'min',
    color: (v) => (v == null ? colors.textTertiary : v >= 90 ? colors.recoveryRed : v >= 45 ? colors.recoveryYellow : colors.recoveryGreen),
    pick: (d) => d.sleepDetail?.debtMin ?? null,
    measured: true,
    blurb:
      'Sleep Debt is the rolling shortfall between sleep needed and sleep achieved. Lower is better; sustained debt raises tonight’s sleep target.',
  },
  sleep_efficiency: {
    title: 'Sleep Efficiency',
    unit: '%',
    color: (v) => (v == null ? colors.textTertiary : v >= 90 ? colors.recoveryGreen : v >= 85 ? colors.sleepTeal : colors.recoveryYellow),
    pick: (d) => d.sleepDetail?.efficiency ?? null,
    measured: true,
    blurb:
      'Sleep Efficiency is asleep time divided by time in bed. Low efficiency usually means too much awake time inside the detected or manually adjusted sleep window.',
  },
  energy_reserve: {
    title: 'Energy Reserve',
    unit: '',
    color: (v) => (v == null ? colors.textTertiary : v >= 70 ? colors.recoveryGreen : v >= 50 ? colors.recoveryYellow : colors.recoveryRed),
    pick: energyReserveScore,
    measured: true,
    blurb:
      'Energy Reserve estimates usable energy from recovery, sleep charge, sleep debt, stress and strain. It is separate from Training Readiness: this estimates energy availability, not how hard you should train.',
  },
  steps: {
    title: 'Steps',
    unit: 'steps',
    color: () => colors.recoveryGreen,
    pick: (d) => d.steps,
    measured: true,
    blurb:
      'Daily steps use the captured WHOOP history counter by default, with phone pedometer fallback for live/today totals when available. Calibrate with the real step count for the synced band counter range if your strap drifts high or low.',
  },
  calories: {
    title: 'Calories',
    unit: 'kcal',
    color: () => colors.recoveryYellow,
    pick: () => null,
    measured: false,
    blurb:
      'Activity calories are calculated for saved workouts from heart rate, duration and profile data. A daily calorie total is not stored as a first-class daily metric yet.',
  },
  avg_hr: {
    title: 'Average Heart Rate',
    unit: 'bpm',
    color: () => colors.recoveryRed,
    pick: () => null,
    measured: false,
    blurb:
      'Average heart rate is available on individual activities and live sessions. Daily all-day average HR is not stored as a dedicated trend metric yet.',
  },
  max_hr: {
    title: 'Max Heart Rate',
    unit: 'bpm',
    color: () => colors.recoveryRed,
    pick: () => null,
    measured: false,
    blurb:
      'Max heart rate is available on individual activities and live sessions. Daily max HR is not stored as a dedicated trend metric yet.',
  },
};

export function MetricDetailScreen({ nav, metricKey }: { nav: Nav; metricKey: MetricKey }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const hrvBal = useStoreSelector(appStore, (s) => s.hrvBal);
  const cardioAge = useStoreSelector(appStore, (s) => s.cardioAge);
  const ageYears = useStoreSelector(appStore, (s) => s.profile.ageYears);
  const sleepPerformance = useStoreSelector(appStore, (s) => s.sleepPerformance);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const stepSource = useStoreSelector(appStore, (s) => s.stepSource);
  const bandSteps = useStoreSelector(appStore, (s) => s.bandSteps);
  const bandStepEstimate = useStoreSelector(appStore, (s) => s.bandStepEstimate);
  const bandStepDivisor = useStoreSelector(appStore, (s) => s.bandStepDivisor);
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  useEffect(() => {
    void appStore.loadHistory(30).then(setHistory);
  }, []);

  if (metricKey === 'hrv_balance') {
    return (
      <Screen title="HRV Balance" onBack={nav.back} tint={colors.recoveryGreen}>
        <View style={styles.hero}>
          <Ring
            value={hrvBal ? hrvBal.score / 100 : 0}
            size={196}
            color={colors.recoveryGreen}
            centerTop="HRV BALANCE"
            centerMain={hrvBal ? `${hrvBal.ratio}x` : '-'}
            centerSub={hrvBal ? `${hrvBal.shortMean} vs ${hrvBal.longMean} ms` : 'needs ~1 week'}
          />
        </View>
        <Card>
          <Text style={styles.blurb}>
            HRV Balance compares your recent (~2-week) HRV trend to your longer (~3-month) average. On
            par with or above your average is a sign your nervous system is keeping up with the load on
            it; a sustained drop can mean accumulated stress, under-recovery or oncoming illness.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (metricKey === 'cardio_age') {
    const delta = cardioAge != null ? cardioAge - ageYears : null;
    return (
      <Screen title="Cardiovascular Age" onBack={nav.back} tint={colors.strainBlue}>
        <View style={styles.hero}>
          <Ring
            value={cardioAge != null ? Math.max(0, Math.min(1, 1 - (cardioAge - 20) / 80)) : 0}
            size={196}
            color={colors.strainBlue}
            centerTop="HEART AGE"
            centerMain={cardioAge != null ? `${cardioAge}` : '-'}
            centerSub={delta != null ? (delta <= 0 ? `${-delta}y younger` : `${delta}y older`) : 'estimate'}
          />
        </View>
        <Card>
          <Text style={styles.blurb}>
            An estimate of your heart's fitness age from your resting heart rate and overnight HRV
            versus what is typical for your age. A lower number than your real age is good.
          </Text>
          <Text style={styles.unavail2}>
            This is a wellness estimate, not Oura's pulse-wave-velocity Cardiovascular Age. That needs
            the ring's raw optical waveform, which WHOOP does not expose over Bluetooth.
          </Text>
        </Card>
      </Screen>
    );
  }

  const def: Def = DEFS[metricKey] ?? (DEFS.hrv as Def);

  const current = today ? def.pick(today) : null;
  const metricHistory = trustedMetricRows(history, metricKey, def);
  const series = metricHistory.trustedValues;
  const rawSeries = metricHistory.rawValues;
  const baseline = series.length ? series.reduce((a, b) => a + b, 0) / series.length : null;
  const tint = def.color(current);

  const last7 = history.slice(-7).map((d) => ({
    label: d.day.slice(8),
    value: def.pick(d),
    display: def.pick(d) != null ? formatMetricValue(metricKey, def.pick(d) as number, def, false) : '',
    color: tint,
    confidence: metricUsesSleepTrust(metricKey) && def.pick(d) != null ? d.sleepDetail?.confidence ?? null : null,
  }));

  return (
    <Screen title={def.title} onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        {def.measured ? (
          <Ring
            value={ringFraction(metricKey, current)}
            size={176}
            color={tint}
            centerMain={current != null ? formatMetricMain(metricKey, current, def) : '-'}
            centerSub={current != null ? centerSubForMetric(metricKey, current, def) : 'awaiting data'}
          />
        ) : (
          <Card style={{ width: '100%' }}>
            <Text style={styles.unavail}>Not measured on this build</Text>
            <Empty text={def.blurb} />
          </Card>
        )}
      </View>

      {renderQualityCard({
        key: metricKey,
        today,
        sleepPerformance,
        historySync: historySync ?? lastHistorySync,
        stepSource,
        bandSteps,
        bandStepEstimate,
        bandStepDivisor,
      })}

      {def.measured ? (
        <>
          <SectionLabel>30-day baseline</SectionLabel>
          <Card>
            <View style={styles.row}>
              <Text style={styles.k}>Baseline</Text>
              <Text style={styles.v}>
                {baseline != null ? formatMetricValue(metricKey, baseline, def) : '-'}
              </Text>
            </View>
            {series.length >= 2 ? (
              <View style={styles.row}>
                <Text style={styles.k}>Range (30d)</Text>
                <Text style={styles.v}>
                  {`${formatMetricValue(metricKey, Math.min(...series), def, false)}-${formatMetricValue(metricKey, Math.max(...series), def)}`}
                </Text>
              </View>
            ) : null}
            {metricHistory.excludedLowTrust > 0 ? (
              <Text style={styles.trustNote}>
                Baseline excludes {metricHistory.excludedLowTrust} low-confidence sleep night{metricHistory.excludedLowTrust === 1 ? '' : 's'}; bars remain visible for review.
              </Text>
            ) : null}
          </Card>

          <SectionLabel>Last 7 days</SectionLabel>
          <Card>
            {last7.some((d) => d.value != null) ? (
              <WeeklyBars data={last7} />
            ) : (
              <Empty text="No history yet - wear the strap overnight to build this trend." />
            )}
          </Card>

          <SectionLabel>30-day trend vs baseline</SectionLabel>
          <Card>
            {series.length >= 2 && baseline != null ? (
              <BaselineChart values={series} baseline={baseline} sd={stdev(series) || 1} color={tint} height={150} />
            ) : rawSeries.length >= 2 && metricHistory.excludedLowTrust > 0 ? (
              <Empty text="Trusted baseline needs more high- or medium-confidence sleep nights." />
            ) : (
              <Empty text="Not enough data yet for a baseline trend." />
            )}
          </Card>
        </>
      ) : null}

      <SectionLabel>About this metric</SectionLabel>
      <Card>
        <Text style={styles.blurb}>{def.blurb}</Text>
      </Card>
    </Screen>
  );
}

function renderQualityCard(input: {
  key: MetricKey;
  today: DailyMetricRow | null;
  sleepPerformance: ReturnType<typeof appStore.getState>['sleepPerformance'];
  historySync: ReturnType<typeof appStore.getState>['historySync'];
  stepSource: ReturnType<typeof appStore.getState>['stepSource'];
  bandSteps: ReturnType<typeof appStore.getState>['bandSteps'];
  bandStepEstimate: ReturnType<typeof appStore.getState>['bandStepEstimate'];
  bandStepDivisor: ReturnType<typeof appStore.getState>['bandStepDivisor'];
}) {
  const detail = input.today?.sleepDetail ?? null;
  if (input.key === 'sleep_performance') {
    return (
      <>
        <SectionLabel>Data quality</SectionLabel>
        <Card>
          <View style={styles.statRow}>
            <Stat label="Confidence" value={sleepConfidenceLabel(detail?.confidence)} color={sleepConfidenceColor(detail?.confidence)} />
            <Stat label="Coverage" value={detail?.coveragePct != null ? `${detail.coveragePct}%` : '-'} color={sleepCoverageColor(detail?.coveragePct)} />
            <Stat label="Signal" value={detail?.signalMin ?? '-'} unit="min" color={colors.sleepTeal} />
          </View>
          <Text style={styles.qualityNote}>
            {input.sleepPerformance?.cappedByConfidence && input.sleepPerformance.confidenceCapPct != null
              ? `Score capped at ${input.sleepPerformance.confidenceCapPct}% until the overnight capture has stronger coverage or sleep-state corroboration.`
              : sleepQualityNote(detail)}
          </Text>
        </Card>
      </>
    );
  }

  if (input.key === 'steps') {
    const range = formatSampleRange(input.bandStepEstimate?.firstTs, input.bandStepEstimate?.lastTs);
    return (
      <>
        <SectionLabel>Step source</SectionLabel>
        <Card>
          <View style={styles.statRow}>
            <Stat label="Current source" value={stepSourceLabel(input.stepSource)} color={input.stepSource === 'band' ? colors.recoveryGreen : colors.textSecondary} />
            <Stat label="Band estimate" value={input.bandSteps != null ? input.bandSteps.toLocaleString() : '-'} color={colors.recoveryGreen} />
            <Stat label="Confidence" value={input.bandStepEstimate?.confidence ?? '-'} color={input.bandStepEstimate?.confidence === 'medium' ? colors.recoveryYellow : colors.textTertiary} />
          </View>
          <View style={[styles.statRow, styles.statRowTight]}>
            <Stat label="Raw counter" value={input.bandStepEstimate?.rawTicks ?? '-'} />
            <Stat label="Used intervals" value={input.bandStepEstimate?.usedIntervals ?? '-'} />
            <Stat label="Units/step" value={input.bandStepDivisor.toFixed(1)} />
          </View>
          <Text style={styles.qualityNote}>
            {input.bandStepEstimate
              ? `${range}. Calibration adjusts the counter-to-step ratio for this strap and firmware.`
              : 'No decoded band step counter yet. Sync history or use phone pedometer fallback for today.'}
          </Text>
        </Card>
      </>
    );
  }

  if (input.key === 'spo2' || input.key === 'skin_temp') {
    const current = input.key === 'spo2' ? input.today?.spo2 ?? null : input.today?.skinTempC ?? null;
    const hasRawRows = (input.historySync?.rawVitalSamples ?? 0) > 0;
    const sleepBlocked = hasRawRows && current == null && rawVitalSleepBlocked(detail);
    const status = current != null ? 'decoded' : sleepBlocked ? 'review sleep' : hasRawRows ? 'awaiting sleep' : 'needs raw rows';
    return (
      <>
        <SectionLabel>Decode status</SectionLabel>
        <Card>
          <View style={styles.statRow}>
            <Stat
              label="Status"
              value={status}
              color={current != null ? colors.recoveryYellow : sleepBlocked ? colors.sleepTeal : colors.textTertiary}
            />
            <Stat label="Raw vitals" value={input.historySync?.rawVitalSamples ?? '-'} />
            <Stat label="Sync state" value={input.historySync?.status ? shortStatus(input.historySync.status) : '-'} />
          </View>
          <View style={[styles.statRow, styles.statRowTight]}>
            <Stat label="Sleep confidence" value={sleepConfidenceLabel(detail?.confidence)} color={sleepConfidenceColor(detail?.confidence)} />
            <Stat label="Sleep coverage" value={detail?.coveragePct != null ? `${detail.coveragePct}%` : '-'} color={sleepCoverageColor(detail?.coveragePct)} />
            <Stat label="Sleep signal" value={detail?.signalMin ?? '-'} unit={detail?.signalMin != null ? 'min' : undefined} />
          </View>
          <Text style={styles.qualityNote}>
            {current != null
              ? 'This decoded raw channel is averaged from valid WHOOP 5 history samples inside the sleep or candidate-sleep window and contributes to Health Monitor once a personal range is available.'
              : sleepBlocked
                ? 'Raw vital rows were decoded, but Pulse needs a clearer sleep window before assigning them to Blood Oxygen or Skin Temperature. Keep auto sync connected, or review the sleep window if the timing looks wrong.'
              : hasRawRows
                ? 'Raw vital rows were decoded, but there are not enough valid samples inside the overnight sleep window yet. Finish auto sync or review the sleep window before trusting this metric.'
                : 'No raw vital rows have been decoded yet. Keep the strap connected long enough for history sync to backfill the overnight raw sensor records.'}
          </Text>
        </Card>
      </>
    );
  }

  return null;
}

function metricUsesSleepTrust(key: MetricKey): boolean {
  return (
    key === 'recovery' ||
    key === 'sleep_performance' ||
    key === 'sleep_need' ||
    key === 'sleep_debt' ||
    key === 'sleep_efficiency' ||
    key === 'energy_reserve' ||
    key === 'hrv' ||
    key === 'rhr' ||
    key === 'respiratory' ||
    key === 'spo2' ||
    key === 'skin_temp'
  );
}

function trustedMetricRows(
  rows: DailyMetricRow[],
  key: MetricKey,
  def: Def,
): { trustedValues: number[]; rawValues: number[]; excludedLowTrust: number } {
  const rawValues: number[] = [];
  const trustedValues: number[] = [];
  let excludedLowTrust = 0;
  const trustAware = metricUsesSleepTrust(key);

  for (const row of rows) {
    const value = def.pick(row);
    if (value == null || !Number.isFinite(value)) continue;
    rawValues.push(value);
    if (!trustAware) {
      trustedValues.push(value);
      continue;
    }
    const weight = sleepTrustWeight(row);
    if (weight <= 0) {
      excludedLowTrust += 1;
      continue;
    }
    trustedValues.push(value);
  }

  return { trustedValues, rawValues, excludedLowTrust };
}

function rawVitalSleepBlocked(detail: DailyMetricRow['sleepDetail']): boolean {
  if (!detail) return true;
  if (sleepTrustTier(detail) === 'low') return true;
  return sleepNeedsMoreSync(detail);
}

function ringFraction(key: MetricKey, value: number | null): number {
  if (value == null) return 0;
  switch (key) {
    case 'recovery':
    case 'sleep_performance':
    case 'sleep_efficiency':
    case 'spo2':
    case 'energy_reserve':
      return value / 100;
    case 'sleep_need':
      return Math.min(1, value / 600);
    case 'sleep_debt':
      return Math.min(1, value / 180);
    case 'strain':
      return value / 21;
    case 'hrv':
      return Math.min(1, value / 120);
    case 'rhr':
      return Math.min(1, value / 100);
    case 'respiratory':
      return Math.min(1, value / 25);
    case 'steps':
      return Math.min(1, value / 15000);
    default:
      return Math.min(1, value / 100);
  }
}

function formatMetricMain(key: MetricKey, value: number, def: Def): string {
  if (key === 'sleep_need' || key === 'sleep_debt') return formatDuration(Math.round(value));
  return value.toFixed(def.decimals ?? 0);
}

function formatMetricValue(key: MetricKey, value: number, def: Def, includeUnit = true): string {
  if (key === 'sleep_need' || key === 'sleep_debt') return formatDuration(Math.round(value));
  const formatted = value.toFixed(def.decimals ?? 0);
  return includeUnit && def.unit ? `${formatted} ${def.unit}` : formatted;
}

function centerSubForMetric(key: MetricKey, value: number, def: Def): string | undefined {
  if (key === 'sleep_need' || key === 'sleep_debt') return def.title.toLowerCase();
  if (key === 'steps') return value === 1 ? 'step' : 'steps';
  return def.unit || undefined;
}

function sleepQualityNote(detail: DailyMetricRow['sleepDetail']): string {
  if (!detail) return 'No sleep-detail breakdown has been saved for today yet.';
  const tier = sleepTrustTier(detail);
  if (tier === 'high') {
    return `Strong overnight capture: ${detail.coveragePct ?? 0}% HR coverage and ${detail.signalMin ?? 0} signal minutes.`;
  }
  if (tier === 'medium') {
    return `Usable estimate: ${detail.coveragePct ?? 0}% coverage. Review the sleep window if timing feels wrong.`;
  }
  return `Low-confidence estimate: ${detail.coveragePct ?? 0}% coverage. Sync more history before trusting score, recovery, or readiness.`;
}

function stepSourceLabel(source: 'band' | 'phone' | null): string {
  if (source === 'band') return 'band calibrated';
  if (source === 'phone') return 'phone';
  return '-';
}

function formatSampleRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'No decoded range yet';
  const first = new Date(firstTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const last = new Date(lastTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `Decoded ${first}-${last}`;
}

function shortStatus(status: string): string {
  if (status.length <= 18) return status;
  return `${status.slice(0, 17)}...`;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  unavail: { color: colors.textSecondary, fontFamily: fonts.textBold, fontSize: 15, marginBottom: 4 },
  unavail2: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  k: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  v: { color: colors.text, fontSize: 15, fontFamily: fonts.bold },
  trustNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 8, fontFamily: fonts.text },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statRowTight: { marginTop: 14 },
  qualityNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
});
