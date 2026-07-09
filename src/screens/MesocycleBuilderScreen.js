import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import { differenceInWeeks } from 'date-fns/differenceInWeeks';
import SvgBarSparkline from '../components/SvgBarSparkline';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import { SkeletonCard } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import {
  getAllMesocycles, getAllWorkouts, getCompletedWorkoutSets,
  getActivePlan, getRoutinesForPlan,
} from '../lib/database';
import { logError, logWarn } from '../lib/errorLog';
import { calculateTonnage } from '../lib/algorithms';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { predictDeloadWeek, evaluateAutoReg } from '../lib/mesocycle';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function MesocycleBuilderScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const [mesocycles, setMesocycles] = useState([]);
  const [activePlan, setActivePlanData] = useState(null);  // coach/manual-built plan
  const [activeStats, setActiveStats] = useState(null);   // { tonnageBars, recovery, deload }
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    if (user?.id) loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]));

  async function loadAll() {
    try {
      await Promise.all([loadMesocycles(), loadActiveStats(), loadActivePlan()]);
    } finally {
      setLoaded(true);
    }
  }

  async function loadMesocycles() {
    if (!user?.id) return;
    try {
      const mine = await getAllMesocycles(user.id);
      setMesocycles(mine);
    } catch (e) {
      logError('MesocycleBuilderScreen.loadMesocycles', e, { userId: user.id });
    }
  }

  async function loadActivePlan() {
    if (!user?.id) return;
    try {
      const plan = await getActivePlan(user.id);
      if (!plan) { setActivePlanData(null); return; }
      const routines = await getRoutinesForPlan(plan.id).catch(() => []);
      setActivePlanData({ ...plan, workoutCount: routines.length });
    } catch (_) {
      setActivePlanData(null);
    }
  }

  async function loadActiveStats() {
    if (!user?.id) return;
    try {
      const [mesoRows, workouts, sets] = await Promise.all([
        getAllMesocycles(user.id),
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
      ]);
      const active = mesoRows.find(m => m.isActive === 1 || m.isActive === true);
      if (!active?.startDate) { setActiveStats(null); return; }

      const startMs = new Date(active.startDate).getTime();
      const totalWeeks = active.durationWeeks || 4;

      // Per-week tonnage since start
      const tonnageBars = Array.from({ length: totalWeeks }, (_, wk) => {
        const wkStart = startMs + wk * WEEK_MS;
        const wkEnd   = wkStart + WEEK_MS;
        const wkSets = sets.filter(s => {
          const at = s.createdAt ?? s.created_at ?? 0;
          return at >= wkStart && at < wkEnd;
        });
        const currentWeek = getCurrentWeek(active);
        return {
          value: Math.round(calculateTonnage(wkSets)),
          label: `W${wk + 1}`,
          frontColor: wk + 1 === active.deloadWeek ? colors.warning
            : wk + 1 === currentWeek ? colors.primary
            : colors.primaryDim,
        };
      });

      // Recovery EMA from completed workouts with feedback
      const completed = workouts.filter(w => w.isCompleted ?? w.is_completed ?? false);
      const recovery = computeRecoveryEMAs(completed);

      // Last 4 workouts feedback window
      const recent = completed.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)).slice(0, 4);
      const feedbackWindow = recent.map(w => ({
        sessionDifficulty: w.sessionDifficulty ?? w.session_difficulty ?? 3,
        overallPump: w.overallPump ?? w.overall_pump ?? 3,
        soreness24hBefore: w.soreness24hBefore ?? w.soreness_24h_before ?? 0,
        fatigueLevel: w.fatigueLevel ?? w.fatigue_level ?? 3,
        jointDiscomfort: w.jointDiscomfort ?? 0,
      }));

      const autoReg = evaluateAutoReg(feedbackWindow);
      const currentWeek = getCurrentWeek(active);
      const deloadPrediction = predictDeloadWeek(feedbackWindow, currentWeek);

      setActiveStats({ tonnageBars, recovery, autoReg, deloadPrediction, active });
    } catch (e) {
      logWarn('MesocycleBuilderScreen.loadActiveStats', e?.message);
      setActiveStats(null);
    }
  }

  function getCurrentWeek(mesocycle) {
    if (!mesocycle?.startDate) return 1;
    const start = new Date(mesocycle.startDate);
    const week = differenceInWeeks(new Date(), start) + 1;
    return Math.min(Math.max(week, 1), mesocycle.durationWeeks || 4);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Training blocks" />
      <FlashList
        // The active block is already shown via ActiveMesoDashboard
        // in the header; "All blocks" is the archive of past blocks.
        data={mesocycles.filter(m => !(m.isActive === 1 || m.isActive === true))}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* ── Active plan (coach / manual built) ───── */}
            {activePlan && (
              <View style={styles.planCard}>
                <View style={styles.planCardHead}>
                  <Ionicons name="barbell" size={18} color={colors.primary} />
                  <Text style={styles.planCardTag}>Your active plan</Text>
                  <InfoTooltip
                    size={14}
                    text={
                      'A Training Block is a structured period, usually 4 to 8 weeks, ' +
                      'where your weekly sets gradually increase, then drop back during a lighter recovery week to let your body absorb the work.\n\n' +
                      'Your plan (the workouts and exercises) lives independently. A block is an ' +
                      'optional layer you add on top to track week-by-week progress across those weeks.\n\n' +
                      'After the block ends:\n' +
                      '• The block is archived in Past blocks below\n' +
                      '• Your plan keeps going. The workouts are still there.\n' +
                      '• Start a new block to begin the next training phase'
                    }
                  />
                </View>
                <Text style={styles.planCardName}>{activePlan.name}</Text>
                <Text style={styles.planCardMeta}>
                  {activePlan.splitType ? `${activePlan.splitType} · ` : ''}
                  {activePlan.workoutCount} workout{activePlan.workoutCount !== 1 ? 's' : ''}
                </Text>
                {activeStats?.active && (() => {
                  const activeMeso = activeStats.active;
                  const currentWeek = getCurrentWeek(activeMeso);
                  const totalWeeks = activeMeso.durationWeeks || 4;
                  const isDeload = activeMeso.deloadWeek != null && currentWeek === activeMeso.deloadWeek;
                  return (
                    <View style={styles.planWeekRow}>
                      <Text style={[styles.planWeekLabel, isDeload && styles.planWeekLabelDeload]}>
                        Week {currentWeek} of {totalWeeks}{isDeload ? ' · recovery week' : ''}
                      </Text>
                      <View style={styles.planWeekBar}>
                        {Array.from({ length: totalWeeks }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.planWeekDot,
                              i < currentWeek && styles.planWeekDotActive,
                              i + 1 === activeMeso.deloadWeek && styles.planWeekDotDeload,
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })()}
                {!activeStats?.active && (
                  <Text style={styles.planCardNote}>
                    This is the training your coach built. A training block is an
                    optional multi-week layer on top of it. Set a start date,
                    duration and recovery week to track periodised progress.
                  </Text>
                )}
              </View>
            )}

            {/* ── Active block dashboard ───────────────── */}
            {activeStats && (
              <ActiveMesoDashboard
                stats={activeStats}
                currentWeek={getCurrentWeek(activeStats.active)}
              />
            )}

            {mesocycles.some(m => !(m.isActive === 1 || m.isActive === true)) && (
              <Text style={styles.historyLabel}>Past blocks</Text>
            )}
          </>
        }
        renderItem={({ item: meso }) => {
          const isActive = meso.isActive === 1 || meso.isActive === true;
          const currentWeek = getCurrentWeek(meso);
          const totalWeeks = meso.durationWeeks || 4;
          return (
            <View style={[styles.mesoCard, isActive && styles.mesoCardActive]}>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
              <Text style={styles.mesoName}>{meso.name}</Text>
              <View style={styles.mesoMeta}>
                {meso.startDate && (
                  <Text style={styles.metaItem}>
                    {format(new Date(meso.startDate), 'MMM d')}
                    {meso.endDate ? ` · ${format(new Date(meso.endDate), 'MMM d')}` : ''}
                  </Text>
                )}
                {meso.focus ? <Text style={styles.metaItem}>{meso.focus}</Text> : null}
              </View>
              {!isActive && (
                <TouchableOpacity
                  style={styles.summaryBtn}
                  onPress={() => navigation.navigate('BlockReflection', { mesocycleId: meso.id })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`View summary of ${meso.name}`}
                >
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={styles.summaryBtnText}>View block summary</Text>
                </TouchableOpacity>
              )}
              {isActive && (
                <View style={styles.weekProgress}>
                  <View style={styles.weekProgressHeader}>
                    <Text style={styles.weekLabel}>Week {currentWeek} of {totalWeeks}</Text>
                    <InfoTooltip
                      size={13}
                      text={
                        `This block runs for ${totalWeeks} weeks` +
                        (meso.deloadWeek ? `. Week ${meso.deloadWeek} is your lighter recovery week.` : '.') +
                        '\n\nEach week your sets increase slightly until the recovery week, where the load drops so your body can absorb all the progress you have been making.\n\n' +
                        `When Week ${totalWeeks} is complete, the block closes and moves to Past blocks below. ` +
                        'Your plan keeps running. Start a new block to begin the next training phase.'
                      }
                    />
                  </View>
                  <View style={styles.weekBar}>
                    {Array.from({ length: totalWeeks }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.weekDot,
                          i < currentWeek && styles.weekDotActive,
                          i + 1 === meso.deloadWeek && styles.weekDotDeload,
                        ]}
                      />
                    ))}
                  </View>
                  {meso.deloadWeek && (
                    <Text style={styles.deloadLabel}>Week {meso.deloadWeek} = recovery week · {currentWeek < meso.deloadWeek ? `${meso.deloadWeek - currentWeek} week${meso.deloadWeek - currentWeek !== 1 ? 's' : ''} away` : currentWeek === meso.deloadWeek ? 'this week' : 'done'}</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !loaded ? (
            <View style={styles.skeletonWrap}>
              <SkeletonCard height={120} />
              <SkeletonCard height={72} />
            </View>
          ) : activeStats ? null : (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.surface3} />
              <Text style={styles.emptyTitle}>
                {activePlan ? 'No block running yet' : 'Your training blocks start here'}
              </Text>
              <Text style={styles.emptyText}>
                {activePlan
                  ? 'Your plan is active and ready to train. A training block adds week-by-week tracking on top, and one starts when you activate a plan.'
                  : 'Training blocks start when you activate a plan. Activate one to track week-by-week progress across a training phase.'}
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

    </SafeAreaView>
  );
}

// ─── Active meso dashboard card ──────────────────────────────────────────────

function ActiveMesoDashboard({ stats, currentWeek }) {
  const { tonnageBars, recovery, autoReg, deloadPrediction, active } = stats;
  const totalWeeks = active.durationWeeks || 4;
  const progress = Math.min(1, (currentWeek - 1) / Math.max(totalWeeks - 1, 1));
  const progressPct = `${Math.round(progress * 100)}%`;

  const hasTonnage = tonnageBars.some(b => b.value > 0);

  // Deload advice copy (jargon-free)
  let deloadCopy = null;
  if (autoReg?.action === 'deload_now') {
    deloadCopy = { text: autoReg.reason || 'Your body is signalling it needs a lighter week.', urgent: true };
  } else if (deloadPrediction?.weeksUntilDeload != null && deloadPrediction.weeksUntilDeload <= 2) {
    deloadCopy = { text: `A lighter week is likely in about ${deloadPrediction.weeksUntilDeload} week${deloadPrediction.weeksUntilDeload !== 1 ? 's' : ''}.`, urgent: false };
  }

  return (
    <View style={styles.dashCard}>
      {/* Header */}
      <View style={styles.dashHeader}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
        <Ionicons name="layers" size={16} color={colors.primary} />
      </View>
      <Text style={styles.dashName} numberOfLines={1}>{active.name}</Text>
      <Text style={styles.dashWeek}>
        Week {currentWeek} of {totalWeeks}
        {active.focus ? `  ·  ${active.focus}` : ''}
      </Text>

      {/* Progress track */}
      <View style={styles.progTrack}>
        <View style={[styles.progFill, { width: progressPct }]} />
      </View>

      {/* Weekly tonnage BarChart */}
      {hasTonnage && (
        <View style={styles.tonnageWrap}>
          <Text style={styles.tonnageLabel}>Weekly load (kg moved)</Text>
          <SvgBarSparkline
            data={tonnageBars.map(b => ({ value: b.value, label: b.label, color: b.frontColor }))}
            width={tonnageBars.length * 30}
            height={60}
            barWidth={24}
            barGap={6}
            showLabels
            labelColor={colors.textMuted}
          />
        </View>
      )}

      {/* Recovery row */}
      {(recovery.soreness != null || recovery.fatigue != null) && (
        <View style={styles.recovRow}>
          {recovery.soreness != null && (
            <View style={styles.recovItem}>
              <Text style={styles.recovValue}>{recovery.soreness.toFixed(1)}</Text>
              <Text style={styles.recovLabel}>Soreness</Text>
            </View>
          )}
          {recovery.fatigue != null && (
            <View style={styles.recovItem}>
              <Text style={styles.recovValue}>{recovery.fatigue.toFixed(1)}</Text>
              <Text style={styles.recovLabel}>Fatigue</Text>
            </View>
          )}
          {recovery.joint != null && (
            <View style={styles.recovItem}>
              <Text style={styles.recovValue}>{recovery.joint.toFixed(1)}</Text>
              <Text style={styles.recovLabel}>Joints</Text>
            </View>
          )}
        </View>
      )}

      {/* Deload advice banner */}
      {deloadCopy && (
        <View style={[styles.deloadBanner, deloadCopy.urgent && styles.deloadBannerUrgent]}>
          <Ionicons
            name={deloadCopy.urgent ? 'warning-outline' : 'information-circle-outline'}
            size={14}
            color={deloadCopy.urgent ? colors.error : colors.warning}
          />
          <Text style={[styles.deloadBannerText, deloadCopy.urgent && { color: colors.error }]}>
            {deloadCopy.text}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.background },
  list:  { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  historyLabel: {
    ...type.label, color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Active dashboard
  dashCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.primary, gap: spacing.md, marginBottom: spacing.xl,
  },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashName:   { ...type.title, color: colors.textPrimary },
  dashWeek:   { ...type.num('caption'), color: colors.textSecondary },
  progTrack:  { height: 4, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden' },
  progFill:   { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  tonnageWrap: { gap: spacing.xs },
  tonnageLabel: { ...type.caption, color: colors.textMuted },
  recovRow:   { flexDirection: 'row', gap: spacing.lg },
  recovItem:  { alignItems: 'center', gap: spacing.xxs },
  recovValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  recovLabel: { fontSize: fontSize.micro, color: colors.textMuted },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  deloadBannerUrgent: { backgroundColor: colors.errorBg, borderColor: colors.error },
  deloadBannerText: { ...type.captionTight, flex: 1, color: colors.warning },

  // Meso list cards
  mesoCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  mesoCardActive: { borderColor: colors.primary },
  activeBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryBg,
    borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
  },
  activeBadgeText: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.primary,
  },
  mesoName:   { ...type.title, color: colors.textPrimary },
  mesoMeta:   { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  metaItem:   { fontSize: fontSize.sm, color: colors.textSecondary },

  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
    padding: spacing.lg, gap: spacing.xs, marginBottom: spacing.lg,
  },
  planCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  planCardTag: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black,
    color: colors.primary,
  },
  planCardName: { ...type.h3, color: colors.textPrimary },
  planCardMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  planCardNote: {
    ...type.bodySm, color: colors.textMuted, marginTop: spacing.sm,
  },
  weekProgress: { gap: spacing.sm },
  weekProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabel:  { ...type.num('label'), color: colors.textSecondary },
  weekBar:    { flexDirection: 'row', gap: spacing.sm },
  weekDot:    { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2 },
  weekDotActive: { backgroundColor: colors.primary },
  weekDotDeload: { backgroundColor: withAlpha(colors.warning, 0.502) },
  deloadLabel: { ...type.num('caption'), color: colors.warning },

  // Empty
  skeletonWrap: { gap: spacing.md },
  empty:      { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { ...type.h3, color: colors.textSecondary },
  emptyText:  { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  summaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', marginTop: spacing.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm, borderWidth: 1, borderColor: withAlpha(colors.primary, 0.314),
    backgroundColor: colors.primaryBg,
  },
  summaryBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  // Plan card week indicator
  planWeekRow:       { gap: spacing.xs, marginTop: spacing.sm },
  planWeekLabel:     { ...type.num('label'), color: colors.primary },
  planWeekLabelDeload: { color: colors.warning },
  planWeekBar:       { flexDirection: 'row', gap: spacing.xs },
  planWeekDot:       { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface2 },
  planWeekDotActive: { backgroundColor: colors.primary },
  planWeekDotDeload: { backgroundColor: withAlpha(colors.warning, 0.502) },
});
