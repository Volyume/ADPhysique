import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getBlockReflectionData } from '../lib/database';
import { safeDate, safeToFixed } from '../lib/safeFormat';
import { SkeletonCard } from '../components/Skeleton';
import { selection as hapticSelection } from '../lib/haptics';
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(ms) {
  // EP-23/UI-11: a malformed/legacy ms value (bad restore/sync) would print
  // "NaN undefined NaN" through the manual getters below; guard it to an
  // omitted date, matching the empty-string fallback for a missing value.
  const d = safeDate(ms);
  if (!d) return '';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// O22: optional `tooltip` prop -- only Sets and Volume pass one (Sessions and
// Avg session need no gloss), so the other stat blocks render unchanged.
function StatBlock({ icon, value, label, tooltip = null }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.statBlock}>
      <Ionicons name={icon} size={20} color={t.colors.primary} style={styles.statIcon} />
      <Text style={[styles.statValue, live.statValue]}>{value}</Text>
      <View style={styles.statLabelRow}>
        <Text style={[styles.statLabel, live.statLabel]}>{label}</Text>
        {tooltip ? <InfoTooltip text={tooltip} size={11} /> : null}
      </View>
    </View>
  );
}

function buildNarrative(data) {
  const { meso, totalSessions, totalSets, tonnage, tonnageDelta, topExercise, avgDuration } = data;
  const name = meso?.name ?? 'this block';
  const weeks = meso?.plannedWeeks ?? meso?.planned_weeks ?? '';
  const lines = [];

  if (totalSessions > 0) {
    lines.push(`You completed ${totalSessions} session${totalSessions !== 1 ? 's' : ''} across ${weeks ? `${weeks}-week` : 'the'} block.`);
  }

  if (totalSets > 0) {
    lines.push(`That's ${totalSets.toLocaleString('en-GB')} working sets and ${tonnage.toLocaleString('en-GB')} kg lifted in total.`);
  }

  if (avgDuration > 0) {
    lines.push(`Your average session lasted ${avgDuration} minutes.`);
  }

  if (tonnageDelta !== null) {
    if (tonnageDelta > 5) {
      lines.push(`The weight you lifted each week climbed ${tonnageDelta}% from the first week to the last.`);
    } else if (tonnageDelta < -5) {
      lines.push(`You lifted less in the final week than the first, likely a recovery week.`);
    } else {
      lines.push(`Total lifted stayed consistent across the block.`);
    }
  }

  if (topExercise) {
    lines.push(`${topExercise} was your most-logged exercise this block.`);
  }

  if (lines.length === 0) {
    lines.push(`Block "${name}" is finished.`);
  }

  return lines;
}

const PR_TYPE_LABELS = {
  '1rm_estimate': 'Est. max',
  heaviest_weight: 'Heaviest weight',
  most_reps: 'Most reps',
};

