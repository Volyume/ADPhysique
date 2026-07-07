import { Fragment, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { DailyMetricRow } from '../db/database';
import { Card, Empty, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import {
  Band,
  bandColors,
  consistencyBand,
  debtBand,
  efficiencyBand,
  hoursVsNeededBand,
  performanceBand,
  restorativeBand,
} from '../metrics/sleepBands';
import { nullableClampPct } from '../util/number';

type RangeKey = 'W' | 'M' | '6M';
const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: 'W', label: 'Week', days: 7 },
  { key: 'M', label: 'Month', days: 30 },
  { key: '6M', label: '6 Month', days: 180 },
];

type TrendMetric = {
  key: string;
  title: string;
  hours: boolean; // value is in hours (format H:MM) vs a percentage
  pick: (d: DailyMetricRow) => number | null;
  band?: (v: number) => Band;
  bandLabels?: [string, string, string]; // [optimal, sufficient, poor]
};

const METRICS: TrendMetric[] = [
  {
    key: 'performance',
    title: 'Sleep Performance',
    hours: false,
    pick: (d) => nullableClampPct(d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null)),
    band: performanceBand,
    bandLabels: ['Optimal', 'Sufficient', 'Poor'],
  },
  {
    key: 'hours_pct',
    title: 'Hours vs Needed (%)',
    hours: false,
    pick: (d) => nullableClampPct(d.sleepDetail?.hoursVsNeeded),
    band: hoursVsNeededBand,
    bandLabels: ['Optimal', 'Sufficient', 'Poor'],
  },
  {
    key: 'consistency',
    title: 'Sleep Consistency',
    hours: false,
    pick: (d) => d.sleepDetail?.consistency ?? null,
    band: consistencyBand,
    bandLabels: ['Optimal', 'Sufficient', 'Poor'],
  },
  {
    key: 'efficiency',
    title: 'Sleep Efficiency',
    hours: false,
    pick: (d) => d.sleepDetail?.efficiency ?? null,
    band: efficiencyBand,
    bandLabels: ['Optimal', 'Sufficient', 'Poor'],
  },
  {
    key: 'restorative_pct',
    title: 'Restorative Sleep (%)',
    hours: false,
    pick: (d) => d.sleepDetail?.restorativePct ?? null,
    band: restorativeBand,
    bandLabels: ['High', 'Sufficient', 'Low'],
  },
  {
    key: 'debt',
    title: 'Sleep Debt',
    hours: true,
    pick: (d) => (d.sleepDetail?.debtMin != null ? d.sleepDetail.debtMin / 60 : null),
    band: (v) => debtBand(v * 60),
    bandLabels: ['Low', 'Moderate', 'High'],
  },
  { key: 'hours', title: 'Hours of Sleep', hours: true, pick: (d) => (d.sleepMin != null ? d.sleepMin / 60 : null) },
  {
    key: 'tib',
    title: 'Time in Bed',
    hours: true,
    pick: (d) =>
      d.sleepDetail?.inBedMin != null
        ? d.sleepDetail.inBedMin / 60
        : d.sleepMin != null && d.awakeMin != null
          ? (d.sleepMin + d.awakeMin) / 60
          : null,
  },
  {
    key: 'restorative_h',
    title: 'Restorative Sleep (hours)',
    hours: true,
    pick: (d) => (d.sleepDetail?.restorativeMin != null ? d.sleepDetail.restorativeMin / 60 : null),
  },
  {
    key: 'confidence',
    title: 'Capture Confidence',
    hours: false,
    pick: (d) => confidenceScore(d.sleepDetail?.confidence),
    band: confidenceBand,
    bandLabels: ['High', 'Medium', 'Low'],
  },
  {
    key: 'coverage',
    title: 'HR Coverage',
    hours: false,
    pick: (d) => nullableClampPct(d.sleepDetail?.coveragePct),
    band: confidenceBand,
    bandLabels: ['High', 'Medium', 'Low'],
  },
  {
    key: 'motion_evidence',
    title: 'Still Evidence',
    hours: false,
    pick: (d) =>
      d.sleepDetail?.inBedMin && d.sleepDetail.motionMin != null
        ? nullableClampPct(Math.round(((d.sleepDetail.stillMin ?? d.sleepDetail.motionMin) / Math.max(1, d.sleepDetail.inBedMin)) * 100))
        : null,
    band: confidenceBand,
    bandLabels: ['High', 'Medium', 'Low'],
  },
];

