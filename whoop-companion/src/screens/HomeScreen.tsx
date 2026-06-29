import { Text, View, StyleSheet } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Dial, Empty, PrimaryButton, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, recoveryColor } from '../ui/theme';
import { formatDuration } from '../util/time';

export type HomeTab = 'recovery' | 'sleep' | 'strain';

export function HomeScreen({ onNavigate }: { onNavigate?: (tab: HomeTab) => void }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const liveRmssd = useStoreSelector(appStore, (s) => s.liveRmssd);
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);

  const recovery = today?.recovery ?? null;
  const strain = today?.strain ?? null;
  const sleepPerf = today?.sleepPerf ?? null;
  const sleepMin = today?.sleepMin ?? null;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen title="Today">
      <Text style={styles.date}>{dateLabel}</Text>

      {/* Three WHOOP dials — tap to open the detail page */}
      <Card style={styles.dialCard}>
        <View style={styles.dialRow}>
          <Dial
            label="Recovery"
            main={recovery != null ? `${recovery}%` : '—'}
            color={recoveryColor(recovery)}
            fraction={recovery != null ? recovery / 100 : 0}
            onPress={() => onNavigate?.('recovery')}
          />
          <Dial
            label="Sleep"
            main={sleepPerf != null ? `${Math.round(sleepPerf * 100)}%` : '—'}
            sub={sleepMin != null ? formatDuration(sleepMin) : undefined}
            color={colors.sleepTeal}
            fraction={sleepPerf ?? 0}
            onPress={() => onNavigate?.('sleep')}
          />
          <Dial
            label="Strain"
            main={strain != null ? strain.toFixed(1) : '—'}
            color={colors.strainBlue}
            fraction={strain != null ? strain / 21 : 0}
            onPress={() => onNavigate?.('strain')}
          />
        </View>
        {recovery == null ? (
          <Text style={styles.hint}>Wear the strap overnight — recovery &amp; sleep appear after a couple of nights.</Text>
        ) : null}
      </Card>

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

      <SectionLabel>Health monitor</SectionLabel>
      <View style={styles.grid}>
        <Card style={styles.half}>
          <Stat label="Resting HR" value={today?.rhr ?? '—'} unit="bpm" />
        </Card>
        <Card style={styles.half}>
          <Stat label="Overnight HRV" value={today?.rmssd != null ? Math.round(today.rmssd) : '—'} unit="ms" />
        </Card>
      </View>

      <PrimaryButton title="Recalculate today" onPress={() => void appStore.recomputeToday()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  dialCard: { paddingVertical: 20 },
  dialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 17 },
  liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
