import { View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, Card, Empty, Screen, SectionLabel, Stat } from '../ui/components';
import { colors } from '../ui/theme';
import { formatClock, formatDuration } from '../util/time';

export function SleepScreen() {
  const sleep = useStoreSelector(appStore, (s) => s.lastSleep);

  if (!sleep) {
    return (
      <Screen title="Sleep">
        <Card>
          <Empty text="No sleep detected yet. Wear the strap overnight with the app connected (it keeps a background Bluetooth link), then recalculate from the Today tab." />
        </Card>
      </Screen>
    );
  }

  const total = sleep.inBedMin || 1;
  const perfPct = sleep.performance != null ? Math.round(sleep.performance * 100) : null;

  return (
    <Screen title="Sleep">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Stat label="Asleep" value={formatDuration(sleep.asleepMin)} color={colors.sleepTeal} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Stat label="Performance" value={perfPct != null ? `${perfPct}` : '—'} unit="%" color={colors.sleepTeal} />
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Lights out" value={formatClock(sleep.startTs)} />
          <Stat label="Woke" value={formatClock(sleep.endTs)} />
          <Stat label="Efficiency" value={`${Math.round(sleep.efficiency * 100)}`} unit="%" />
        </View>
      </Card>

      <SectionLabel>Stages</SectionLabel>
      <Card>
        <Bar label="Deep" value={sleep.stages.deep / total} color="#1E40AF" right={formatDuration(sleep.stages.deep)} />
        <Bar label="REM" value={sleep.stages.rem / total} color="#6D28D9" right={formatDuration(sleep.stages.rem)} />
        <Bar label="Light" value={sleep.stages.light / total} color={colors.sleepTeal} right={formatDuration(sleep.stages.light)} />
        <Bar label="Awake" value={sleep.stages.awake / total} color={colors.textTertiary} right={formatDuration(sleep.stages.awake)} />
      </Card>

      <Empty text="Sleep need is a baseline estimate; stages are inferred from overnight heart rate and movement (approximate, not WHOOP's proprietary staging)." />
    </Screen>
  );
}
