import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, ContributorRow, Empty, MetricRow, NavRow, Ring, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import type { DailyMetricRow } from '../db/database';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { fourTier } from '../metrics/bands';
import { sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { illnessTint } from './IllnessScreen';
import { DayRail } from './DayScreen';
import { sleepConfidenceColor, sleepConfidenceLabel, sleepCoverageColor } from '../ui/sleepTrust';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

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

function sleepCaptureTrustLabel(sleepDetail: DailyMetricRow['sleepDetail'] | null): string {
  if (!sleepDetail) return 'needs data';
  if (sleepStateWakeConflict(sleepDetail)) return 'wake conflict';
  const confidence = sleepConfidenceLabel(sleepDetail.confidence);
  return sleepDetail.coveragePct != null ? `${confidence} · ${sleepDetail.coveragePct}%` : confidence;
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
      value: input.coveragePct != null ? `${input.coveragePct}% coverage` : 'needs sync',
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
  const hrvBal = useStoreSelector(appStore, (s) => s.hrvBal);
  const illness = useStoreSelector(appStore, (s) => s.illness);
  const res = useStoreSelector(appStore, (s) => s.resilience);
  const cardioAge = useStoreSelector(appStore, (s) => s.cardioAge);

  const recovery = today?.recovery ?? null;
  const sleepDetail = today?.sleepDetail ?? null;
  const confidence = sleepDetail?.confidence ?? null;
  const confidenceCap = recoveryConfidenceCap(sleepDetail);
  const captureTrustScore = sleepCaptureTrustScore(sleepDetail);
  const prior = recentDays.filter((d) => d.day !== today?.day);
  const baselineNights = prior.filter(
    (d) => {
      const tier = sleepTrustTier(d.sleepDetail);
      return d.rmssd != null && d.rhr != null && (tier === 'high' || tier === 'medium');
    },
  ).length;
  const week = recentDays.slice(0, 7).reverse();
  const days = orderedDays(today, recentDays);
  const recoveryDriver = recoveryDriverInsight(parts, confidence, sleepDetail, confidenceCap);
  const qualityAction = recoveryQualityAction({
    rmssd: today?.rmssd ?? null,
    rhr: today?.rhr ?? null,
    resp: today?.resp ?? null,
    confidence,
    coveragePct: sleepDetail?.coveragePct ?? null,
    sleepDetail,
  });

  return (
    <Screen title="Recovery" onBack={nav.canBack ? nav.back : undefined} tint={recoveryColor(recovery)}>
      <DayRail
        days={days}
        selected={today?.day ?? ''}
        onSelect={(selected) => nav.navigate({ name: 'day', day: selected })}
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

      <SectionLabel>Recovery quality</SectionLabel>
      <Card>
        <View style={styles.qualityGrid}>
          <Stat label="HRV" value={today?.rmssd != null ? 'Ready' : '-'} color={today?.rmssd != null ? colors.recoveryGreen : colors.textTertiary} />
          <Stat label="RHR" value={today?.rhr != null ? 'Ready' : '-'} color={today?.rhr != null ? colors.recoveryGreen : colors.textTertiary} />
          <Stat label="Resp" value={today?.resp != null ? 'Ready' : '-'} color={today?.resp != null ? colors.recoveryGreen : colors.textTertiary} />
        </View>
        <View style={[styles.qualityGrid, { marginTop: 12 }]}>
          <Stat label="Sleep confidence" value={sleepConfidenceLabel(confidence)} color={sleepConfidenceColor(confidence)} />
          <Stat label="Sleep coverage" value={sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}%` : '-'} color={sleepCoverageColor(sleepDetail?.coveragePct)} />
          <Stat label="Signal" value={sleepDetail?.signalMin ?? '-'} unit={sleepDetail?.signalMin != null ? 'min' : undefined} />
        </View>
        <Text style={styles.qualityNote}>{recoveryQualityNote(today, confidence, confidenceCap, baselineNights)}</Text>
        {qualityAction ? (
          <NavRow
            label={qualityAction.label}
            icon={qualityAction.icon}
            iconColor={qualityAction.color}
            value={qualityAction.value}
            onPress={() => nav.navigate(qualityAction.route)}
            last
          />
        ) : null}
      </Card>

      {/* Illness early-warning (recovery-independent) */}
      {illness && illness.level !== 'none' ? (
        <Pressable onPress={() => nav.navigate({ name: 'illness' })} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Card style={{ borderColor: illnessTint(illness.level) }}>
            <View style={styles.illnessHead}>
              <View style={[styles.illnessDot, { backgroundColor: illnessTint(illness.level) }]} />
              <Text style={styles.illnessTitle}>
                {illness.level === 'major' ? 'Major signs you may be getting sick' : 'Minor signs to watch'}
              </Text>
            </View>
            <Text style={styles.illnessSub}>
              {illness.flaggedCount} overnight vital{illness.flaggedCount > 1 ? 's' : ''} outside your typical range. Tap for the breakdown.
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {/* Recovery contributors — Oura-style four-tier */}
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
                  <Stat label="Sleep conf." value={sleepConfidenceLabel(confidence)} color={sleepConfidenceColor(confidence)} />
                </View>
                <NavRow
                  label={recoveryDriver.actionLabel}
                  icon={recoveryDriver.icon}
                  iconColor={recoveryDriver.color}
                  value={recoveryDriver.actionValue}
                  onPress={() => nav.navigate(recoveryDriver.route)}
                  last
                />
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
            <ContributorRow
              label="Sleep"
              percent={parts.sleepSub}
              value={fourTier(parts.sleepSub).label}
              color={fourTier(parts.sleepSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}
            />
            <ContributorRow
              label="Sleep capture trust"
              percent={captureTrustScore}
              value={sleepCaptureTrustLabel(sleepDetail)}
              color={sleepStateWakeConflict(sleepDetail) ? colors.recoveryRed : undefined}
              onPress={() => {
                if (captureTrustScore != null && captureTrustScore < 80) nav.navigate({ name: 'sleep' });
                else nav.navigate({ name: 'metric', key: 'sleep_performance' });
              }}
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
      </Card>

      {/* Insights */}
      <SectionLabel>Insights</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow
          label="HRV Balance"
          icon="pulse"
          iconColor={fourTier(hrvBal?.score ?? null).color}
          value={hrvBal ? `${hrvBal.ratio}× · ${fourTier(hrvBal.score).label}` : 'needs data'}
          onPress={() => nav.navigate({ name: 'metric', key: 'hrv_balance' })}
        />
        <NavRow
          label="Resilience"
          icon="shield-half"
          iconColor={colors.recoveryGreen}
          value={res ? res.tier : 'needs ~1 week'}
          onPress={() => nav.navigate({ name: 'resilience' })}
        />
        <NavRow
          label="Cardiovascular Age"
          icon="heart"
          iconColor={colors.strainBlue}
          value={cardioAge != null ? `${cardioAge} yrs` : 'estimate'}
          onPress={() => nav.navigate({ name: 'metric', key: 'cardio_age' })}
        />
        <NavRow label="Sick-Risk Monitor" icon="medkit" iconColor={illnessTint(illness?.level)} value={illness ? (illness.level === 'none' ? 'No signs' : illness.level === 'minor' ? 'Minor' : 'Major') : '—'} onPress={() => nav.navigate({ name: 'illness' })} />
        <NavRow label="Health Monitor" icon="fitness" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'health' })} last />
      </Card>

      <Empty text={recoveryGuidanceForDetail(recovery, confidenceCap, sleepDetail, baselineNights)} />

      <SectionLabel>Weekly trends</SectionLabel>
      <Card>
        <SectionLabel>Recovery</SectionLabel>
        {week.length === 0 ? (
          <Empty text="No history yet." />
        ) : (
          <WeeklyBars
            data={week.map((d) => ({
              label: dow(d.day),
              value: d.recovery,
              display: d.recovery != null ? `${d.recovery}%` : '',
              color: recoveryColor(d.recovery),
              confidence: d.recovery != null ? barConfidence(d) : null,
            }))}
          />
        )}
      </Card>
      <Card>
        <SectionLabel>Heart rate variability</SectionLabel>
        {week.length === 0 ? (
          <Empty text="No history yet." />
        ) : (
          <WeeklyBars
            data={week.map((d) => ({
              label: dow(d.day),
              value: d.rmssd != null ? Math.round(d.rmssd) : null,
              display: d.rmssd != null ? `${Math.round(d.rmssd)}` : '',
              color: colors.recoveryGreen,
              confidence: d.rmssd != null ? barConfidence(d) : null,
            }))}
          />
        )}
      </Card>

      <Empty text="Recovery blends overnight HRV vs your baseline, resting HR, respiratory rate and sleep performance — a local approximation, not WHOOP's exact score." />
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
      body: `The recovery score is capped at ${confidenceCap}% until the overnight window has stronger coverage, sleep-state corroboration, or has been reviewed.`,
      metric: 'Confidence',
      value: sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}%` : '-',
      actionLabel: needsMoreSync ? 'Sync more data' : 'Review sleep window',
      actionValue: sleepConfidenceLabel(confidence),
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
  if (key === 'sleep') return `Sleep performance is the lowest contributor (${score}); tonight's plan is the biggest lever.`;
  return 'One recovery input is below its useful band today.';
}

function recoverySupportBody(key: string): string {
  if (key === 'hrv') return 'HRV is carrying the recovery score in the right direction.';
  if (key === 'rhr') return 'Resting heart rate is supporting recovery against your baseline.';
  if (key === 'resp') return 'Respiratory rate is close enough to baseline to support the score.';
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
});
