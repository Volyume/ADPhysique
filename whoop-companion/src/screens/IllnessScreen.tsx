import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { IllnessResult } from '../metrics/illness';

export function illnessTint(level: IllnessResult['level'] | undefined): string {
  if (level === 'major') return colors.recoveryRed;
  if (level === 'minor') return colors.recoveryYellow;
  return colors.recoveryGreen;
}

function levelLabel(level: IllnessResult['level']): string {
  return level === 'major' ? 'Major signs' : level === 'minor' ? 'Minor signs' : 'No signs';
}

export function IllnessScreen({ nav }: { nav: Nav }) {
  const illness = useStoreSelector(appStore, (s) => s.illness);
  const tint = illnessTint(illness?.level);

  return (
    <Screen title="Sick-Risk Monitor" onBack={nav.back} tint={tint}>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <View style={[styles.badge, { borderColor: tint }]}>
          <Text style={[styles.badgeText, { color: tint }]}>{illness ? levelLabel(illness.level) : '—'}</Text>
        </View>
        <Text style={styles.sub}>
          {illness == null
            ? 'Needs a couple of nights of overnight data to learn your baselines.'
            : illness.level === 'none'
            ? 'Your overnight vitals look normal versus your baseline.'
            : `${illness.flaggedCount} biometric${illness.flaggedCount > 1 ? 's' : ''} outside your typical range.`}
        </Text>
      </Card>

      {illness ? (
        <>
          <SectionLabel>Signals</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            {illness.signals.map((s, i) => (
              <View key={s.metric} style={[styles.row, i === illness.signals.length - 1 && styles.last]}>
                <View style={[styles.dot, { backgroundColor: s.flagged ? colors.recoveryYellow : colors.recoveryGreen }]} />
                <Text style={styles.rowLabel}>{s.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.rowVal, { color: s.flagged ? colors.recoveryYellow : colors.textSecondary }]}>
                  {s.z > 0 ? '+' : ''}
                  {s.z.toFixed(1)} SD
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel>How it works</SectionLabel>
      <Card>
        <Text style={styles.blurb}>
          This early-warning flag watches three overnight signals against your personal baseline: a
          rising resting heart rate, falling HRV, and a rising respiratory rate. A coordinated adverse
          move across them often precedes feeling unwell — sometimes a day before symptoms.
        </Text>
        <Text style={styles.note}>
          Note: Oura’s strongest illness signal is body temperature, which can’t be read over WHOOP
          Bluetooth — so this is honestly lower-sensitivity than a temperature-based version. It is a
          wellness indicator, not a medical diagnosis.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 },
  badgeText: { fontSize: 22, fontFamily: fonts.black },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 14, textAlign: 'center', lineHeight: 19, fontFamily: fonts.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  rowLabel: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  rowVal: { fontSize: 15, fontFamily: fonts.bold },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
});
