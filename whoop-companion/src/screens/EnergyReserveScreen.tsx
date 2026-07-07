import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { DailyMetricRow } from '../db/database';
import { Card, Empty, Ring, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { computeEnergyReserve, EnergyReserveEffect } from '../metrics/energyReserve';
import { clampPct, nullableClampPct } from '../util/number';

function energyColor(score: number | null | undefined): string {
  if (score == null) return colors.textTertiary;
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function effectColor(effect: EnergyReserveEffect): string {
  if (effect === 'charge') return colors.recoveryGreen;
  if (effect === 'drain') return colors.recoveryRed;
  return colors.textTertiary;
}

function trendLabel(trend: string): string {
  if (trend === 'charging') return 'Charging';
  if (trend === 'draining') return 'Draining';
  return 'Stable';
}

function scoreFromDay(d: DailyMetricRow): number | null {
  const sleepPerformance = nullableClampPct(
    d.sleepDetail?.performance ?? (d.sleepPerf != null ? Math.round(d.sleepPerf * 100) : null),
  );
  const stress = d.sleepDetail?.stressHigh != null ? (d.sleepDetail.stressHigh / 100) * 3 : null;
  return (
    computeEnergyReserve({
      recovery: d.recovery,
      sleepPerformance,
      sleepDebtMin: d.sleepDetail?.debtMin ?? 0,
      hrvBalance: null,
      strain: d.strain,
      stress,
    })?.score ?? null
  );
}

function recentTrendDays(today: DailyMetricRow | null, recent: DailyMetricRow[]): DailyMetricRow[] {
  const byDay = new Map<string, DailyMetricRow>();
  for (const d of [today, ...recent]) {
    if (d) byDay.set(d.day, d);
  }
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 7).reverse();
}

function inputState(ok: boolean): { value: string; color: string } {
  return ok ? { value: 'Ready', color: colors.recoveryGreen } : { value: '-', color: colors.textTertiary };
}

function energyQualityNote(input: {
  recovery: number | null;
  sleep: number | null;
  stress: number | null;
  strain: number | null;
  debtMin: number | null;
}): string {
  const missing = [
    input.recovery == null ? 'recovery' : null,
    input.sleep == null ? 'sleep' : null,
    input.stress == null ? 'stress' : null,
    input.strain == null ? 'strain' : null,
    input.debtMin == null ? 'sleep debt' : null,
  ].filter((v): v is string => v != null);
  if (!missing.length) return 'Energy Reserve is using overnight charge, sleep debt, stress and activity drain.';
  return `Energy Reserve is usable, but still waiting for ${missing.join(', ')} to make it sharper.`;
}

export function EnergyReserveScreen({ nav }: { nav: Nav }) {
  const energyReserve = useStoreSelector(appStore, (s) => s.energyReserve);
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const stress = useStoreSelector(appStore, (s) => s.liveStress ?? s.storedStress);
  const trendDays = recentTrendDays(today, recentDays);
  const todaySleepPerf = nullableClampPct(
    today?.sleepDetail?.performance ?? (today?.sleepPerf != null ? Math.round(today.sleepPerf * 100) : null),
  );
  const bars = trendDays.map((d) => {
    const score = scoreFromDay(d);
    return {
      label: d.day.slice(8),
      value: score,
      display: score != null ? `${score}` : '',
      color: energyColor(score),
    };
  });
  const recoveryState = inputState(today?.recovery != null);
  const sleepState = inputState(todaySleepPerf != null);
  const stressState = inputState(stress != null);
  const strainState = inputState(today?.strain != null);

  return (
    <Screen title="Energy Reserve" onBack={nav.back} tint={energyColor(energyReserve?.score)}>
      <SectionLabel>Energy</SectionLabel>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        {energyReserve ? (
          <>
            <Ring
              value={energyReserve.score / 100}
              color={energyColor(energyReserve.score)}
              centerTop="Energy"
              centerMain={`${energyReserve.score}`}
              centerSub={energyReserve.label}
            />
            <View style={styles.stats}>
              <Stat label="Trend" value={trendLabel(energyReserve.trend)} color={energyColor(energyReserve.score)} />
              <Stat label="Stress" value={stress != null ? stress.toFixed(1) : '-'} />
              <Stat label="Sleep debt" value={sleepNeed ? `${Math.round(sleepNeed.debtMin)}m` : '-'} />
            </View>
            <Text style={styles.note}>
              Usable energy from recovery, sleep charge, stress, strain and sleep debt.
            </Text>
          </>
        ) : (
          <Empty text="Energy Reserve appears once recovery, sleep, stress or strain data is available." />
        )}
      </Card>

      <SectionLabel>Energy quality</SectionLabel>
      <Card>
        <View style={styles.stats}>
          <Stat label="Recovery" value={recoveryState.value} color={recoveryState.color} />
          <Stat label="Sleep" value={sleepState.value} color={sleepState.color} />
          <Stat label="Stress" value={stressState.value} color={stressState.color} />
        </View>
        <View style={styles.statsTight}>
          <Stat label="Strain" value={strainState.value} color={strainState.color} />
          <Stat label="Sleep debt" value={sleepNeed ? 'Ready' : '-'} color={sleepNeed ? colors.recoveryGreen : colors.textTertiary} />
          <Stat label="Trend" value={energyReserve ? trendLabel(energyReserve.trend) : '-'} color={energyReserve ? energyColor(energyReserve.score) : colors.textTertiary} />
        </View>
        <Text style={styles.note}>
          {energyQualityNote({
            recovery: today?.recovery ?? null,
            sleep: todaySleepPerf,
            stress,
            strain: today?.strain ?? null,
            debtMin: sleepNeed?.debtMin ?? null,
          })}
        </Text>
      </Card>

      {energyReserve ? (
        <>
          <SectionLabel>Drivers</SectionLabel>
          <Card>
            {energyReserve.contributors.map((c) => (
              <View key={c.key} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: effectColor(c.effect) }]} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{c.label}</Text>
                  <Text style={styles.rowNote}>{c.note}</Text>
                </View>
                <Text style={styles.rowValue}>{c.value}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel>Last 7 days</SectionLabel>
      <Card>
        {bars.some((b) => b.value != null) ? (
          <WeeklyBars data={bars} height={130} />
        ) : (
          <Empty text="No Energy Reserve history yet." />
        )}
      </Card>

      <SectionLabel>Today</SectionLabel>
      <Card>
        <View style={styles.stats}>
          <Stat label="Recovery" value={today?.recovery != null ? `${today.recovery}%` : '-'} color={energyColor(today?.recovery)} />
          <Stat label="Sleep" value={todaySleepPerf != null ? `${clampPct(todaySleepPerf)}%` : '-'} color={colors.sleepTeal} />
          <Stat label="Strain" value={today?.strain != null ? today.strain.toFixed(1) : '-'} color={colors.strainBlue} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18, gap: 10 },
  statsTight: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 10, gap: 10 },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center', fontFamily: fonts.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  rowText: { flex: 1, paddingRight: 10 },
  rowLabel: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  rowNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 16, marginTop: 2, fontFamily: fonts.text },
  rowValue: { color: colors.textSecondary, fontSize: 15, fontFamily: fonts.bold },
});
