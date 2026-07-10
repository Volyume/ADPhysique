import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, NavRow, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import type { Nav, Route } from '../ui/navigation';
import { buildWeeklyPlan, WeeklyIntensity, WeeklyMetric, WeeklyRecommendation } from '../metrics/weeklyPlan';

export function WeeklyPlanScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const [intensity, setIntensity] = useState<WeeklyIntensity | null>(null);

  useEffect(() => {
    void appStore.weeklyIntensity().then(setIntensity);
  }, [cardio.length, today?.day]);

  const plan = useMemo(
    () => buildWeeklyPlan({ today, recentDays, cardio, intensity }),
    [today, recentDays, cardio, intensity],
  );
  const dateRange = formatDateRange(plan.weekStartMs, plan.weekEndMs);

  return (
    <Screen title="Weekly Plan" onBack={nav.back} tint={colors.greenVibrant}>
      <Card>
        <View style={styles.planHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>CURRENT WEEK</Text>
            <Text style={styles.range}>{dateRange}</Text>
            <Text style={styles.subtitle}>A personal pace built from your local 30-day history.</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeMain}>{plan.daysElapsed}/7</Text>
            <Text style={styles.weekBadgeLabel}>days</Text>
          </View>
        </View>
      </Card>

      <SectionLabel right={<Text style={styles.sectionMeta}>MON-SUN</Text>}>Week at a glance</SectionLabel>
      <Card style={styles.weekCard}>
        <View style={styles.dayRow}>
          {plan.days.map((day) => (
            <View key={day.key} style={styles.dayCell}>
              <Text style={[styles.dayLabel, day.isToday && styles.todayText]}>{day.label}</Text>
              <View style={[styles.dayNumber, day.isToday && styles.todayNumber]}>
                <Text style={[styles.dayNumberText, day.isToday && styles.todayText]}>{day.dayNumber}</Text>
              </View>
              <View style={styles.coverageTrack}>
                <View style={[styles.coverageFill, { height: `${Math.max(10, day.coverage * 100)}%`, backgroundColor: coverageColor(day.coverage) }]} />
              </View>
              <Text style={styles.coverageLabel}>{day.coverage === 1 ? 'ready' : day.coverage > 0 ? 'partial' : 'open'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.greenVibrant }]} />
          <Text style={styles.legendText}>coverage across sleep, steps and activities</Text>
        </View>
      </Card>

      <SectionLabel>Goals</SectionLabel>
      <Card style={styles.goalsCard}>
        {plan.metrics.map((metric, index) => (
          <GoalRow key={metric.key} metric={metric} last={index === plan.metrics.length - 1} />
        ))}
      </Card>

      <SectionLabel>Next best moves</SectionLabel>
      <Card style={styles.movesCard}>
        {plan.recommendations.map((recommendation, index) => (
          <RecommendationRow
            key={`${recommendation.key}-${index}`}
            recommendation={recommendation}
            last={index === plan.recommendations.length - 1}
            onPress={() => nav.navigate(recommendationRoute(recommendation))}
          />
        ))}
      </Card>

      {plan.calibration ? (
        <Card style={styles.calibrationCard}>
          <View style={styles.calibrationHead}>
            <View style={styles.calibrationDot} />
            <Text style={styles.calibrationTitle}>Plan is calibrating</Text>
          </View>
          <Text style={styles.calibrationBody}>{plan.calibration}</Text>
          <Text style={styles.calibrationMeta}>No cloud data or fixed athlete template is used.</Text>
        </Card>
      ) : (
      <Text style={styles.sourceNote}>Baseline: {plan.baselineDays} local days. Zone minutes use the store's HR-derived 7-day total.</Text>
      )}
    </Screen>
  );
}

