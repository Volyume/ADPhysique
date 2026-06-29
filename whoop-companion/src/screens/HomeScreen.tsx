import { View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, PrimaryButton, Ring, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, recoveryColor } from '../ui/theme';
import { formatDuration } from '../util/time';

export function HomeScreen() {
  const today = useStoreSelector(appStore, (s) => s.today);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const status = useStoreSelector(appStore, (s) => s.status);
  const battery = useStoreSelector(appStore, (s) => s.battery);

  const recovery = today?.recovery ?? null;

  return (
    <Screen title="Today">
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={recovery != null ? recovery / 100 : 0}
          color={recoveryColor(recovery)}
          centerTop="Recovery"
          centerMain={recovery != null ? `${recovery}%` : '—'}
          centerSub={recovery == null ? 'needs a few nights' : ''}
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Stat
            label="Day strain"
            value={today?.strain != null ? today.strain.toFixed(1) : '—'}
            color={colors.strainBlue}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Stat
            label="Sleep"
            value={today?.sleepMin != null ? formatDuration(today.sleepMin) : '—'}
            color={colors.sleepTeal}
          />
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Stat label="HRV" value={today?.rmssd != null ? Math.round(today.rmssd) : '—'} unit="ms" />
        </Card>
        <Card style={{ flex: 1 }}>
          <Stat label="Resting HR" value={today?.rhr ?? '—'} unit="bpm" />
        </Card>
      </View>

      <SectionLabel>Live</SectionLabel>
      <Card>
        {status === 'connected' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stat label="Heart rate" value={liveHr ?? '—'} unit="bpm" color={colors.recoveryRed} />
            <Stat label="Battery" value={battery != null ? `${battery}` : '—'} unit="%" />
          </View>
        ) : (
          <Empty text="Not connected. Open the Device tab to connect your strap and start streaming." />
        )}
      </Card>

      <PrimaryButton title="Recalculate today" onPress={() => void appStore.recomputeToday()} />
    </Screen>
  );
}
