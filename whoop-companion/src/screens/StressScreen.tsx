import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, LineChart, Ring, Screen, SectionLabel } from '../ui/components';
import { colors, fonts, stressColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatClock } from '../util/time';

function stressColor(score: number | null): string {
  if (score == null) return colors.textTertiary;
  if (score >= 2) return stressColors.high;
  if (score >= 1) return stressColors.medium;
  return stressColors.low;
}

function stressLabel(score: number | null): string {
  if (score == null) return 'NO DATA';
  if (score >= 2) return 'HIGH STRESS';
  if (score >= 1) return 'MEDIUM STRESS';
  return 'LOW STRESS';
}

export function StressScreen({ nav }: { nav: Nav }) {
  const liveStress = useStoreSelector(appStore, (s) => s.liveStress);
  const status = useStoreSelector(appStore, (s) => s.status);
  const [series, setSeries] = useState<Array<{ tsMs: number; score: number }>>([]);

  useEffect(() => {
    void appStore.stressSeries().then(setSeries);
  }, []);

  const tint = stressColor(liveStress);

  return (
    <Screen title="Stress Monitor" onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        <Ring
          value={liveStress != null ? liveStress / 3 : 0}
          size={196}
          color={tint}
          centerTop="STRESS"
          centerMain={liveStress != null ? liveStress.toFixed(1) : '--'}
          centerSub={stressLabel(liveStress).toLowerCase()}
        />
        <Text style={styles.scaleNote}>Scale 0–3 · {status === 'connected' ? 'live' : 'not connected'}</Text>
      </View>

      <View style={styles.legend}>
        <Legend color={stressColors.low} label="Low" />
        <Legend color={stressColors.medium} label="Medium" />
        <Legend color={stressColors.high} label="High" />
      </View>

      <SectionLabel>Stress over today</SectionLabel>
      <Card>
        {series.length >= 2 ? (
          <>
            <LineChart values={series.map((s) => s.score)} color={tint} fill height={150} />
            <View style={styles.axis}>
              <Text style={styles.axisLabel}>{formatClock(series[0]!.tsMs)}</Text>
              <Text style={styles.axisLabel}>{formatClock(series[series.length - 1]!.tsMs)}</Text>
            </View>
          </>
        ) : (
          <Empty text="No stress data yet today. Stress is computed from your R-R intervals while the strap is connected." />
        )}
      </Card>

      <SectionLabel>How it works</SectionLabel>
      <Card>
        <Text style={styles.blurb}>
          Your stress score (0–3) is computed continuously from heart rate and heart-rate variability
          using the Baevsky Stress Index — a published measure of autonomic balance. Low HRV with an
          elevated heart rate pushes the score up. Higher values mean more sympathetic (“fight or
          flight”) activation.
        </Text>
      </Card>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  scaleNote: { color: colors.textTertiary, fontSize: 12, marginTop: 10, fontFamily: fonts.text },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.text },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.text },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
});
