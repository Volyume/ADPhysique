import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import { differenceInWeeks } from 'date-fns/differenceInWeeks';
import SvgBarSparkline from '../components/SvgBarSparkline';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from '../components/InfoTooltip';
import { SkeletonCard } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
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
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // because this screen renders a FlashList (renderItem runs once per row).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
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
              <View style={[styles.planCard, live.planCard]}>
                <View style={styles.planCardHead}>
                  <Ionicons name="barbell" size={18} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.planCardTag, live.planCardTag]}>Your active plan</Text>
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
                <Text maxFontSizeMultiplier={1.3} style={[styles.planCardName, live.planCardName]}>{activePlan.name}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.planCardMeta, live.planCardMeta]}>
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
                      <Text maxFontSizeMultiplier={1.3} style={[styles.planWeekLabel, live.planWeekLabel, isDeload && [styles.planWeekLabelDeload, live.planWeekLabelDeload]]}>
                        Week {currentWeek} of {totalWeeks}{isDeload ? ' · recovery week' : ''}
                      </Text>
                      <View style={styles.planWeekBar}>
                        {Array.from({ length: totalWeeks }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.planWeekDot,
                              live.planWeekDot,
                              i < currentWeek && [styles.planWeekDotActive, live.planWeekDotActive],
                              i + 1 === activeMeso.deloadWeek && [styles.planWeekDotDeload, live.planWeekDotDeload],
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })()}
                {!activeStats?.active && (
                  <Text maxFontSizeMultiplier={1.3} style={[styles.planCardNote, live.planCardNote]}>
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.historyLabel, live.historyLabel]}>Past blocks</Text>
            )}
          </>
        }
        renderItem={({ item: meso }) => {
          const isActive = meso.isActive === 1 || meso.isActive === true;
          const currentWeek = getCurrentWeek(meso);
          const totalWeeks = meso.durationWeeks || 4;
          return (
            <View style={[styles.mesoCard, live.mesoCard, isActive && [styles.mesoCardActive, live.mesoCardActive]]}>
              {isActive && (
                <View style={[styles.activeBadge, live.activeBadge]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.activeBadgeText, live.activeBadgeText]}>Active</Text>
                </View>
              )}
              <Text maxFontSizeMultiplier={1.3} style={[styles.mesoName, live.mesoName]}>{meso.name}</Text>
              <View style={styles.mesoMeta}>
                {meso.startDate && (
                  <Text maxFontSizeMultiplier={1.3} style={[styles.metaItem, live.metaItem]}>
                    {format(new Date(meso.startDate), 'MMM d')}
                    {meso.endDate ? ` · ${format(new Date(meso.endDate), 'MMM d')}` : ''}
                  </Text>
                )}
                {meso.focus ? <Text maxFontSizeMultiplier={1.3} style={[styles.metaItem, live.metaItem]}>{meso.focus}</Text> : null}
              </View>
              {!isActive && (
                <Button
                  title="View block summary"
                  icon="document-text-outline"
                  variant="tertiary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.navigate('BlockReflection', { mesocycleId: meso.id })}
                  style={[styles.summaryBtn, live.summaryBtn]}
                  textStyle={[styles.summaryBtnText, live.summaryBtnText]}
                  accessibilityLabel={`View summary of ${meso.name}`}
                />
              )}
              {isActive && (
                <View style={styles.weekProgress}>
                  <View style={styles.weekProgressHeader}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.weekLabel, live.weekLabel]}>Week {currentWeek} of {totalWeeks}</Text>
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
                          live.weekDot,
                          i < currentWeek && [styles.weekDotActive, live.weekDotActive],
                          i + 1 === meso.deloadWeek && [styles.weekDotDeload, live.weekDotDeload],
                        ]}
                      />
                    ))}
                  </View>
                  {meso.deloadWeek && (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.deloadLabel, live.deloadLabel]}>Week {meso.deloadWeek} = recovery week · {currentWeek < meso.deloadWeek ? `${meso.deloadWeek - currentWeek} week${meso.deloadWeek - currentWeek !== 1 ? 's' : ''} away` : currentWeek === meso.deloadWeek ? 'this week' : 'done'}</Text>
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
            <EmptyState
              icon="calendar-outline"
              title={activePlan ? 'No block running yet' : 'Your training blocks start here'}
              text={activePlan
                ? 'Your plan is active and ready to train. A training block adds week-by-week tracking on top, and one starts when you activate a plan.'
                : 'Training blocks start when you activate a plan. Activate one to track week-by-week progress across a training phase.'}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

    </SafeAreaView>
  );
}

