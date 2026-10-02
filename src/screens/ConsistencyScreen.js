import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import BackHeader from '../components/BackHeader';
import AnimatedEntrance from '../components/AnimatedEntrance';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import InfoTooltip from '../components/InfoTooltip';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard } from '../components/Skeleton';
import PlanWeekCard from '../components/PlanWeekCard';
import BlockProgressCard from '../components/BlockProgressCard';
import BlockShapeCard from '../components/BlockShapeCard';
import ReadinessCards from '../components/ReadinessCards';
import {
  BlockCard, LoadCard, TrainingDaysSection, typicalSessionsLine,
} from '../components/ProgressSections';
import useProgressData from '../hooks/useProgressData';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { buildPlanWeekSummary } from '../lib/progress/planWeek';
import { RECOVERY_STATE, recoveryStateCard } from '../lib/recoveryState';

/**
 * What the block card says about the week, from the programme position and the
 * calendar's own resolver (D214 addendum 3, plan 7.3 item 4).
 *
 *   - The WEEK is the programme's (`position.activeWeekIndex`), the one the
 *     plan-week card above names ("in week 2 of your plan"), so the two cards
 *     cannot disagree while a required session is outstanding. The calendar's
 *     week (`currentMesoWeek.weekIndex`) is the fallback when the position
 *     cannot be read.
 *   - "A recovery week" is the position's GATED planned recovery week
 *     (`recoveryState.state === PLANNED_BLOCK_RECOVERY`, recoveryState.js), the
 *     reading the plan-week card and the Volume heatmap use, so the three
 *     surfaces that name the week name the same one. The calendar flag
 *     (`currentMesoWeek.isDeload`, also true on an adaptive week) is the
 *     fallback only when the position cannot be read at all, and never on a
 *     finished block.
 *   - An ADAPTIVE adjustment (recovery evidence easing an accumulation week)
 *     is never called a recovery week: it keeps recoveryState.js's own words.
 *   - ONE total, the block's planned weeks, for the sentence and the bar (CS-5).
 *
 * @returns {{ weekIndex: number|null, plannedWeeks: number|null,
 *   recoveryWeek: boolean, note: string|null }}
 */
export function blockReading({ position = null, currentMesoWeek = null } = {}) {
  const state = position?.recoveryState?.state ?? null;
  const recoveryWeek = position
    ? state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY
    : currentMesoWeek?.isDeload === true && currentMesoWeek?.awaitingDecision !== true;
  const active = Number(position?.activeWeekIndex);
  const weekIndex = position && Number.isFinite(active) && active >= 1
    ? active
    : (currentMesoWeek?.weekIndex ?? null);
  const plannedWeeks = currentMesoWeek?.plannedWeeks ?? position?.plannedWeeks ?? null;
  const card = state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT
    ? recoveryStateCard(position.recoveryState)
    : null;
  return { weekIndex, plannedWeeks, recoveryWeek, note: card ? `${card.title}. ${card.body}` : null };
}

