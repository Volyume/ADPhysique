import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, NavRow, Ring, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { DailyMetricRow } from '../db/database';
import { stdev } from '../metrics/ema';

const TIER_COLOR: Record<string, string> = {
  Exceptional: '#00f19f',
  Strong: '#43cb00',
  Solid: '#9bd64a',
  Adequate: '#ffde00',
  Limited: '#ff6422',
};

export function ResilienceScreen({ nav }: { nav: Nav }) {
  const res = useStoreSelector(appStore, (s) => s.resilience);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  useEffect(() => {
    void appStore.loadHistory(14).then(setHistory);
  }, [lastSyncTs]);

  const tint = res ? TIER_COLOR[res.tier] ?? colors.recoveryGreen : colors.textTertiary;
  const bars = history.map((d) => ({
    label: d.day.slice(8),
    value: d.recovery,
    display: d.recovery != null ? `${d.recovery}` : '',
    color: recoveryColor(d.recovery),
  }));
  const summary = resilienceSummary(history);

  return (
    <Screen title="Resilience" onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        <Ring
          value={res ? res.score / 100 : 0}
          size={196}
          color={tint}
          centerTop="RESILIENCE"
          centerMain={res ? res.tier : '—'}
          centerSub={res ? `${res.days}-day trend` : 'needs ~1 week'}
        />
      </View>

      <SectionLabel>Recovery over the last 14 days</SectionLabel>
      <Card>
        {bars.some((b) => b.value != null) ? (
          <>
            <WeeklyBars data={bars} height={160} />
            {summary ? (
              <View style={styles.stats}>
                <Stat label="Average" value={`${summary.avg}%`} color={recoveryColor(summary.avg)} />
                <Stat label="Stability" value={summary.stabilityLabel} color={summary.stabilityColor} />
                <Stat label="Trend" value={summary.trendLabel} color={summary.trendColor} />
              </View>
            ) : null}
          </>
        ) : (
          <Empty text="Wear the strap overnight for a week or two to build your resilience trend." />
        )}
      </Card>

      {summary ? (
        <>
          <SectionLabel>Resilience focus</SectionLabel>
          <Card>
            <View style={styles.focusHead}>
              <View style={[styles.focusBadge, { backgroundColor: summary.focusColor }]}>
                <Text style={styles.focusBadgeText}>{summary.focusBadge}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusTitle}>{summary.focusTitle}</Text>
                <Text style={styles.focusBody}>{summary.focusBody}</Text>
              </View>
            </View>
            <NavRow
              label={summary.actionLabel}
              icon={summary.actionIcon}
              iconColor={summary.focusColor}
              value={summary.actionValue}
              onPress={() => nav.navigate(summary.route)}
              last
            />
          </Card>
        </>
      ) : null}

      <SectionLabel>About resilience</SectionLabel>
      <Card>
        <Text style={styles.blurb}>
          Resilience reflects how well your body is holding up over weeks, not just today. It blends
          your 14-day recovery trend with its night-to-night stability: consistently high recovery
          builds resilience; an erratic or declining trend lowers it.
        </Text>
        <View style={styles.tiers}>
          {(['Limited', 'Adequate', 'Solid', 'Strong', 'Exceptional'] as const).map((t) => (
            <View key={t} style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: TIER_COLOR[t] }]} />
              <Text style={[styles.tierLabel, res?.tier === t && styles.tierActive]}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          This version uses the strongest reliable local signal: nightly recovery level and
          stability. Daytime stress recovery can be added once continuous motion-gated stress history
          is trustworthy.
        </Text>
      </Card>
    </Screen>
  );
}

function resilienceSummary(history: DailyMetricRow[]) {
  const vals = history.map((d) => d.recovery).filter((v): v is number => v != null);
  if (vals.length < 3) return null;

  const avg = Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  const sd = stdev(vals);
  const midpoint = Math.max(1, Math.floor(vals.length / 2));
  const first = vals.slice(0, midpoint);
  const second = vals.slice(midpoint);
  const firstAvg = first.reduce((sum, v) => sum + v, 0) / first.length;
  const secondAvg = second.length ? second.reduce((sum, v) => sum + v, 0) / second.length : firstAvg;
  const delta = Math.round(secondAvg - firstAvg);

  const stabilityLabel = sd <= 8 ? 'steady' : sd <= 15 ? 'variable' : 'erratic';
  const stabilityColor = sd <= 8 ? colors.recoveryGreen : sd <= 15 ? colors.recoveryYellow : colors.recoveryRed;
  const trendLabel = delta >= 5 ? 'rising' : delta <= -5 ? 'falling' : 'flat';
  const trendColor = delta >= 5 ? colors.recoveryGreen : delta <= -5 ? colors.recoveryRed : colors.sleepTeal;

  if (avg < 42 || delta <= -8) {
    return {
      avg,
      stabilityLabel,
      stabilityColor,
      trendLabel,
      trendColor,
      focusBadge: 'REST',
      focusColor: colors.recoveryRed,
      focusTitle: 'Rebuild the baseline',
      focusBody: 'Your recent recovery is low or sliding. Protect sleep timing and keep training easy until the trend turns.',
      actionLabel: 'Plan tonight',
      actionValue: 'Sleep coach',
      actionIcon: 'moon',
      route: { name: 'sleepCoach' } as const,
    };
  }

  if (sd > 15) {
    return {
      avg,
      stabilityLabel,
      stabilityColor,
      trendLabel,
      trendColor,
      focusBadge: 'CALM',
      focusColor: colors.recoveryYellow,
      focusTitle: 'Reduce volatility',
      focusBody: 'Your good days are being pulled down by sharp swings. Look for repeatable wake time, alcohol, late meals, and heavy sessions.',
      actionLabel: 'Review the pattern',
      actionValue: 'Trends',
      actionIcon: 'trending-up',
      route: { name: 'sleepTrends' } as const,
    };
  }

  if (avg >= 68 && sd <= 10) {
    return {
      avg,
      stabilityLabel,
      stabilityColor,
      trendLabel,
      trendColor,
      focusBadge: 'HOLD',
      focusColor: colors.recoveryGreen,
      focusTitle: 'Hold the routine',
      focusBody: 'Recovery is both strong and steady. This is the window for productive training without changing too many variables.',
      actionLabel: 'Set training load',
      actionValue: 'Training',
      actionIcon: 'activity',
      route: { name: 'training' } as const,
    };
  }

  return {
    avg,
    stabilityLabel,
    stabilityColor,
    trendLabel,
    trendColor,
    focusBadge: 'BUILD',
    focusColor: colors.sleepTeal,
    focusTitle: 'Build consistency',
    focusBody: 'The baseline is usable, but there is room to make it steadier. Keep the next few nights boring and repeatable.',
    actionLabel: 'Tune sleep need',
    actionValue: 'Sleep coach',
    actionIcon: 'moon',
    route: { name: 'sleepCoach' } as const,
  };
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  focusBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  focusBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  focusTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  focusBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  tiers: { marginTop: 14 },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  tierLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  tierActive: { color: colors.text, fontFamily: fonts.textBold },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14, fontFamily: fonts.text },
});
