import { View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, MetricRow, NavRow, Ring, Screen, SectionLabel, WeeklyBars } from '../ui/components';
import type { DailyMetricRow } from '../db/database';
import { colors, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';

function avg(rows: DailyMetricRow[], pick: (r: DailyMetricRow) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function dow(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

export function RecoveryScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);

  const recovery = today?.recovery ?? null;
  const prior = recentDays.filter((d) => d.day !== today?.day);
  const week = recentDays.slice(0, 7).reverse();

  return (
    <Screen title="Recovery" onBack={nav.canBack ? nav.back : undefined} tint={recoveryColor(recovery)}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={recovery != null ? recovery / 100 : 0}
          color={recoveryColor(recovery)}
          centerTop="Recovery"
          centerMain={recovery != null ? `${recovery}%` : '—'}
          centerSub={recovery == null ? 'needs data' : recovery >= 67 ? 'primed' : recovery >= 34 ? 'maintaining' : 'rest needed'}
        />
      </Card>

      <SectionLabel>Recovery contributors</SectionLabel>
      <Card>
        <MetricRow
          label="Heart rate variability"
          current={today?.rmssd != null ? Math.round(today.rmssd) : null}
          prior={avg(prior, (r) => r.rmssd)}
          unit=" ms"
          onPress={() => nav.navigate({ name: 'metric', key: 'hrv' })}
        />
        <MetricRow
          label="Resting heart rate"
          current={today?.rhr ?? null}
          prior={avg(prior, (r) => r.rhr)}
          unit=" bpm"
          betterWhenLower
          onPress={() => nav.navigate({ name: 'metric', key: 'rhr' })}
        />
        <MetricRow
          label="Respiratory rate"
          current={today?.resp != null ? Math.round(today.resp * 10) / 10 : null}
          prior={avg(prior, (r) => r.resp)}
          unit=" rpm"
          onPress={() => nav.navigate({ name: 'metric', key: 'respiratory' })}
        />
        <MetricRow
          label="Sleep performance"
          current={today?.sleepPerf != null ? Math.round(today.sleepPerf * 100) : null}
          prior={
            avg(prior, (r) => r.sleepPerf) != null ? Math.round((avg(prior, (r) => r.sleepPerf) as number) * 100) : null
          }
          unit="%"
          onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}
        />
      </Card>

      <Empty
        text={
          recovery == null
            ? 'Recovery appears after a couple of nights of overnight data to build your baseline.'
            : recovery < 34
              ? 'Recovery is low — your body is under strain. Prioritise rest, hydration and sleep today.'
              : recovery < 67
                ? 'Moderate recovery — you can train, but listen to your body.'
                : 'High recovery — your body is primed. A good day to push.'
        }
      />

      <SectionLabel>More vitals</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow label="Health Monitor" icon="pulse" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'health' })} />
        <NavRow label="Blood Oxygen (SpO₂)" icon="water" onPress={() => nav.navigate({ name: 'metric', key: 'spo2' })} />
        <NavRow label="Skin Temperature" icon="thermometer" onPress={() => nav.navigate({ name: 'metric', key: 'skin_temp' })} last />
      </Card>

      <SectionLabel>Weekly trends</SectionLabel>
      <Card>
        <SectionLabel>Recovery</SectionLabel>
        {week.length === 0 ? (
          <Empty text="No history yet." />
        ) : (
          <WeeklyBars
            data={week.map((d) => ({
              label: dow(d.day),
              value: d.recovery,
              display: d.recovery != null ? `${d.recovery}%` : '',
              color: recoveryColor(d.recovery),
            }))}
          />
        )}
      </Card>
      <Card>
        <SectionLabel>Heart rate variability</SectionLabel>
        {week.length === 0 ? (
          <Empty text="No history yet." />
        ) : (
          <WeeklyBars
            data={week.map((d) => ({
              label: dow(d.day),
              value: d.rmssd != null ? Math.round(d.rmssd) : null,
              display: d.rmssd != null ? `${Math.round(d.rmssd)}` : '',
              color: colors.recoveryGreen,
            }))}
          />
        )}
      </Card>

      <Empty text="Recovery blends overnight HRV vs your baseline, resting HR, respiratory rate and sleep performance. It is a local approximation, not WHOOP's exact score." />
    </Screen>
  );
}
