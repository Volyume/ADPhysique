import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { safeDate, safeFormatDate } from '../lib/safeFormat';
import { getBlockStatus, BLOCK_PLANNED_WEEKS } from '../lib/mesocycle';
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
  getAllMesocycles, getAllWorkouts, getCompletedWorkoutSets, getAllExercises,
  getActivePlan, getRoutinesForPlan,
} from '../lib/database';
import { logError, logWarn } from '../lib/errorLog';
import { calculateTonnage, buildLoadSemanticsById } from '../lib/algorithms';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { planHeadingName } from '../lib/planDisplay';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { navigateCrossTab } from '../navigation/navigateCrossTab';

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
  // WAVE-A-FINDINGS.md STATE_DEFECT (:162-176): every catch below used to
  // silently reset state to []/null with no error flag exposed to render,
  // so a transient DB read failure painted the "Your training blocks start
  // here" / "No block running yet" EmptyState exactly as if the user had
  // never trained -- a load FAILURE read as a confirmed empty account.
  // Mirrors PlansScreen.js's EP-09/P-06 loadError pattern: each loader now
  // reports success/failure, loadAll flags loadError if any of the three
  // failed, and the render layer shows a retryable error state instead of
  // the empty-account copy when there is genuinely nothing to fall back on.
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(useCallback(() => {
    if (user?.id) loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]));

  async function loadAll() {
    try {
      const results = await Promise.all([loadMesocycles(), loadActiveStats(), loadActivePlan()]);
      setLoadError(results.some(ok => ok === false));
    } finally {
      setLoaded(true);
    }
  }

  async function loadMesocycles() {
    if (!user?.id) return true;
    try {
      const mine = await getAllMesocycles(user.id);
      setMesocycles(mine);
      return true;
    } catch (e) {
      logError('MesocycleBuilderScreen.loadMesocycles', e, { userId: user.id });
      return false;
    }
  }

  async function loadActivePlan() {
    if (!user?.id) return true;
    try {
      const plan = await getActivePlan(user.id);
      if (!plan) { setActivePlanData(null); return true; }
      const routines = await getRoutinesForPlan(plan.id).catch(() => []);
      setActivePlanData({ ...plan, workoutCount: routines.length });
      return true;
    } catch (_) {
      setActivePlanData(null);
      return false;
    }
  }

  // WAVE-A-FINDINGS.md AUTHORITY_DEFECT (Class C, :109-160): this used to
  // also compute evaluateAutoReg/predictDeloadWeek (src/lib/mesocycle.js)
  // from a 4-workout post-session feedback window and feed ActiveMesoDash-
  // board's deload advisory banner -- an independent, ungated second
  // recovery/deload judgement that could disagree with the authoritative
  // blockAdvisor.getBlockAdvice decision on the Train tab (which reads
  // weekly check-ins) and leaked adaptive coaching copy to Free (no tier
  // check existed on this path). Removed per the change plan; the lib
  // functions in mesocycle.js are left in place (production-unreferenced,
  // a standing D37 founder-triage item) -- only this call site and its
  // JSX are gone. Tonnage bars and recovery EMA (factual display, class A)
  // are unaffected.
  async function loadActiveStats() {
    if (!user?.id) return true;
    try {
      const [mesoRows, workouts, sets, allExercises] = await Promise.all([
        getAllMesocycles(user.id),
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        // Best-effort: the semantics map only refines tonnage; a library
        // read failure must not take the whole block dashboard down.
        getAllExercises().catch(() => []),
      ]);
      // D107-2: per-hand sets count x2, assistance is excluded.
      const loadSemanticsById = buildLoadSemanticsById(allExercises);
      const active = mesoRows.find(m => m.isActive === 1 || m.isActive === true);
      if (!active?.startDate) { setActiveStats(null); return true; }

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
          value: Math.round(calculateTonnage(wkSets, null, loadSemanticsById)),
          label: `W${wk + 1}`,
          frontColor: wk + 1 === active.deloadWeek ? colors.warning
            : wk + 1 === currentWeek ? colors.primary
            : colors.primaryDim,
        };
      });

      // Recovery EMA from completed workouts with feedback
      const completed = workouts.filter(w => w.isCompleted ?? w.is_completed ?? false);
      const recovery = computeRecoveryEMAs(completed);

      setActiveStats({ tonnageBars, recovery, active });
      return true;
    } catch (e) {
      logWarn('MesocycleBuilderScreen.loadActiveStats', e?.message);
      setActiveStats(null);
      return false;
    }
  }

  // Wave 2 (cross-surface-consistency-audit-2026-07-30): this used to be its
  // own differenceInWeeks calculation -- one of FOUR independent date
  // formulas the audit found answering "which week am I in" across the app.
  // Now shares getBlockStatus's DST-safe day maths (mesocycle.js) so this
  // screen can never disagree with Today/Train/Consistency about which week
  // "now" falls in. getBlockStatus already falls back to week 1 for a
  // malformed/unparseable startDate (EP-23/UI-11), so no separate NaN guard
  // is needed. Clamped to totalWeeks for display, matching the previous
  // behaviour (an overdue block still reads as its final week here rather
  // than "Week 8 of 6"); getBlockStatus's own unclamped currentWeek/status is
  // how overdue blocks are actually detected elsewhere (blockAdvisor).
  function getCurrentWeek(mesocycle) {
    if (!mesocycle?.startDate) return 1;
    const totalWeeks = mesocycle.plannedWeeks || mesocycle.durationWeeks || 4;
    const { currentWeek } = getBlockStatus(mesocycle.startDate, totalWeeks);
    return Math.min(Math.max(currentWeek, 1), totalWeeks);
  }

  // Stage 1 (2026-08-09): a block past its recovery week is finished and
  // awaiting the user's next-block decision; this screen must not read
  // "Week 6 of 6 · recovery week" for ever (the same honesty rule as
  // BlockShapeCard's finished state).
  function isBlockFinished(mesocycle) {
    if (!mesocycle?.startDate) return false;
    const totalWeeks = mesocycle.plannedWeeks || mesocycle.durationWeeks || 4;
    return !!getBlockStatus(mesocycle.startDate, totalWeeks).awaitingDecision;
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
                  <Text style={[styles.planCardTag, live.planCardTag]}>Your active plan</Text>
                  {/* C5-P11-03 / C5-P11-05 / FB-20 (D96): this was the one
                      place on the Train side that defined a block, and it
                      described a product that does not exist -- an
                      "optional layer you add on top", archived "in Past
                      blocks below" as soon as it ends. Activation always
                      creates a block (activatePlanWithBlock), there is no
                      control for one, and a finished block stays active
                      until the NEXT one is created, which is why it is
                      missing from Past blocks during the decision window.
                      The two facts worth keeping (your plan keeps going;
                      you start the next block) are kept. */}
                  <InfoTooltip
                    size={14}
                    text={
                      'A training block is the multi-week shape of your training: your weekly sets climb for a few weeks, ' +
                      'then drop back for a lighter recovery week so your body can absorb the work.\n\n' +
                      `Your plan is the workouts and exercises. Making a plan active also starts a block of ${BLOCK_PLANNED_WEEKS} weeks, ` +
                      'the last of them the recovery week. There is nothing to set up.\n\n' +
                      'When the block finishes:\n' +
                      '• Your plan keeps going. The workouts are still there.\n' +
                      '• Nothing rolls into a new block on its own. You choose what comes next\n' +
                      '• The finished block moves to Past blocks once your next block starts'
                    }
                  />
                </View>
                <Text style={[styles.planCardName, live.planCardName]}>{planHeadingName(activePlan.name)}</Text>
                <Text style={[styles.planCardMeta, live.planCardMeta]}>
                  {activePlan.splitType ? `${activePlan.splitType} · ` : ''}
                  {activePlan.workoutCount} workout{activePlan.workoutCount !== 1 ? 's' : ''}
                </Text>
                {activeStats?.active && (() => {
                  const activeMeso = activeStats.active;
                  const currentWeek = getCurrentWeek(activeMeso);
                  const totalWeeks = activeMeso.durationWeeks || 4;
                  const finished = isBlockFinished(activeMeso);
                  const isDeload = !finished && activeMeso.deloadWeek != null && currentWeek === activeMeso.deloadWeek;
                  return (
                    <View style={styles.planWeekRow}>
                      <Text style={[styles.planWeekLabel, live.planWeekLabel, isDeload && [styles.planWeekLabelDeload, live.planWeekLabelDeload]]}>
                        {finished ? 'Block finished · choose your next block' : `Week ${currentWeek} of ${totalWeeks}${isDeload ? ' · recovery week' : ''}`}
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
                      {/* FB-15 (D96): a finished block stays is_active = 1
                          until the NEXT block is created, so it is neither
                          in Past blocks nor offered the "View block
                          summary" button below -- the one screen that
                          answers "what did this block show" was unreachable
                          for the whole decision window it exists to inform.
                          isBlockFinished is the same predicate the label
                          above already uses. */}
                      {finished && (
                        <Button
                          title="View block summary"
                          icon="document-text-outline"
                          variant="tertiary"
                          size="sm"
                          fullWidth={false}
                          onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'BlockReflection', { mesocycleId: activeMeso.id })}
                          style={[styles.summaryBtn, live.summaryBtn]}
                          textStyle={[styles.summaryBtnText, live.summaryBtnText]}
                          accessibilityLabel={`View summary of ${activeMeso.name ?? 'this block'}`}
                        />
                      )}
                    </View>
                  );
                })()}
                {/* C5-P11-03 (D96): the old note told the user to "set a
                    start date, duration and recovery week" -- three
                    controls that do not exist anywhere in the app. The
                    block is created with the plan, at a fixed length. */}
                {!activeStats?.active && (
                  <Text style={[styles.planCardNote, live.planCardNote]}>
                    This is the training your coach built. Making a plan active also starts
                    a training block of {BLOCK_PLANNED_WEEKS} weeks, the last of them a lighter
                    recovery week. There is nothing to set up.
                  </Text>
                )}
              </View>
            )}

            {/* ── Active block dashboard ───────────────── */}
            {activeStats && (
              <ActiveMesoDashboard
                stats={activeStats}
                currentWeek={getCurrentWeek(activeStats.active)}
                finished={isBlockFinished(activeStats.active)}
              />
            )}

            {mesocycles.some(m => !(m.isActive === 1 || m.isActive === true)) && (
              <Text style={[styles.historyLabel, live.historyLabel]}>Past blocks</Text>
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
                  <Text style={[styles.activeBadgeText, live.activeBadgeText]}>Active</Text>
                </View>
              )}
              <Text style={[styles.mesoName, live.mesoName]}>{meso.name}</Text>
              <View style={styles.mesoMeta}>
                {meso.startDate && safeDate(meso.startDate) && (
                  <Text style={[styles.metaItem, live.metaItem]}>
                    {safeFormatDate(meso.startDate, 'MMM d')}
                    {meso.endDate && safeDate(meso.endDate) ? ` · ${safeFormatDate(meso.endDate, 'MMM d')}` : ''}
                  </Text>
                )}
                {meso.focus ? <Text style={[styles.metaItem, live.metaItem]}>{meso.focus}</Text> : null}
              </View>
              {!isActive && (
                <Button
                  title="View block summary"
                  icon="document-text-outline"
                  variant="tertiary"
                  size="sm"
                  fullWidth={false}
                  // BlockReflection is a ProfileStack route and this screen is
                  // PlansStack-only, so the bare navigate was silently dropped
                  // and this button did nothing (D95, AUDIT-ROUTES 5.6 / 6).
                  onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'BlockReflection', { mesocycleId: meso.id })}
                  style={[styles.summaryBtn, live.summaryBtn]}
                  textStyle={[styles.summaryBtnText, live.summaryBtnText]}
                  accessibilityLabel={`View summary of ${meso.name}`}
                />
              )}
              {isActive && (
                <View style={styles.weekProgress}>
                  <View style={styles.weekProgressHeader}>
                    <Text style={[styles.weekLabel, live.weekLabel]}>Week {currentWeek} of {totalWeeks}</Text>
                    <InfoTooltip
                      size={13}
                      text={
                        `This block runs for ${totalWeeks} weeks` +
                        (meso.deloadWeek ? `. Week ${meso.deloadWeek} is your lighter recovery week.` : '.') +
                        '\n\nEach week your sets increase slightly until the recovery week, where the load drops so your body can absorb all the progress you have been making.\n\n' +
                        // FB-20 (D96): it does NOT move to Past blocks when
                        // the last week completes; it waits, still active,
                        // until the next block is created.
                        `When Week ${totalWeeks} is complete, the block is finished and waits for your decision. ` +
                        'Your plan keeps running. It moves to Past blocks once your next block starts.'
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
                    <Text style={[styles.deloadLabel, live.deloadLabel]}>Week {meso.deloadWeek} = recovery week · {currentWeek < meso.deloadWeek ? `${meso.deloadWeek - currentWeek} week${meso.deloadWeek - currentWeek !== 1 ? 's' : ''} away` : currentWeek === meso.deloadWeek ? 'this week' : 'done'}</Text>
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
          ) : activeStats ? null : loadError ? (
            // WAVE-A-FINDINGS.md STATE_DEFECT (:162-176): a load failure
            // must never be mistaken for a confirmed "no blocks yet"
            // account state, matching PlansScreen.js's EP-09/P-06 pattern.
            // Only shown when there is genuinely nothing to fall back on
            // (gated on !activeStats, same as the empty-account branch it
            // replaces).
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load your training blocks"
              text="Check your connection and try again. Nothing has been lost."
              actionLabel="Retry"
              onAction={loadAll}
              actionAccessibilityLabel="Retry loading your training blocks"
            />
          ) : (
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
// buildLiveStyles(t) as the parent screen.
function ActiveMesoDashboard({ stats, currentWeek, finished = false }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const { tonnageBars, recovery, active } = stats;
  const totalWeeks = active.durationWeeks || 4;
  const progress = Math.min(1, (currentWeek - 1) / Math.max(totalWeeks - 1, 1));
  const progressPct = `${Math.round(progress * 100)}%`;

  const hasTonnage = tonnageBars.some(b => b.value > 0);

  return (
    <View style={[styles.dashCard, live.dashCard]}>
      {/* Header */}
      <View style={styles.dashHeader}>
        <View style={[styles.activeBadge, live.activeBadge]}>
          <Text style={[styles.activeBadgeText, live.activeBadgeText]}>Active</Text>
        </View>
        <Ionicons name="layers" size={16} color={t.colors.primary} />
      </View>
      <Text style={[styles.dashName, live.dashName]} numberOfLines={1}>{active.name}</Text>
      <Text style={[styles.dashWeek, live.dashWeek]}>
        {finished ? 'Block finished' : `Week ${currentWeek} of ${totalWeeks}`}
        {active.focus ? `  ·  ${active.focus}` : ''}
      </Text>

      {/* Progress track */}
      <View style={[styles.progTrack, live.progTrack]}>
        <View style={[styles.progFill, live.progFill, { width: progressPct }]} />
      </View>

      {/* Weekly tonnage BarChart */}
      {hasTonnage && (
        <View style={styles.tonnageWrap}>
          <Text style={[styles.tonnageLabel, live.tonnageLabel]}>Weekly load (kg moved)</Text>
          {/* CP-10 batch G: the bar colour ternary resolves HERE, at render
              time, from the live theme -- the same deload/current/rest
              mapping loadActiveStats() bakes into frontColor (left in place
              but unused), the same wk+1 indexing, and the same
              getCurrentWeek(active) value (the parent passes it from the
              identical stats.active object). The mapping is byte-identical,
              only WHERE the colour resolves changes, so a theme flip
              recolours the chart without waiting for a data reload. */}
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
        <View style={styles.recovWrap}>
          <View style={styles.recovHeaderRow}>
            <Text style={[styles.tonnageLabel, live.tonnageLabel]}>Recovery</Text>
            {/* O25: bare decimals with no scale or direction; wording aligned
                with ReadinessCards.js's own corrected tooltip (T21/O9 fix). */}
            <InfoTooltip
              size={13}
              text="Scored 1-5, where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore or tired). Joints is the same scale, where 1 = comfortable. It is a running average weighted so your most recent week counts most, older sessions fade out."
            />
          </View>
          <View style={styles.recovRow}>
            {recovery.soreness != null && (
              <View style={styles.recovItem}>
                <Text style={[styles.recovValue, live.recovValue]}>{recovery.soreness.toFixed(1)}</Text>
                <Text style={[styles.recovLabel, live.recovLabel]}>Soreness</Text>
              </View>
            )}
            {recovery.fatigue != null && (
              <View style={styles.recovItem}>
                <Text style={[styles.recovValue, live.recovValue]}>{recovery.fatigue.toFixed(1)}</Text>
                <Text style={[styles.recovLabel, live.recovLabel]}>Fatigue</Text>
              </View>
            )}
            {recovery.joint != null && (
              <View style={styles.recovItem}>
                <Text style={[styles.recovValue, live.recovValue]}>{recovery.joint.toFixed(1)}</Text>
                <Text style={[styles.recovLabel, live.recovLabel]}>Joints</Text>
              </View>
            )}
          </View>
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
  recovWrap: { gap: spacing.xs },
  recovHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  recovRow:   { flexDirection: 'row', gap: spacing.lg },
  recovItem:  { alignItems: 'center', gap: spacing.xxs },
  recovValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  recovLabel: { fontSize: fontSize.micro, color: colors.textMuted },

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
// correctly omitted -- there is nothing to unfreeze for them.
//
// NOTE (flag resolved at lead review, batch G): loadActiveStats() above
// bakes colors.warning/colors.primary/colors.primaryDim into each
// tonnageBars[].frontColor at DATA-LOAD time. Converting those literals in
// place would have left the chart on stale colours until the next screen
// focus, so instead the SvgBarSparkline call site in ActiveMesoDashboard
// resolves the identical ternary at RENDER time from t.colors; frontColor
// stays baked (byte-identical loader) but is no longer read.
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
