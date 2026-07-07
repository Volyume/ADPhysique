import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import type { DailyMetricRow } from '../db/database';
import { Card, Dial, Empty, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts, recoveryColor, sleepStageColors } from '../ui/theme';
import type { Nav } from '../ui/navigation';
import { formatClock, formatDuration } from '../util/time';
import { formatDistance } from '../sensors/location';

export function DayScreen({ nav, day }: { nav: Nav; day: string }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const days = orderedDays(today, recentDays);
  const metric = days.find((d) => d.day === day) ?? null;
  const idx = days.findIndex((d) => d.day === day);
  const previous = idx >= 0 ? days[idx + 1] : null;
  const next = idx > 0 ? days[idx - 1] : null;
  const acts = cardio.filter((c) => dayForTs(c.startTs) === day);
  const sleepPerf = metric?.sleepDetail?.performance ?? (metric?.sleepPerf != null ? Math.round(metric.sleepPerf * 100) : null);
  const sleepStart = metric?.sleepStart ?? null;
  const sleepEnd = metric?.sleepEnd ?? null;
  const totalStageMin = (metric?.deepMin ?? 0) + (metric?.remMin ?? 0) + (metric?.lightMin ?? 0) + (metric?.awakeMin ?? 0);

  return (
    <Screen
      title="Day"
      onBack={nav.canBack ? nav.back : undefined}
      right={
        <View style={styles.arrows}>
          <TouchableOpacity
            onPress={() => previous && nav.navigate({ name: 'day', day: previous.day })}
            disabled={!previous}
            hitSlop={10}
            style={[styles.iconBtn, !previous && styles.disabled]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => next && nav.navigate({ name: 'day', day: next.day })}
            disabled={!next}
            hitSlop={10}
            style={[styles.iconBtn, !next && styles.disabled]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.date}>{formatDayLong(day)}</Text>
      <DayRail days={days} selected={day} onSelect={(selected) => nav.navigate({ name: 'day', day: selected })} />

      {!metric ? (
        <Card>
          <Empty text="No synced metrics for this day yet. Reconnect the strap and auto sync will backfill anything still stored on the band." />
        </Card>
      ) : (
        <>
          <Card style={styles.ringCard}>
            <View style={styles.ringRow}>
              <Dial
                label="Sleep"
                main={sleepPerf != null ? `${sleepPerf}%` : '-'}
                fraction={sleepPerf != null ? sleepPerf / 100 : 0}
                color={colors.sleepTeal}
                size={92}
              />
              <Dial
                label="Recovery"
                main={metric.recovery != null ? `${metric.recovery}%` : '-'}
                fraction={metric.recovery != null ? metric.recovery / 100 : 0}
                color={recoveryColor(metric.recovery)}
                size={92}
              />
              <Dial
                label="Strain"
                main={metric.strain != null ? metric.strain.toFixed(1) : '-'}
                fraction={metric.strain != null ? metric.strain / 21 : 0}
                color={colors.strainBlue}
                size={92}
              />
            </View>
          </Card>

          <SectionLabel>Sleep</SectionLabel>
          <Card>
            {metric.sleepMin != null ? (
              <>
                <View style={styles.sleepHead}>
                  <Text style={styles.big}>{formatDuration(metric.sleepMin)}</Text>
                  <Text style={styles.sub}>
                    {sleepStart && sleepEnd ? `${formatClock(sleepStart)}-${formatClock(sleepEnd)}` : 'sleep window'}
                  </Text>
                </View>
                <StageRow label="Awake" minutes={metric.awakeMin} total={totalStageMin} color={sleepStageColors.awake} />
                <StageRow label="Light" minutes={metric.lightMin} total={totalStageMin} color={sleepStageColors.light} />
                <StageRow label="REM" minutes={metric.remMin} total={totalStageMin} color={sleepStageColors.rem} />
                <StageRow label="Deep" minutes={metric.deepMin} total={totalStageMin} color={sleepStageColors.deep} />
                <Text style={styles.note}>
                  Signal {metric.sleepDetail?.signalMin ?? 0} min / coverage {metric.sleepDetail?.coveragePct ?? 0}%
                </Text>
              </>
            ) : (
              <Empty text="No sleep block for this day yet." />
            )}
          </Card>

          <SectionLabel>Vitals and activity</SectionLabel>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="HRV" value={metric.rmssd != null ? Math.round(metric.rmssd) : '-'} unit={metric.rmssd != null ? 'ms' : undefined} />
            </Card>
            <Card style={styles.half}>
              <Stat label="RHR" value={metric.rhr ?? '-'} unit={metric.rhr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
            </Card>
          </View>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Respiratory" value={metric.resp != null ? Math.round(metric.resp * 10) / 10 : '-'} unit={metric.resp != null ? 'rpm' : undefined} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Steps" value={metric.steps != null ? metric.steps.toLocaleString() : '-'} color={colors.recoveryGreen} />
            </Card>
          </View>
        </>
      )}

      <SectionLabel>Timeline</SectionLabel>
      <Card>
        {metric?.sleepStart && metric.sleepEnd ? (
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Sleep</Text>
              <Text style={styles.rowMeta}>
                {formatClock(metric.sleepStart)}-{formatClock(metric.sleepEnd)}
                {metric.sleepMin != null ? ` / ${formatDuration(metric.sleepMin)}` : ''}
              </Text>
            </View>
          </View>
        ) : null}
        {acts.length === 0 && !metric?.sleepStart ? (
          <Empty text="No sleep or activities recorded for this date." />
        ) : (
          acts.map((c) => (
            <TouchableOpacity key={c.id} style={styles.row} onPress={() => nav.navigate({ name: 'activity', id: c.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.activity}</Text>
                <Text style={styles.rowMeta}>
                  {formatClock(c.startTs)} / {formatDuration(Math.round((c.endTs - c.startTs) / 60000))}
                  {c.distanceM != null ? ` / ${formatDistance(c.distanceM)}` : ''}
                  {c.steps != null ? ` / ${c.steps.toLocaleString()} steps` : ''}
                  {c.strain != null ? ` / strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))
        )}
      </Card>
    </Screen>
  );
}

export function DayRail({
  days,
  selected,
  onSelect,
}: {
  days: DailyMetricRow[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  if (!days.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {days.map((d) => {
        const active = d.day === selected;
        return (
          <TouchableOpacity key={d.day} onPress={() => onSelect(d.day)} style={[styles.dayChip, active && styles.dayChipActive]}>
            <Text style={[styles.dayDow, active && styles.dayTextActive]}>{formatDow(d.day)}</Text>
            <Text style={[styles.dayNum, active && styles.dayTextActive]}>{new Date(`${d.day}T00:00:00`).getDate()}</Text>
            <View style={styles.dayDots}>
              <View style={[styles.dot, { backgroundColor: d.recovery != null ? recoveryColor(d.recovery) : colors.surface }]} />
              <View style={[styles.dot, { backgroundColor: d.sleepMin != null ? colors.sleepTeal : colors.surface }]} />
              <View style={[styles.dot, { backgroundColor: d.strain != null ? colors.strainBlue : colors.surface }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function StageRow({ label, minutes, total, color }: { label: string; minutes: number | null; total: number; color: string }) {
  const pct = total > 0 && minutes != null ? Math.round((minutes / total) * 100) : 0;
  return (
    <View style={styles.stage}>
      <View style={styles.stageHead}>
        <Text style={styles.stageLabel}>{label}</Text>
        <Text style={styles.stageValue}>{minutes != null ? `${formatDuration(minutes)} / ${pct}%` : '-'}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function dayForTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLong(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDow(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

const styles = StyleSheet.create({
  date: { color: colors.textSecondary, fontSize: 14, marginBottom: 10, fontFamily: fonts.text },
  arrows: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
  rail: { gap: 8, paddingRight: 8, paddingBottom: 2 },
  dayChip: {
    width: 58,
    minHeight: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: colors.white, borderColor: colors.white },
  dayDow: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold },
  dayNum: { color: colors.text, fontSize: 20, marginTop: 2, fontFamily: fonts.bold },
  dayTextActive: { color: '#000' },
  dayDots: { flexDirection: 'row', gap: 3, marginTop: 7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  ringCard: { paddingVertical: 18 },
  ringRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sleepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  big: { color: colors.text, fontSize: 30, fontFamily: fonts.black },
  sub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text },
  note: { color: colors.textTertiary, fontSize: 12, marginTop: 12, fontFamily: fonts.text },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  half: { flex: 1, marginTop: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  rowMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  stage: { marginTop: 10 },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stageLabel: { color: colors.text, fontSize: 13, fontFamily: fonts.textSemibold },
  stageValue: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
});
