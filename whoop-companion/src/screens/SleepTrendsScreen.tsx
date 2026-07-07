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

function QualityStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.qualityStat}>
      <Text style={[styles.qualityValue, { color }]}>{value}</Text>
      <Text style={styles.qualityLabel}>{label}</Text>
    </View>
  );
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
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const priorAvg = priorVals.length ? priorVals.reduce((a, b) => a + b, 0) / priorVals.length : null;
    const deltaPct = avg != null && priorAvg != null && priorAvg !== 0 ? Math.round(((avg - priorAvg) / priorAvg) * 100) : null;

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
        const lowConfidence = d.sleepDetail?.confidence === 'low';
        return {
          value,
          day: d.day,
          color: value != null && metric.band ? bandColors[metric.band(value)] : colors.sleepTeal,
          opacity: metric.key === 'performance' && lowConfidence ? 0.45 : 0.88,
        };
      });
    return { avg, priorAvg, deltaPct, breakdown, quality, bars };
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
        <Text style={styles.avgLabel}>AVERAGE</Text>
        <View style={styles.avgRow}>
          <Text style={styles.avgValue}>{view.avg != null ? fmtVal(view.avg, metric.hours) : '—'}</Text>
          {view.deltaPct != null ? (
            <View style={[styles.delta, { backgroundColor: view.deltaPct >= 0 ? '#0c3b2e' : '#3b2a0c' }]}>
              <Ionicons name={view.deltaPct >= 0 ? 'caret-up' : 'caret-down'} size={12} color={view.deltaPct >= 0 ? colors.recoveryGreen : '#ffa722'} />
              <Text style={[styles.deltaText, { color: view.deltaPct >= 0 ? colors.recoveryGreen : '#ffa722' }]}>
                {Math.abs(view.deltaPct)}% vs prior {periodWord}
              </Text>
            </View>
          ) : null}
        </View>
        {view.avg != null && view.priorAvg != null ? (
          <Text style={styles.sentence}>
            Your average {metric.title.toLowerCase()} this {periodWord} ({fmtVal(view.avg, metric.hours)}) was{' '}
            {view.avg >= view.priorAvg ? 'above' : 'below'} your previous average of {fmtVal(view.priorAvg, metric.hours)}.
          </Text>
        ) : null}
        {view.bars.some((b) => b.value != null) ? (
          <>
            <TrendChart bars={view.bars} avg={view.avg} hours={metric.hours} onSelectDay={(day) => nav.navigate({ name: 'day', day })} />
            {metric.key === 'performance' ? (
              <Text style={styles.chartHint}>Dim bars are low-confidence nights; tap any bar to review the day.</Text>
            ) : null}
          </>
        ) : (
          <Empty text="No data for this metric in the selected range yet." />
        )}
      </Card>

      {view.quality.total > 0 ? (
        <>
          <SectionLabel>Capture quality</SectionLabel>
          <Card>
            <View style={styles.qualityGrid}>
              <QualityStat label="High" value={view.quality.high} color={colors.recoveryGreen} />
              <QualityStat label="Medium" value={view.quality.medium} color={colors.recoveryYellow} />
              <QualityStat label="Low" value={view.quality.low} color={colors.recoveryRed} />
              <QualityStat label="Coverage" value={view.quality.avgCoverage != null ? `${view.quality.avgCoverage}%` : '-'} color={colors.sleepTeal} />
            </View>
            <Text style={styles.qualityNote}>
              Low-confidence nights can make sleep, recovery and readiness trends look worse or better than reality. Tap a bar to review that day.
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
  chartHint: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: fonts.text },
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
