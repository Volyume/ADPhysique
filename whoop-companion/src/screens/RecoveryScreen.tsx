import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, ContributorRow, Empty, MetricRow, NavRow, Ring, Screen, SectionLabel, WeeklyBars } from '../ui/components';
import type { DailyMetricRow } from '../db/database';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { fourTier } from '../metrics/bands';
import { illnessTint } from './IllnessScreen';
import { DayRail } from './DayScreen';

function avg(rows: DailyMetricRow[], pick: (r: DailyMetricRow) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function dow(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function orderedDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  if (today) byDay.set(today.day, today);
  for (const d of recent) byDay.set(d.day, d);
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

export function RecoveryScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const parts = useStoreSelector(appStore, (s) => s.recoveryParts);
  const hrvBal = useStoreSelector(appStore, (s) => s.hrvBal);
  const illness = useStoreSelector(appStore, (s) => s.illness);
  const res = useStoreSelector(appStore, (s) => s.resilience);
  const cardioAge = useStoreSelector(appStore, (s) => s.cardioAge);

  const recovery = today?.recovery ?? null;
  const prior = recentDays.filter((d) => d.day !== today?.day);
  const week = recentDays.slice(0, 7).reverse();
  const days = orderedDays(today, recentDays);

  return (
    <Screen title="Recovery" onBack={nav.canBack ? nav.back : undefined} tint={recoveryColor(recovery)}>
      <DayRail
        days={days}
        selected={today?.day ?? ''}
        onSelect={(selected) => nav.navigate({ name: 'day', day: selected })}
      />

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring
          value={recovery != null ? recovery / 100 : 0}
          color={recoveryColor(recovery)}
          centerTop="Recovery"
          centerMain={recovery != null ? `${recovery}%` : '—'}
          centerSub={recovery == null ? 'needs data' : recovery >= 67 ? 'primed' : recovery >= 34 ? 'maintaining' : 'rest needed'}
        />
      </Card>

      {/* Illness early-warning (recovery-independent) */}
      {illness && illness.level !== 'none' ? (
        <Pressable onPress={() => nav.navigate({ name: 'illness' })} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Card style={{ borderColor: illnessTint(illness.level) }}>
            <View style={styles.illnessHead}>
              <View style={[styles.illnessDot, { backgroundColor: illnessTint(illness.level) }]} />
              <Text style={styles.illnessTitle}>
                {illness.level === 'major' ? 'Major signs you may be getting sick' : 'Minor signs to watch'}
              </Text>
            </View>
            <Text style={styles.illnessSub}>
              {illness.flaggedCount} overnight vital{illness.flaggedCount > 1 ? 's' : ''} outside your typical range. Tap for the breakdown.
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {/* Recovery contributors — Oura-style four-tier */}
      {parts ? (
        <>
          <SectionLabel>Recovery contributors</SectionLabel>
          <Card>
            <ContributorRow
              label="HRV"
              percent={parts.hrvSub}
              value={fourTier(parts.hrvSub).label}
              color={fourTier(parts.hrvSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'hrv' })}
            />
            <ContributorRow
              label="Resting heart rate"
              percent={parts.rhrSub}
              value={fourTier(parts.rhrSub).label}
              color={fourTier(parts.rhrSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'rhr' })}
            />
            {parts.respSub != null ? (
              <ContributorRow
                label="Respiratory rate"
                percent={parts.respSub}
                value={fourTier(parts.respSub).label}
                color={fourTier(parts.respSub).color}
                onPress={() => nav.navigate({ name: 'metric', key: 'respiratory' })}
              />
            ) : null}
            <ContributorRow
              label="Sleep"
              percent={parts.sleepSub}
              value={fourTier(parts.sleepSub).label}
              color={fourTier(parts.sleepSub).color}
              onPress={() => nav.navigate({ name: 'metric', key: 'sleep_performance' })}
            />
          </Card>
        </>
      ) : null}

      {/* Vitals & trends */}
      <SectionLabel>Vitals</SectionLabel>
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
      </Card>

      {/* Insights */}
      <SectionLabel>Insights</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        <NavRow
          label="HRV Balance"
          icon="pulse"
          iconColor={fourTier(hrvBal?.score ?? null).color}
          value={hrvBal ? `${hrvBal.ratio}× · ${fourTier(hrvBal.score).label}` : 'needs data'}
          onPress={() => nav.navigate({ name: 'metric', key: 'hrv_balance' })}
        />
        <NavRow
          label="Resilience"
          icon="shield-half"
          iconColor={colors.recoveryGreen}
          value={res ? res.tier : 'needs ~1 week'}
          onPress={() => nav.navigate({ name: 'resilience' })}
        />
        <NavRow
          label="Cardiovascular Age"
          icon="heart"
          iconColor={colors.strainBlue}
          value={cardioAge != null ? `${cardioAge} yrs` : 'estimate'}
          onPress={() => nav.navigate({ name: 'metric', key: 'cardio_age' })}
        />
        <NavRow label="Sick-Risk Monitor" icon="medkit" iconColor={illnessTint(illness?.level)} value={illness ? (illness.level === 'none' ? 'No signs' : illness.level === 'minor' ? 'Minor' : 'Major') : '—'} onPress={() => nav.navigate({ name: 'illness' })} />
        <NavRow label="Health Monitor" icon="fitness" iconColor={colors.recoveryGreen} onPress={() => nav.navigate({ name: 'health' })} last />
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

      <Empty text="Recovery blends overnight HRV vs your baseline, resting HR, respiratory rate and sleep performance — a local approximation, not WHOOP's exact score." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  illnessHead: { flexDirection: 'row', alignItems: 'center' },
  illnessDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  illnessTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  illnessSub: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: fonts.text },
});
