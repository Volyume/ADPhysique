import { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, FAB, Screen, SectionLabel, Stat, Tile } from '../ui/components';
import { colors, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatClock, formatDuration } from '../util/time';

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

  const recovery = today?.recovery ?? null;
  const strain = today?.strain ?? null;
  const sleepPerf = today?.sleepPerf ?? null;

  const hm = useMemo(() => appStore.healthMonitor(), [today, recentDays]);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const todayCardio = cardio.filter((c) => c.startTs >= new Date().setHours(0, 0, 0, 0));
  const stressLabel =
    liveStress == null ? '—' : liveStress >= 2 ? 'High' : liveStress >= 1 ? 'Medium' : 'Low';

  return (
    <View style={{ flex: 1 }}>
      <Screen title="VOLYUME Pulse">
        <Text style={styles.date}>{dateLabel}</Text>

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
                  {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
            ))
          )}
        </Card>
      </Screen>
      <FAB onPress={() => nav.navigate({ name: 'logActivity' })} />
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
});
