import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import type { DailyMetricRow } from '../db/database';
import { Card, Screen, SectionLabel, Stat } from '../ui/components';
import type { Nav } from '../ui/navigation';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { clampPct } from '../util/number';
import { formatDuration } from '../util/time';

export function HistoryScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const days = useMemo(() => orderedDays(today, recentDays), [today, recentDays]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const active = days.find((day) => day.day === selectedDay) ?? days[0] ?? null;
  const activeIndex = active ? days.findIndex((day) => day.day === active.day) : -1;
  const previous = activeIndex >= 0 ? days[activeIndex + 1] : undefined;
  const next = activeIndex > 0 ? days[activeIndex - 1] : undefined;

  const moveTo = (day: DailyMetricRow | undefined) => {
    if (day) setSelectedDay(day.day);
  };

  return (
    <Screen title="History" onBack={nav.canBack ? nav.back : undefined} tint={colors.strainBlue}>
      <View style={styles.dateNavigator}>
        <TouchableOpacity
          accessibilityLabel="Previous day"
          accessibilityHint="Show the previous retained day"
          disabled={!previous}
          onPress={() => moveTo(previous)}
          style={[styles.dateButton, !previous && styles.disabled]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.dateButtonLabel}>Previous</Text>
        </TouchableOpacity>
        <View style={styles.dateContext}>
          {active ? (
            <>
              <Text style={styles.month}>{monthYear(active.day)}</Text>
              <Text style={styles.date}>{dayLabel(active.day)}</Text>
            </>
          ) : (
            <Text style={styles.date}>No days recorded</Text>
          )}
        </View>
        <TouchableOpacity
          accessibilityLabel="Next day"
          accessibilityHint="Show the next retained day"
          disabled={!next}
          onPress={() => moveTo(next)}
          style={[styles.dateButton, styles.nextButton, !next && styles.disabled]}
        >
          <Text style={styles.dateButtonLabel}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {active ? (
        <Card onPress={() => nav.navigate({ name: 'day', day: active.day })} style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow}>{isToday(active.day, today) ? 'Today' : 'Selected day'}</Text>
              <Text style={styles.summaryTitle}>{dayLabel(active.day)}</Text>
            </View>
            <View style={styles.detailsLink}>
              <Text style={styles.detailsLabel}>Details</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <Stat
              label="Sleep"
              value={active.sleepMin != null ? formatDuration(active.sleepMin) : '-'}
              color={colors.sleepTeal}
            />
            <Stat
              label="Recovery"
              value={active.recovery != null ? `${active.recovery}%` : '-'}
              color={recoveryColor(active.recovery)}
            />
            <Stat
              label="Strain"
              value={active.strain != null ? active.strain.toFixed(1) : '-'}
              color={colors.strainBlue}
            />
            <Stat
              label="Steps"
              value={active.steps != null ? active.steps.toLocaleString() : '-'}
              color={colors.recoveryGreen}
            />
          </View>
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyBody}>Synced days will appear here when they are available.</Text>
        </Card>
      )}

      <SectionLabel right={<Text style={styles.count}>{days.length} days</Text>}>Recent days</SectionLabel>
      {days.length ? (
        <Card style={styles.daysCard}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={day.day}
              accessibilityRole="button"
              accessibilityLabel={`Open ${dayLabel(day.day)}`}
              onPress={() => nav.navigate({ name: 'day', day: day.day })}
              style={[styles.dayRow, index === days.length - 1 && styles.lastDayRow]}
            >
              <View style={styles.dayDate}>
                <Text style={styles.dayWeekday}>{isToday(day.day, today) ? 'Today' : weekday(day.day)}</Text>
                <Text style={styles.dayMonth}>{monthDay(day.day)}</Text>
              </View>
              <View style={styles.dayMetrics}>
                <Metric label="Sleep" value={sleepSummary(day)} />
                <Metric label="Recovery" value={day.recovery != null ? `${day.recovery}%` : '-'} color={recoveryColor(day.recovery)} />
                <Metric label="Strain" value={day.strain != null ? day.strain.toFixed(1) : '-'} color={colors.strainBlue} />
                <Metric label="Steps" value={day.steps != null ? day.steps.toLocaleString() : '-'} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: value === '-' ? colors.textTertiary : color ?? colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function orderedDays(today: DailyMetricRow | null, recentDays: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const day of recentDays) byDay.set(day.day, day);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function localDate(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

function monthYear(day: string): string {
  return localDate(day).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function dayLabel(day: string): string {
  return localDate(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function weekday(day: string): string {
  return localDate(day).toLocaleDateString(undefined, { weekday: 'short' });
}

function monthDay(day: string): string {
  return localDate(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function isToday(day: string, today: DailyMetricRow | null): boolean {
  return today?.day === day;
}

function sleepSummary(day: DailyMetricRow): string {
  if (day.sleepMin != null) return formatDuration(day.sleepMin);
  if (day.sleepPerf != null) return `${clampPct(Math.round(day.sleepPerf * 100))}%`;
  return '-';
}

const styles = StyleSheet.create({
  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  dateButton: { flexDirection: 'row', alignItems: 'center', minWidth: 82, paddingVertical: 8, gap: 2 },
  nextButton: { justifyContent: 'flex-end' },
  dateButtonLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textSemibold },
  dateContext: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  month: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textSemibold },
  date: { color: colors.text, fontSize: 14, marginTop: 2, textAlign: 'center', fontFamily: fonts.textBold },
  disabled: { opacity: 0.28 },
  summaryCard: { paddingVertical: 18 },
  summaryHead: { flexDirection: 'row', alignItems: 'center' },
  summaryCopy: { flex: 1 },
  summaryEyebrow: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.textBold },
  summaryTitle: { color: colors.text, fontSize: 16, marginTop: 3, fontFamily: fonts.textBold },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailsLabel: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.textSemibold },
  summaryGrid: { flexDirection: 'row', marginTop: 20, gap: 10 },
  emptyCard: { paddingVertical: 18 },
  emptyTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  emptyBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4, fontFamily: fonts.text },
  count: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.text },
  daysCard: { paddingVertical: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastDayRow: { borderBottomWidth: 0 },
  dayDate: { width: 78 },
  dayWeekday: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  dayMonth: { color: colors.textSecondary, fontSize: 12, marginTop: 3, fontFamily: fonts.text },
  dayMetrics: { flex: 1, flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 13, fontFamily: fonts.textBold },
  metricLabel: { color: colors.textTertiary, fontSize: 10, marginTop: 3, fontFamily: fonts.text },
});
