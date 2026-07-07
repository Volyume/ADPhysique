import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { appStore, SessionStats } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, PrimaryButton, SecondaryButton, Stat } from '../ui/components';
import { colors, fonts, strainZoneColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatDistance, formatPace } from '../sensors/location';
import { strainCategory, strainCoachText } from '../metrics/strainCoach';
import { kcalPerMinute } from '../metrics/calories';
import { STEP_META, stepAt, totalDurationSec } from '../data/structuredWorkouts';
import { activityUsesSteps } from '../data/activities';

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function LiveSessionScreen({ nav }: { nav: Nav }) {
  const session = useStoreSelector(appStore, (s) => s.session);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const status = useStoreSelector(appStore, (s) => s.status);
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const [now, setNow] = useState(Date.now());
  const [stats, setStats] = useState<SessionStats | null>(null);
  const ticked = useRef(0);
  const lastStepIdx = useRef(-1);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      ticked.current += 1;
      if (ticked.current % 2 === 0) void appStore.sessionStats().then(setStats);
      // Buzz on each structured-workout step change (and on completion).
      const s = appStore.getState().session;
      if (s?.plan) {
        const st = stepAt(s.plan, Math.round((Date.now() - s.startTs) / 1000));
        if (lastStepIdx.current === -1) lastStepIdx.current = st.index;
        else if (st.index !== lastStepIdx.current) {
          lastStepIdx.current = st.index;
          Vibration.vibrate(st.done ? [0, 300, 150, 300] : 250);
        }
      }
    }, 1000);
    void appStore.sessionStats().then(setStats);
    return () => clearInterval(id);
  }, []);

  if (!session) {
    // Session ended elsewhere — bail out.
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.ended}>No active session.</Text>
        <View style={{ paddingHorizontal: 16 }}>
          <PrimaryButton title="Back" onPress={nav.back} />
        </View>
      </SafeAreaView>
    );
  }

  const elapsed = Math.round((now - session.startTs) / 1000);
  const isWorkout = session.kind === 'workout';
  const plan = session.plan;
  const planState = plan ? stepAt(plan, elapsed) : null;
  const activityLabel = session.plan?.activity ?? session.label;
  const tint = session.kind === 'sleep' ? colors.sleepTeal : session.kind === 'nap' ? colors.recoveryYellow : colors.strainBlue;
  const zoneMax = Math.max(1, ...(stats?.zones.map((z) => z.minutes) ?? [1]));
  const usesSteps = session.kind === 'workout' && activityUsesSteps(activityLabel);
  const stepSource =
    stats?.stepSource === 'band' ? 'band est.' : stats?.stepSource === 'phone' ? 'phone' : 'waiting';
  const quality = recordingQuality({
    session,
    stats,
    status,
    elapsedSec: elapsed,
    usesSteps,
  });

  const save = () => {
    if (session.kind === 'workout' && quality.badge !== 'GOOD' && elapsed >= 60) {
      Alert.alert('Save low-quality recording?', quality.body, [
        { text: 'Keep recording', style: 'cancel' },
        {
          text: 'Save anyway',
          onPress: () => {
            void appStore.stopSession(true);
            nav.back();
          },
        },
      ]);
      return;
    }
    void appStore.stopSession(true);
    nav.back();
  };
  const discard = () => {
    Alert.alert('Discard session?', 'This recording will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { appStore.discardSession(); nav.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Text style={[styles.kind, { color: tint }]}>{session.label.toUpperCase()}</Text>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        <Text style={styles.conn}>{status === 'connected' ? 'strap connected' : 'strap not connected'}</Text>

        <View style={[styles.qualityBanner, { borderColor: quality.color }]}>
          <View style={[styles.qualityBadge, { backgroundColor: quality.color }]}>
            <Text style={styles.qualityBadgeText}>{quality.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qualityTitle}>{quality.title}</Text>
            <Text style={styles.qualityBody}>{quality.body}</Text>
          </View>
        </View>

        {plan && planState ? (
          planState.done ? (
            <View style={[styles.stepBanner, { borderColor: colors.recoveryGreen }]}>
              <Text style={[styles.stepKind, { color: colors.recoveryGreen }]}>WORKOUT COMPLETE</Text>
              <Text style={styles.stepHint}>All {plan.steps.length} steps done — tap “Finish & save”.</Text>
            </View>
          ) : (
            <View style={[styles.stepBanner, { borderColor: STEP_META[planState.step!.kind].color }]}>
              <Text style={[styles.stepKind, { color: STEP_META[planState.step!.kind].color }]}>
                {STEP_META[planState.step!.kind].label.toUpperCase()} · STEP {planState.index + 1}/{plan.steps.length}
              </Text>
              <Text style={styles.stepTime}>{fmt(Math.ceil(planState.stepRemaining))}</Text>
              <Text style={styles.stepHint}>
                {planState.step!.targetZone ? `Target zone ${planState.step!.targetZone}` : 'No HR target'} ·{' '}
                {fmt(Math.round(totalDurationSec(plan) - elapsed))} left of plan
              </Text>
            </View>
          )
        ) : null}

        <View style={styles.statRow}>
          <Stat label="Heart rate" value={liveHr ?? '—'} unit={liveHr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
          <Stat label="Avg HR" value={stats?.avgHr ?? '—'} unit={stats?.avgHr != null ? 'bpm' : undefined} />
          <Stat label="Max HR" value={stats?.maxHr ?? '—'} unit={stats?.maxHr != null ? 'bpm' : undefined} />
        </View>

        {isWorkout ? (
          <>
            {usesSteps ? (
            <View style={styles.statRow}>
              <Stat
                label="Steps"
                value={stats?.steps != null ? stats.steps.toLocaleString() : '—'}
                color={colors.recoveryGreen}
              />
              <Stat
                label="Cadence"
                value={stats?.cadenceSpm ?? '—'}
                unit={stats?.cadenceSpm != null ? 'spm' : undefined}
              />
              <Stat label="Step source" value={stepSource} />
            </View>
            ) : null}

            <View style={styles.statRow}>
              <Stat label="Activity strain" value={stats?.strain != null ? stats.strain.toFixed(1) : '—'} color={colors.strainBlue} />
              <Stat
                label="Calories"
                value={stats?.avgHr != null ? Math.round(kcalPerMinute(stats.avgHr, profile) * (elapsed / 60)) : '—'}
                color={colors.recoveryYellow}
              />
              <Stat label="Laps" value={session.laps.length} />
            </View>

            {stats?.strain != null ? (
              <Text style={styles.coach}>{strainCoachText(stats.strain, strainCategory(activityLabel))}</Text>
            ) : null}

            {session.hasGps ? (
              <>
                <View style={styles.statRow}>
                  <Stat label="Distance" value={formatDistance(session.distanceM)} color={colors.recoveryGreen} />
                  <Stat label="Pace" value={formatPace(session.distanceM ?? 0, elapsed)} />
                </View>
                <Text style={styles.sectionLabel}>ROUTE</Text>
                <View style={styles.mapBox}>
                  {session.route.length >= 2 ? (
                    <RouteTrace route={session.route} />
                  ) : (
                    <Text style={styles.mapHint}>Acquiring GPS… your route will draw here.</Text>
                  )}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>HEART-RATE ZONES</Text>
            <View style={styles.zones}>
              {(stats?.zones ?? []).map((z, i) => (
                <Bar key={z.zone} label={`Z${z.zone}`} value={z.minutes / zoneMax} color={strainZoneColors[i] ?? colors.strainBlue} right={`${z.minutes}m`} />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.hint}>
            {session.kind === 'sleep'
              ? 'Tracking your sleep. Tap “End & save” when you wake — Pulse scores sleep & recovery from your overnight heart rate.'
              : 'Tracking your nap. It will count toward today’s sleep need.'}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        {isWorkout ? <SecondaryButton title="Lap" onPress={() => appStore.addLap()} /> : null}
        <PrimaryButton title={session.kind === 'workout' ? 'Finish & save' : 'End & save'} onPress={save} />
        <SecondaryButton title="Discard" onPress={discard} />
      </View>
    </SafeAreaView>
  );
}

function recordingQuality({
  session,
  stats,
  status,
  elapsedSec,
  usesSteps,
}: {
  session: NonNullable<ReturnType<typeof appStore.getState>['session']>;
  stats: SessionStats | null;
  status: string;
  elapsedSec: number;
  usesSteps: boolean;
}): { badge: string; title: string; body: string; color: string } {
  const needsGps = session.kind === 'workout' && session.hasGps;
  const hasHr = (stats?.beats ?? 0) >= Math.max(5, Math.min(60, Math.floor(elapsedSec / 3)));
  const hasSteps = !usesSteps || stats?.steps != null;
  const hasGps = !needsGps || (session.route.length >= 2 && (session.distanceM ?? 0) > 0);

  if (status !== 'connected' && !hasHr) {
    return {
      badge: 'HR',
      title: 'Waiting for strap signal',
      body: 'Keep the strap nearby and connected so strain, zones and calories can be recorded.',
      color: colors.recoveryRed,
    };
  }

  if (elapsedSec >= 90 && !hasHr) {
    return {
      badge: 'HR',
      title: 'Heart-rate recording is thin',
      body: 'This workout will save, but strain and zone time need more heart-rate samples.',
      color: colors.recoveryYellow,
    };
  }

  if (elapsedSec >= 60 && needsGps && !hasGps) {
    return {
      badge: 'GPS',
      title: 'Acquiring route and distance',
      body: 'Keep the phone with you and allow location permission for pace, distance and the route trace.',
      color: colors.recoveryYellow,
    };
  }

  if (elapsedSec >= 60 && usesSteps && !hasSteps) {
    return {
      badge: 'STEP',
      title: 'Waiting for step source',
      body: 'Walking/running sessions need phone pedometer or calibrated band steps for cadence and step totals.',
      color: colors.recoveryYellow,
    };
  }

  if (session.kind === 'sleep' || session.kind === 'nap') {
    return {
      badge: 'REC',
      title: 'Timer is running',
      body: session.kind === 'sleep'
        ? 'Sleep timing will be saved as a window; synced overnight history still drives the detailed score.'
        : 'Nap timing and available HR will be saved, then credited against today’s sleep need.',
      color: session.kind === 'sleep' ? colors.sleepTeal : colors.recoveryYellow,
    };
  }

  return {
    badge: 'GOOD',
    title: 'Recording looks healthy',
    body: 'Heart rate is coming in and available sensors are contributing to the session.',
    color: colors.recoveryGreen,
  };
}

/** A self-scaling polyline of the GPS route (no map tiles / API key needed). */
function RouteTrace({ route }: { route: Array<{ lat: number; lng: number }> }) {
  const W = 320;
  const H = 150;
  const pad = 12;
  const lats = route.map((p) => p.lat);
  const lngs = route.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(1e-6, maxLat - minLat);
  const spanLng = Math.max(1e-6, maxLng - minLng);
  // Preserve aspect: use the larger span so the trace isn't stretched.
  const span = Math.max(spanLat, spanLng);
  const pts = route
    .map((p) => {
      const x = pad + ((p.lng - minLng) / span) * (W - 2 * pad);
      const y = H - pad - ((p.lat - minLat) / span) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={pts} fill="none" stroke={colors.recoveryGreen} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 20 },
  ended: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, marginBottom: 16, fontFamily: fonts.text },
  kind: { fontSize: 13, letterSpacing: 1.4, fontFamily: fonts.textBold, marginTop: 20, textAlign: 'center' },
  timer: { color: colors.text, fontSize: 72, fontFamily: fonts.black, textAlign: 'center', marginTop: 6, letterSpacing: 1 },
  conn: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginBottom: 24, fontFamily: fonts.text },
  qualityBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: colors.card, marginBottom: 8 },
  qualityBadge: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qualityBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  qualityTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  qualityBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 12 },
  sectionLabel: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.4, fontFamily: fonts.textBold, marginTop: 24, marginBottom: 4 },
  zones: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
  mapBox: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 8, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  mapHint: { color: colors.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 36, fontFamily: fonts.text },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 24, fontFamily: fonts.text },
  coach: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 12, fontFamily: fonts.text },
  stepBanner: { borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 4, backgroundColor: colors.card },
  stepKind: { fontSize: 13, letterSpacing: 1.2, fontFamily: fonts.textBold },
  stepTime: { color: colors.text, fontSize: 44, fontFamily: fonts.black, marginTop: 4 },
  stepHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: fonts.text },
  controls: { padding: 16, gap: 4 },
});
