import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { DailyMetricRow } from '../db/database';
import { Card, Empty, Screen, SectionLabel, WeeklyBars } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav, MetricKey } from '../ui/navigation';

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

const SERIESES: Series[] = [
  { key: 'recovery', title: 'RECOVERY', unit: '%', pick: (d) => d.recovery, color: (v) => recoveryColor(v) },
  { key: 'strain', title: 'DAY STRAIN', unit: '', pick: (d) => d.strain, color: () => colors.strainBlue, decimals: 1 },
  {
    key: 'sleep_performance',
    title: 'SLEEP PERFORMANCE',
    unit: '%',
    pick: (d) => (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null),
    color: () => colors.sleepTeal,
  },
  { key: 'hrv', title: 'HRV', unit: 'ms', pick: (d) => d.rmssd, color: () => colors.recoveryGreen },
  { key: 'rhr', title: 'RESTING HEART RATE', unit: 'bpm', pick: (d) => d.rhr, color: () => colors.recoveryRed },
  { key: 'steps', title: 'STEPS', unit: '', pick: (d) => d.steps, color: () => colors.recoveryGreen },
];

export function TrendsScreen({ nav }: { nav: Nav }) {
  const [range, setRange] = useState<RangeKey>('M');
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;
  useEffect(() => {
    void appStore.loadHistory(days).then(setHistory);
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

      {history.length === 0 ? (
        <Card>
          <Empty text="No data to display for the selected range. Wear the strap to build your trends." />
        </Card>
      ) : (
        SERIESES.map((s) => {
          const vals = history.map(s.pick).filter((v): v is number => v != null);
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          // Down-sample to ~14 bars for readability.
          const step = Math.max(1, Math.ceil(history.length / 14));
          const bars = history
            .filter((_, i) => i % step === 0)
            .map((d) => ({
              label: d.day.slice(5).replace('-', '/'),
              value: s.pick(d),
              display: s.pick(d) != null ? `${s.pick(d)}` : '',
              color: s.color(s.pick(d)),
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
      <Card>
        <Text style={styles.paTitle}>Weekly Performance Assessment</Text>
        <Text style={styles.paSub}>
          A weekly summary of your recovery, strain and sleep. Builds automatically as your history
          grows (WHOOP delivers this every Monday).
        </Text>
      </Card>
      <Card>
        <Text style={styles.paTitle}>Monthly Performance Assessment</Text>
        <Text style={styles.paSub}>
          Monthly patterns across recovery, strain and sleep, correlated with your journal behaviours.
        </Text>
      </Card>
    </Screen>
  );
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
});