// Consistency. The one place for "am I training as planned, and where am I in
// the block?": the plan week first, the twelve weeks of training days, the
// block and its planned sets, the load, how long a session lasts, and the signs
// of building fatigue when the four-week check finds them.
//
// D214 (Progress, the recovery heatmap and Consistency elevation, lane 4; plan
// `docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 00-AUDIT-AND-PLAN.md` section 7.3): the order below is the plan's. Gone from
// here: the fatigue trend (Recovery's ratings own it now, Q3 = A), the training
// frequency table (the Volume heatmap owns per-muscle work, its clock-change
// week with it, CS-20), the second load card and the session length chart.
export default function ConsistencyScreen({ navigation }) {
  // D208: tier went with the Recovery section (ReadinessCards never read it).
  const { user, units } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
  })));
  const {
    activeMeso, mesoTonnage, workloadData, loadComparison, position,
    blockProgress, blockWeek, currentMesoWeek, deloadAlert, calValues, earliestWorkoutAt,
    typicalSessionMinutes,
    refreshing, loading, loadError, hasData, allSets, handleRefresh,
  } = useProgressData();
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (a single
  // ScrollView), so an unmemoised call matches AddCustomFoodScreen's own
  // precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const unit = units === 'lbs' ? 'lbs' : 'kg';

  // The plan-week object: the programme's count and next session, the Monday
  // week's trained days from the sets the hook already loaded. An unreadable
  // position reads as "no plan" ("2 sessions this week"), never as anything
  // claimed.
  // A finished block (awaiting the athlete's decision) claims no live plan
  // week on this card either (D214 addendum 6, lane 4 review S2).
  const planWeek = useMemo(
    () => buildPlanWeekSummary({ position, sets: allSets, finished: !!currentMesoWeek?.awaitingDecision }),
    [position, allSets, currentMesoWeek],
  );
  const block = blockReading({ position, currentMesoWeek });
  const sessionsLine = typicalSessionsLine(typicalSessionMinutes);
  // The load card withholds itself when nothing has been lifted in the four
  // weeks (bodyweight-only training, say), so its heading must go with it:
  // a section label over nothing is a promise the screen does not keep.
  const hasLoad = (Array.isArray(mesoTonnage) ? mesoTonnage : []).some((b) => (Number(b?.value) || 0) > 0);

  const blockCard = (
    <BlockCard
      meso={activeMeso}
      weekIndex={block.weekIndex}
      plannedWeeks={block.plannedWeeks}
      // The effort reads the PROGRAMME's week, the week the card names (D214
      // addendum 6, lane 4 review S1); the calendar row only when the hook
      // could not name one.
      rirTarget={blockWeek?.rirTarget ?? currentMesoWeek?.rirTarget}
      finished={!!currentMesoWeek?.awaitingDecision}
      note={block.note}
      onPress={() => navigateCrossTab(navigation, 'PlansTab', 'MesocycleBuilder')}
      onBuild={() => navigateCrossTab(navigation, 'PlansTab', 'PlanLibrary')}
    >
      {/* D2: programme-arc visibility, "Week N of M" dots + effort word, so the
          block reads as a journey with a destination (the recovery week) rather
          than an open-ended grind. The recovery week it names is the gated one
          (blockReading), and a finished block claims no live week. */}
      {block.plannedWeeks >= 2 ? (
        <BlockShapeCard
          weekIndex={block.weekIndex}
          plannedWeeks={block.plannedWeeks}
          isDeload={block.recoveryWeek}
          finished={!!currentMesoWeek?.awaitingDecision}
        />
      ) : null}
    </BlockCard>
  );

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Consistency" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />
        }
      >
        {/* Founder ruling (Today truth repair): the COMP-018 "Your weeks"
            consistency-run section is REMOVED. The weekly run/streak
            construct is rejected product-wide - "N weeks running", the
            longest-run line, the kept/paused glyph strip and the "pause your
            run" sheet all went with it. The factual training record this
            screen exists for is untouched. */}
        {loading ? (
          <View style={styles.section}>
            <SkeletonCard height={116} />
            <SkeletonCard height={190} />
            <SkeletonCard height={148} />
          </View>
        ) : null}

        {!loading && loadError ? (
          <EmptyState
            icon="warning-outline"
            title="Couldn't load consistency"
            text="Your training history is safe. This is a loading problem, not lost data."
            actionLabel="Try again"
            onAction={handleRefresh}
            compact
          />
        ) : null}

        {/* ── Your plan week (first) ── CS-15/CS-16: shown whether or not a
            session is complete, so a person who has just started a plan sees
            "0 of 4 sessions" rather than an empty page. */}
        {!loading && !loadError ? (
          <AnimatedEntrance index={0}>
            <View style={styles.section}>
              <SectionLabel heading>Your plan week</SectionLabel>
              <PlanWeekCard summary={planWeek} />
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Last 12 weeks ── */}
        {!loading && !loadError && hasData ? (
          <AnimatedEntrance index={1}>
            <View style={styles.section}>
              <SectionLabel heading>Last 12 weeks</SectionLabel>
              <TrainingDaysSection
                trainedDayKeys={calValues.map(v => v.date)}
                firstSessionAt={earliestWorkoutAt}
              />
              {/* D214 (CS-2, CS-14): the sessions milestone is one plain
                  sentence under the grid ("53 sessions logged since 26 June ·
                  next milestone 100"), the true count, no trophy, no gold; it
                  waits for its own read rather than printing "First session". */}
              <ReadinessCards
                userId={user?.id}
                sections="milestone"
              />
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Your block (also with no completed session: CS-15) ── */}
        {!loading && !loadError ? (
          <AnimatedEntrance index={2}>
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <SectionLabel heading>Your block</SectionLabel>
                {/* Stage 1 (2026-08-09): the old wording promised "a new block
                    starts slightly heavier" automatically; no block is ever
                    created without the user choosing, and the next block's
                    starting volume is not an automatic increase. */}
                <InfoTooltip text={
                  'Training gets harder each week across the block, then a planned lighter recovery week lets fatigue clear.\n\n' +
                  'After the recovery week you choose your next block.'
                } />
              </View>
              {blockCard}
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── This week's plan ── */}
        {!loading && !loadError && hasData && blockProgress.length > 0 ? (
          <AnimatedEntrance index={3}>
            <View style={styles.section}>
              <SectionLabel heading>This week's plan</SectionLabel>
              <BlockProgressCard
                blockProgress={blockProgress}
                currentMesoWeek={currentMesoWeek}
                planWeek={planWeek.hasPlan ? { done: planWeek.done, required: planWeek.required } : null}
                onPress={() => navigation.navigate('VolumeHeatmap')}
              />
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Load: one card, in the person's units, compared like for like;
            the section goes with the card when nothing was lifted ── */}
        {!loading && !loadError && hasData && hasLoad ? (
          <AnimatedEntrance index={4}>
            <View style={styles.section}>
              <SectionLabel heading>Load</SectionLabel>
              <LoadCard
                bars={mesoTonnage}
                unit={unit}
                comparison={loadComparison}
                average={workloadData}
              />
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Sessions: one line (CS-11) ── */}
        {!loading && !loadError && hasData && sessionsLine ? (
          <AnimatedEntrance index={5}>
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <SectionLabel heading>Sessions</SectionLabel>
                <InfoTooltip text="The middle length of the sessions you finished this week and in the five weeks before it, as your workout timer recorded them." />
              </View>
              <Text style={[styles.sessionsLine, live.sessionsLine]}>{sessionsLine}</Text>
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Signs of building fatigue ──
            D204 (founder rule 2026-09-26: "We don't want to be telling
            people to consider an easier session ... They don't choose
            sessions!"): this card said "Lighter week recommended" and its
            tooltip told the athlete how to run their own deload. It
            DESCRIBES what the four-week check found, in the app's neutral
            card (no warning tone), and says plainly that the plan sets the
            sessions. D214 (CS-18): it lists EVERY reason the check found, not
            only the first. */}
        {!loading && !loadError && hasData && deloadAlert && (
          <Card style={styles.deloadBanner}>
            <Ionicons name="moon-outline" size={18} color={t.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deloadTitle, live.deloadTitle]}>Signs of building fatigue</Text>
              {(Array.isArray(deloadAlert.reasons) && deloadAlert.reasons.length > 0
                ? deloadAlert.reasons
                : ['Your recent sessions show signs that fatigue is building up.']
              ).map((reason) => (
                <Text key={reason} style={[styles.deloadSub, live.deloadSub]}>{reason}</Text>
              ))}
            </View>
            <InfoTooltip text={
              'This looks back over your last four weeks for signs that fatigue is building up, such as your reps dropping, ' +
              'or soreness or joint discomfort that keeps coming back.\n\n' +
              "It's a picture of how you've been recovering, not an instruction. Your plan sets your sessions."
            } size={13} />
          </Card>
        )}

        {/* ── Empty state (CS-4): nothing completed yet. The plan week and the
            block above still show, with their zeros. ── */}
        {!loading && !loadError && !hasData ? (
          <EmptyState
            icon="barbell-outline"
            title="No consistency data yet"
            text="Once you finish a session, this page shows how often you train, where you are in your block and the sets you do each week."
            compact
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
  },
  // D204 addendum 2: the fatigue banner is a neutral description, so its
  // title takes the text colour, not the warning colour.
  deloadTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  deloadSub: { ...type.bodySm, color: colors.textSecondary },
  sessionsLine: { ...type.body, color: colors.textPrimary },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical in shape. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding, no token) are correctly omitted -- there is
// nothing to unfreeze for them. Same pattern as AddCustomFoodScreen.js's
// buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    deloadTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    deloadSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    sessionsLine: { ...t.type.body, color: t.colors.textPrimary },
  };
}
