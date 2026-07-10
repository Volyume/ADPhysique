import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, LineChart, NavRow, Ring, Screen, SectionLabel, Stat } from '../ui/components';
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
  const storedStress = useStoreSelector(appStore, (s) => s.storedStress);
  const status = useStoreSelector(appStore, (s) => s.status);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const [series, setSeries] = useState<Array<{ tsMs: number; score: number }>>([]);

  useEffect(() => {
    void appStore.stressSeries().then(setSeries);
  }, [lastSyncTs]);

  const stressValue = liveStress ?? storedStress;
  const tint = stressColor(stressValue);
  const insight = stressInsight({ stressValue, live: liveStress != null, status, points: series.length });

  return (
    <Screen title="Stress Monitor" onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        <Ring
          value={stressValue != null ? stressValue / 3 : 0}
          size={196}
          color={tint}
          centerTop="STRESS"
          centerMain={stressValue != null ? stressValue.toFixed(1) : '--'}
          centerSub={stressLabel(stressValue).toLowerCase()}
        />
        <Text style={styles.scaleNote}>Scale 0-3 · {liveStress != null ? 'live' : storedStress != null ? 'latest synced' : status === 'connected' ? 'waiting for R-R' : 'needs synced R-R'}</Text>
      </View>

      <View style={styles.legend}>
        <Legend color={stressColors.low} label="Low" />
        <Legend color={stressColors.medium} label="Medium" />
        <Legend color={stressColors.high} label="High" />
      </View>

      <SectionLabel>Current state</SectionLabel>
      <Card>
        <View style={styles.insightHead}>
          <View style={[styles.insightBadge, { backgroundColor: insight.color }]}>
            <Text style={styles.insightBadgeText}>{insight.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightBody}>{insight.body}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <Stat label="Source" value={insight.source} color={insight.color} />
          <Stat label="Windows" value={series.length} />
          <Stat label="Score" value={stressValue != null ? stressValue.toFixed(1) : '-'} color={tint} />
        </View>
        <NavRow
          label={insight.actionLabel}
          icon={insight.icon}
          iconColor={insight.color}
          value={insight.actionValue}
          onPress={() => nav.navigate(insight.route)}
          last
        />
      </Card>

      <SectionLabel>Stress over today</SectionLabel>
      <Card>
        {series.length >= 2 ? (
          <>
            <LineChart values={series.map((s) => s.score)} color={tint} fill height={150} />
            <View style={styles.axis}>
              <Text style={styles.axisLabel}>{formatClock(series[0]!.tsMs)}</Text>
              <Text style={styles.axisLabel}>{formatClock(series[series.length - 1]!.tsMs)}</Text>
            </View>
            <Text style={styles.coverage}>
              {series.length} five-minute window{series.length === 1 ? '' : 's'} had enough R-R to score
              today. Gaps are where the strap wasn’t sending enough beat-to-beat data — so this curve is
              patchy, not a continuous reading like WHOOP’s.
            </Text>
          </>
        ) : (
          <Empty text="Not enough R-R captured to chart stress yet. Each point needs ~20 clean beat-to-beat intervals in a 5-minute window; the strap’s R-R currently arrives in sparse bursts, so this fills in slowly." />
        )}
      </Card>

      <SectionLabel>How it works</SectionLabel>
      <Card>
        <Text style={styles.blurb}>
          Your stress score (0–3) is computed from heart rate and heart-rate variability using the
          Baevsky Stress Index — a published measure of autonomic balance. Low HRV with an elevated
          heart rate pushes the score up. It needs clean, continuous R-R to be a smooth curve; ours
          depends on how steadily the strap streams R-R, which is currently intermittent — so expect
          gaps until the R-R feed is improved.
        </Text>
      </Card>
    </Screen>
  );
}

function stressInsight(input: {
  stressValue: number | null;
  live: boolean;
  status: string;
  points: number;
}): {
  badge: string;
  title: string;
  body: string;
  source: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  const source = input.live ? 'live' : input.stressValue != null ? 'synced' : input.status === 'connected' ? 'waiting' : 'offline';
  if (input.stressValue == null) {
    return {
      badge: 'DATA',
      title: input.status === 'connected' ? 'Waiting for clean R-R' : 'Stress needs synced R-R',
      body: input.status === 'connected'
        ? 'Keep the strap connected; stress appears when enough beat-to-beat intervals arrive in a clean window.'
        : 'Reconnect the strap and let history sync before using the stress monitor.',
      source,
      actionLabel: 'Open device sync',
      actionValue: input.status === 'connected' ? 'waiting' : 'connect',
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }

  if (input.stressValue >= 2) {
    return {
      badge: 'HIGH',
      title: 'Stress is elevated',
      body: 'Treat this as a signal to downshift: breathe, hydrate, avoid stacking hard training on top of high autonomic load.',
      source,
      actionLabel: 'Open recovery',
      actionValue: 'protect',
      icon: 'pulse',
      color: stressColors.high,
      route: { name: 'recovery' },
    };
  }

  if (input.stressValue >= 1) {
    return {
      badge: 'MED',
      title: 'Stress is moderate',
      body: 'Your autonomic load is not calm, but it is not a hard stop. Keep workouts controlled unless readiness is strong.',
      source,
      actionLabel: 'Open readiness',
      actionValue: 'check',
      icon: 'speedometer',
      color: stressColors.medium,
      route: { name: 'readiness' },
    };
  }

  return {
    badge: 'LOW',
    title: 'Stress is low',
    body: input.points >= 2
      ? 'Current stress is calm and today has enough scored windows to show a useful curve.'
      : 'Current stress is calm; more R-R windows will make the day curve more useful.',
    source,
    actionLabel: 'View trends',
    actionValue: 'context',
    icon: 'trending-up',
    color: stressColors.low,
    route: { name: 'trends' },
  };
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
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  insightBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  insightBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  insightTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  insightBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.text },
  coverage: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
});
