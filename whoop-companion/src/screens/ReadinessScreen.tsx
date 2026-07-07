import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, NavRow, Ring, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';

function readyColor(score: number): string {
  if (score >= 70) return colors.recoveryGreen;
  if (score >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function confidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high') return colors.recoveryGreen;
  if (confidence === 'medium') return colors.recoveryYellow;
  return colors.recoveryRed;
}

export function ReadinessScreen({ nav }: { nav: Nav }) {
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);
  const today = useStoreSelector(appStore, (s) => s.today);
  const sleepDetail = today?.sleepDetail ?? null;
  const trainingCall = readiness ? readinessCall(readiness, sleepDetail) : null;
  const qualityAction =
    !readiness
      ? null
      : readiness.missingInputs.includes('sleep performance') ||
          readiness.missingInputs.includes('recovery') ||
          (sleepDetail?.coveragePct ?? 100) < 60
        ? {
            label: 'Sync overnight data',
            value: sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}% coverage` : 'needs sync',
            route: { name: 'device' } as const,
            icon: 'sync',
          }
        : readiness.confidence !== 'high'
          ? {
              label: 'Review sleep window',
              value: readiness.qualityLabel,
              route: { name: 'editSleep' } as const,
              icon: 'create',
            }
          : null;

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
              How ready your body is to take on strain today, built from recovery, sleep, HRV balance,
              sleep debt and recent training load.
            </Text>
          </>
        ) : (
          <Empty text="Training readiness appears once you have a recovery or sleep score today." />
        )}
      </Card>

      {readiness ? (
        <>
          <SectionLabel>Readiness quality</SectionLabel>
          <Card>
            <View style={styles.statRow}>
              <Stat label="Confidence" value={`${readiness.confidencePct}%`} color={confidenceColor(readiness.confidence)} />
              <Stat label="Sleep coverage" value={sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}%` : '-'} />
              <Stat label="Sleep signal" value={sleepDetail?.signalMin ?? '-'} unit={sleepDetail?.signalMin != null ? 'min' : undefined} />
            </View>
            <View style={styles.qualityHead}>
              <View style={[styles.dot, { backgroundColor: confidenceColor(readiness.confidence) }]} />
              <Text style={[styles.qualityTitle, { color: confidenceColor(readiness.confidence) }]}>
                {readiness.qualityLabel}
              </Text>
            </View>
            <Text style={styles.qualityNote}>{readiness.qualityNote}</Text>
            {qualityAction ? (
              <NavRow
                label={qualityAction.label}
                icon={qualityAction.icon}
                iconColor={confidenceColor(readiness.confidence)}
                value={qualityAction.value}
                onPress={() => nav.navigate(qualityAction.route)}
                last
              />
            ) : null}
          </Card>

          {trainingCall ? (
            <>
              <SectionLabel>Today's training call</SectionLabel>
              <Card>
                <View style={styles.callHead}>
                  <View style={[styles.callBadge, { backgroundColor: trainingCall.color }]}>
                    <Text style={styles.callBadgeText}>{trainingCall.badge}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callTitle}>{trainingCall.title}</Text>
                    <Text style={styles.callBody}>{trainingCall.body}</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <Stat label="Target strain" value={trainingCall.targetStrain} color={trainingCall.color} />
                  <Stat label="Sleep debt" value={sleepDetail?.debtMin != null ? `${Math.round(sleepDetail.debtMin)}m` : '-'} />
                  <Stat label="Confidence" value={`${readiness.confidencePct}%`} color={confidenceColor(readiness.confidence)} />
                </View>
                <NavRow
                  label={trainingCall.actionLabel}
                  icon={trainingCall.icon}
                  iconColor={trainingCall.color}
                  value={trainingCall.actionValue}
                  onPress={() => nav.navigate(trainingCall.route)}
                  last
                />
              </Card>
            </>
          ) : null}

          <SectionLabel>Contributors</SectionLabel>
          <Card>
            {readiness.contributors.map((c) => (
              <View key={c.key} style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: c.good == null ? colors.textTertiary : c.good ? colors.recoveryGreen : colors.recoveryYellow },
                  ]}
                />
                <Text style={styles.rowLabel}>{c.label}</Text>
                <Text style={styles.rowValue}>{c.value}</Text>
              </View>
            ))}
            <Text style={styles.note}>
              Recovery remains the largest input; readiness then adjusts for sleep, HRV balance, sleep
              debt and how hard you have been training lately.
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function readinessCall(
  readiness: NonNullable<ReturnType<typeof appStore.getState>['trainingReadiness']>,
  sleepDetail: NonNullable<ReturnType<typeof appStore.getState>['today']>['sleepDetail'] | null,
): {
  badge: string;
  title: string;
  body: string;
  targetStrain: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  if (readiness.confidence === 'low' || (sleepDetail?.coveragePct ?? 100) < 60) {
    return {
      badge: 'DATA',
      title: 'Trust the signal before the session',
      body: 'Readiness is currently limited by sleep data quality. Finish syncing or review the sleep window before choosing a hard workout.',
      targetStrain: 'hold',
      actionLabel: 'Fix readiness confidence',
      actionValue: sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}% coverage` : 'needs sync',
      icon: (sleepDetail?.coveragePct ?? 100) < 60 ? 'sync' : 'create',
      color: colors.strainBlue,
      route: (sleepDetail?.coveragePct ?? 100) < 60 ? { name: 'device' } : { name: 'editSleep' },
    };
  }

  if (readiness.score >= 80) {
    return {
      badge: 'PUSH',
      title: 'Green light for a purposeful session',
      body: 'Your body is ready for higher strain. Choose a quality workout rather than adding random volume.',
      targetStrain: '10-14',
      actionLabel: 'Start workout',
      actionValue: 'quality',
      icon: 'play',
      color: colors.recoveryGreen,
      route: { name: 'startMenu' },
    };
  }

  if (readiness.score >= 60) {
    return {
      badge: 'BUILD',
      title: 'Build without overreaching',
      body: 'This is a solid day for aerobic work, technique, or a controlled strength session.',
      targetStrain: '8-12',
      actionLabel: 'Open strain target',
      actionValue: 'controlled',
      icon: 'pulse',
      color: colors.sleepTeal,
      route: { name: 'strain' },
    };
  }

  if (readiness.score >= 40) {
    return {
      badge: 'EASY',
      title: 'Keep it easy today',
      body: 'A lighter session can maintain momentum while protecting recovery for tomorrow.',
      targetStrain: '5-8',
      actionLabel: 'Open sleep plan',
      actionValue: sleepDetail?.debtMin != null && sleepDetail.debtMin >= 45 ? 'debt' : 'recover',
      icon: 'moon',
      color: colors.recoveryYellow,
      route: sleepDetail?.debtMin != null && sleepDetail.debtMin >= 45 ? { name: 'sleepCoach' } : { name: 'strain' },
    };
  }

  return {
    badge: 'REST',
    title: 'Recovery beats training today',
    body: 'Your system is not ready for meaningful load. Prioritise sleep, hydration and low-stress movement.',
    targetStrain: '0-5',
    actionLabel: 'Plan recovery sleep',
    actionValue: 'rest',
    icon: 'moon',
    color: colors.recoveryRed,
    route: { name: 'sleepCoach' },
  };
}

const styles = StyleSheet.create({
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center', fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qualityHead: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  qualityTitle: { fontSize: 14, fontFamily: fonts.textBold },
  qualityNote: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8, fontFamily: fonts.text },
  callHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  callBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  callBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  callTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  callBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  rowLabel: { color: colors.text, fontSize: 15, flex: 1, fontFamily: fonts.textSemibold },
  rowValue: { color: colors.textSecondary, fontSize: 15, fontFamily: fonts.bold },
});
