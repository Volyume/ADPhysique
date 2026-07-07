import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, FAB, Screen, SectionLabel, Stat, Tile } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { illnessTint } from './IllnessScreen';
import { formatClock, formatDuration } from '../util/time';
import { clampPct } from '../util/number';
import { DayRail } from './DayScreen';
import { activitySummary } from '../ui/activityFormat';
import type { DailyMetricRow } from '../db/database';

export function HomeScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const liveRmssd = useStoreSelector(appStore, (s) => s.liveRmssd);
  const liveStress = useStoreSelector(appStore, (s) => s.liveStress);
  const storedStress = useStoreSelector(appStore, (s) => s.storedStress);
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);
  const draining = useStoreSelector(appStore, (s) => s.draining);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const sleepCapture = useStoreSelector(appStore, (s) => s.sleepCapture);
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
  const energyReserve = useStoreSelector(appStore, (s) => s.energyReserve);
  // Composite Sleep Performance (WHOOP's headline) when available, else the
  // hours-vs-needed ratio as a fallback for older rows.
  const sleepPerf =
    today?.sleepDetail?.performance != null
      ? clampPct(today.sleepDetail.performance) / 100
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

  const stressValue = liveStress ?? storedStress;
  const stressTileLabel =
    stressValue == null ? '—' : stressValue >= 2 ? 'High' : stressValue >= 1 ? 'Medium' : 'Low';

  const signalMin = sleepCapture?.signalMin ?? 0;
  const coverage = sleepCapture?.coveragePct ?? 0;
  const effectiveSync = historySync ?? lastHistorySync;
  const syncProblem = isRetryableSyncProblem(effectiveSync);
  const decodedRange = formatDecodedRange(effectiveSync?.firstSampleTs, effectiveSync?.lastSampleTs);
  const syncLabel = draining
    ? syncProblem
      ? 'Recovering sync'
      : 'Syncing'
    : syncProblem
      ? 'Retrying sync'
      : lastSyncTs
        ? `Synced ${formatSyncAge(lastSyncTs)}`
        : status === 'connected'
          ? 'Waiting for sync'
          : 'Connect strap';

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

        {/* Sync/data trust */}
        <Card onPress={() => nav.navigate({ name: 'device' })}>
          <View style={styles.qualityHead}>
            <View style={[styles.qualityDot, { backgroundColor: qualityColor(coverage, signalMin, draining, syncProblem) }]} />
            <Text style={styles.qualityTitle}>Data quality</Text>
            <Text style={styles.qualityStatus}>{syncLabel}</Text>
          </View>
          <View style={styles.liveRow}>
            <Stat label="Sleep signal" value={signalMin || '-'} unit={signalMin ? 'min' : undefined} color={colors.sleepTeal} />
            <Stat label="Coverage" value={sleepCapture ? `${coverage}%` : '-'} color={qualityColor(coverage, signalMin, draining, syncProblem)} />
            <Stat label="History rows" value={effectiveSync?.decodedRecords ?? '-'} />
          </View>
          <Text style={styles.qualityMeta}>
            {decodedRange} / R-R {effectiveSync?.rrSamples ?? 0} / raw vitals {effectiveSync?.rawVitalSamples ?? 0}
          </Text>
          {effectiveSync?.status ? <Text style={styles.qualityNote}>{effectiveSync.status}</Text> : null}
          {sleepCapture?.note ? <Text style={styles.qualityNote}>{sleepCapture.note}</Text> : null}
        </Card>

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
            value={hm.measuredCount > 0 ? `${hm.inRangeCount}/${hm.measuredCount}` : hm.valueCount > 0 ? `${hm.valueCount}` : '—'}
            sub={hm.measuredCount > 0 ? 'within range' : hm.valueCount > 0 ? 'building ranges' : 'needs full sync'}
            onPress={() => nav.navigate({ name: 'health' })}
            style={styles.half}
          />
          <Tile
            title="Stress Monitor"
            icon="speedometer"
            color={colors.strainBlue}
            value={stressValue != null ? stressValue.toFixed(1) : '—'}
            sub={liveStress != null ? `${stressTileLabel} · live` : storedStress != null ? `${stressTileLabel} · synced` : status === 'connected' ? 'waiting for R-R' : 'needs synced R-R'}
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
            sub={resilience ? `${resilience.days}-day trend` : 'needs recovery nights'}
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
            title="Energy"
            icon="battery-charging"
            color={energyColor(energyReserve?.score)}
            value={energyReserve ? `${energyReserve.score}` : '—'}
            sub={energyReserve ? energyReserve.label : 'needs data'}
            onPress={() => nav.navigate({ name: 'energyReserve' })}
            style={styles.half}
          />
        </View>

        <View style={styles.grid}>
          <Tile
            title="Steps"
            icon="footsteps"
            color={colors.recoveryGreen}
            value={steps != null ? steps.toLocaleString() : '—'}
            sub={stepSource === 'band' ? 'band estimate' : stepSource === 'phone' ? 'phone pedometer' : 'waiting'}
            onPress={() => nav.navigate({ name: 'metric', key: 'steps' })}
            style={styles.half}
          />
          <Tile
            title="Training Status"
            icon="fitness"
            color={colors.strainBlue}
            value=""
            sub="VO2max / load"
            onPress={() => nav.navigate({ name: 'training' })}
            style={styles.half}
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
  liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  actText: { flex: 1 },
  actName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  pressedRow: { opacity: 0.65 },
  illnessHead: { flexDirection: 'row', alignItems: 'center' },
  illnessDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  illnessTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  illnessSub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: fonts.text },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.recoveryRed, marginRight: 10 },
  recText: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  qualityHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  qualityDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  qualityTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold, flex: 1 },
  qualityStatus: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.text },
  qualityMeta: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  qualityNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
});

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

function qualityColor(coverage: number, signalMin: number, syncing: boolean, syncProblem = false): string {
  if (syncing) return colors.strainBlue;
  if (syncProblem) return colors.recoveryYellow;
  if (coverage >= 60 && signalMin >= 120) return colors.recoveryGreen;
  if (signalMin >= 30) return colors.recoveryYellow;
  return colors.textTertiary;
}

function energyColor(score: number | null | undefined): string {
  if (score == null) return colors.textSecondary;
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function isRetryableSyncProblem(sync: { status: string; reason?: string } | null | undefined): boolean {
  if (!sync) return false;
  const status = sync.status.toLowerCase();
  return sync.reason === 'timeout' || status.includes('stalled') || status.includes('partial sync');
}

function formatSyncAge(ts: number): string {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatDecodedRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'No decoded range yet';
  const sameDay = new Date(firstTs).toDateString() === new Date(lastTs).toDateString();
  const first = new Date(firstTs).toLocaleString(undefined, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const last = new Date(lastTs).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `Decoded ${first}-${last}`;
}
