import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, Ring, Screen, SectionLabel, WeeklyBars } from '../ui/components';
import { colors, fonts, recoveryColor } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { DailyMetricRow } from '../db/database';

const TIER_COLOR: Record<string, string> = {
  Exceptional: '#00f19f',
  Strong: '#43cb00',
  Solid: '#9bd64a',
  Adequate: '#ffde00',
  Limited: '#ff6422',
};

export function ResilienceScreen({ nav }: { nav: Nav }) {
  const res = useStoreSelector(appStore, (s) => s.resilience);
  const [history, setHistory] = useState<DailyMetricRow[]>([]);

  useEffect(() => {
    void appStore.loadHistory(14).then(setHistory);
  }, []);

  const tint = res ? TIER_COLOR[res.tier] ?? colors.recoveryGreen : colors.textTertiary;
  const bars = history.map((d) => ({
    label: d.day.slice(8),
    value: d.recovery,
    display: d.recovery != null ? `${d.recovery}` : '',
    color: recoveryColor(d.recovery),
  }));

  return (
    <Screen title="Resilience" onBack={nav.back} tint={tint}>
      <View style={styles.hero}>
        <Ring
          value={res ? res.score / 100 : 0}
          size={196}
          color={tint}
          centerTop="RESILIENCE"
          centerMain={res ? res.tier : '—'}
          centerSub={res ? `${res.days}-day trend` : 'needs ~1 week'}
        />
      </View>

      <SectionLabel>Recovery over the last 14 days</SectionLabel>
      <Card>
        {bars.some((b) => b.value != null) ? (
          <WeeklyBars data={bars} height={160} />
        ) : (
          <Empty text="Wear the strap overnight for a week or two to build your resilience trend." />
        )}
      </Card>

      <SectionLabel>About resilience</SectionLabel>
      <Card>
        <Text style={styles.blurb}>
          Resilience reflects how well your body is holding up over weeks, not just today. It blends
          your 14-day recovery trend with its night-to-night stability: consistently high recovery
          builds resilience; an erratic or declining trend lowers it.
        </Text>
        <View style={styles.tiers}>
          {(['Limited', 'Adequate', 'Solid', 'Strong', 'Exceptional'] as const).map((t) => (
            <View key={t} style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: TIER_COLOR[t] }]} />
              <Text style={[styles.tierLabel, res?.tier === t && styles.tierActive]}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          v1 uses your nightly recovery trend. A full Oura-style version also blends daytime stress
          recovery, which needs the strap’s motion stream — not yet decoded over Bluetooth.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 12 },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  tiers: { marginTop: 14 },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  tierLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  tierActive: { color: colors.text, fontFamily: fonts.textBold },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14, fontFamily: fonts.text },
});