function fmtHM(h: number): string {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function fmtVal(v: number, hours: boolean): string {
  return hours ? `${fmtHM(v)} hr` : `${Math.round(v)}%`;
}

function confidenceScore(confidence: 'high' | 'medium' | 'low' | null | undefined): number | null {
  if (confidence === 'high') return 100;
  if (confidence === 'medium') return 70;
  if (confidence === 'low') return 40;
  return null;
}

function confidenceBand(v: number): Band {
  if (v >= 85) return 'optimal';
  if (v >= 60) return 'sufficient';
  return 'poor';
}

function trendDeltaMeta(metric: TrendMetric, avg: number | null, priorAvg: number | null): {
  pct: number | null;
  improved: boolean | null;
  label: 'higher' | 'lower' | 'unchanged' | null;
} {
  if (avg == null || priorAvg == null || priorAvg === 0) return { pct: null, improved: null, label: null };
  const delta = avg - priorAvg;
  const pct = Math.round((delta / priorAvg) * 100);
  if (Math.abs(pct) < 1) return { pct: 0, improved: null, label: 'unchanged' };
  const lowerIsBetter = metric.key === 'debt';
  return {
    pct,
    improved: lowerIsBetter ? delta < 0 : delta > 0,
    label: delta > 0 ? 'higher' : 'lower',
  };
}

function trendWeight(day: DailyMetricRow): number {
  const confidence = day.sleepDetail?.confidence;
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 0.7;
  if (confidence === 'low') return 0;
  return day.sleepDetail?.coveragePct != null ? 0.45 : 1;
}

function weightedAverage(rows: DailyMetricRow[], metric: TrendMetric): { avg: number | null; weight: number; count: number } {
  let total = 0;
  let weightTotal = 0;
  let count = 0;
  for (const row of rows) {
    const value = metric.pick(row);
    if (value == null) continue;
    const weight = trendWeight(row);
    if (weight <= 0) continue;
    total += value * weight;
    weightTotal += weight;
    count += 1;
  }
  return { avg: weightTotal > 0 ? total / weightTotal : null, weight: weightTotal, count };
}

function trendDeltaColor(improved: boolean | null): string {
  if (improved === false) return '#ffa722';
  if (improved === null) return colors.sleepTeal;
  return colors.recoveryGreen;
}

function trendDeltaBg(improved: boolean | null): string {
  if (improved === false) return '#3b2a0c';
  if (improved === null) return '#0b3131';
  return '#0c3b2e';
}

function QualityStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.qualityStat}>
      <Text style={[styles.qualityValue, { color }]}>{value}</Text>
      <Text style={styles.qualityLabel}>{label}</Text>
    </View>
  );
}

