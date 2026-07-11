import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import type { CardioRow, DailyMetricRow } from '../db/database';
import { Card, Dial, Empty, Screen, SectionLabel, SleepConfidenceStatus, Stat } from '../ui/components';
import { colors, fonts, recoveryColor, sleepStageColors } from '../ui/theme';
import type { Nav } from '../ui/navigation';
import { formatClock, formatDuration } from '../util/time';
import { clampPct } from '../util/number';
import { activitySummary } from '../ui/activityFormat';
import { sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

export function DayScreen({ nav, day }: { nav: Nav; day: string }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const [loadedMetric, setLoadedMetric] = useState<{ day: string; row: DailyMetricRow | null } | null>(null);
  const [loadedActivities, setLoadedActivities] = useState<{ day: string; rows: CardioRow[] } | null>(null);
  const olderRow = loadedMetric?.day === day ? loadedMetric.row : null;
  const days = orderedDays(today, olderRow ? [olderRow, ...recentDays] : recentDays);
  const railDays = calendarRailDays(days, day);
  const metric = days.find((d) => d.day === day) ?? null;
  const previousDay = offsetDayKey(day, -1);
  const nextDay = day < localDayKey(Date.now()) ? offsetDayKey(day, 1) : null;
  const acts = loadedActivities?.day === day
    ? loadedActivities.rows
    : cardio.filter((c) => dayForTs(c.startTs) === day);
  const sleepPerf = metric?.sleepDetail?.performance != null
    ? clampPct(metric.sleepDetail.performance)
    : metric?.sleepPerf != null
      ? clampPct(Math.round(metric.sleepPerf * 100))
      : null;
  const sleepTier = sleepTrustTier(metric?.sleepDetail);
  const sleepNeedsReview = sleepTier === 'low';
  const sleepStart = metric?.sleepStart ?? null;
  const sleepEnd = metric?.sleepEnd ?? null;
  const loggedTimingOnly = metric?.sleepDetail?.source === 'manual_duration' && sleepStart != null && sleepEnd != null;
  const totalStageMin = (metric?.deepMin ?? 0) + (metric?.remMin ?? 0) + (metric?.lightMin ?? 0) + (metric?.awakeMin ?? 0);
  const sleepReview = metric ? daySleepReview(metric) : null;
  const vitalsReview = metric ? dayVitalsReview(metric) : null;

  useEffect(() => {
    let active = true;
    void Promise.all([appStore.loadDay(day), appStore.loadActivitiesForDay(day)]).then(([row, activities]) => {
      if (!active) return;
      setLoadedMetric({ day, row });
      setLoadedActivities({ day, rows: activities });
    });
    return () => {
      active = false;
    };
  }, [day, lastSyncTs]);

  return (
    <Screen
      title="Day"
      onBack={nav.canBack ? nav.back : undefined}
      right={
        <View style={styles.arrows}>
          <TouchableOpacity
            onPress={() => nav.replace({ name: 'day', day: previousDay })}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => nextDay && nav.replace({ name: 'day', day: nextDay })}
            disabled={!nextDay}
            hitSlop={10}
            style={[styles.iconBtn, !nextDay && styles.disabled]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.date}>{formatDayLong(day)}</Text>
      <DayRail days={railDays} selected={day} onSelect={(selected) => nav.replace({ name: 'day', day: selected })} />

      {!metric ? (
        <Card>
          <Empty text="No metrics are available for this day yet. Reconnect the strap to retrieve any history still stored on the band." />
        </Card>
      ) : (
        <>
          <Card style={styles.ringCard}>
            <View style={styles.ringRow}>
              <Dial
                label="Sleep"
                main={sleepNeedsReview ? 'Review' : sleepPerf != null ? `${sleepPerf}%` : '-'}
                fraction={sleepNeedsReview ? 0 : sleepPerf != null ? sleepPerf / 100 : 0}
                color={sleepNeedsReview ? colors.recoveryRed : colors.sleepTeal}
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
                <SleepConfidenceStatus
                  confidence={sleepTier === 'none' ? null : sleepTier}
                  reason={dayConfidenceReason(metric)}
                  onDetails={() => nav.navigate({ name: 'editSleep', day })}
                  detailsLabel="Review"
                />
                {sleepReview ? (
                  <View style={[styles.reviewBanner, { borderColor: sleepReview.color, backgroundColor: sleepReview.tint }]}>
                    <View style={[styles.reviewBadge, { backgroundColor: sleepReview.color }]}>
                      <Text style={[styles.reviewBadgeText, { color: sleepReview.textColor }]}>{sleepReview.label}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewTitle}>{sleepReview.title}</Text>
                      <Text style={styles.reviewBody}>{sleepReview.body}</Text>
                    </View>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.adjustRow} onPress={() => nav.navigate({ name: 'editSleep', day })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adjustTitle}>Adjust this sleep</Text>
                    <Text style={styles.adjustMeta}>Re-detect stages, vitals and recovery for {formatDayLong(day)}</Text>
                  </View>
                  <Ionicons name="create" size={18} color={colors.sleepTeal} />
                </TouchableOpacity>
              </>
            ) : loggedTimingOnly ? (
              <>
                <View style={styles.sleepHead}>
                  <Text style={styles.big}>Logged timing</Text>
                  <Text style={styles.sub}>{formatClock(sleepStart)}-{formatClock(sleepEnd)}</Text>
                </View>
                <SleepConfidenceStatus confidence={null} reason="Timing is saved, but there is no overnight record to score yet." />
                <Text style={styles.note}>
                  This window informs sleep timing and schedule suggestions. Pulse needs overnight data before it can assign sleep minutes, stages, vitals, recovery, or debt.
                </Text>
                <TouchableOpacity style={styles.adjustRow} onPress={() => nav.navigate({ name: 'editSleep', day })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adjustTitle}>Adjust logged timing</Text>
                    <Text style={styles.adjustMeta}>Rescan this window when overnight strap history is available</Text>
                  </View>
                  <Ionicons name="create" size={18} color={colors.sleepTeal} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Empty text="No sleep block for this day yet." />
                <TouchableOpacity style={styles.adjustRow} onPress={() => nav.navigate({ name: 'editSleep', day })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adjustTitle}>Log sleep for this day</Text>
                    <Text style={styles.adjustMeta}>Use synced strap data inside your bed and wake window</Text>
                  </View>
                  <Ionicons name="create" size={18} color={colors.sleepTeal} />
                </TouchableOpacity>
              </>
            )}
          </Card>

          <SectionLabel>Vitals and activity</SectionLabel>
          {vitalsReview ? (
            <View style={[styles.vitalsBanner, { borderColor: vitalsReview.color, backgroundColor: vitalsReview.tint }]}>
              <View style={[styles.reviewBadge, { backgroundColor: vitalsReview.color }]}>
                <Text style={[styles.reviewBadgeText, { color: vitalsReview.textColor }]}>{vitalsReview.label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewTitle}>{vitalsReview.title}</Text>
                <Text style={styles.reviewBody}>{vitalsReview.body}</Text>
                <View style={styles.vitalFacts}>
                  {vitalsReview.facts.map((fact) => (
                    <View key={fact} style={styles.vitalFact}>
                      <Text style={styles.vitalFactText}>{fact}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
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
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Blood oxygen" value={metric.spo2 != null ? Math.round(metric.spo2) : '-'} unit={metric.spo2 != null ? '%' : undefined} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Skin temp" value={metric.skinTempC != null ? metric.skinTempC.toFixed(1) : '-'} unit={metric.skinTempC != null ? 'C' : undefined} />
            </Card>
          </View>
        </>
      )}

      <SectionLabel>Timeline</SectionLabel>
      <Card>
        {metric?.sleepStart && metric.sleepEnd ? (
          <TouchableOpacity style={styles.row} onPress={() => nav.navigate({ name: 'editSleep', day })}>
            <View>
              <Text style={styles.rowTitle}>Sleep</Text>
              <Text style={styles.rowMeta}>
                {formatClock(metric.sleepStart)}-{formatClock(metric.sleepEnd)}
                {metric.sleepMin != null ? ` / ${formatDuration(metric.sleepMin)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
        {acts.length === 0 && !metric?.sleepStart ? (
          <Empty text="No sleep or activities recorded for this date." />
        ) : (
          acts.map((c) => (
            <TouchableOpacity key={c.id} style={styles.row} onPress={() => nav.navigate({ name: 'activity', id: c.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.activity}</Text>
                <Text style={styles.rowMeta}>
                  {formatClock(c.startTs)} / {activitySummary(c)}
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
  days: DayRailItem[];
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
              <View style={[styles.dot, { backgroundColor: sleepDotColor(d) }]} />
              <View style={[styles.dot, { backgroundColor: d.strain != null ? colors.strainBlue : colors.surface }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

type DayRailItem = Pick<DailyMetricRow, 'day' | 'recovery' | 'sleepMin' | 'sleepDetail' | 'strain'>;

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

function sleepDotColor(day: DayRailItem): string {
  if (day.sleepMin == null) return colors.surface;
  const tier = sleepTrustTier(day.sleepDetail);
  if (tier === 'low') return colors.recoveryRed;
  if (tier === 'medium') return colors.recoveryYellow;
  return colors.sleepTeal;
}

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function calendarRailDays(metrics: DailyMetricRow[], selected: string, count = 30): DayRailItem[] {
  const byDay = new Map(metrics.map((metric) => [metric.day, metric]));
  const today = localDayKey(Date.now());
  const newest = selected > today ? today : selected < offsetDayKey(today, -(count - 1)) ? selected : today;
  return Array.from({ length: count }, (_, index) => {
    const day = offsetDayKey(newest, -index);
    return byDay.get(day) ?? { day, recovery: null, sleepMin: null, sleepDetail: null, strain: null };
  });
}

function localDayKey(ts: number): string {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetDayKey(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDayKey(date.getTime());
}

function dayForTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayConfidenceReason(metric: DailyMetricRow): string {
  const detail = metric.sleepDetail;
  if (!detail) return 'Waiting for a complete overnight record.';
  if (sleepStateWakeConflict(detail)) return 'The sleep window may include awake time.';
  if (sleepNeedsMoreSync(detail)) return 'Overnight capture is incomplete; decoded coverage is insufficient.';
  if (sleepTrustTier(detail) === 'medium') return 'Usable, but more overnight detail may refine it.';
  return 'The overnight record is strong enough to use.';
}

function daySleepReview(metric: DailyMetricRow): {
  label: string;
  title: string;
  body: string;
  color: string;
  tint: string;
  textColor: string;
} | null {
  if (metric.sleepMin == null) return null;

  const detail = metric.sleepDetail;
  if (!detail) {
    return {
      label: 'CHECK',
      title: 'Sleep needs review',
      body: 'The app has a sleep duration but no capture detail, so stages and recovery inputs should be treated as incomplete.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  const inBed = detail.inBedMin ?? metric.sleepMin;
  const efficiency = detail.efficiency ?? (inBed > 0 ? Math.round((metric.sleepMin / inBed) * 100) : null);
  const rawHoursVsNeeded = detail.needMin && metric.sleepMin != null
    ? Math.round((metric.sleepMin / Math.max(1, detail.needMin)) * 100)
    : detail.hoursVsNeeded ?? 0;
  const hasCoreVitals = metric.rmssd != null && metric.rhr != null && metric.resp != null;
  const trustTier = sleepTrustTier(detail);

  if (sleepStateWakeConflict(detail)) {
    return {
      label: 'WAKE',
      title: 'Sleep window conflicts with strap state',
      body: `Decoded strap-state evidence is mostly wake (${sleepStateWakeDisplay(detail)}). Review the window before trusting sleep, recovery or readiness for this day.`,
      color: colors.recoveryRed,
      tint: `${colors.recoveryRed}12`,
      textColor: colors.white,
    };
  }

  if (trustTier === 'low' || sleepNeedsMoreSync(detail)) {
    const needsSync = sleepNeedsMoreSync(detail);
    return {
      label: needsSync ? 'DATA' : 'CHECK',
      title: needsSync ? 'Partial overnight capture' : 'Sleep candidate needs corroboration',
      body:
        needsSync
          ? 'Overnight capture is partial. Review the capture before trusting sleep or recovery.'
          : 'The overnight record is present, but sleep-state evidence is weak. Review the window if the timing looks wrong.',
      color: colors.recoveryRed,
      tint: `${colors.recoveryRed}12`,
      textColor: colors.white,
    };
  }

  if (rawHoursVsNeeded > 105) {
    return {
      label: 'NEED',
      title: 'Sleep need looks overfilled',
      body: 'The duration beat the current sleep-need estimate. Check that the window does not include awake time before using the score.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  if ((efficiency ?? 0) >= 94 && inBed >= 600) {
    return {
      label: 'CHECK',
      title: 'Window may be too wide',
      body: `Efficiency is ${efficiency}% across ${formatDuration(inBed)} in bed. If you were awake at either end, trim the window for cleaner stages.`,
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  if (!hasCoreVitals) {
    return {
      label: 'VITAL',
      title: 'Recovery inputs incomplete',
      body: 'Sleep timing is usable, but HRV, resting HR or respiratory rate is missing, so recovery confidence is limited.',
      color: colors.strainBlue,
      tint: `${colors.strainBlue}18`,
      textColor: colors.white,
    };
  }

  if (trustTier === 'medium') {
    return {
      label: 'OK',
      title: 'Usable with caution',
      body: 'The result is useful, but adjust the sleep window if the bedtime or wake time looks wrong.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  return {
    label: 'GOOD',
    title: 'Strong sleep capture',
    body: 'The overnight record and core vitals are strong enough to use for recovery scoring.',
    color: colors.recoveryGreen,
    tint: `${colors.recoveryGreen}12`,
    textColor: '#000',
  };
}

function dayVitalsReview(metric: DailyMetricRow): {
  label: string;
  title: string;
  body: string;
  facts: string[];
  color: string;
  tint: string;
  textColor: string;
} {
  const coreMissing = [
    metric.rmssd == null ? 'HRV' : null,
    metric.rhr == null ? 'RHR' : null,
    metric.resp == null ? 'Resp' : null,
  ].filter(Boolean) as string[];
  const healthMissing = [
    metric.skinTempC == null ? 'Skin temp' : null,
  ].filter(Boolean) as string[];
  const sleepNeedsSync = sleepNeedsMoreSync(metric.sleepDetail);
  const sleepTrustBlocked = sleepTrustTier(metric.sleepDetail) === 'low' || sleepNeedsSync;
  const hasSteps = metric.steps != null;
  const facts = [
    coreMissing.length === 0 ? 'Core vitals ready' : `${coreMissing.join(', ')} missing`,
    healthMissing.length === 0 ? 'Health monitor ready' : `${healthMissing.join(', ')} pending`,
    hasSteps ? 'Steps captured' : 'Steps missing',
  ];

  if (coreMissing.length >= 2 || sleepTrustBlocked) {
    return {
      label: 'DATA',
      title: sleepTrustBlocked && !sleepNeedsSync ? 'Recovery inputs need trusted sleep' : 'Recovery inputs need more data',
      body: sleepTrustBlocked
        ? sleepNeedsSync
          ? 'Overnight capture is partial, so overnight vitals and recovery should be treated as incomplete until coverage is sufficient.'
          : 'Sleep is present, but confidence is low. Review the sleep window before trusting recovery or overnight health metrics.'
        : `Missing ${coreMissing.join(', ')} from the overnight window. Recovery, stress and health monitor panels will stay limited until those inputs are captured.`,
      facts,
      color: colors.recoveryRed,
      tint: `${colors.recoveryRed}12`,
      textColor: colors.white,
    };
  }

  if (coreMissing.length > 0) {
    return {
      label: 'VITAL',
      title: 'One core vital is incomplete',
      body: `${coreMissing[0]} is missing for this day. Sleep timing can still be useful, but recovery confidence is lower until the overnight record is complete.`,
      facts,
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  if (healthMissing.length > 0) {
    return {
      label: 'CORE',
      title: 'Core recovery is usable',
      body: 'HRV, resting HR and respiration are present. Validated skin temperature is still missing for this day.',
      facts,
      color: colors.strainBlue,
      tint: `${colors.strainBlue}16`,
      textColor: colors.white,
    };
  }

  if (!hasSteps) {
    return {
      label: 'STEP',
      title: 'Vitals ready, activity incomplete',
      body: 'Overnight recovery inputs are present, but the WHOOP step counter has not synced with enough movement evidence yet.',
      facts,
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  return {
    label: 'READY',
    title: 'Daily inputs are complete',
    body: 'Core recovery vitals, decoded raw health channels and steps are present for this day.',
    facts,
    color: colors.recoveryGreen,
    tint: `${colors.recoveryGreen}12`,
    textColor: '#000',
  };
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
  qualityGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  reviewBadge: {
    width: 48,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBadgeText: { fontSize: 10, fontFamily: fonts.black },
  reviewTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  reviewBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  vitalsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  vitalFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  vitalFact: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  vitalFactText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 12, fontFamily: fonts.text },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  adjustTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  adjustMeta: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
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
