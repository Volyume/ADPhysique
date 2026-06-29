import { View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, Ring, Screen, SectionLabel, Stat } from '../ui/components';
import { Bar } from '../ui/components';
import { colors, recoveryColor } from '../ui/theme';

export function RecoveryScreen() {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const liveRmssd = useStoreSelector(appStore, (s) => s.liveRmssd);

  const recovery = today?.recovery ?? null;
  const withRec = recentDays.filter((d) => d.recovery != null).slice(0, 14);
  const maxRec = 100;

  return (
    <Screen title="Recovery">
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={recovery != null ? recovery / 100 : 0}
          color={recoveryColor(recovery)}
          centerTop="Recovery"
          centerMain={recovery != null ? `${recovery}%` : '—'}
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Stat label="Overnight HRV" value={today?.rmssd != null ? Math.round(today.rmssd) : '—'} unit="ms" />
        </Card>
        <Card style={{ flex: 1 }}>
          <Stat label="Resting HR" value={today?.rhr ?? '—'} unit="bpm" />
        </Card>
      </View>

      <Card>
        <Stat label="Live HRV (RMSSD, last ~2 min)" value={liveRmssd != null ? Math.round(liveRmssd) : '—'} unit="ms" />
      </Card>

      <SectionLabel>Last 14 days</SectionLabel>
      <Card>
        {withRec.length === 0 ? (
          <Empty text="No recovery history yet. Recovery appears after a couple of nights of overnight data to build your baseline." />
        ) : (
          withRec
            .slice()
            .reverse()
            .map((d) => (
              <Bar
                key={d.day}
                label={d.day.slice(5)}
                value={(d.recovery as number) / maxRec}
                color={recoveryColor(d.recovery)}
                right={`${d.recovery}%`}
              />
            ))
        )}
      </Card>

      <Empty text="Recovery blends overnight HRV vs your baseline, resting HR, and sleep performance. It is a local approximation, not WHOOP's exact score." />
    </Screen>
  );
}