function sleepTrendInsight({
  period,
  metric,
  avg,
  priorAvg,
  quality,
}: {
  period: DailyMetricRow[];
  metric: TrendMetric;
  avg: number | null;
  priorAvg: number | null;
  quality: { total: number; high: number; medium: number; low: number; avgCoverage: number | null };
}): {
  badge: string;
  title: string;
  body: string;
  color: string;
  usableNights: number;
  totalNights: number;
  usableColor: string;
  direction: string;
  directionColor: string;
  nextMove: string;
} {
  const totalNights = period.filter((d) => d.sleepMin != null || d.sleepDetail != null).length;
  const usableNights = quality.high + quality.medium;
  const usableRatio = usableNights / Math.max(1, totalNights);
  const usableColor = totalNights === 0 ? colors.textTertiary : usableRatio >= 0.75 ? colors.recoveryGreen : colors.recoveryYellow;
  const delta = avg != null && priorAvg != null ? avg - priorAvg : null;
  const improvesWhenLower = metric.key === 'debt';
  const improved = delta == null ? null : improvesWhenLower ? delta <= -0.25 : delta >= (metric.hours ? 0.25 : 3);
  const worsened = delta == null ? null : improvesWhenLower ? delta >= 0.25 : delta <= (metric.hours ? -0.25 : -3);
  const direction =
    delta == null
      ? 'building'
      : improved
        ? 'better'
        : worsened
          ? 'worse'
          : 'steady';
  const directionColor = direction === 'better' ? colors.recoveryGreen : direction === 'worse' ? colors.recoveryYellow : colors.sleepTeal;

  if (totalNights === 0) {
    return {
      badge: 'SYNC',
      title: 'Trend needs sleep nights',
      body: 'Wear the strap overnight and let history sync complete before using this range to make sleep decisions.',
      color: colors.strainBlue,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'sync',
    };
  }

  if (quality.low > 0 || usableRatio < 0.7 || (quality.avgCoverage != null && quality.avgCoverage < 65)) {
    return {
      badge: 'DATA',
      title: 'Fix trend confidence first',
      body: `${usableNights}/${totalNights} nights are usable for this trend. Low-confidence or partial bars stay visible, but the headline now favors trusted nights.`,
      color: colors.recoveryYellow,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'review',
    };
  }

  if (metric.key === 'debt' && avg != null && avg >= 1) {
    return {
      badge: 'DEBT',
      title: 'Sleep debt is the constraint',
      body: `Average debt is ${fmtHM(avg)}. The highest-value move is adding enough time in bed for several nights, not chasing stage percentages.`,
      color: colors.recoveryYellow,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'bedtime',
    };
  }

  if (metric.key === 'consistency' && avg != null && avg < 75) {
    return {
      badge: 'TIME',
      title: 'Schedule stability is limiting sleep',
      body: 'Bed and wake timing are moving around enough to affect recovery. Pick a realistic wake anchor and let bedtime follow it.',
      color: colors.sleepTeal,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'anchor',
    };
  }

  if (metric.key === 'efficiency' && avg != null && avg < 85) {
    return {
      badge: 'REST',
      title: 'Continuity needs attention',
      body: 'Efficiency is below the useful range. Look for late caffeine, alcohol, late heavy meals, overheating, or a sleep window that includes too much awake time.',
      color: colors.sleepTeal,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'continuity',
    };
  }

  if (direction === 'better') {
    return {
      badge: 'HOLD',
      title: 'This trend is moving well',
      body: `${metric.title} is improving against the prior range. Keep the routine stable long enough to prove it is repeatable.`,
      color: colors.recoveryGreen,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'hold',
    };
  }

  if (direction === 'worse') {
    return {
      badge: 'CHECK',
      title: 'The trend is slipping',
      body: `${metric.title} is worse than the prior range. Check sleep timing, recent strain, naps and capture quality before making a training call.`,
      color: colors.recoveryYellow,
      usableNights,
      totalNights,
      usableColor,
      direction,
      directionColor,
      nextMove: 'adjust',
    };
  }

  return {
    badge: 'STEADY',
    title: 'Trend is stable',
    body: 'The selected sleep signal is holding steady. Use the breakdown and quality cards to decide whether to maintain or make one small change.',
    color: colors.sleepTeal,
    usableNights,
    totalNights,
    usableColor,
    direction,
    directionColor,
    nextMove: 'steady',
  };
}