function GoalRow({ metric, last }: { metric: WeeklyMetric; last: boolean }) {
  const current = displayCurrent(metric);
  const goal = metric.goal != null ? displayGoal(metric) : '-';
  return (
    <View style={[styles.goalRow, last && styles.lastRow]}>
      <View style={styles.goalTop}>
        <Text style={styles.goalTitle}>{metric.title}</Text>
        <Text style={[styles.goalStatus, { color: statusColor(metric.status) }]}>{metric.statusText}</Text>
      </View>
      <View style={styles.goalValues}>
        <Stat label="This week" value={current} color={metric.color} />
        <Stat label="Goal" value={goal} />
        <Text style={styles.goalDetail}>{metric.detail}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(metric.current != null ? 2 : 0, metric.progress * 100)}%`, backgroundColor: metric.status === 'calibrating' ? colors.textTertiary : metric.color }]} />
      </View>
    </View>
  );
}

function RecommendationRow({ recommendation, last, onPress }: { recommendation: WeeklyRecommendation; last: boolean; onPress: () => void }) {
  return (
    <View style={[styles.recommendation, last && styles.lastRow]}>
      <NavRow label={recommendation.title} icon={recommendation.icon} iconColor={colors.greenVibrant} value={recommendation.action} onPress={onPress} />
      <Text style={styles.recommendationBody}>{recommendation.body}</Text>
    </View>
  );
}

function displayCurrent(metric: WeeklyMetric): string {
  if (metric.current == null) return '-';
  if (metric.key === 'sleep') return formatMinutes(metric.current);
  if (metric.key === 'consistency') return `${Math.round(metric.current)}%`;
  if (metric.key === 'steps') return Math.round(metric.current).toLocaleString();
  if (metric.key === 'zones') return `${Math.round(metric.current)}`;
  return `${Math.round(metric.current)}`;
}

function displayGoal(metric: WeeklyMetric): string {
  if (metric.goal == null) return 'calibrating';
  if (metric.key === 'sleep') return formatMinutes(metric.goal);
  if (metric.key === 'steps') return Math.round(metric.goal).toLocaleString();
  if (metric.key === 'consistency') return `${Math.round(metric.goal)}%`;
  return `${Math.round(metric.goal)}`;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDateRange(startMs: number, endMs: number): string {
  const end = new Date(endMs - 1);
  const start = new Date(startMs);
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function coverageColor(coverage: number): string {
  if (coverage >= 1) return colors.greenVibrant;
  if (coverage > 0) return colors.recoveryYellow;
  return colors.surface;
}

function statusColor(status: WeeklyMetric['status']): string {
  if (status === 'on-track') return colors.recoveryGreen;
  if (status === 'building') return colors.recoveryYellow;
  return colors.textSecondary;
}

function recommendationRoute(recommendation: WeeklyRecommendation): Route {
  if (recommendation.key === 'steps') return { name: 'metric', key: 'steps' };
  if (recommendation.key === 'zones' || recommendation.key === 'activities') return { name: 'startMenu' };
  return { name: 'sleepCoach' };
}

const styles = StyleSheet.create({
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { color: colors.greenVibrant, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 0 },
  range: { color: colors.text, fontSize: 20, fontFamily: fonts.textBold, marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 6, maxWidth: 245 },
  weekBadge: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: colors.greenVibrant, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  weekBadgeMain: { color: colors.greenVibrant, fontSize: 18, fontFamily: fonts.bold },
  weekBadgeLabel: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.textSemibold, marginTop: 1 },
  sectionMeta: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.textBold, letterSpacing: 0 },
  weekCard: { paddingVertical: 14 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', flex: 1 },
  dayLabel: { color: colors.textSecondary, fontSize: 10, fontFamily: fonts.textBold, textTransform: 'uppercase' },
  todayText: { color: colors.greenVibrant },
  dayNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  todayNumber: { backgroundColor: colors.greenVibrant },
  dayNumberText: { color: colors.text, fontSize: 13, fontFamily: fonts.textBold },
  coverageTrack: { width: 6, height: 40, borderRadius: 3, backgroundColor: colors.surface, justifyContent: 'flex-end', overflow: 'hidden', marginTop: 8 },
  coverageFill: { width: '100%', borderRadius: 3 },
  coverageLabel: { color: colors.textTertiary, fontSize: 9, marginTop: 5, fontFamily: fonts.text },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendText: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.text },
  goalsCard: { paddingVertical: 4 },
  goalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  goalStatus: { fontSize: 11, fontFamily: fonts.textBold },
  goalValues: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  goalDetail: { color: colors.textTertiary, fontSize: 10, flex: 2, textAlign: 'right', marginBottom: 3 },
  progressTrack: { height: 5, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  movesCard: { paddingVertical: 2 },
  recommendation: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  recommendationBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginLeft: 32, marginBottom: 10, marginRight: 8 },
  calibrationCard: { borderColor: colors.inputBorder },
  calibrationHead: { flexDirection: 'row', alignItems: 'center' },
  calibrationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.recoveryYellow, marginRight: 8 },
  calibrationTitle: { color: colors.recoveryYellow, fontSize: 13, fontFamily: fonts.textBold },
  calibrationBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 8 },
  calibrationMeta: { color: colors.textTertiary, fontSize: 10, lineHeight: 15, marginTop: 8 },
  sourceNote: { color: colors.textTertiary, fontSize: 10, lineHeight: 15, marginTop: 18, textAlign: 'center' },
});
