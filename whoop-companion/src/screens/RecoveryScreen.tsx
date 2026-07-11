import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { calculateTonightPlan, Card, ContributorRow, MetricRow, NavRow, parsePinnedWakeMinute, parsePlanningWindowMinute, Ring, Screen, SectionLabel, SleepConfidenceStatus, Stat, TonightBand, tonightEfficiencyPercent } from '../ui/components';
import type { DailyMetricRow } from '../db/database';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { fourTier } from '../metrics/bands';
import { sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { illnessTint } from './IllnessScreen';
import { DayRail } from './DayScreen';
import { sleepConfidenceLabel } from '../ui/sleepTrust';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';
import { kvGet } from '../db/database';

const RECOVERY_BASELINE_NIGHTS = 5;

function avg(rows: DailyMetricRow[], pick: (r: DailyMetricRow) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function dow(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function barConfidence(day: DailyMetricRow): 'high' | 'medium' | 'low' | null {
  return day.sleepDetail?.confidence ?? null;
}

function recoveryConfidenceCap(sleepDetail: DailyMetricRow['sleepDetail'] | null): number | null {
  const tier = sleepTrustTier(sleepDetail);
  if (tier === 'low') return 66;
  if (tier === 'medium') return 85;
  return null;
}

function sleepCaptureTrustScore(sleepDetail: DailyMetricRow['sleepDetail'] | null): number | null {
  if (!sleepDetail) return null;
  if (sleepStateWakeConflict(sleepDetail)) return 25;
  const tier = sleepTrustTier(sleepDetail);
  if (tier === 'low') return 45;
  if (tier === 'medium') return 72;
  return 100;
}

function recoveryConfidenceReason(sleepDetail: DailyMetricRow['sleepDetail'] | null): string {
  if (!sleepDetail) return 'Waiting for a complete overnight record.';
  if (sleepStateWakeConflict(sleepDetail)) return 'The sleep window may include awake time.';
  if (sleepNeedsMoreSync(sleepDetail)) return 'Some overnight data is still syncing.';
  if (sleepDetail.confidence === 'medium') return 'Usable, but more overnight detail may refine recovery.';
  return 'The overnight record is strong enough to use.';
}

function confidenceStatusTier(sleepDetail: DailyMetricRow['sleepDetail'] | null): 'high' | 'medium' | 'low' | null {
  const tier = sleepTrustTier(sleepDetail);
  return tier === 'none' ? null : tier;
}

function recoveryStatusLabel(recovery: number | null, cap: number | null): string {
  if (recovery == null) return 'needs data';
  if (cap != null) return recovery >= cap ? `capped ${cap}%` : `cap ${cap}%`;
  if (recovery >= 67) return 'primed';
  if (recovery >= 34) return 'maintaining';
  return 'rest needed';
}

function recoveryGuidance(recovery: number | null, cap: number | null, baselineNights = 0): string {
  if (recovery == null) {
    return baselineNights < RECOVERY_BASELINE_NIGHTS
      ? `Personal recovery baseline: ${baselineNights}/${RECOVERY_BASELINE_NIGHTS} trusted nights. Keep syncing complete overnight records.`
      : 'Recovery is waiting for a complete trusted overnight record today.';
  }
  if (cap != null && cap <= 66) return 'Recovery is capped because the overnight capture is weak. Sync more data or review the sleep window before trusting today\'s training signal.';
  if (cap != null) return 'Recovery is capped by medium sleep confidence. Treat it as usable but provisional until the overnight record is fuller.';
  if (recovery < 34) return 'Recovery is low - your body is under strain. Prioritise rest, hydration and sleep today.';
  if (recovery < 67) return 'Moderate recovery - you can train, but listen to your body.';
  return 'High recovery - your body is primed. A good day to push.';
}

function recoveryGuidanceForDetail(
  recovery: number | null,
  cap: number | null,
  sleepDetail: DailyMetricRow['sleepDetail'] | null,
  baselineNights: number,
): string {
  if (sleepStateWakeConflict(sleepDetail)) {
    return 'Recovery is capped because the sleep window conflicts with decoded strap-state evidence. Review the window before trusting today\'s training signal.';
  }
  if (cap != null && !sleepNeedsMoreSync(sleepDetail)) {
    return 'Recovery is capped because sleep confidence is low despite usable signal. Review the sleep window before trusting today\'s training signal.';
  }
  return recoveryGuidance(recovery, cap, baselineNights);
}

function recoveryQualityNote(
  day: DailyMetricRow | null,
  confidence: 'high' | 'medium' | 'low' | null,
  cap: number | null,
  baselineNights: number,
): string {
  if (!day) return 'Recovery appears after a synced overnight record.';
  const missing = [
    day.rmssd == null ? 'HRV' : null,
    day.rhr == null ? 'RHR' : null,
    day.resp == null ? 'respiratory rate' : null,
  ].filter((v): v is string => v != null);
  if (missing.length) return `Recovery is waiting for ${missing.join(', ')} from a stronger overnight sync.`;
  if (day.recovery == null && baselineNights < RECOVERY_BASELINE_NIGHTS) {
    return `${baselineNights}/${RECOVERY_BASELINE_NIGHTS} trusted prior nights are ready. Recovery appears once the personal HRV and RHR baseline reaches ${RECOVERY_BASELINE_NIGHTS}.`;
  }
  if (sleepStateWakeConflict(day.sleepDetail)) return 'Recovery is capped because decoded strap-state evidence is mostly wake.';
  if (cap != null && !sleepNeedsMoreSync(day.sleepDetail)) return `Recovery is capped at ${cap}% until the sleep window is reviewed or corroborated.`;
  if (cap != null) return `Recovery is capped at ${cap}% until sleep confidence improves.`;
  if (confidence === 'high') return 'Recovery is backed by strong overnight coverage and still-worn evidence.';
  if (confidence === 'medium') return 'Recovery is usable, but sleep confidence is medium; more synced data can refine it.';
  if (confidence === 'low') return 'Recovery should be treated cautiously until sleep confidence improves.';
  return 'Recovery is using available overnight vitals; sleep confidence is not available yet.';
}

function recoveryQualityAction(input: {
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  coveragePct: number | null;
  sleepDetail: DailyMetricRow['sleepDetail'] | null;
}): {
  label: string;
  value: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} | null {
  if (sleepStateWakeConflict(input.sleepDetail)) {
    return {
      label: 'Review sleep window',
      value: sleepStateWakeDisplay(input.sleepDetail),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }

  if (input.rmssd == null || input.rhr == null || input.resp == null || (input.coveragePct ?? 0) < 60) {
    return {
      label: 'Sync more overnight data',
      value: 'continue syncing',
      icon: 'sync',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }
  if (input.confidence && input.confidence !== 'high') {
    return {
      label: 'Review sleep window',
      value: sleepConfidenceLabel(input.confidence),
      icon: 'create',
      color: colors.sleepTeal,
      route: { name: 'editSleep' },
    };
  }
  return null;
}

export function RecoveryScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const parts = useStoreSelector(appStore, (s) => s.recoveryParts);
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const sleepGoal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const sleepSchedule = useStoreSelector(appStore, (s) => s.sleepSchedule);
  const [pinnedWakeMinute, setPinnedWakeMinute] = useState<number | null>(null);
  const [planningWindowMin, setPlanningWindowMin] = useState(30);
  useEffect(() => {
    void Promise.all([kvGet('wakeTime'), kvGet('wakeTimePinned'), kvGet('smartWakeWindowMin')]).then(([wake, pinned, window]) => {
      setPinnedWakeMinute(parsePinnedWakeMinute(wake, pinned));
      setPlanningWindowMin(parsePlanningWindowMinute(window));
    });
  }, []);

  const recovery = today?.recovery ?? null;
  const sleepDetail = today?.sleepDetail ?? null;
  const confidence = sleepDetail?.confidence ?? null;
  const confidenceCap = recoveryConfidenceCap(sleepDetail);
  const prior = recentDays.filter((d) => d.day !== today?.day);
  const baselineNights = prior.filter(
    (d) => {
      const tier = sleepTrustTier(d.sleepDetail);
      return d.rmssd != null && d.rhr != null && (tier === 'high' || tier === 'medium');
    },
  ).length;
  const days = orderedDays(today, recentDays);
  const recoveryDriver = recoveryDriverInsight(parts, confidence, sleepDetail, confidenceCap);
  const efficiencySamples = recentDays
    .filter((d) => sleepTrustTier(d.sleepDetail) !== 'low')
    .map((d) => d.sleepDetail?.efficiency)
    .filter((v): v is number => v != null && v > 0);
  const tonightPlan = calculateTonightPlan({
    neededMinutes: sleepNeed?.neededMin ?? 480,
    goal: sleepGoal,
    wakeMinute: pinnedWakeMinute ?? sleepSchedule.wakeMin,
    planningWindowMinutes: planningWindowMin,
    expectedEfficiencyPercent: tonightEfficiencyPercent(efficiencySamples),
  });
  const overnightActionRoute = sleepStateWakeConflict(sleepDetail)
    ? { name: 'editSleep' as const }
    : sleepNeedsMoreSync(sleepDetail)
      ? { name: 'device' as const }
      : { name: 'sleepCoach' as const };
  return (
    <Screen title="Recovery" onBack={nav.canBack ? nav.back : undefined} tint={recoveryColor(recovery)}>
      <DayRail
        days={days}
        selected={today?.day ?? ''}
        onSelect={(selected) => nav.navigate({ name: 'day', day: selected })}
      />

      <TonightBand
        targetMinutes={tonightPlan.targetMinutes}
        bedMinute={tonightPlan.bedMinute}
        wakeMinute={tonightPlan.wakeMinute}
        onPress={() => nav.navigate({ name: 'sleepCoach' })}
      />

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={recovery != null ? recovery / 100 : 0}
          color={recoveryColor(recovery)}
          centerTop="Recovery"
          centerMain={recovery != null ? `${recovery}%` : '—'}
          centerSub={
            recovery == null && today?.rmssd != null && today.rhr != null
              ? `${Math.min(baselineNights, RECOVERY_BASELINE_NIGHTS)}/${RECOVERY_BASELINE_NIGHTS} baseline nights`
              : recoveryStatusLabel(recovery, confidenceCap)
          }
        />
      </Card>

      <SleepConfidenceStatus
        confidence={confidenceStatusTier(sleepDetail)}
        reason={recoveryConfidenceReason(sleepDetail)}
        onDetails={confidenceStatusTier(sleepDetail) !== 'high' ? () => nav.navigate(overnightActionRoute) : undefined}
        detailsLabel={sleepNeedsMoreSync(sleepDetail) ? 'Sync' : 'Review'}
      />
      {/* Recovery contributors — Oura-style four-tier */}
      {recovery == null ? (
        <>
          <SectionLabel>What recovery needs</SectionLabel>
          <Card>
            <Text style={styles.missingTitle}>A trusted overnight record</Text>
            <Text style={styles.missingBody}>
              At minimum, Pulse needs overnight HRV and resting heart rate, plus {RECOVERY_BASELINE_NIGHTS} trusted nights to build your personal baseline. Respiratory rate improves the picture when available.
            </Text>
            <View style={styles.missingStats}>
              <Stat label="HRV" value={today?.rmssd != null ? `${Math.round(today.rmssd)} ms` : 'missing'} color={today?.rmssd != null ? colors.recoveryGreen : colors.recoveryYellow} />
              <Stat label="Resting HR" value={today?.rhr != null ? `${today.rhr} bpm` : 'missing'} color={today?.rhr != null ? colors.recoveryGreen : colors.recoveryYellow} />
              <Stat label="Baseline" value={`${Math.min(baselineNights, RECOVERY_BASELINE_NIGHTS)}/${RECOVERY_BASELINE_NIGHTS}`} color={baselineNights >= RECOVERY_BASELINE_NIGHTS ? colors.recoveryGreen : colors.recoveryYellow} />
            </View>
          </Card>
        </>
      ) : null}

      {parts ? (
        <>
          {recoveryDriver ? (
            <>
              <SectionLabel>Recovery driver</SectionLabel>
              <Card>
                <View style={styles.driverHead}>
                  <View style={[styles.driverBadge, { backgroundColor: recoveryDriver.color }]}>
                    <Text style={styles.driverBadgeText}>{recoveryDriver.badge}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverTitle}>{recoveryDriver.title}</Text>
                    <Text style={styles.driverBody}>{recoveryDriver.body}</Text>
                  </View>
                </View>
                <View style={styles.qualityGrid}>
                  <Stat label="Driver" value={recoveryDriver.metric} color={recoveryDriver.color} />
                  <Stat label="Score" value={recoveryDriver.value} />
                 </View>
              </Card>
            </>
          ) : null}

          <SectionLabel>Recovery contributors</SectionLabel>
          <Card>
            <ContributorRow
              label="HRV"
              percent={parts.hrvSub}
              value={fourTier(parts.hrvSub).label}
              color={fourTier(parts.hrvSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'hrv' })}
            />
            <ContributorRow
              label="Resting heart rate"
              percent={parts.rhrSub}
              value={fourTier(parts.rhrSub).label}
              color={fourTier(parts.rhrSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'rhr' })}
            />
            {parts.respSub != null ? (
              <ContributorRow
                label="Respiratory rate"
                percent={parts.respSub}
                value={fourTier(parts.respSub).label}
                color={fourTier(parts.respSub).color}
                onPress={() => nav.navigate({ name: 'metric', key: 'respiratory' })}
              />
            ) : null}
            {parts.tempSub != null ? (
              <ContributorRow
                label="Skin temperature"
                percent={parts.tempSub}
                value={fourTier(parts.tempSub).label}
                color={fourTier(parts.tempSub).color}
                onPress={() => nav.navigate({ name: 'metric', key: 'skin_temp' })}
              />
            ) : null}
            <ContributorRow
              label="Sleep"
              percent={parts.sleepSub}
              value={fourTier(parts.sleepSub).label}
              color={fourTier(parts.sleepSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}
            />
          </Card>
        </>
      ) : null}

      {/* Vitals & trends */}
      <SectionLabel>Vitals</SectionLabel>
      <Card>
        <MetricRow
          label="Heart rate variability"
          current={today?.rmssd != null ? Math.round(today.rmssd) : null}
          prior={avg(prior, (r) => r.rmssd)}
          unit=" ms"
          onPress={() => nav.navigate({ name: 'metric', key: 'hrv' })}
        />
        <MetricRow
          label="Resting heart rate"
          current={today?.rhr ?? null}
          prior={avg(prior, (r) => r.rhr)}
          unit=" bpm"
          betterWhenLower
          onPress={() => nav.navigate({ name: 'metric', key: 'rhr' })}
        />
        <MetricRow
          label="Respiratory rate"
          current={today?.resp != null ? Math.round(today.resp * 10) / 10 : null}
          prior={avg(prior, (r) => r.resp)}
          unit=" rpm"
          onPress={() => nav.navigate({ name: 'metric', key: 'respiratory' })}
        />
        <MetricRow
          label="Skin temperature"
          current={today?.skinTempC != null ? Math.round(today.skinTempC * 10) / 10 : null}
          prior={avg(prior, (r) => r.skinTempC)}
          unit=" C"
          onPress={() => nav.navigate({ name: 'metric', key: 'skin_temp' })}
        />
        <NavRow label="Recovery trends" icon="trending-up" iconColor={colors.recoveryGreen} value="compare history" onPress={() => nav.navigate({ name: 'trends' })} last />
      </Card>

    </Screen>
  );
}

function recoveryDriverInsight(
  parts: ReturnType<typeof appStore.getState>['recoveryParts'],
  confidence: 'high' | 'medium' | 'low' | null,
  sleepDetail: DailyMetricRow['sleepDetail'] | null,
  confidenceCap: number | null,
): {
  badge: string;
  title: string;
  body: string;
  metric: string;
  value: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} | null {
  if (!parts) return null;
  if (sleepStateWakeConflict(sleepDetail)) {
    return {
      badge: 'DATA',
      title: 'Sleep window is limiting recovery',
      body: 'Decoded strap-state evidence is mostly wake, so recovery stays capped until the sleep window is reviewed or more history arrives.',
      metric: 'Sleep state',
      value: sleepStateWakeDisplay(sleepDetail, 'min'),
      actionLabel: 'Review sleep window',
      actionValue: 'state evidence',
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }
  if (confidenceCap != null) {
    const needsMoreSync = sleepNeedsMoreSync(sleepDetail);
    return {
      badge: 'DATA',
      title: confidenceCap <= 66 ? 'Sleep confidence is limiting recovery' : 'Recovery is provisional today',
      body: 'The recovery score is limited until the overnight window is complete, corroborated or reviewed.',
      metric: 'Confidence',
      value: confidence === 'high' ? 'Good' : 'Limited',
      actionLabel: needsMoreSync ? 'Sync more data' : 'Review sleep window',
      actionValue: confidence === 'high' ? 'good' : 'limited',
      icon: needsMoreSync ? 'sync' : 'create',
      color: colors.strainBlue,
      route: needsMoreSync ? { name: 'device' } : { name: 'editSleep' },
    };
  }

  const rows = [
    { key: 'hrv', metric: 'HRV', score: parts.hrvSub, route: { name: 'metric', key: 'hrv' } as const, icon: 'pulse' },
    { key: 'rhr', metric: 'Resting HR', score: parts.rhrSub, route: { name: 'metric', key: 'rhr' } as const, icon: 'heart' },
    ...(parts.respSub != null
      ? [{ key: 'resp', metric: 'Respiratory', score: parts.respSub, route: { name: 'metric', key: 'respiratory' } as const, icon: 'fitness' }]
      : []),
    ...(parts.tempSub != null
      ? [{ key: 'temp', metric: 'Skin temperature', score: parts.tempSub, route: { name: 'metric', key: 'skin_temp' } as const, icon: 'thermometer' }]
      : []),
    { key: 'sleep', metric: 'Sleep', score: parts.sleepSub, route: { name: 'sleep' } as const, icon: 'moon' },
  ];
  const weakest = rows.slice().sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 70) {
    return {
      badge: 'DRAG',
      title: `${weakest.metric} is dragging recovery`,
      body: recoveryDriverBody(weakest.key, weakest.score),
      metric: weakest.metric,
      value: `${weakest.score}`,
      actionLabel: 'Open detail',
      actionValue: weakest.metric.toLowerCase(),
      icon: weakest.icon,
      color: weakest.score < 45 ? colors.recoveryRed : colors.recoveryYellow,
      route: weakest.route,
    };
  }

  const strongest = rows.slice().sort((a, b) => b.score - a.score)[0];
  return strongest
    ? {
        badge: 'HELP',
        title: `${strongest.metric} is supporting recovery`,
        body: recoverySupportBody(strongest.key),
        metric: strongest.metric,
        value: `${strongest.score}`,
        actionLabel: strongest.key === 'sleep' ? 'Open sleep' : 'Open detail',
        actionValue: strongest.metric.toLowerCase(),
        icon: strongest.icon,
        color: colors.recoveryGreen,
        route: strongest.route,
      }
    : null;
}

function recoveryDriverBody(key: string, score: number): string {
  if (key === 'hrv') return `HRV is below your current baseline band (${score}), so recovery should stay conservative.`;
  if (key === 'rhr') return `Resting heart rate is elevated relative to baseline (${score}), often a sign to ease off.`;
  if (key === 'resp') return `Respiratory rate is away from baseline (${score}), so recovery confidence should be tempered.`;
  if (key === 'temp') return `Skin temperature is away from your personal baseline (${score}), which can signal strain or poor recovery.`;
  if (key === 'sleep') return `Sleep performance is the lowest contributor (${score}); tonight's plan is the biggest lever.`;
  return 'One recovery input is below its useful band today.';
}

function recoverySupportBody(key: string): string {
  if (key === 'hrv') return 'HRV is carrying the recovery score in the right direction.';
  if (key === 'rhr') return 'Resting heart rate is supporting recovery against your baseline.';
  if (key === 'resp') return 'Respiratory rate is close enough to baseline to support the score.';
  if (key === 'temp') return 'Skin temperature is stable against your baseline.';
  if (key === 'sleep') return 'Sleep is supporting the recovery blend today.';
  return 'The main recovery inputs are aligned.';
}

const styles = StyleSheet.create({
  qualityGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  qualityNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 2, fontFamily: fonts.text },
  driverHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  driverBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  driverBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  driverTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  driverBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  illnessHead: { flexDirection: 'row', alignItems: 'center' },
  illnessDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  illnessTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  illnessSub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: fonts.text },
  missingTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  missingBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4, fontFamily: fonts.text },
  missingStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 4 },
});
