import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, Ring, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';

function readyColor(score: number): string {
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

export function ReadinessScreen({ nav }: { nav: Nav }) {
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);

  return (
    <Screen title="Readiness" onBack={nav.back} tint={colors.recoveryGreen}>
      <SectionLabel>Training readiness</SectionLabel>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        {readiness ? (
          <>
            <Ring
              value={readiness.score / 100}
              color={readyColor(readiness.score)}
              centerTop="Readiness"
              centerMain={`${readiness.score}`}
              centerSub={readiness.label}
            />
            <Text style={styles.note}>
              How ready your body is to take on strain today — fusing recovery, sleep, HRV, sleep debt
              and training load. (Estimate; richer than wrist-only because it uses full recovery + sleep.)
            </Text>
          </>
        ) : (
          <Empty text="Training readiness appears once you have a recovery or sleep score today." />
        )}
      </Card>

      {readiness ? (
        <Card>
          {readiness.contributors.map((c) => (
            <View key={c.key} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: c.good == null ? colors.textTertiary : c.good ? colors.recoveryGreen : colors.recoveryYellow }]} />
              <Text style={styles.rowLabel}>{c.label}</Text>
              <Text style={styles.rowValue}>{c.value}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            Recovery is the largest input — Training Readiness extends your Recovery score with sleep,
            HRV, sleep debt and how hard you've been training lately.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center', fontFamily: fonts.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  rowLabel: { color: colors.text, fontSize: 15, flex: 1, fontFamily: fonts.textSemibold },
  rowValue: { color: colors.textSecondary, fontSize: 15, fontFamily: fonts.bold },
});
