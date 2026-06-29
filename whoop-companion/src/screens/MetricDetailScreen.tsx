import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { DailyMetricRow } from '../db/database';
import { BaselineChart, Card, Empty, Ring, Screen, SectionLabel, WeeklyBars } from '../ui/components';
import { stdev } from '../metrics/ema';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { MetricKey, Nav } from '../ui/navigation';
import { formatDuration } from '../util/time';

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

const DEFS: Record<string, Def> = {
  hrv: {
    title: 'Heart Rate Variability',
    unit: 'ms',
    color: () => colors.recoveryGreen,
    pick: (d) => d.rmssd,
    measured: true,
    blurb:
      'Heart rate variability (HRV), the variance in time between heartbeats, is an indicator of how well your body can perform and adapt to its environment. Higher is generally better. WHOOP measures HRV during sleep; this build derives it from the strap’s R-R intervals.',
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
    pick: () => null,
    measured: false,
    blurb:
      'Blood oxygen (SpO₂) measures how much oxygen your red blood cells are carrying. It requires the raw red/infrared optical (PPG) stream, which this build cannot yet decode over Bluetooth — so it is not measured here.',
  },
  skin_temp: {
    title: 'Skin Temperature',
    unit: '°C',
    color: () => NEUTRAL,
    pick: () => null,
    measured: false,
    blurb:
      'Skin temperature indicates how your body regulates heat and varies day to day, unlike core body temperature. It requires the raw thermistor channel, which this build cannot yet decode over Bluetooth — so it is not measured here.',
  },
  recovery: {
    title: 'Recovery',
    unit: '%',
    color: (v) => recoveryColor(v),
    pick: (d) => d.recovery,
    measured: true,
    blurb:
      'Recovery (0–100%) is how prepared your body is to perform, derived from HRV, resting heart rate, respiratory rate and sleep. Green (≥67%) = primed; Yellow (34–66%) = maintaining; Red (≤33%) = needs rest.',
  },
  strain: {
    title: 'Day Strain',
    unit: '',
    color: () => colors.strainBlue,
    decimals: 1,
    pick: (d) => d.strain,
    measured: true,
    blurb:
      'Strain (0–21, logarithmic) is the cardiovascular load you accumulate over a day or activity, based on time spent in each heart-rate zone. It builds quickly at high heart rates and barely moves at rest.',
  },
  sleep_performance: {
    title: 'Sleep Performance',
    unit: '%',
    color: () => colors.sleepTeal,
    pick: (d) =>
      d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null),
    measured: true,
    blurb:
      'Sleep Performance is a composite of four contributors — Hours vs Needed, Sleep Consistency, Sleep Efficiency and Sleep Stress. Sleep need is personalised from your baseline, recent strain, naps and accrued sleep debt.',
  },
};

export function MetricDetailScreen({ nav, metricKey }: { nav: Nav; metricKey: MetricKey }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const hrvBal = useStoreSelector(appStore, (s) => s.hrvBal);
  const cardioAge = useStoreSelector(appStore, (s) => s.cardioAge);
  const ageYears = useStoreSelector(appStore, (s) => s.profile.ageYears);
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
            centerMain={hrvBal ? `${hrvBal.ratio}×` : '—'}
            centerSub={hrvBal ? `${hrvBal.shortMean} vs ${hrvBal.longMean} ms` : 'needs ~1 week'}
          />
        </View>
        <Card>
          <Text style={styles.blurb}>
            HRV Balance compares your recent (≈2-week) HRV trend to your longer (≈3-month) average. On
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
            centerMain={cardioAge != null ? `${cardioAge}` : '—'}
            centerSub={delta != null ? (delta <= 0 ? `${-delta}y younger` : `${delta}y older`) : 'estimate'}
          />
        </View>
        <Card>
          <Text style={styles.blurb}>
            An estimate of your heart’s fitness age from your resting heart rate and overnight HRV
            versus what’s typical for your age. A lower number than your real age is good.
          </Text>
          <Text style={styles.unavail2}>
            This is a wellness estimate, not Oura’s pulse-wave-velocity Cardiovascular Age — that needs
            the ring’s raw optical waveform, which WHOOP doesn’t expose over Bluetooth.
          </Text>
        </Card>
      </Screen>
    );
  }

  const def: Def = DEFS[metricKey] ?? (DEFS.hrv as Def);

  const current = today ? def.pick(today) : null;
  const series = history.map(def.pick).filter((v): v is number => v != null);
  const baseline = series.length ? series.reduce((a, b) => a + b, 0) / series.length : null;
  const tint = def.color(current);

  // Last 7 days for the weekly bars.
  const last7 = history.slice(-7).map((d) => ({
    label: d.day.slice(8),
    value: def.pick(d),
    display: def.pick(d) != null ? `${def.pick(d)}` : '',
    color: tint,
  }));

  return (
    <Screen title={def.title} onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        {def.measured ? (
          <Ring
            value={ringFraction(metricKey, current)}
            size={176}
            color={tint}
            centerMain={current != null ? `${current.toFixed(def.decimals ?? 0)}` : '—'}
            centerSub={current != null ? def.unit || undefined : 'awaiting data'}
          />
        ) : (
          <Card style={{ width: '100%' }}>
            <Text style={styles.unavail}>Not measured on this build</Text>
            <Empty text={def.blurb} />
          </Card>
        )}
      </View>

      {def.measured ? (
        <>
          <SectionLabel>30-day baseline</SectionLabel>
          <Card>
            <View style={styles.row}>
              <Text style={styles.k}>Baseline</Text>
              <Text style={styles.v}>
                {baseline != null ? `${baseline.toFixed(def.decimals ?? 0)} ${def.unit}` : '—'}
              </Text>
            </View>
            {series.length >= 2 ? (
              <View style={styles.row}>
                <Text style={styles.k}>Range (30d)</Text>
                <Text style={styles.v}>
                  {`${Math.min(...series).toFixed(def.decimals ?? 0)}–${Math.max(...series).toFixed(
                    def.decimals ?? 0,
                  )} ${def.unit}`}
                </Text>
              </View>
            ) : null}
          </Card>

          <SectionLabel>Last 7 days</SectionLabel>
          <Card>
            {last7.some((d) => d.value != null) ? (
              <WeeklyBars data={last7} />
            ) : (
              <Empty text="No history yet — wear the strap overnight to build this trend." />
            )}
          </Card>

          <SectionLabel>30-day trend vs baseline</SectionLabel>
          <Card>
            {series.length >= 2 && baseline != null ? (
              <BaselineChart values={series} baseline={baseline} sd={stdev(series) || 1} color={tint} height={150} />
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

function ringFraction(key: MetricKey, value: number | null): number {
  if (value == null) return 0;
  switch (key) {
    case 'recovery':
    case 'sleep_performance':
    case 'spo2':
      return value / 100;
    case 'strain':
      return value / 21;
    case 'hrv':
      return Math.min(1, value / 120);
    case 'rhr':
      return Math.min(1, value / 100);
    case 'respiratory':
      return Math.min(1, value / 25);
    default:
      return Math.min(1, value / 100);
  }
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  unavail: { color: colors.textSecondary, fontFamily: fonts.textBold, fontSize: 15, marginBottom: 4 },
  unavail2: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  k: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  v: { color: colors.text, fontSize: 15, fontFamily: fonts.bold },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
});
