import { StyleSheet, Text, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, NavRow, Ring, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { sleepStateWakeConflict, sleepStateWakeDisplay } from '../metrics/sleepEvidence';
import { sleepNeedsMoreSync, sleepSyncActionValue } from '../metrics/sleepSync';

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
  const sleepNeed = useStoreSelector(appStore, (s) => s.sleepNeed);
  const sleepDetail = today?.sleepDetail ?? null;
  const sleepStateConflict = sleepStateWakeConflict(sleepDetail);
  const tonightDebtMin = sleepNeed?.debtMin ?? null;
  const trainingCall = readiness ? readinessCall(readiness, sleepDetail, tonightDebtMin) : null;
  const limiter = readiness ? readinessLimiter(readiness, sleepDetail, tonightDebtMin) : null;
  const sleepNeedsSync = sleepNeedsMoreSync(sleepDetail);
  const qualityAction =
    !readiness
      ? null
      : sleepStateConflict
        ? {
            label: 'Review sleep window',
            value: sleepStateWakeDisplay(sleepDetail),
            route: { name: 'editSleep' } as const,
            icon: 'create',
          }
      : readiness.missingInputs.includes('sleep performance') ||
          readiness.missingInputs.includes('recovery') ||
          sleepNeedsSync
        ? {
            label: 'Sync overnight data',
            value: sleepSyncActionValue(sleepDetail),
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
              <Stat
                label={sleepStateConflict ? 'Sleep state' : readiness.cappedByConfidence ? 'Score cap' : 'Sleep signal'}
                value={sleepStateConflict ? 'wake' : readiness.cappedByConfidence ? `${readiness.scoreCap}%` : sleepDetail?.signalMin ?? '-'}
                unit={!sleepStateConflict && !readiness.cappedByConfidence && sleepDetail?.signalMin != null ? 'min' : undefined}
                color={sleepStateConflict ? colors.recoveryRed : readiness.cappedByConfidence ? colors.recoveryYellow : undefined}
              />
            </View>
            <View style={styles.qualityHead}>
              <View style={[styles.dot, { backgroundColor: confidenceColor(readiness.confidence) }]} />
              <Text style={[styles.qualityTitle, { color: confidenceColor(readiness.confidence) }]}>
                {readiness.qualityLabel}
              </Text>
            </View>
            <Text style={styles.qualityNote}>
              {readiness.cappedByConfidence && readiness.scoreCap != null
                ? `${readiness.qualityNote} Score capped at ${readiness.scoreCap} until sleep confidence improves.`
                : readiness.qualityNote}
            </Text>
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
                  <Stat label="Sleep debt" value={tonightDebtMin != null ? `${Math.round(tonightDebtMin)}m` : '-'} />
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

          {limiter ? (
            <>
              <SectionLabel>Readiness limiter</SectionLabel>
              <Card>
                <View style={styles.callHead}>
                  <View style={[styles.callBadge, { backgroundColor: limiter.color }]}>
                    <Text style={styles.callBadgeText}>{limiter.badge}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callTitle}>{limiter.title}</Text>
                    <Text style={styles.callBody}>{limiter.body}</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <Stat label="Limiter" value={limiter.metric} color={limiter.color} />
                  <Stat label="Value" value={limiter.value} />
                  <Stat label="Confidence" value={`${readiness.confidencePct}%`} color={confidenceColor(readiness.confidence)} />
                </View>
                <NavRow
                  label={limiter.actionLabel}
                  icon={limiter.icon}
                  iconColor={limiter.color}
                  value={limiter.actionValue}
                  onPress={() => nav.navigate(limiter.route)}
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
                    { backgroundColor: contributorDotColor(c) },
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

function contributorDotColor(c: { key: string; value: string; good: boolean | null }): string {
  if (c.good == null) return colors.textTertiary;
  if (c.good) return colors.recoveryGreen;
  if (c.key === 'sleep_trust' && c.value.toLowerCase().includes('low')) return colors.recoveryRed;
  return colors.recoveryYellow;
}

function readinessLimiter(
  readiness: NonNullable<ReturnType<typeof appStore.getState>['trainingReadiness']>,
  sleepDetail: NonNullable<ReturnType<typeof appStore.getState>['today']>['sleepDetail'] | null,
  tonightDebtMin: number | null,
): {
  badge: string;
  title: string;
  body: string;
  metric: string;
  value: string;
  actionLabel: string;
  actionValue: string;
  icon: string;
  color: string;
  route: Parameters<Nav['navigate']>[0];
} {
  if (sleepStateWakeConflict(sleepDetail)) {
    return {
      badge: 'DATA',
      title: 'Sleep window is the limiter',
      body: 'Decoded strap-state evidence is mostly wake, so readiness should stay conservative until the sleep window is reviewed.',
      metric: 'Sleep state',
      value: sleepStateWakeDisplay(sleepDetail),
      actionLabel: 'Review sleep window',
      actionValue: 'state evidence',
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }

  if (readiness.confidence === 'low' || readiness.confidencePct < 55) {
    const needsSync = sleepNeedsMoreSync(sleepDetail);
    return {
      badge: 'DATA',
      title: 'Confidence is the limiter',
      body: 'The training call should stay conservative until sleep/recovery inputs are complete enough to trust.',
      metric: 'Confidence',
      value: `${readiness.confidencePct}%`,
      actionLabel: needsSync ? 'Sync overnight data' : 'Review sleep window',
      actionValue: sleepDetail?.coveragePct != null ? `${sleepDetail.coveragePct}% coverage` : 'quality',
      icon: needsSync ? 'sync' : 'create',
      color: colors.strainBlue,
      route: needsSync ? { name: 'device' } : { name: 'editSleep' },
    };
  }

  const debtMin = tonightDebtMin ?? 0;
  if (debtMin >= 60) {
    return {
      badge: 'DEBT',
      title: 'Sleep debt is holding readiness down',
      body: 'Debt raises your sleep need and makes otherwise decent recovery less durable under training load.',
      metric: 'Sleep debt',
      value: `${Math.round(debtMin)}m`,
      actionLabel: 'Plan tonight',
      actionValue: 'sleep',
      icon: 'moon',
      color: colors.recoveryYellow,
      route: { name: 'sleepCoach' },
    };
  }

  const weakContributor = readiness.contributors.find((c) => c.good === false);
  if (weakContributor) {
    const sleepTrustNeedsSync = sleepNeedsMoreSync(sleepDetail);
    const route =
      weakContributor.key === 'sleep_trust'
        ? (sleepTrustNeedsSync ? ({ name: 'device' } as const) : ({ name: 'editSleep' } as const))
        : weakContributor.key === 'sleep' || weakContributor.key === 'debt'
        ? ({ name: 'sleep' } as const)
        : weakContributor.key === 'load'
          ? ({ name: 'training' } as const)
          : weakContributor.key === 'hrv'
            ? ({ name: 'recovery' } as const)
            : ({ name: 'recovery' } as const);
    return {
      badge: 'FOCUS',
      title: `${weakContributor.label} is the weak link`,
      body: limiterBody(weakContributor.key),
      metric: weakContributor.label,
      value: weakContributor.value,
      actionLabel: weakContributor.key === 'sleep_trust'
        ? sleepTrustNeedsSync ? 'Sync more data' : 'Review sleep window'
        : 'Open detail',
      actionValue: weakContributor.label.toLowerCase(),
      icon: weakContributor.key === 'sleep_trust'
        ? sleepTrustNeedsSync ? 'sync' : 'create'
        : weakContributor.key === 'load' ? 'barbell' : weakContributor.key === 'sleep' || weakContributor.key === 'debt' ? 'moon' : 'pulse',
      color: weakContributor.key === 'sleep_trust' ? colors.strainBlue : colors.recoveryYellow,
      route,
    };
  }

  return {
    badge: 'READY',
    title: 'No single limiter stands out',
    body: 'The major readiness inputs are aligned. Use the training call to choose quality over random extra volume.',
    metric: 'Balanced',
    value: readiness.label,
    actionLabel: 'Start workout',
    actionValue: 'quality',
    icon: 'play',
    color: colors.recoveryGreen,
    route: { name: 'startMenu' },
  };
}

function limiterBody(key: string): string {
  if (key === 'recovery') return 'Recovery is the largest readiness input, so low recovery should steer the whole day easier.';
  if (key === 'sleep') return 'Sleep performance is dragging the readiness blend down. Fixing sleep usually beats forcing more training.';
  if (key === 'sleep_trust') return 'Sleep quality may be fine, but the capture itself is not strong enough to support a hard training call yet.';
  if (key === 'debt') return 'Debt compounds across nights; paying it down is the cleanest way to lift readiness.';
  if (key === 'hrv') return 'HRV balance suggests your autonomic baseline is not fully settled yet.';
  if (key === 'load') return 'Recent load is the limiter. Keep today controlled so the acute spike does not become tomorrow’s recovery problem.';
  return 'This input is currently below the useful band for a harder training day.';
}

function readinessCall(
  readiness: NonNullable<ReturnType<typeof appStore.getState>['trainingReadiness']>,
  sleepDetail: NonNullable<ReturnType<typeof appStore.getState>['today']>['sleepDetail'] | null,
  tonightDebtMin: number | null,
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
  if (sleepStateWakeConflict(sleepDetail)) {
    return {
      badge: 'CHECK',
      title: 'Review sleep before training',
      body: 'The sleep window conflicts with strap-state evidence. Keep training easy until the window is fixed or more history arrives.',
      targetStrain: 'hold',
      actionLabel: 'Adjust sleep window',
      actionValue: sleepStateWakeDisplay(sleepDetail),
      icon: 'create',
      color: colors.recoveryRed,
      route: { name: 'editSleep' },
    };
  }

  if (readiness.confidence === 'low' || sleepNeedsMoreSync(sleepDetail)) {
    const needsSync = sleepNeedsMoreSync(sleepDetail);
    return {
      badge: 'DATA',
      title: needsSync ? 'Trust the signal before the session' : 'Review sleep before the session',
      body: needsSync
        ? 'Readiness is currently limited by sleep data quality. Finish syncing before choosing a hard workout.'
        : 'Readiness is currently limited by low sleep confidence despite usable signal. Review the sleep window before choosing a hard workout.',
      targetStrain: 'hold',
      actionLabel: needsSync ? 'Sync overnight data' : 'Review sleep window',
      actionValue: sleepSyncActionValue(sleepDetail),
      icon: needsSync ? 'sync' : 'create',
      color: colors.strainBlue,
      route: needsSync ? { name: 'device' } : { name: 'editSleep' },
    };
  }

  if (readiness.confidence === 'medium') {
    return {
      badge: 'CHECK',
      title: 'Good enough for controlled work',
      body: 'Readiness is usable, but not fully confident. Choose aerobic, technique or controlled strength work until the overnight signal is stronger.',
      targetStrain: readiness.score >= 70 ? '8-12' : '5-8',
      actionLabel: (sleepDetail?.coveragePct ?? 100) < 80 ? 'Improve sleep capture' : 'Open strain target',
      actionValue: `${readiness.confidencePct}% confidence`,
      icon: (sleepDetail?.coveragePct ?? 100) < 80 ? 'moon' : 'pulse',
      color: colors.recoveryYellow,
      route: (sleepDetail?.coveragePct ?? 100) < 80 ? { name: 'sleep' } : { name: 'strain' },
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
      actionValue: tonightDebtMin != null && tonightDebtMin >= 45 ? 'debt' : 'recover',
      icon: 'moon',
      color: colors.recoveryYellow,
      route: tonightDebtMin != null && tonightDebtMin >= 45 ? { name: 'sleepCoach' } : { name: 'strain' },
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
