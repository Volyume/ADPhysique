import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, FAB, Screen, SectionLabel, Stat, Tile } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { illnessTint } from './IllnessScreen';
import { formatClock, formatDuration } from '../util/time';
import { DayRail } from './DayScreen';
import type { DailyMetricRow } from '../db/database';

export function HomeScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const liveRmssd = useStoreSelector(appStore, (s) => s.liveRmssd);
  const liveStress = useStoreSelector(appStore, (s) => s.liveStress);
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const illness = useStoreSelector(appStore, (s) => s.illness);
  const resilience = useStoreSelector(appStore, (s) => s.resilience);
  const cardioAge = useStoreSelector(appStore, (s) => s.cardioAge);
  const session = useStoreSelector(appStore, (s) => s.session);
  const steps = useStoreSelector(appStore, (s) => s.steps ?? s.bandSteps);
  const stepSource = useStoreSelector(appStore, (s) => s.stepSource);

  const recovery = today?.recovery ?? null;
  const strain = today?.strain ?? null;
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);
  // Composite Sleep Performance (WHOOP's headline) when available, else the
  // hours-vs-needed ratio as a fallback for older rows.
  const sleepPerf =
    today?.sleepDetail?.performance != null
      ? today.sleepDetail.performance / 100
      : today?.sleepPerf ?? null;

  const hm = useMemo(() => appStore.healthMonitor(), [today, recentDays]);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const days = useMemo(() => orderedDays(today, recentDays), [today, recentDays]);

  const todayCardio = cardio.filter((c) => c.startTs >= new Date().setHours(0, 0, 0, 0));
  const stressLabel =
    liveStress == null ? '—' : liveStress >= 2 ? 'High' : liveStress >= 1 ? 'Medium' : 'Low';

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

        {/* Three WHOOP dials: Sleep · Recovery · Strain */}
        <Card style={styles.dialCard}>
          <View style={styles.dialRow}>
            <Dial
              label="Sleep"
              main={sleepPerf != null ? `${Math.round(sleepPerf * 100)}%` : '—'}
              color={colors.sleepTeal}
              fraction={sleepPerf ?? 0}
              onPress={() => nav.navigate({ name: 'sleep' })}
            />
            <Dial
              label="Recovery"
              main={recovery != null ? `${recovery}%` : '—'}
              color={recoveryColor(recovery)}
              fraction={recovery != null ? recovery / 100 : 0}
              onPress={() => nav.navigate({ name: 'recovery' })}
            />
            <Dial
              label="Strain"
              main={strain != null ? strain.toFixed(1) : '—'}
              color={colors.strainBlue}
              fraction={strain != null ? strain / 21 : 0}
              onPress={() => nav.navigate({ name: 'strain' })}
            />
          </View>
        </Card>

        {/* Illness early-warning banner */}
        {illness && illness.level !== 'none' ? (
          <Pressable onPress={() => nav.navigate({ name: 'illness' })} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Card style={{ borderColor: illnessTint(illness.level), marginTop: 12 }}>
              <View style={styles.illnessHead}>
                <View style={[styles.illnessDot, { backgroundColor: illnessTint(illness.level) }]} />
                <Text style={styles.illnessTitle}>
                  {illness.level === 'major' ? 'Signs you may be getting sick' : 'Minor signs to watch'}
                </Text>
              </View>
              <Text style={styles.illnessSub}>
                {illness.flaggedCount} overnight vital{illness.flaggedCount > 1 ? 's' : ''} outside your typical range — tap for details.
              </Text>
            </Card>
          </Pressable>
        ) : null}

        {/* Health + Stress monitors — both tappable */}
        <View style={styles.grid}>
          <Tile
            title="Health Monitor"
            icon="pulse"
            color={hm.measuredCount && hm.inRangeCount === hm.measuredCount ? colors.recoveryGreen : colors.recoveryYellow}
            value={hm.measuredCount > 0 ? `${hm.inRangeCount}/${hm.measuredCount}` : '—'}
            sub={hm.measuredCount > 0 ? 'within range' : 'needs data'}
            onPress={() => nav.navigate({ name: 'health' })}
            style={styles.half}
          />
          <Tile
            title="Stress Monitor"
            icon="speedometer"
            color={colors.strainBlue}
            value={liveStress != null ? liveStress.toFixed(1) : '—'}
            sub={status === 'connected' ? `${stressLabel} · live` : 'not connected'}
            onPress={() => nav.navigate({ name: 'stress' })}
            style={styles.half}
          />
        </View>

        <View style={styles.grid}>
          <Tile
            title="Resilience"
            icon="shield-half"
            color={colors.recoveryGreen}
            value={resilience ? resilience.tier : '—'}
            sub={resilience ? `${resilience.days}-day trend` : 'needs ~1 week'}
            onPress={() => nav.navigate({ name: 'resilience' })}
            style={styles.half}
          />
          <Tile
            title="Heart Age"
            icon="heart"
            color={colors.strainBlue}
            value={cardioAge != null ? `${cardioAge}` : '—'}
            sub="cardiovascular est."
            onPress={() => nav.navigate({ name: 'metric', key: 'cardio_age' })}
            style={styles.half}
          />
        </View>

        <View style={styles.grid}>
          <Tile
            title="Readiness"
            icon="speedometer"
            color={
              readiness == null
                ? colors.textSecondary
                : readiness.score >= 70
                ? colors.recoveryGreen
                : readiness.score >= 50
                ? colors.recoveryYellow
                : colors.recoveryRed
            }
            value={readiness ? `${readiness.score}` : '—'}
            sub={readiness ? readiness.label : 'needs recovery'}
            onPress={() => nav.navigate({ name: 'readiness' })}
            style={styles.half}
          />
          <Tile
            title="Steps"
            icon="footsteps"
            color={colors.recoveryGreen}
            value={steps != null ? steps.toLocaleString() : '—'}
            sub={stepSource === 'band' ? 'WHOOP band' : stepSource === 'phone' ? 'phone pedometer' : 'waiting'}
            onPress={() => nav.navigate({ name: 'strain' })}
            style={styles.half}
          />
        </View>

        <View style={styles.grid}>
          <Tile
            title="Training Status"
            icon="fitness"
            color={colors.strainBlue}
            value=""
            sub="VO2max / load"
            onPress={() => nav.navigate({ name: 'training' })}
            style={{ flex: 1, marginTop: 0 }}
          />
        </View>

        {/* Live */}
        <SectionLabel>Live</SectionLabel>
        <Card onPress={() => nav.navigate({ name: 'device' })}>
          {status === 'connected' ? (
            <View style={styles.liveRow}>
              <Stat label="Heart rate" value={liveHr ?? '—'} unit="bpm" color={colors.recoveryRed} />
              <Stat label="HRV (awake)" value={liveRmssd != null ? Math.round(liveRmssd) : '—'} unit="ms" />
              <Stat label="Battery" value={battery ?? '—'} unit="%" />
            </View>
          ) : (
            <Empty text="Not connected. Tap to open the Device tab, pair your strap and start streaming." />
          )}
        </Card>

        {/* My Day / activities */}
        <SectionLabel>Today's activities</SectionLabel>
        <Card>
          {sleep ? (
            <View style={styles.actRow}>
              <Text style={styles.actName}>Sleep</Text>
              <Text style={styles.actMeta}>
                {formatDuration(sleep.asleepMin)} · {formatClock(sleep.startTs)}–{formatClock(sleep.endTs)}
              </Text>
            </View>
          ) : null}
          {todayCardio.length === 0 && !sleep ? (
            <Empty text="No activities yet today. Tap + to log one." />
          ) : (
            todayCardio.map((c) => (
              <View key={c.id} style={styles.actRow}>
                <Text style={styles.actName}>{c.activity}</Text>
                <Text style={styles.actMeta}>
                  {formatDuration(Math.round((c.endTs - c.startTs) / 60000))}
                  {c.distanceM != null ? ` · ${Math.round(c.distanceM)} m` : ''}
                  {c.steps != null ? ` · ${c.steps.toLocaleString()} steps` : ''}
                  {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
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
  liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  actName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actMeta: { color: colors.textSecondary, fontSize: 12 },
  illnessHead: { flexDirection: 'row', alignItems: 'center' },
  illnessDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  illnessTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  illnessSub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: fonts.text },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.recoveryRed, marginRight: 10 },
  recText: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
});

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}
