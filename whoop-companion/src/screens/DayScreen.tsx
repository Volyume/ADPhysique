import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import type { DailyMetricRow } from '../db/database';
import { Card, Dial, Empty, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts, recoveryColor, sleepStageColors } from '../ui/theme';
import type { Nav } from '../ui/navigation';
import { formatClock, formatDuration } from '../util/time';
import { clampPct } from '../util/number';
import { activitySummary } from '../ui/activityFormat';
import { sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { sleepConfidenceColor, sleepConfidenceLabel, sleepCoverageColor } from '../ui/sleepTrust';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

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
  const sleepPerf = metric?.sleepDetail?.performance != null
    ? clampPct(metric.sleepDetail.performance)
    : metric?.sleepPerf != null
      ? clampPct(Math.round(metric.sleepPerf * 100))
      : null;
  const sleepStart = metric?.sleepStart ?? null;
  const sleepEnd = metric?.sleepEnd ?? null;
  const totalStageMin = (metric?.deepMin ?? 0) + (metric?.remMin ?? 0) + (metric?.lightMin ?? 0) + (metric?.awakeMin ?? 0);
  const sleepReview = metric ? daySleepReview(metric) : null;
  const vitalsReview = metric ? dayVitalsReview(metric) : null;

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
                <View style={styles.qualityGrid}>
                  <Stat label="Confidence" value={sleepConfidenceLabel(metric.sleepDetail?.confidence)} color={sleepConfidenceColor(metric.sleepDetail?.confidence)} />
                  <Stat label="Coverage" value={`${metric.sleepDetail?.coveragePct ?? 0}%`} color={sleepCoverageColor(metric.sleepDetail?.coveragePct ?? 0)} />
                  <Stat label="Signal" value={metric.sleepDetail?.signalMin ?? 0} unit="min" />
                </View>
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
                <Text style={styles.note}>{sleepTrustNote(metric)}</Text>
                <TouchableOpacity style={styles.adjustRow} onPress={() => nav.navigate({ name: 'editSleep', day })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adjustTitle}>Adjust this sleep</Text>
                    <Text style={styles.adjustMeta}>Re-detect stages, vitals and recovery for {formatDayLong(day)}</Text>
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

function sleepTrustNote(metric: DailyMetricRow): string {
  const detail = metric.sleepDetail;
  if (!detail) return 'No capture detail is available for this sleep yet.';
  const still = detail.stillMin ?? detail.motionMin ?? 0;
  const moving = detail.movingMin ?? 0;
  if (sleepStateWakeConflict(detail)) {
    return `Low-confidence sleep: decoded strap-state evidence is mostly wake (${sleepStateWakeDisplay(detail)}). Review the window after sync finishes.`;
  }
  const tier = sleepTrustTier(detail);
  if (tier === 'high') return `Strong overnight capture: ${detail.signalMin} signal minutes, ${detail.coveragePct}% coverage, ${still} still minutes.`;
  if (tier === 'medium') return `Usable estimate: ${detail.coveragePct}% coverage with ${still} still / ${moving} moving minutes. Adjust the window if the timing looks wrong.`;
  if (!sleepNeedsMoreSync(detail)) {
    return `Low-confidence sleep: coverage is present, but still-worn or decoded sleep-state corroboration is weak. Review the window before trusting score/recovery.`;
  }
  return `Low-confidence sleep: ${detail.coveragePct}% coverage with ${detail.signalMin} signal minutes. Sync more data or adjust the window before trusting score/recovery.`;
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

  const coverage = detail.coveragePct ?? 0;
  const signal = detail.signalMin ?? 0;
  const inBed = detail.inBedMin ?? metric.sleepMin;
  const efficiency = detail.efficiency ?? (inBed > 0 ? Math.round((metric.sleepMin / inBed) * 100) : null);
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
      label: needsSync ? 'SYNC' : 'CHECK',
      title: needsSync ? 'Partial overnight capture' : 'Sleep candidate needs corroboration',
      body:
        needsSync
          ? `Only ${coverage}% coverage and ${signal} signal minutes are available. Keep the strap connected and let auto sync backfill before trusting sleep or recovery.`
          : 'The HR window has enough signal, but still-worn or decoded sleep-state evidence is weak. Review the window if the timing looks wrong.',
      color: colors.recoveryRed,
      tint: `${colors.recoveryRed}12`,
      textColor: colors.white,
    };
  }

  if ((detail.hoursVsNeeded ?? 0) > 105 || (detail.performance ?? 0) > 100) {
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
      body: `Coverage is ${coverage}%. Trends are useful, but adjust the sleep window if the bedtime or wake time looks wrong.`,
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  return {
    label: 'GOOD',
    title: 'Strong sleep capture',
    body: `This day has ${coverage}% coverage, ${signal} signal minutes and the core overnight vitals needed for recovery scoring.`,
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
    metric.spo2 == null ? 'SpO2' : null,
    metric.skinTempC == null ? 'Skin temp' : null,
  ].filter(Boolean) as string[];
  const sleepCoverage = metric.sleepDetail?.coveragePct ?? null;
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
      label: 'SYNC',
      title: sleepTrustBlocked && !sleepNeedsSync ? 'Recovery inputs need trusted sleep' : 'Recovery inputs need more data',
      body: sleepTrustBlocked
        ? sleepNeedsSync
          ? sleepCoverage != null
            ? `Sleep coverage is ${sleepCoverage}%, so overnight vitals and recovery should be treated as partial until auto sync backfills more history.`
            : 'Sleep capture detail is missing, so overnight vitals and recovery should be treated as partial until auto sync backfills more history.'
          : 'Sleep has enough raw signal to inspect, but confidence is low. Review the sleep window before trusting recovery or overnight health metrics.'
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
      body: `${coreMissing[0]} is missing for this day. Sleep timing can still be useful, but recovery confidence is lower until the overnight signal fills in.`,
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
      body: `HRV, resting HR and respiration are present. ${healthMissing.join(' and ')} remain experimental or unavailable for this day, so health monitor completeness is not full yet.`,
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
      body: 'Overnight recovery inputs are present, but the daily step total is missing. Keep the strap connected or calibrate with the real steps for the synced counter range.',
      facts,
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
      textColor: '#000',
    };
  }

  return {
    label: 'READY',
    title: 'Daily inputs are complete',
    body: 'Core recovery vitals, health monitor candidates and steps are present for this day.',
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
