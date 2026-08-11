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
import { navigateCrossTab } from '../navigation/navigateCrossTab';
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

  // FB-17 (D96): the comparison now runs first week vs last BUILD week
  // (database.getBlockReflectionData), so the climb line is reachable and
  // the down branch no longer hedges ("likely a recovery week") about a
  // week the app knows for certain was the deload.
  if (tonnageDelta !== null) {
    if (tonnageDelta > 5) {
      lines.push(`The weight you lifted each week climbed ${tonnageDelta}% from your first week to your last training week.`);
    } else if (tonnageDelta < -5) {
      lines.push(`Your last training week was lighter than your first, which can happen after a hard stretch.`);
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
          // RecapStory is a ProgressStack route and this screen is
          // ProfileStack-only, so the bare navigate was silently dropped and
          // the block recap was inert (D95, AUDIT-ROUTES 6 row 2).
          <TouchableOpacity
            onPress={() => { hapticSelection(); navigateCrossTab(navigation, 'ProgressTab', 'RecapStory', { variant: 'block', mesocycleId, blockName: data.meso?.name }); }}
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
            // FB-18 (D96): MesocycleBuilder cannot start a block; the Train
            // tab's block card is the only place that decision lives.
            actionLabel="Choose your next block"
            onAction={() => navigateCrossTab(navigation, 'PlansTab', 'Plans')}
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
                  <Ionicons name="barbell-outline" size={16} color={t.colors.primary} />
                  {/* FB-16 (D96): these rows are the best estimated max per
                      exercise WITHIN this block (database.js's
                      blockBestByExercise), never compared against a prior
                      block, a prior best or any record store. On a first
                      block every row is by construction a first-ever
                      performance -- the same set the logger deliberately
                      refuses to call a record ("logged as your starting
                      point", Wave A A1). Heading and gloss now say what the
                      rows are; the month and week variants of the block
                      story already got this right. No PR maths touched. */}
                  <SectionLabel accessibilityRole="header">Your best estimated max per lift</SectionLabel>
                  <InfoTooltip text={GLOSSARY.estMax} size={12} />
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

            {/* What's next.
                FB-18 (D96): the old copy told the user to "take a few days
                of lighter activity to recover" on the day they finished a
                recovery week as the block's final week -- the Train tab
                says "recovery week included" on the same screen-day. And
                both CTAs routed to MesocycleBuilder, which is read-only and
                has no create action anywhere in the file, so a button named
                "Start a new block" landed where no block can be started.
                The decision lives on the Train tab's block card, which is
                where the Home block sheet already sends it. */}
            <View style={[styles.nextSection, live.nextSection]}>
              <Text style={[styles.nextTitle, live.nextTitle]} accessibilityRole="header">What's next</Text>
              <Text style={[styles.nextBody, live.nextBody]}>
                Your recovery week is done, so the next step is choosing your next block. Nothing starts on its own.
              </Text>
              <Button
                title="Choose your next block"
                variant="tertiary"
                icon="arrow-forward-circle-outline"
                fullWidth={false}
                onPress={() => {
                  navigation.goBack();
                  setTimeout(() => navigateCrossTab(navigation, 'PlansTab', 'Plans'), 300);
                }}
                accessibilityLabel="Choose your next block"
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