// ─── Active meso dashboard card ──────────────────────────────────────────────

// CP-10 batch G (2026-07-11): ActiveMesoDashboard is a sibling function-
// component scope (rendered via ListHeaderComponent, not prop-drilled
// `live`/`t` from MesocycleBuilderScreen), so its own useTheme() call is
// cleaner than threading two extra props through. Same shared
// buildLiveStyles(t) as the parent screen (CardioHistoryScreen/CardioTrend
// precedent, batch preceding this one).
function ActiveMesoDashboard({ stats, currentWeek }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
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
    <View style={[styles.dashCard, live.dashCard]}>
      {/* Header */}
      <View style={styles.dashHeader}>
        <View style={[styles.activeBadge, live.activeBadge]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.activeBadgeText, live.activeBadgeText]}>Active</Text>
        </View>
        <Ionicons name="layers" size={16} color={t.colors.primary} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.dashName, live.dashName]} numberOfLines={1}>{active.name}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.dashWeek, live.dashWeek]}>
        Week {currentWeek} of {totalWeeks}
        {active.focus ? `  ·  ${active.focus}` : ''}
      </Text>

      {/* Progress track */}
      <View style={[styles.progTrack, live.progTrack]}>
        <View style={[styles.progFill, live.progFill, { width: progressPct }]} />
      </View>

      {/* Weekly tonnage BarChart */}
      {hasTonnage && (
        <View style={styles.tonnageWrap}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.tonnageLabel, live.tonnageLabel]}>Weekly load (kg moved)</Text>
          {/* CP-10 batch G: the bar colour ternary resolves HERE, at render
              time, from the live theme -- the same deload/current/rest
              mapping loadActiveStats() bakes into frontColor (left in place
              but unused), the same wk+1 indexing, and the same
              getCurrentWeek(active) value (the parent passes it from the
              identical stats.active object). buildMarkStyle precedent
              (CardioHistoryScreen): the mapping is byte-identical, only
              WHERE the colour resolves changes, so a theme flip recolours
              the chart without waiting for a data reload. */}
          <SvgBarSparkline
            data={tonnageBars.map((b, i) => ({
              value: b.value,
              label: b.label,
              color: i + 1 === active.deloadWeek ? t.colors.warning
                : i + 1 === currentWeek ? t.colors.primary
                : t.colors.primaryDim,
            }))}
            width={tonnageBars.length * 30}
            height={60}
            barWidth={24}
            barGap={6}
            showLabels
            labelColor={t.colors.textMuted}
          />
        </View>
      )}

      {/* Recovery row */}
      {(recovery.soreness != null || recovery.fatigue != null) && (
        <View style={styles.recovRow}>
          {recovery.soreness != null && (
            <View style={styles.recovItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovValue, live.recovValue]}>{recovery.soreness.toFixed(1)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovLabel, live.recovLabel]}>Soreness</Text>
            </View>
          )}
          {recovery.fatigue != null && (
            <View style={styles.recovItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovValue, live.recovValue]}>{recovery.fatigue.toFixed(1)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovLabel, live.recovLabel]}>Fatigue</Text>
            </View>
          )}
          {recovery.joint != null && (
            <View style={styles.recovItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovValue, live.recovValue]}>{recovery.joint.toFixed(1)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.recovLabel, live.recovLabel]}>Joints</Text>
            </View>
          )}
        </View>
      )}

      {/* Deload advice banner */}
      {deloadCopy && (
        <View style={[styles.deloadBanner, live.deloadBanner, deloadCopy.urgent && [styles.deloadBannerUrgent, live.deloadBannerUrgent]]}>
          <Ionicons
            name={deloadCopy.urgent ? 'warning-outline' : 'information-circle-outline'}
            size={14}
            color={deloadCopy.urgent ? t.colors.error : t.colors.warning}
          />
          <Text maxFontSizeMultiplier={1.3} style={[styles.deloadBannerText, live.deloadBannerText, deloadCopy.urgent && { color: t.colors.onErrorBg }]}>
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
  weekDot:    { flex: 1, height: 8, borderRadius: radius.xs, backgroundColor: colors.surface2 },
  weekDotActive: { backgroundColor: colors.primary },
  weekDotDeload: { backgroundColor: withAlpha(colors.warning, 0.502) },
  deloadLabel: { ...type.num('caption'), color: colors.warning },

  // Empty
  skeletonWrap: { gap: spacing.md },

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
  planWeekDot:       { flex: 1, height: 6, borderRadius: radius.hair, backgroundColor: colors.surface2 },
  planWeekDotActive: { backgroundColor: colors.primary },
  planWeekDotDeload: { backgroundColor: withAlpha(colors.warning, 0.502) },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this screen's two function-component scopes (MesocycleBuilderScreen
// and ActiveMesoDashboard) so they can never drift out of step with each
// other or the frozen block. Pure layout keys (flex/gap/padding/height/
// borderRadius/borderWidth/fontWeight, no colour/fontSize/type token) are
// correctly omitted -- there is nothing to unfreeze for them. Same pattern
// as CardioHistoryScreen.js's buildLiveStyles.
//
// NOTE (flag resolved at lead review, batch G): loadActiveStats() above
// bakes colors.warning/colors.primary/colors.primaryDim into each
// tonnageBars[].frontColor at DATA-LOAD time. Converting those literals in
// place would have left the chart on stale colours until the next screen
// focus, so instead the SvgBarSparkline call site in ActiveMesoDashboard
// resolves the identical ternary at RENDER time from t.colors (the
// buildMarkStyle precedent, CardioHistoryScreen); frontColor stays baked
// (byte-identical loader) but is no longer read.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    historyLabel: { ...t.type.label, color: t.colors.textSecondary },
    dashCard: { backgroundColor: t.colors.surface, borderColor: t.colors.primary },
    dashName: { ...t.type.title, color: t.colors.textPrimary },
    dashWeek: { ...t.type.num('caption'), color: t.colors.textSecondary },
    progTrack: { backgroundColor: t.colors.surface2 },
    progFill: { backgroundColor: t.colors.primary },
    tonnageLabel: { ...t.type.caption, color: t.colors.textMuted },
    recovValue: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    recovLabel: { fontSize: t.fontSize.micro, color: t.colors.textMuted },
    deloadBanner: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warning },
    deloadBannerUrgent: { backgroundColor: t.colors.errorBg, borderColor: t.colors.error },
    deloadBannerText: { ...t.type.captionTight, color: t.colors.warning },
    mesoCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    mesoCardActive: { borderColor: t.colors.primary },
    activeBadge: { backgroundColor: t.colors.primaryBg },
    activeBadgeText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    mesoName: { ...t.type.title, color: t.colors.textPrimary },
    metaItem: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    planCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, 0.251) },
    planCardTag: { fontSize: t.fontSize.xs, color: t.colors.primary },
    planCardName: { ...t.type.h3, color: t.colors.textPrimary },
    planCardMeta: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    planCardNote: { ...t.type.bodySm, color: t.colors.textMuted },
    weekLabel: { ...t.type.num('label'), color: t.colors.textSecondary },
    weekDot: { backgroundColor: t.colors.surface2 },
    weekDotActive: { backgroundColor: t.colors.primary },
    weekDotDeload: { backgroundColor: withAlpha(t.colors.warning, 0.502) },
    deloadLabel: { ...t.type.num('caption'), color: t.colors.warning },
    summaryBtn: { borderColor: withAlpha(t.colors.primary, 0.314), backgroundColor: t.colors.primaryBg },
    summaryBtnText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    planWeekLabel: { ...t.type.num('label'), color: t.colors.primary },
    planWeekLabelDeload: { color: t.colors.warning },
    planWeekDot: { backgroundColor: t.colors.surface2 },
    planWeekDotActive: { backgroundColor: t.colors.primary },
    planWeekDotDeload: { backgroundColor: withAlpha(t.colors.warning, 0.502) },
  };
}
