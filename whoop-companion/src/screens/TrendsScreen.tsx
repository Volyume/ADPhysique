import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { DailyMetricRow } from '../db/database';
import { Card, Empty, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav, MetricKey } from '../ui/navigation';
import { nullableClampPct } from '../util/number';
import { computeEnergyReserve } from '../metrics/energyReserve';

type RangeKey = 'W' | 'M' | '6M' | 'ALL';
const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: 'W', label: 'Week', days: 7 },
  { key: 'M', label: 'Month', days: 30 },
  { key: '6M', label: '6 Month', days: 180 },
  { key: 'ALL', label: 'All', days: 365 },
];

type Series = {
  key: MetricKey;
  title: string;
  unit: string;
  pick: (d: DailyMetricRow) => number | null;
  color: (v: number | null) => string;
  decimals?: number;
};

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

const SERIESES: Series[] = [
  { key: 'recovery', title: 'RECOVERY', unit: '%', pick: (d) => d.recovery, color: (v) => recoveryColor(v) },
  { key: 'strain', title: 'DAY STRAIN', unit: '', pick: (d) => d.strain, color: () => colors.strainBlue, decimals: 1 },
  {
    key: 'sleep_performance',
    title: 'SLEEP PERFORMANCE',
    unit: '%',
    pick: (d) => nullableClampPct(d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null)),
    color: () => colors.sleepTeal,
  },
  {
    key: 'energy_reserve',
    title: 'ENERGY RESERVE',
    unit: '',
    pick: energyReserveScore,
    color: (v) => (v == null ? colors.textTertiary : v >= 70 ? colors.recoveryGreen : v >= 50 ? colors.recoveryYellow : colors.recoveryRed),
  },
  { key: 'hrv', title: 'HRV', unit: 'ms', pick: (d) => d.rmssd, color: () => colors.recoveryGreen },
  { key: 'rhr', title: 'RESTING HEART RATE', unit: 'bpm', pick: (d) => d.rhr, color: () => colors.recoveryRed },
  { key: 'steps', title: 'STEPS', unit: '', pick: (d) => d.steps, color: () => colors.recoveryGreen },
];

function confidenceForSeries(series: MetricKey, day: DailyMetricRow): 'high' | 'medium' | 'low' | null {
  if (
    series === 'recovery' ||
    series === 'sleep_performance' ||
    series === 'energy_reserve' ||
    series === 'hrv' ||
    series === 'rhr'
  ) {
    return day.sleepDetail?.confidence ?? null;
  }
  return null;
}

export function TrendsScreen({ nav }: { nav: Nav }) {
  const [range, setRange] = useState<RangeKey>('M');
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;
  const chartHistory = history.slice(-days);
  useEffect(() => {
    void appStore.loadHistory(Math.max(days, 60)).then(setHistory);
  }, [days]);

  return (
    <Screen title="Trend View" onBack={nav.back}>
      <View style={styles.segment}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRange(r.key)}
            style={[styles.segBtn, range === r.key && styles.segBtnActive]}
          >
            <Text style={[styles.segText, range === r.key && styles.segTextActive]}>{r.key}</Text>
          </Pressable>
        ))}
      </View>

      {chartHistory.length === 0 ? (
        <Card>
          <Empty text="No data to display for the selected range. Wear the strap to build your trends." />
        </Card>
      ) : (
        SERIESES.map((s) => {
          const vals = chartHistory.map(s.pick).filter((v): v is number => v != null);
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          // Down-sample to ~14 bars for readability.
          const step = Math.max(1, Math.ceil(chartHistory.length / 14));
          const bars = chartHistory
            .filter((_, i) => i % step === 0)
            .map((d) => ({
              label: d.day.slice(5).replace('-', '/'),
              value: s.pick(d),
              display: s.pick(d) != null ? `${s.pick(d)}` : '',
              color: s.color(s.pick(d)),
              confidence: s.pick(d) != null ? confidenceForSeries(s.key, d) : null,
            }));
          return (
            <View key={s.key}>
              <SectionLabel
                right={
                  <Text style={styles.avg}>
                    avg {avg != null ? avg.toFixed(s.decimals ?? 0) : '—'}
                    {s.unit}
                  </Text>
                }
              >
                {s.title}
              </SectionLabel>
              <Card onPress={() => nav.navigate({ name: 'metric', key: s.key })}>
                {bars.some((b) => b.value != null) ? (
                  <WeeklyBars data={bars} height={150} />
                ) : (
                  <Empty text="No data for this metric yet." />
                )}
              </Card>
            </View>
          );
        })
      )}

      <SectionLabel>Performance assessments</SectionLabel>
      <AssessmentCard title="Weekly Performance Assessment" history={history} days={7} />
      <AssessmentCard title="Monthly Performance Assessment" history={history} days={30} />
    </Screen>
  );
}

