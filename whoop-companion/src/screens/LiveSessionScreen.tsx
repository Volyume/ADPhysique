import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appStore, SessionStats } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, PrimaryButton, SecondaryButton, Stat } from '../ui/components';
import { colors, fonts, strainZoneColors } from '../ui/theme';
import { Nav } from '../ui/navigation';

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
  const [now, setNow] = useState(Date.now());
  const [stats, setStats] = useState<SessionStats | null>(null);
  const ticked = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      ticked.current += 1;
      if (ticked.current % 5 === 0) void appStore.sessionStats().then(setStats);
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
  const tint = session.kind === 'sleep' ? colors.sleepTeal : session.kind === 'nap' ? colors.recoveryYellow : colors.strainBlue;
  const zoneMax = Math.max(1, ...(stats?.zones.map((z) => z.minutes) ?? [1]));

  const save = () => {
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

        <View style={styles.statRow}>
          <Stat label="Heart rate" value={liveHr ?? '—'} unit={liveHr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
          <Stat label="Avg HR" value={stats?.avgHr ?? '—'} unit={stats?.avgHr != null ? 'bpm' : undefined} />
          <Stat label="Max HR" value={stats?.maxHr ?? '—'} unit={stats?.maxHr != null ? 'bpm' : undefined} />
        </View>

        {isWorkout ? (
          <>
            <View style={styles.statRow}>
              <Stat label="Activity strain" value={stats?.strain != null ? stats.strain.toFixed(1) : '—'} color={colors.strainBlue} />
              <Stat label="Laps" value={session.laps.length} />
            </View>

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 20 },
  ended: { color: colors.textSecondary, textAlign: 'center', marginTop: 40, marginBottom: 16, fontFamily: fonts.text },
  kind: { fontSize: 13, letterSpacing: 1.4, fontFamily: fonts.textBold, marginTop: 20, textAlign: 'center' },
  timer: { color: colors.text, fontSize: 72, fontFamily: fonts.black, textAlign: 'center', marginTop: 6, letterSpacing: 1 },
  conn: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginBottom: 24, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 12 },
  sectionLabel: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.4, fontFamily: fonts.textBold, marginTop: 24, marginBottom: 4 },
  zones: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 24, fontFamily: fonts.text },
  controls: { padding: 16, gap: 4 },
});
