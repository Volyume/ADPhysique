import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, NavRow, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import {
  formatRaceTime,
  racePredictions,
  trainingLoad,
  trainingZoneTarget,
  vo2maxEstimate,
  vo2maxLabel,
  workoutActivityLabel,
} from '../metrics/training';
import { sleepStateWakeConflict } from '../metrics/sleepEvidence';
import { sleepNeedsMoreSync, sleepSyncActionValue } from '../metrics/sleepSync';
import { formatDistance, formatPace } from '../sensors/location';
import { formatDuration } from '../util/time';

const STATUS_COLOR: Record<string, string> = {
  'Near recent baseline': colors.recoveryGreen,
  'Baseline building': colors.sleepTeal,
  'Below recent baseline': colors.sleepTeal,
  'Above recent baseline': '#FFA722',
  'Well above recent baseline': colors.recoveryRed,
  Detraining: colors.textSecondary,
};

export function TrainingScreen({ nav }: { nav: Nav }) {
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const today = useStoreSelector(appStore, (s) => s.today);

  const now = Date.now();
  // VO2max only when we have REAL inputs: an explicitly-set max HR (we can't
  // measure true max at rest) and a measured resting HR from your sleep. Never
  // estimate it from default/placeholder profile values — that produced a
  // meaningless number. Even then it's a rough HR-ratio proxy (best for runners).
  const measuredResting = today?.rhr ?? null;
  const hasFitnessInputs = profile.maxHr != null && measuredResting != null;
  const vo2 = hasFitnessInputs ? vo2maxEstimate(profile.maxHr as number, measuredResting as number) : null;
  const vo2Lbl = vo2 != null ? vo2maxLabel(vo2, profile.ageYears, profile.sex) : null;
  const races = racePredictions(vo2);

  const trimps = cardio
    .filter((c) => c.trimp != null)
    .map((c) => ({ ts: c.startTs, trimp: c.trimp as number }));
  const load = trainingLoad(trimps, now);
  const statusColor = STATUS_COLOR[load.status] ?? colors.textSecondary;
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);
  const sleepDetail = today?.sleepDetail ?? null;
  const sleepStateConflict = sleepStateWakeConflict(sleepDetail);
  const sleepReadinessFix = trainingSleepFix(sleepDetail);

  // Weekly training load for the last 6 weeks.
  const DAY = 86400000;
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    const sum = trimps.filter((t) => t.ts > start && t.ts <= end).reduce((a, t) => a + t.trimp, 0);
    return { label: i === 0 ? 'This' : `−${i}w`, value: Math.round(sum), display: `${Math.round(sum)}`, color: colors.strainBlue };
  }).reverse();

  const recent = cardio.slice(0, 8);

  const [intensity, setIntensity] = useState<{ moderate: number; vigorous: number; total: number; goal: number } | null>(null);
  useEffect(() => {
    void appStore.weeklyIntensity().then(setIntensity);
  }, [cardio.length]);
  const plan = trainingPlan({
    loadStatus: load.status,
    acwr: load.acwr,
    readinessScore: readiness?.score ?? null,
    readinessConfidence: readiness?.confidence ?? null,
    sleepStateConflict,
    sleepReadinessFix,
    recovery: today?.recovery ?? null,
    intensity,
    hasFitnessInputs,
  });
  const loadDriver = trainingLoadDriver({
    loadStatus: load.status,
    acwr: load.acwr,
    acute: load.acute,
    chronic: load.chronic,
    readinessScore: readiness?.score ?? null,
    readinessConfidence: readiness?.confidence ?? null,
    sleepStateConflict,
    sleepReadinessFix,
  });

  // Personal records from logged activities.
  const pr = useMemo(() => {
    const withDur = cardio.map((c) => ({
      ...c,
      durSec: Math.max(1, (c.activeDurationMin ?? (c.endTs - c.startTs) / 60000) * 60),
    }));
    const longestDist = withDur.filter((c) => c.distanceM != null).sort((a, b) => (b.distanceM ?? 0) - (a.distanceM ?? 0))[0];
    const longestDur = [...withDur].sort((a, b) => b.durSec - a.durSec)[0];
    const hardest = withDur.filter((c) => c.strain != null).sort((a, b) => (b.strain ?? 0) - (a.strain ?? 0))[0];
    const paced = withDur.filter((c) => c.distanceM != null && c.distanceM >= 1000);
    const fastest = paced.sort((a, b) => a.durSec / (a.distanceM as number) - b.durSec / (b.distanceM as number))[0];
    return { longestDist, longestDur, hardest, fastest };
  }, [cardio]);

  return (
    <Screen title="Training Status" onBack={nav.back} tint={colors.strainBlue}>
      <Card>
        <View style={styles.statusHead}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{load.status}</Text>
        </View>
        <Text style={styles.statusDetail}>{load.statusDetail}</Text>
      </Card>

      <SectionLabel>Next training move</SectionLabel>
      <Card>
        <View style={styles.planHead}>
          <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planBody}>{plan.body}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <Stat label="Target" value={plan.target} color={plan.color} />
          <Stat label="ACWR context" value={load.acwr != null ? load.acwr.toFixed(2) : '—'} color={statusColor} />
          <Stat label="Readiness" value={readiness?.score ?? '—'} color={readinessColor(readiness?.score)} />
        </View>
        <NavRow
          label={plan.actionLabel}
          icon={plan.icon}
          iconColor={plan.color}
          value={plan.actionValue}
          onPress={() => nav.navigate(plan.route)}
          last
        />
      </Card>

      <SectionLabel>Fitness</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label={vo2Lbl ? `VO₂max · ${vo2Lbl}` : 'VO₂max'} value={vo2 ?? '—'} unit={vo2 != null ? 'ml/kg/min' : undefined} color={colors.recoveryGreen} />
        </View>
        <Text style={styles.note}>
          {vo2 == null
            ? 'Not estimated yet — set your true max HR on the Device screen, and wear the strap overnight so a resting HR is measured. (We won’t guess it from default values.)'
            : 'Rough estimate from your max:resting HR ratio (Uth 2004) — most accurate for endurance athletes; treat with caution if you mainly train strength. A proper VO₂max needs paced outdoor runs.'}
        </Text>
      </Card>

      {races ? (
        <>
          <SectionLabel>Race predictor</SectionLabel>
          <Card>
            <View style={styles.statRow}>
              {races.map((r) => (
                <View key={r.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.raceTime}>{formatRaceTime(r.seconds)}</Text>
                  <Text style={styles.raceLabel}>{r.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>
              Estimated finish times from your VO₂max (ACSM velocity model). They improve as your
              fitness estimate sharpens with an accurate max/resting HR.
            </Text>
          </Card>
        </>
      ) : null}

      <SectionLabel>Training load</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label="Acute (7d)" value={load.acute} color={colors.strainBlue} />
          <Stat label="Chronic (weekly)" value={load.chronic} />
          <Stat label="ACWR context" value={load.acwr != null ? load.acwr.toFixed(2) : '—'} color={statusColor} />
        </View>
        <Text style={styles.note}>
          ACWR compares your recent 7-day load with your trailing weekly average. The bands are
          descriptive context, not a universal safe/optimal range or an injury-risk prediction.
          Built from each activity's heart-rate training load (TRIMP), with HRR-based zones.
        </Text>
      </Card>

      <SectionLabel>Load driver</SectionLabel>
      <Card>
        <View style={styles.planHead}>
          <View style={[styles.planBadge, { backgroundColor: loadDriver.color }]}>
            <Text style={styles.planBadgeText}>{loadDriver.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{loadDriver.title}</Text>
            <Text style={styles.planBody}>{loadDriver.body}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <Stat label="Driver" value={loadDriver.metric} color={loadDriver.color} />
          <Stat label="ACWR context" value={load.acwr != null ? load.acwr.toFixed(2) : '—'} color={statusColor} />
          <Stat label="Readiness" value={readiness?.score ?? '—'} color={readinessColor(readiness?.score)} />
        </View>
        <NavRow
          label={loadDriver.actionLabel}
          icon={loadDriver.icon}
          iconColor={loadDriver.color}
          value={loadDriver.actionValue}
          onPress={() => nav.navigate(loadDriver.route)}
          last
        />
      </Card>

      <SectionLabel>Weekly load</SectionLabel>
      <Card>
        {weeks.some((w) => w.value > 0) ? <WeeklyBars data={weeks} /> : <Empty text="Log activities to build your weekly training load." />}
      </Card>

      <SectionLabel>Intensity minutes</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label="Moderate" value={intensity?.moderate ?? '—'} color={colors.recoveryGreen} />
          <Stat label="Vigorous (×2)" value={intensity?.vigorous ?? '—'} color={colors.strainBlue} />
          <Stat label="This week" value={intensity ? `${intensity.total}/${intensity.goal}` : '—'} color={colors.recoveryYellow} />
        </View>
        {intensity ? (
          <View style={styles.imTrack}>
            <View style={[styles.imFill, { width: `${Math.min(100, (intensity.total / intensity.goal) * 100)}%` }]} />
          </View>
        ) : null}
        <Text style={styles.note}>
          The WHO recommends 150 intensity minutes a week — moderate (Z2-Z3 HR reserve) counts once,
          vigorous (Z4-Z5 HR reserve) counts double. Measured from your heart rate across the last 7 days.
        </Text>
      </Card>

      <SectionLabel>Personal records</SectionLabel>
      <Card>
        {cardio.length === 0 ? (
          <Empty text="Your bests appear here as you log activities." />
        ) : (
          <>
            <PrRow label="Longest distance" value={pr.longestDist?.distanceM != null ? formatDistance(pr.longestDist.distanceM) : '—'} sub={pr.longestDist ? workoutActivityLabel({ activity: pr.longestDist.activity }) : undefined} />
            <PrRow label="Longest activity" value={pr.longestDur ? formatDuration(Math.round(pr.longestDur.durSec / 60)) : '—'} sub={pr.longestDur ? workoutActivityLabel({ activity: pr.longestDur.activity }) : undefined} />
            <PrRow
              label="Fastest pace"
              value={pr.fastest?.distanceM != null ? formatPace(pr.fastest.distanceM, pr.fastest.durSec) : '—'}
              sub={pr.fastest ? workoutActivityLabel({ activity: pr.fastest.activity }) : undefined}
            />
            <PrRow label="Highest strain" value={pr.hardest?.strain != null ? pr.hardest.strain.toFixed(1) : '—'} sub={pr.hardest ? workoutActivityLabel({ activity: pr.hardest.activity }) : undefined} last />
          </>
        )}
      </Card>

      <SectionLabel>Recent activities</SectionLabel>
      <Card>
        {recent.length === 0 ? (
          <Empty text="No activities logged yet." />
        ) : (
          recent.map((c) => (
            <Pressable key={c.id} style={styles.actRow} onPress={() => nav.navigate({ name: 'activity', id: c.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actName}>{workoutActivityLabel({ activity: c.activity })}</Text>
                <Text style={styles.actMeta}>
                  {new Date(c.startTs).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                  {formatDuration(Math.round(c.activeDurationMin ?? (c.endTs - c.startTs) / 60000))}
                  {c.distanceM != null ? ` · ${formatDistance(c.distanceM)}` : ''}
                  {c.steps != null ? ` · ${c.steps.toLocaleString()} steps` : ''}
                  {c.cadenceSpm != null ? ` · ${c.cadenceSpm} spm` : ''}
                  {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))
        )}
      </Card>

      <Text style={styles.disclaimer}>
        Training Status, VO₂max and load are on-device approximations. ACWR is a personal load
        comparison, not a diagnosis or an injury-risk estimate.
      </Text>
    </Screen>
  );
}

function trainingLoadDriver(input: {
  loadStatus: string;
  acwr: number | null;
  acute: number;
  chronic: number;
  readinessScore: number | null;
  readinessConfidence: 'high' | 'medium' | 'low' | null;
  sleepStateConflict: boolean;
  sleepReadinessFix: SleepReadinessFix;
}): {
  badge: string;
  title: string;
  body: string;
  metric: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  if (input.sleepStateConflict) {
    return {
      badge: 'SLEEP',
      title: 'Sleep review limits training guidance',
      body: 'Load status can wait: decoded strap-state evidence says the sleep window is mostly wake, so training should stay conservative until that is reviewed.',
      metric: 'Sleep state',
      actionLabel: 'Open readiness',
      actionValue: 'review',
      icon: 'speedometer',
      color: colors.recoveryRed,
      route: { name: 'readiness' },
    };
  }

  if (input.readinessConfidence === 'low') {
    return {
      badge: 'DATA',
      title: input.sleepReadinessFix.needsSync ? 'Sync overnight data before training' : 'Review sleep before training',
      body: input.sleepReadinessFix.needsSync
        ? 'Load status is useful, but the session call should stay conservative until overnight coverage and signal finish backfilling.'
        : 'Load status is useful, but low sleep confidence is limiting the session call. Review the sleep window before using load to go hard.',
      metric: 'Readiness',
      actionLabel: input.sleepReadinessFix.needsSync ? 'Open device sync' : 'Open readiness',
      actionValue: input.sleepReadinessFix.actionValue,
      icon: input.sleepReadinessFix.needsSync ? 'sync' : 'speedometer',
      color: colors.strainBlue,
      route: input.sleepReadinessFix.route,
    };
  }

  if (input.acwr != null && input.acwr > 1.5) {
    return {
      badge: 'HIGH',
      title: 'Relative load is high',
      body: `Your 7-day load is ${input.acwr.toFixed(2)}× the recent weekly average. This is a context flag, not an injury prediction; consider recovery and symptoms before adding more.`,
      metric: 'ACWR context',
      actionLabel: 'Plan recovery',
      actionValue: 'sleep',
      icon: 'moon',
      color: colors.recoveryRed,
      route: { name: 'sleepCoach' },
    };
  }

  if (input.acwr != null && input.acwr < 0.8) {
    return {
      badge: 'LOW',
      title: 'Relative load is below baseline',
      body: 'Recent load is lighter than your usual baseline. That may create room to build gradually, if recovery and goals support it.',
      metric: 'ACWR context',
      actionLabel: 'Start workout',
      actionValue: 'build',
      icon: 'play',
      color: colors.sleepTeal,
      route: { name: 'startMenu' },
    };
  }

  if (input.readinessScore != null && input.readinessScore < 50) {
    return {
      badge: 'BODY',
      title: 'Body signal is the limiter',
      body: 'Load ratio is not the main issue; readiness says today should stay easy.',
      metric: 'Readiness',
      actionLabel: 'Open readiness',
      actionValue: 'easy',
      icon: 'speedometer',
      color: colors.recoveryYellow,
      route: { name: 'readiness' },
    };
  }

  if (input.loadStatus === 'Near recent baseline') {
    return {
      badge: 'GOOD',
      title: 'Training load is near baseline',
      body: 'Recent load is close to your own baseline. That is useful context, but it does not determine readiness on its own.',
      metric: 'Balanced load',
      actionLabel: 'Start workout',
      actionValue: 'quality',
      icon: 'play',
      color: colors.recoveryGreen,
      route: { name: 'startMenu' },
    };
  }

  return {
    badge: 'HOLD',
    title: `${input.loadStatus} load pattern`,
    body: `Acute load is ${input.acute}, chronic load is ${input.chronic}. Keep the next session aligned with readiness rather than chasing a fixed weekly total.`,
    metric: 'Load status',
    actionLabel: 'Open readiness',
    actionValue: 'context',
    icon: 'speedometer',
    color: STATUS_COLOR[input.loadStatus] ?? colors.sleepTeal,
    route: { name: 'readiness' },
  };
}

function PrRow({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={[styles.prRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prLabel}>{label}</Text>
        {sub ? <Text style={styles.prSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.prValue}>{value}</Text>
    </View>
  );
}

function readinessColor(score: number | null | undefined): string {
  if (score == null) return colors.textTertiary;
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

type SleepReadinessFix = {
  needsSync: boolean;
  actionValue: string;
  route: Parameters<Nav['navigate']>[0];
};

function trainingSleepFix(
  sleepDetail: NonNullable<ReturnType<typeof appStore.getState>['today']>['sleepDetail'] | null,
): SleepReadinessFix {
  const needsSync = sleepNeedsMoreSync(sleepDetail);
  return {
    needsSync,
    actionValue: needsSync ? sleepSyncActionValue(sleepDetail) : 'review window',
    route: needsSync ? { name: 'device' } : { name: 'readiness' },
  };
}

function trainingPlan(input: {
  loadStatus: string;
  acwr: number | null;
  readinessScore: number | null;
  readinessConfidence: 'high' | 'medium' | 'low' | null;
  sleepStateConflict: boolean;
  sleepReadinessFix: SleepReadinessFix;
  recovery: number | null;
  intensity: { moderate: number; vigorous: number; total: number; goal: number } | null;
  hasFitnessInputs: boolean;
}): {
  badge: string;
  title: string;
  body: string;
  target: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  if (input.sleepStateConflict) {
    return {
      badge: 'CHECK',
      title: 'Review sleep before training',
      body: 'The overnight sleep window conflicts with strap-state evidence. Keep today easy until the window is fixed or more history arrives.',
      target: 'hold',
      actionLabel: 'Open readiness',
      actionValue: 'sleep state',
      icon: 'speedometer',
      color: colors.recoveryRed,
      route: { name: 'readiness' },
    };
  }

  if (input.readinessConfidence == null || input.readinessConfidence === 'low') {
    return {
      badge: 'DATA',
      title: input.sleepReadinessFix.needsSync ? 'Finish overnight sync first' : 'Resolve sleep confidence first',
      body: input.sleepReadinessFix.needsSync
        ? 'Training guidance depends on enough overnight coverage and signal. Let sync finish before using load to make a hard call.'
        : 'Training guidance depends on a trustworthy overnight recovery signal. Review the sleep window before using load to make a hard call.',
      target: 'hold',
      actionLabel: input.sleepReadinessFix.needsSync ? 'Open device sync' : 'Open readiness',
      actionValue: input.sleepReadinessFix.actionValue,
      icon: input.sleepReadinessFix.needsSync ? 'sync' : 'speedometer',
      color: colors.strainBlue,
      route: input.sleepReadinessFix.route,
    };
  }

  if (input.loadStatus === 'Well above recent baseline' || (input.acwr != null && input.acwr > 1.5)) {
    return {
      badge: 'REST',
      title: 'Absorb the load',
      body: 'Recent load is well above baseline. Use recovery, fatigue and symptoms to decide whether an easy day is appropriate; ACWR alone is not a risk verdict.',
      target: '0-5 strain',
      actionLabel: 'Plan recovery sleep',
      actionValue: 'recover',
      icon: 'moon',
      color: colors.recoveryRed,
      route: { name: 'sleepCoach' },
    };
  }

  if ((input.readinessScore != null && input.readinessScore < 50) || (input.recovery != null && input.recovery < 34)) {
    return {
      badge: 'EASY',
      title: 'Maintain, do not chase adaptation',
      body: 'Readiness/recovery is low. Choose low-intensity movement or technique work instead of load-building.',
      target: '5-8 strain',
      actionLabel: 'Open strain',
      actionValue: 'easy',
      icon: 'pulse',
      color: colors.recoveryYellow,
      route: { name: 'strain' },
    };
  }

  if (input.loadStatus === 'Below recent baseline' || (input.acwr != null && input.acwr < 0.8)) {
    return {
      badge: 'BUILD',
      title: 'Rebuild load carefully',
      body: 'Load is below your recent baseline. A controlled session may be a reasonable build if the rest of your evidence supports it.',
      target: '8-11 strain',
      actionLabel: 'Start workout',
      actionValue: 'aerobic',
      icon: 'play',
      color: colors.sleepTeal,
      route: { name: 'startMenu' },
    };
  }

  const intensityRemaining = input.intensity ? Math.max(0, input.intensity.goal - input.intensity.total) : null;
  if (intensityRemaining != null && intensityRemaining >= 45) {
    return {
      badge: 'MOVE',
      title: 'Close the weekly intensity gap',
      body: `${intensityRemaining} intensity minutes remain this week. A zone 2-3 HRR session gives the best return.`,
      target: trainingZoneTarget(2, 3),
      actionLabel: 'Start workout',
      actionValue: 'minutes',
      icon: 'play',
      color: colors.recoveryGreen,
      route: { name: 'startMenu' },
    };
  }

  if (!input.hasFitnessInputs) {
    return {
      badge: 'BASE',
      title: 'Improve fitness calibration',
      body: 'Set true max HR and keep wearing the strap overnight so VO2max, zones and load guidance sharpen.',
      target: 'inputs',
      actionLabel: 'Open device profile',
      actionValue: 'max HR',
      icon: 'watch',
      color: colors.strainBlue,
      route: { name: 'device' },
    };
  }

  return {
    badge: 'GO',
    title: 'Load is in a productive range',
    body: 'A purposeful session is appropriate. Pick the workout that fits the goal rather than adding junk volume.',
    target: '8-14 strain',
    actionLabel: 'Start workout',
    actionValue: 'quality',
    icon: 'play',
    color: colors.recoveryGreen,
    route: { name: 'startMenu' },
  };
}

const styles = StyleSheet.create({
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 22, fontFamily: fonts.black },
  statusDetail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  planBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  planBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  planTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  planBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 12, fontFamily: fonts.text },
  actRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  actName: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  actMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  disclaimer: { color: colors.textTertiary, fontSize: 11, lineHeight: 16, marginTop: 16, fontFamily: fonts.text },
  raceTime: { color: colors.text, fontSize: 18, fontFamily: fonts.black },
  raceLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: fonts.textBold },
  imTrack: { height: 10, backgroundColor: colors.surface, borderRadius: 5, overflow: 'hidden', marginTop: 12 },
  imFill: { height: 10, borderRadius: 5, backgroundColor: colors.recoveryGreen },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  prLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  prSub: { color: colors.textTertiary, fontSize: 12, marginTop: 1, fontFamily: fonts.text },
  prValue: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
});