export default function BlockReflectionScreen({ navigation, route }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const { mesocycleId } = route.params ?? {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
  })));
  const [data, setData] = useState(null);
  // Stage 8: the stored Block Ledger's per-muscle story.
  const [ledgerRows, setLedgerRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mesocycleId]);

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    if (!user?.id || !mesocycleId) {
      setData(null);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const d = await getBlockReflectionData(user.id, mesocycleId);
      if (!isCurrentRequest()) return;
      setData(d);
      // Stage 8 (§3.6): the block's stored ledger, muscle by muscle, in
      // the coach's own delta-composed words. Best-effort: the summary
      // renders without it.
      try {
        // eslint-disable-next-line global-require
        const { getAllMesocyclesForUser } = require('../lib/database');
        // eslint-disable-next-line global-require
        const { buildLedgerReflectionRows } = require('../lib/blockExplain');
        const mesos = await getAllMesocyclesForUser(user.id);
        const meso = mesos.find((m) => m.id === mesocycleId);
        const ledger = meso?.blockLedger ? JSON.parse(meso.blockLedger) : null;
        if (isCurrentRequest()) setLedgerRows(buildLedgerReflectionRows(ledger));
      } catch (_e) { if (isCurrentRequest()) setLedgerRows([]); }
    } catch (_) {
      if (!isCurrentRequest()) return;
      setData(null);
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  const narrative = data ? buildNarrative(data) : [];

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'left', 'right']}>
      <BackHeader
        title="Block summary"
        right={data ? (
          // COMP-005: this analytic screen gains the story as its front door.
          <TouchableOpacity
            onPress={() => { hapticSelection(); navigation.navigate('RecapStory', { variant: 'block', mesocycleId, blockName: data.meso?.name }); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Play block story"
          >
            <Ionicons name="play-circle-outline" size={24} color={t.colors.primary} />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard height={100} />
            <SkeletonCard height={160} />
            <SkeletonCard height={140} />
          </View>
        )}

        {!loading && loadError && (
          <EmptyState
            icon="warning-outline"
            title="Couldn't load block summary"
            text="Your sessions are safe. This is a loading problem, not lost data."
            actionLabel="Try again"
            onAction={loadData}
            compact
          />
        )}

        {!loading && !loadError && !data && (
          <EmptyState
            icon="calendar-outline"
            title="No data found"
            text="This block doesn't have any logged sessions yet."
            actionLabel="Start a new block"
            onAction={() => navigation.navigate('MesocycleBuilder')}
            compact
          />
        )}

        {data && (
          <>
            {/* Block title and dates */}
            <View style={styles.blockTitle}>
              <Text style={[styles.blockName, live.blockName]} accessibilityRole="header">{data.meso?.name ?? 'Training block'}</Text>
              {data.startDate ? (
                <Text style={[styles.blockDates, live.blockDates]}>
                  {fmtDate(data.startDate)}
                  {data.endDate ? ` – ${fmtDate(data.endDate)}` : ''}
                  {data.meso?.plannedWeeks ? ` · ${data.meso.plannedWeeks} weeks` : ''}
                </Text>
              ) : null}
            </View>

            {/* 4-stat row */}
            <View style={[styles.statsRow, live.statsRow]}>
              <StatBlock icon="barbell-outline" value={String(data.totalSessions)} label="Sessions" />
              <StatBlock icon="layers-outline" value={data.totalSets.toLocaleString('en-GB')} label="Sets" tooltip={GLOSSARY.workingSets} />
              <StatBlock
                icon="trending-up-outline"
                value={`${data.tonnage.toLocaleString('en-GB')} kg`}
                label="Total lifted"
                tooltip={GLOSSARY.tonnage}
              />
              {data.avgDuration > 0 && (
                <StatBlock icon="time-outline" value={`${data.avgDuration}m`} label="Avg session" />
              )}
            </View>

            {/* Narrative */}
            <View style={[styles.narrativeCard, live.narrativeCard]}>
              {narrative.map((line, i) => (
                <Text key={i} style={[styles.narrativeLine, live.narrativeLine]}>{line}</Text>
              ))}
            </View>

            {/* PRs set during this block */}
            {data.prs?.length > 0 && (
              <View style={[styles.section, live.section]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trophy-outline" size={16} color={t.colors.primary} />
                  <SectionLabel accessibilityRole="header">Records set this block</SectionLabel>
                  {/* D93 (Phase 3): same PR definition as the exercise
                      records surfaces - one meaning everywhere. */}
                  <InfoTooltip text={GLOSSARY.pr} size={12} />
                </View>
                {data.prs.map((pr, i) => {
                  const recordType = pr.recordType ?? pr.record_type;
                  return (
                    <View key={i} style={[styles.prRow, live.prRow]}>
                      <View style={styles.prInfo}>
                        <Text style={[styles.prExercise, live.prExercise]}>{pr.exerciseName ?? pr.exercise_name}</Text>
                        <View style={styles.prTypeRow}>
                          <Text style={[styles.prType, live.prType]}>{PR_TYPE_LABELS[recordType] ?? recordType}</Text>
                          {/* O22: GLOSSARY.estMax, reused rather than a new entry -- the
                              estimate concept is identical everywhere it appears. */}
                          {recordType === '1rm_estimate' && <InfoTooltip text={GLOSSARY.estMax} size={11} />}
                        </View>
                      </View>
                      <Text style={[styles.prValue, live.prValue]}>{safeToFixed(pr.value, 1)}{units}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Stage 8 (§3.6): what each muscle's block showed and what the
                next block does differently, in the coach's own words. */}
            {ledgerRows.length > 0 && (
              <View style={[styles.section, live.section]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="analytics-outline" size={16} color={t.colors.primary} />
                  <SectionLabel accessibilityRole="header">What this block showed</SectionLabel>
                </View>
                {ledgerRows.map((row) => (
                  <Text key={row.muscle} style={[styles.ledgerLine, live.ledgerLine]}>
                    {row.rationale}
                  </Text>
                ))}
              </View>
            )}

            {/* Best session */}
            {data.bestSession?.volume > 0 && (
              <View style={[styles.bestSessionCard, live.bestSessionCard]}>
                <Ionicons name="flash-outline" size={16} color={t.colors.primary} />
                <View style={styles.bestSessionInfo}>
                  <Text style={[styles.bestSessionLabel, live.bestSessionLabel]}>Best session</Text>
                  <Text style={[styles.bestSessionDate, live.bestSessionDate]}>{fmtDate(data.bestSession.startedAt)}</Text>
                </View>
                <Text style={[styles.bestSessionVolume, live.bestSessionVolume]}>
                  {Math.round(data.bestSession.volume).toLocaleString('en-GB')} kg
                </Text>
              </View>
            )}

            {/* What's next */}
            <View style={[styles.nextSection, live.nextSection]}>
              <Text style={[styles.nextTitle, live.nextTitle]} accessibilityRole="header">What's next</Text>
              <Text style={[styles.nextBody, live.nextBody]}>
                Take a few days of lighter activity to recover, then start your next block. That recovery is when your progress takes hold.
              </Text>
              <Button
                title="Start a new block"
                variant="tertiary"
                icon="add-circle-outline"
                fullWidth={false}
                onPress={() => {
                  navigation.goBack();
                  setTimeout(() => navigation.navigate('MesocycleBuilder'), 300);
                }}
                accessibilityLabel="Start a new block"
              />
            </View>
          </>
        )}

        <Button
          title="Done"
          variant="secondary"
          size="lg"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Done"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },


  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  blockTitle: { gap: spacing.xs },
  blockName: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  blockDates: { fontSize: fontSize.sm, color: colors.textMuted },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  statBlock: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs,
  },
  statIcon: { marginBottom: spacing.xxs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  statLabel: { ...type.caption, color: colors.textMuted },

  narrativeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  narrativeLine: { ...type.body, color: colors.textSecondary },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },

  // Stage 8: the ledger's per-muscle story lines.
  ledgerLine: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  prRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  prInfo: { flex: 1, gap: spacing.xxs },
  prExercise: { ...type.label, color: colors.textPrimary },
  prTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  prType: { ...type.caption, color: colors.textMuted },
  prValue: { ...type.num('bodyStrong'), color: colors.primary },

  bestSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.soft),
    padding: spacing.lg,
  },
  bestSessionInfo: { flex: 1, gap: spacing.xxs },
  bestSessionLabel: { ...type.label, color: colors.textPrimary },
  bestSessionDate: { ...type.num('caption'), color: colors.textMuted },
  bestSessionVolume: { ...type.num('title'), color: colors.primary },

  nextSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  nextTitle: { ...type.bodyStrong, color: colors.textPrimary },
  nextBody: { ...type.bodySm, color: colors.textSecondary },
});

// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): buildLiveStyles
// mirrors only the colour/fontSize/type-bearing sub-properties of the frozen
// `styles` block above, at identical rest values; pure layout keys (flex/
// padding/gap, no token) are correctly omitted. Same pattern as
// WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    blockName: { fontSize: t.fontSize.xxl, color: t.colors.textPrimary },
    blockDates: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    statsRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    statValue: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    statLabel: { ...t.type.caption, color: t.colors.textMuted },
    narrativeCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    narrativeLine: { ...t.type.body, color: t.colors.textSecondary },
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    prRow: { borderTopColor: t.colors.border },
    ledgerLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    prExercise: { ...t.type.label, color: t.colors.textPrimary },
    prType: { ...t.type.caption, color: t.colors.textMuted },
    prValue: { ...t.type.num('bodyStrong'), color: t.colors.primary },
    bestSessionCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.soft) },
    bestSessionLabel: { ...t.type.label, color: t.colors.textPrimary },
    bestSessionDate: { ...t.type.num('caption'), color: t.colors.textMuted },
    bestSessionVolume: { ...t.type.num('title'), color: t.colors.primary },
    nextSection: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    nextTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    nextBody: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
