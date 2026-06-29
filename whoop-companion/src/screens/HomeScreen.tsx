import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, PrimaryButton, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, recoveryColor } from '../ui/theme';
import { formatClock, formatDuration } from '../util/time';

export type HomeTab = 'recovery' | 'sleep' | 'strain';

export function HomeScreen({ onNavigate }: { onNavigate?: (tab: HomeTab) => void }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const liveRmssd = useStoreSelector(appStore, (s) => s.liveRmssd);
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);

  const recovery = today?.recovery ?? null;
  const strain = today?.strain ?? null;
  const sleepPerf = today?.sleepPerf ?? null;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const healthOk = today?.rhr != null && today?.rmssd != null;
  const todayCardio = cardio.filter((c) => c.startTs >= new Date().setHours(0, 0, 0, 0));

  return (
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
            onPress={() => onNavigate?.('sleep')}
          />
          <Dial
            label="Recovery"
            main={recovery != null ? `${recovery}%` : '—'}
            color={recoveryColor(recovery)}
            fraction={recovery != null ? recovery / 100 : 0}
            onPress={() => onNavigate?.('recovery')}
          />
          <Dial
            label="Strain"
            main={strain != null ? strain.toFixed(1) : '—'}
            color={colors.strainBlue}
            fraction={strain != null ? strain / 21 : 0}
            onPress={() => onNavigate?.('strain')}
          />
        </View>
      </Card>

      {/* Health + Stress monitors */}
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Text style={styles.monitorTitle}>HEALTH MONITOR</Text>
          <Text style={[styles.monitorValue, { color: healthOk ? colors.recoveryGreen : colors.textTertiary }]}>
            {healthOk ? 'Within range' : '—'}
          </Text>
          <Text style={styles.monitorSub}>{healthOk ? 'RHR + HRV tracked' : 'needs overnight data'}</Text>
        </Card>
        <Card style={styles.half}>
          <Text style={styles.monitorTitle}>STRESS MONITOR</Text>
          <Text style={[styles.monitorValue, { color: colors.strainBlue }]}>
            {liveRmssd != null ? (liveRmssd >= 40 ? 'Low' : liveRmssd >= 25 ? 'Medium' : 'High') : '—'}
          </Text>
          <Text style={styles.monitorSub}>{status === 'connected' ? 'live' : 'not connected'}</Text>
        </Card>
      </View>

      {/* Live */}
      <SectionLabel>Live</SectionLabel>
      <Card>
        {status === 'connected' ? (
          <View style={styles.liveRow}>
            <Stat label="Heart rate" value={liveHr ?? '—'} unit="bpm" color={colors.recoveryRed} />
            <Stat label="Live HRV" value={liveRmssd != null ? Math.round(liveRmssd) : '—'} unit="ms" />
            <Stat label="Battery" value={battery ?? '—'} unit="%" />
          </View>
        ) : (
          <Empty text="Not connected. Open the Device tab to pair your strap and start streaming." />
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
          <Empty text="No activities yet today. Log one from the Strain tab." />
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

      <PrimaryButton title="Recalculate today" onPress={() => void appStore.recomputeToday()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  dialCard: { paddingVertical: 20 },
  dialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  half: { flex: 1 },
  monitorTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  monitorValue: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  monitorSub: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  actName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actMeta: { color: colors.textSecondary, fontSize: 12 },
});
