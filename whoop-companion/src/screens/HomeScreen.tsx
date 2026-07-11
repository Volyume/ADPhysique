import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, FAB, Screen, SectionLabel } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatClock, formatDuration } from '../util/time';
import { clampPct } from '../util/number';
import { DayRail } from './DayScreen';
import { activitySummary } from '../ui/activityFormat';
import type { DailyMetricRow } from '../db/database';
import { longAutoSleepNeedsCorroboration, sleepStateWakeConflict } from '../metrics/sleepEvidence';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

export function HomeScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const draining = useStoreSelector(appStore, (s) => s.draining);
  const sleepCapture = useStoreSelector(appStore, (s) => s.sleepCapture);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const session = useStoreSelector(appStore, (s) => s.session);

  const recovery = today?.recovery ?? null;
  const strain = today?.strain ?? null;
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);
  const sleepPerformance = useStoreSelector(appStore, (s) => s.sleepPerformance);
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  // Composite Sleep Performance (WHOOP's headline) when available, else the
  // hours-vs-needed ratio as a fallback for older rows.
  const sleepPerf =
    today?.sleepDetail?.performance != null
      ? clampPct(today.sleepDetail.performance) / 100
      : today?.sleepPerf != null
        ? clampPct(Math.round(today.sleepPerf * 100)) / 100
        : null;
  const todaySleepTier = sleepTrustTier(today?.sleepDetail);
  const sleepNeedsReview = todaySleepTier === 'low';

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const days = useMemo(() => orderedDays(today, recentDays), [today, recentDays]);

  const todayCardio = cardio.filter((c) => c.startTs >= new Date().setHours(0, 0, 0, 0));
  const sleepDialSub =
    sleepNeedsReview
      ? 'review'
      : sleepPerformance?.cappedByConfidence && sleepPerformance.confidenceCapPct != null
      ? 'partial'
      : sleep
        ? 'last night'
        : 'awaiting';
  const todayFocus = dailyFocus({
    draining,
    sleepCapture,
    sleep,
    readiness,
    recovery,
    strain,
    sleepDebtMin: sleepNeed?.debtMin ?? null,
    sleepPerformanceCapped: !!sleepPerformance?.cappedByConfidence,
    sleepLowTrust: sleepNeedsReview,
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen title="VOLYUME Pulse">
        <Text style={styles.date}>{dateLabel}</Text>
        <DayRail
          days={days}
          selected={today?.day ?? ''}
          onSelect={(day) => nav.navigate({ name: 'day', day })}
        />

        {session ? (
          <Pressable onPress={() => nav.navigate({ name: 'liveSession' })} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Card style={{ borderColor: colors.recoveryRed, flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>Recording {session.label} — tap to resume</Text>
            </Card>
          </Pressable>
        ) : null}

        {/* Three core outcomes */}
        <Card style={styles.dialCard}>
          <View style={styles.dialRow}>
            <Dial
              label="Sleep"
              sub={sleepDialSub}
              main={sleepNeedsReview ? 'Review' : sleepPerf != null ? `${Math.round(sleepPerf * 100)}%` : '—'}
              color={sleepNeedsReview ? colors.recoveryRed : colors.sleepTeal}
              fraction={sleepNeedsReview ? 0 : sleepPerf ?? 0}
              size={88}
              onPress={() => nav.navigate({ name: 'sleep' })}
            />
            <Dial
              label="Recovery"
              main={recovery != null ? `${recovery}%` : '—'}
              color={recoveryColor(recovery)}
              fraction={recovery != null ? recovery / 100 : 0}
              size={88}
              onPress={() => nav.navigate({ name: 'recovery' })}
            />
            <Dial
              label="Strain"
              main={strain != null ? strain.toFixed(1) : '—'}
              color={colors.strainBlue}
              fraction={strain != null ? strain / 21 : 0}
              size={88}
              onPress={() => nav.navigate({ name: 'strain' })}
            />
          </View>
        </Card>

        {todayFocus ? (
          <Card onPress={() => nav.navigate(todayFocus.route)}>
            <View style={styles.focusHead}>
              <View style={[styles.focusBadge, { backgroundColor: todayFocus.color }]}>
                <Text style={styles.focusBadgeText}>{todayFocus.badge}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusTitle}>{todayFocus.title}</Text>
                <Text style={styles.focusBody}>{todayFocus.body}</Text>
              </View>
            </View>
            <Text style={[styles.focusAction, { color: todayFocus.color }]}>{todayFocus.action}</Text>
          </Card>
        ) : null}

        <SectionLabel>Today's activities</SectionLabel>
        <Card>
          {sleep ? (
            <Pressable onPress={() => nav.navigate({ name: 'sleep' })} style={({ pressed }) => [styles.actRow, pressed && styles.pressedRow]}>
              <View style={styles.actText}>
                <Text style={styles.actName}>Sleep</Text>
                <Text style={styles.actMeta}>
                  {formatDuration(sleep.asleepMin)} - {formatClock(sleep.startTs)}-{formatClock(sleep.endTs)}
                </Text>
              </View>
            </Pressable>
          ) : null}
          {todayCardio.length === 0 && !sleep ? (
            <Empty text="No activities yet today. Tap + to log one." />
          ) : (
            todayCardio.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => nav.navigate({ name: 'activity', id: c.id })}
                style={({ pressed }) => [styles.actRow, pressed && styles.pressedRow]}
              >
                <View style={styles.actText}>
                  <Text style={styles.actName}>{c.activity}</Text>
                  <Text style={styles.actMeta}>{activitySummary(c)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
        <View style={{ height: 76 }} />
      </Screen>
      <FAB onPress={() => nav.navigate({ name: 'startMenu' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  dialCard: { paddingVertical: 20 },
  dialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  half: { flex: 1, marginTop: 0 },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  actText: { flex: 1 },
  actName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  pressedRow: { opacity: 0.65 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.recoveryRed, marginRight: 10 },
  recText: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  focusBadge: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  focusBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  focusTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  focusBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  focusAction: { fontSize: 12, marginTop: 12, fontFamily: fonts.textBold },
});

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function longHrOnlyHomeCapture(capture: NonNullable<ReturnType<typeof appStore.getState>['sleepCapture']>): boolean {
  return longAutoSleepNeedsCorroboration(capture, false);
}

function energyColor(score: number | null | undefined): string {
  if (score == null) return colors.textSecondary;
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}


function dailyFocus(input: {
  draining: boolean;
  sleepCapture: ReturnType<typeof appStore.getState>['sleepCapture'];
  sleep: ReturnType<typeof appStore.getState>['lastSleep'];
  readiness: ReturnType<typeof appStore.getState>['trainingReadiness'];
  recovery: number | null;
  strain: number | null;
  sleepDebtMin: number | null;
  sleepPerformanceCapped: boolean;
  sleepLowTrust: boolean;
}): {
  badge: string;
  title: string;
  body: string;
  action: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} | null {
  if (sleepStateWakeConflict(input.sleepCapture)) {
    return null;
  }
  if (input.sleepCapture && longHrOnlyHomeCapture(input.sleepCapture)) {
    return null;
  }
  if (input.sleepLowTrust) {
    return null;
  }
  if (input.draining || !input.sleep || sleepNeedsMoreSync(input.sleepCapture) || input.sleepPerformanceCapped) {
    return null;
  }

  if (input.recovery != null && input.recovery < 34) {
    return {
      badge: 'REST',
      title: 'Protect recovery today',
      body: `Recovery is ${input.recovery}%. Keep strain low, prioritise hydration and plan an earlier sleep target tonight.`,
      action: 'Open Recovery',
      color: colors.recoveryRed,
      route: { name: 'recovery' },
    };
  }

  if (input.readiness && input.readiness.score < 50) {
    return {
      badge: 'EASY',
      title: 'Choose an easier training day',
      body: `Readiness is ${input.readiness.score}. Use today to maintain, not chase a peak workout.`,
      action: 'Open Readiness',
      color: colors.recoveryYellow,
      route: { name: 'readiness' },
    };
  }

  if ((input.sleepDebtMin ?? 0) >= 60) {
    return {
      badge: 'SLEEP',
      title: 'Pay down sleep debt tonight',
      body: `You are carrying ${formatDuration(input.sleepDebtMin ?? 0)} of sleep debt. Tonight’s plan matters more than another metric check.`,
      action: 'Open Sleep Coach',
      color: colors.sleepTeal,
      route: { name: 'sleepCoach' },
    };
  }

  if (input.recovery != null && input.recovery >= 67 && (input.strain ?? 0) < 8) {
    return {
      badge: 'PUSH',
      title: 'Good window to build fitness',
      body: `Recovery is ${input.recovery}% and strain is still low. Add a purposeful workout if your schedule allows.`,
      action: 'Start workout',
      color: colors.recoveryGreen,
      route: { name: 'startMenu' },
    };
  }

  return {
    badge: 'STEADY',
    title: 'Keep today steady',
    body: 'Your core signals are usable. Hold the plan, keep syncing in the background, and let trends guide bigger changes.',
    action: 'View trends',
    color: colors.sleepTeal,
    route: { name: 'trends' },
  };
}