function AssessmentCard({ title, history, days }: { title: string; history: DailyMetricRow[]; days: number }) {
  const assessment = buildAssessment(history, days);
  if (!assessment) {
    return (
      <Card>
        <Text style={styles.paTitle}>{title}</Text>
        <Text style={styles.paSub}>
          {days === 7
            ? 'Needs about a week of synced sleep, recovery and strain to generate a meaningful weekly review.'
            : 'Needs more history before monthly patterns can be separated from day-to-day noise.'}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.paTitle}>{title}</Text>
      <Text style={styles.paSub}>{assessment.summary}</Text>
      <View style={styles.assessmentStats}>
        <Stat label="Recovery" value={assessment.recoveryAvg != null ? `${assessment.recoveryAvg}%` : '-'} color={recoveryColor(assessment.recoveryAvg)} />
        <Stat label="Sleep" value={assessment.sleepAvg != null ? `${assessment.sleepAvg}%` : '-'} color={colors.sleepTeal} />
        <Stat label="Strain" value={assessment.strainAvg != null ? assessment.strainAvg.toFixed(1) : '-'} color={colors.strainBlue} />
      </View>
      <View style={[styles.assessmentStats, { marginTop: 12 }]}>
        <Stat label="Vs prior" value={assessment.deltaLabel} color={assessment.deltaColor} />
        <Stat label="Sleep quality" value={assessment.qualityLabel} color={assessment.qualityColor} />
        <Stat label="Days" value={`${assessment.daysWithData}/${days}`} />
      </View>
    </Card>
  );
}

function buildAssessment(history: DailyMetricRow[], days: number): {
  recoveryAvg: number | null;
  sleepAvg: number | null;
  strainAvg: number | null;
  deltaLabel: string;
  deltaColor: string;
  qualityLabel: string;
  qualityColor: string;
  daysWithData: number;
  summary: string;
} | null {
  const current = history.slice(-days);
  const prior = history.slice(-days * 2, -days);
  const daysWithData = current.filter((d) => d.recovery != null || d.sleepMin != null || d.strain != null).length;
  if (daysWithData < Math.min(days, days === 7 ? 4 : 14)) return null;

  const recoveryAvg = avg(current, (d) => d.recovery);
  const sleepAvg = avg(current, (d) => nullableClampPct(d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null)));
  const strainAvg = avg(current, (d) => d.strain);
  const priorRecovery = avg(prior, (d) => d.recovery);
  const priorSleep = avg(prior, (d) => nullableClampPct(d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null)));
  const priorStrain = avg(prior, (d) => d.strain);

  const currentScore = weightedAssessmentScore(recoveryAvg, sleepAvg, strainAvg);
  const priorScore = weightedAssessmentScore(priorRecovery, priorSleep, priorStrain);
  const delta = currentScore != null && priorScore != null ? Math.round(currentScore - priorScore) : null;
  const sleepRows = current.filter((d) => d.sleepMin != null || d.sleepDetail != null).length;
  const confidenceRows = current.filter((d) => d.sleepDetail?.confidence != null).length;
  const lowConfidence = current.filter((d) => d.sleepDetail?.confidence === 'low').length;
  const mediumConfidence = current.filter((d) => d.sleepDetail?.confidence === 'medium').length;
  const qualityLabel =
    sleepRows === 0
      ? 'no sleep'
      : confidenceRows === 0
        ? 'unverified'
        : lowConfidence > 0
          ? `${lowConfidence} low`
          : mediumConfidence > 0
            ? `${mediumConfidence} usable`
            : 'strong';
  const qualityColor =
    sleepRows === 0 || confidenceRows === 0
      ? colors.textTertiary
      : lowConfidence > 0
        ? colors.recoveryRed
        : mediumConfidence > 0
          ? colors.recoveryYellow
          : colors.recoveryGreen;
  const strainText = strainAvg == null ? 'unknown training load' : strainAvg >= 12 ? 'high training load' : strainAvg >= 8 ? 'productive training load' : 'controlled training load';
  const recoveryText = recoveryAvg == null ? 'recovery is still building' : recoveryAvg >= 67 ? 'recovery stayed high' : recoveryAvg >= 34 ? 'recovery was mixed' : 'recovery was low';
  const sleepText = sleepAvg == null ? 'sleep needs more data' : sleepAvg >= 85 ? 'sleep supported the week' : sleepAvg >= 70 ? 'sleep was sufficient but improvable' : 'sleep limited recovery';
  const deltaText =
    delta == null
      ? 'No prior period comparison yet'
      : delta >= 5
        ? `Overall trend improved by ${delta} points`
        : delta <= -5
          ? `Overall trend fell by ${Math.abs(delta)} points`
          : 'Overall trend was steady';

  return {
    recoveryAvg,
    sleepAvg,
    strainAvg,
    deltaLabel: delta == null ? '-' : delta > 0 ? `+${delta}` : `${delta}`,
    deltaColor: delta == null ? colors.textTertiary : delta >= 5 ? colors.recoveryGreen : delta <= -5 ? colors.recoveryRed : colors.sleepTeal,
    qualityLabel,
    qualityColor,
    daysWithData,
    summary: `${deltaText}: ${recoveryText}, ${sleepText}, with ${strainText}.`,
  };
}

function avg(rows: DailyMetricRow[], pick: (d: DailyMetricRow) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function weightedAssessmentScore(recovery: number | null, sleep: number | null, strain: number | null): number | null {
  if (recovery == null && sleep == null && strain == null) return null;
  const rec = recovery ?? sleep ?? 50;
  const slp = sleep ?? rec;
  const strainBalance = strain == null ? 65 : strain >= 8 && strain <= 14 ? 85 : strain < 8 ? 65 : 55;
  return Math.round(0.45 * rec + 0.35 * slp + 0.2 * strainBalance);
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 4, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  segBtnActive: { backgroundColor: colors.surface },
  segText: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.textSemibold },
  segTextActive: { color: colors.text },
  avg: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.medium },
  paTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  paSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, fontFamily: fonts.text },
  assessmentStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
});