export function SleepTrendsScreen({ nav }: { nav: Nav }) {
  const [range, setRange] = useState<RangeKey>('M');
  const [metricKey, setMetricKey] = useState('performance');
  const [picking, setPicking] = useState(false);
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;
  useEffect(() => {
    // Load two periods so we can compare against the prior one.
    void appStore.loadHistory(days * 2).then(setHistory);
  }, [days]);

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]!;

  const view = useMemo(() => {
    const period = history.slice(-days); // current period (chronological)
    const prior = history.slice(-days * 2, -days);
    const vals = period.map(metric.pick).filter((v): v is number => v != null);
    const priorVals = prior.map(metric.pick).filter((v): v is number => v != null);
    const rawAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const weighted = weightedAverage(period, metric);
    const priorWeighted = weightedAverage(prior, metric);
    const avg = weighted.avg ?? rawAvg;
    const priorAvg = priorWeighted.avg ?? (priorVals.length ? priorVals.reduce((a, b) => a + b, 0) / priorVals.length : null);
    const delta = trendDeltaMeta(metric, avg, priorAvg);
    // Breakdown counts by band (only for banded metrics).
    let breakdown: Array<{ label: string; count: number; color: string }> | null = null;
    if (metric.band && metric.bandLabels) {
      const counts: Record<Band, number> = { optimal: 0, sufficient: 0, poor: 0 };
      for (const v of vals) counts[metric.band(v)] += 1;
      breakdown = [
        { label: metric.bandLabels[0], count: counts.optimal, color: bandColors.optimal },
        { label: metric.bandLabels[1], count: counts.sufficient, color: bandColors.sufficient },
        { label: metric.bandLabels[2], count: counts.poor, color: bandColors.poor },
      ];
    }
    const qualityRows = period.filter((d) => d.sleepDetail?.confidence != null || d.sleepDetail?.coveragePct != null);
    const qualityCounts = { high: 0, medium: 0, low: 0 };
    let coverageTotal = 0;
    let coverageCount = 0;
    for (const d of qualityRows) {
      const confidence = d.sleepDetail?.confidence;
      if (confidence === 'high') qualityCounts.high += 1;
      else if (confidence === 'medium') qualityCounts.medium += 1;
      else if (confidence === 'low') qualityCounts.low += 1;
      if (d.sleepDetail?.coveragePct != null) {
        coverageTotal += d.sleepDetail.coveragePct;
        coverageCount += 1;
      }
    }
    const quality = {
      total: qualityRows.length,
      high: qualityCounts.high,
      medium: qualityCounts.medium,
      low: qualityCounts.low,
      avgCoverage: coverageCount ? Math.round(coverageTotal / coverageCount) : null,
    };

    // Down-sample to <=30 bars.
    const step = Math.max(1, Math.ceil(period.length / 30));
    const bars = period
      .filter((_, i) => i % step === 0)
      .map((d) => {
        const value = metric.pick(d);
        const confidence = d.sleepDetail?.confidence;
        return {
          value,
          day: d.day,
          color: value != null && metric.band ? bandColors[metric.band(value)] : colors.sleepTeal,
          opacity: confidence === 'low' ? 0.42 : confidence === 'medium' ? 0.68 : 0.88,
        };
      });
    const insight = sleepTrendInsight({ period, metric, avg, priorAvg, quality });
    return { avg, rawAvg, priorAvg, delta, breakdown, quality, bars, insight, weighted };
  }, [history, days, metric]);

  const periodWord = range === 'W' ? 'week' : range === 'M' ? 'month' : '6 months';

  return (
    <Screen title="Trend View" onBack={nav.back} tint={colors.sleepTeal}>
      {/* Metric selector */}
      <Pressable onPress={() => setPicking((p) => !p)}>
        <Card style={styles.selectorRow}>
          <Ionicons name="moon" size={20} color={colors.sleepTeal} />
          <Text style={styles.selectorText}>{metric.title}</Text>
          <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </Card>
      </Pressable>
      {picking ? (
        <Card style={{ paddingVertical: 2 }}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => {
                setMetricKey(m.key);
                setPicking(false);
              }}
              style={styles.pickRow}
            >
              <Text style={[styles.pickText, m.key === metric.key && { color: colors.sleepTeal }]}>{m.title}</Text>
              {m.key === metric.key ? <Ionicons name="checkmark" size={18} color={colors.sleepTeal} /> : null}
            </Pressable>
          ))}
        </Card>
      ) : null}

      {/* Range toggle */}
      <View style={styles.segment}>
        {RANGES.map((r) => (
          <Pressable key={r.key} onPress={() => setRange(r.key)} style={[styles.segBtn, range === r.key && styles.segBtnActive]}>
            <Text style={[styles.segText, range === r.key && styles.segTextActive]}>{r.key}</Text>
          </Pressable>
        ))}
      </View>

      {/* Average + delta */}
      <Card>
        <Text style={styles.avgLabel}>{view.weighted.avg != null ? 'TRUSTED AVERAGE' : 'AVERAGE'}</Text>
        <View style={styles.avgRow}>
          <Text style={styles.avgValue}>{view.avg != null ? fmtVal(view.avg, metric.hours) : '—'}</Text>
          {view.delta.pct != null ? (
            <View style={[styles.delta, { backgroundColor: trendDeltaBg(view.delta.improved) }]}>
              <Ionicons
                name={view.delta.label === 'lower' ? 'caret-down' : view.delta.label === 'higher' ? 'caret-up' : 'remove'}
                size={12}
                color={trendDeltaColor(view.delta.improved)}
              />
              <Text style={[styles.deltaText, { color: trendDeltaColor(view.delta.improved) }]}>
                {Math.abs(view.delta.pct)}% {view.delta.label ?? ''} vs prior {periodWord}
              </Text>
            </View>
          ) : null}
        </View>
        {view.avg != null && view.priorAvg != null ? (
          <Text style={styles.sentence}>
            Your average {metric.title.toLowerCase()} this {periodWord} ({fmtVal(view.avg, metric.hours)}) was{' '}
            {view.delta.label === 'unchanged' ? 'in line with' : view.delta.label === 'higher' ? 'higher than' : 'lower than'} your previous average of {fmtVal(view.priorAvg, metric.hours)}.
          </Text>
        ) : null}
        {view.rawAvg != null && view.weighted.avg != null && Math.abs(view.rawAvg - view.weighted.avg) > (metric.hours ? 0.08 : 1) ? (
          <Text style={styles.trustSentence}>
            Raw average was {fmtVal(view.rawAvg, metric.hours)}; trusted weighting reduces low-confidence nights before comparing trends.
          </Text>
        ) : null}
        {view.bars.some((b) => b.value != null) ? (
          <>
            <TrendChart bars={view.bars} avg={view.avg} hours={metric.hours} onSelectDay={(day) => nav.navigate({ name: 'day', day })} />
            {view.quality.low > 0 || view.quality.medium > 0 ? (
              <Text style={styles.chartHint}>Dim bars have lower capture confidence; tap any bar to review the day.</Text>
            ) : null}
          </>
        ) : (
          <Empty text="No data for this metric in the selected range yet." />
        )}
      </Card>

      <SectionLabel>Trend interpretation</SectionLabel>
      <Card>
        <View style={styles.insightHead}>
          <View style={[styles.insightBadge, { backgroundColor: view.insight.color }]}>
            <Text style={styles.insightBadgeText}>{view.insight.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>{view.insight.title}</Text>
            <Text style={styles.insightBody}>{view.insight.body}</Text>
          </View>
        </View>
        <View style={styles.insightStats}>
          <QualityStat label="Usable nights" value={`${view.insight.usableNights}/${view.insight.totalNights}`} color={view.insight.usableColor} />
          <QualityStat label="Direction" value={view.insight.direction} color={view.insight.directionColor} />
          <QualityStat label="Next move" value={view.insight.nextMove} color={view.insight.color} />
        </View>
      </Card>

      {view.quality.total > 0 ? (
        <>
          <SectionLabel>Capture quality</SectionLabel>
          <Card>
            <View style={styles.qualityGrid}>
              <QualityStat label="High" value={view.quality.high} color={colors.recoveryGreen} />
              <QualityStat label="Medium" value={view.quality.medium} color={colors.recoveryYellow} />
              <QualityStat label="Low" value={view.quality.low} color={colors.recoveryRed} />
              <QualityStat label="Weighted avg" value={view.weighted.avg != null ? fmtVal(view.weighted.avg, metric.hours) : '-'} color={colors.sleepTeal} />
            </View>
            <Text style={styles.qualityNote}>
              High-confidence nights drive the weighted average, medium nights contribute partially, and low-confidence nights stay visible for review.
            </Text>
          </Card>
        </>
      ) : null}

      {/* Breakdown */}
      {view.breakdown ? (
        <>
          <SectionLabel>{metric.title} breakdown (days)</SectionLabel>
          <Card>
            <View style={styles.segBar}>
              {view.breakdown.map((b, i) =>
                b.count > 0 ? <View key={i} style={{ flex: b.count, backgroundColor: b.color, height: 10 }} /> : null,
              )}
            </View>
            {view.breakdown.map((b) => (
              <View key={b.label} style={styles.bdRow}>
                <View style={[styles.bdSwatch, { backgroundColor: b.color }]} />
                <Text style={styles.bdCount}>{b.count}x</Text>
                <Text style={styles.bdLabel}>{b.label}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function TrendChart({
  bars,
  avg,
  hours,
  onSelectDay,
}: {
  bars: Array<{ value: number | null; day: string; color: string; opacity: number }>;
  avg: number | null;
  hours: boolean;
  onSelectDay: (day: string) => void;
}) {
  const W = 340;
  const H = 170;
  const padB = 6;
  const vals = bars.map((b) => b.value).filter((v): v is number => v != null);
  const max = Math.max(0.0001, ...vals, avg ?? 0) * 1.12;
  const n = bars.length;
  const slot = W / n;
  const bw = Math.max(2, Math.min(slot * 0.7, 16));
  const avgY = avg != null ? H - padB - (avg / max) * (H - padB) : null;
  return (
    <Svg width="100%" height={H + 8} viewBox={`0 0 ${W} ${H + 8}`}>
      {bars.map((b, i) => {
        if (b.value == null) return null;
        const h = (b.value / max) * (H - padB);
        const x = i * slot + (slot - bw) / 2;
        const showLabel = bars.length <= 14 || i === 0 || i === bars.length - 1;
        return (
          <Fragment key={b.day}>
            <Rect
              x={x}
              y={H - padB - h}
              width={bw}
              height={Math.max(1, h)}
              rx={2}
              fill={b.color}
              opacity={b.opacity}
              onPress={() => onSelectDay(b.day)}
            />
            {showLabel ? (
              <SvgText x={x + bw / 2} y={H + 8} fill={colors.textTertiary} fontSize={9} textAnchor="middle">
                {b.day.slice(8)}
              </SvgText>
            ) : null}
          </Fragment>
        );
      })}
      {avgY != null ? (
        <>
          <Line x1={0} y1={avgY} x2={W} y2={avgY} stroke={colors.text} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
          <SvgText x={2} y={avgY - 4} fill={colors.text} fontSize={10} fontWeight="bold">
            AVG {hours ? fmtHM(avg!) : Math.round(avg!)}
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorText: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold, flex: 1 },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickText: { color: colors.text, fontSize: 14, fontFamily: fonts.text },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 4, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  segBtnActive: { backgroundColor: colors.surface },
  segText: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.textSemibold },
  segTextActive: { color: colors.text },
  avgLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 1.2 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avgValue: { color: colors.text, fontSize: 34, fontFamily: fonts.black },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  deltaText: { fontSize: 12, fontFamily: fonts.textBold },
  sentence: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 6, fontFamily: fonts.text },
  trustSentence: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: 6, fontFamily: fonts.text },
  chartHint: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: fonts.text },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  insightBadge: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  insightBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  insightTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  insightBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  insightStats: { flexDirection: 'row', justifyContent: 'space-between' },
  qualityGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  qualityStat: { flex: 1, alignItems: 'center' },
  qualityValue: { fontSize: 20, fontFamily: fonts.black },
  qualityLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: fonts.textBold },
  qualityNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 12, fontFamily: fonts.text },
  segBar: { flexDirection: 'row', borderRadius: 5, overflow: 'hidden', marginBottom: 12, backgroundColor: colors.surface },
  bdRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  bdSwatch: { width: 12, height: 12, borderRadius: 3, marginRight: 10 },
  bdCount: { color: colors.text, fontSize: 15, fontFamily: fonts.bold, width: 44 },
  bdLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
});
