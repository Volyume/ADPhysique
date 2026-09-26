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
import FatigueTrendCard from '../components/FatigueTrendCard';
import BlockProgressCard from '../components/BlockProgressCard';
import BlockShapeCard from '../components/BlockShapeCard';
import ReadinessCards from '../components/ReadinessCards';
import {
  MesocyclePulseCard, WorkloadCard, SessionDurationChart,
  MuscleFrequencyTable, TrainingCalendar,
} from '../components/ProgressSections';
import useProgressData from '../hooks/useProgressData';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Consistency and recovery. The one place for "am I training often enough, and
// is my body keeping up": the training block, recovery signals, training load,
// session length, how often each muscle gets hit, and the 12-week calendar.
// Pulled off the Progress landing so the landing reads as a hub, not a wall.
export default function ConsistencyScreen({ navigation }) {
  // D208: tier went with the Recovery section (ReadinessCards never read it).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const {
    activeMeso, mesoTonnage, mesoProgress, mesoCurrentWeek,
    fatigueSessions, blockProgress, currentMesoWeek,
    deloadAlert, workloadData, durationBars, muscleFreq,
    showAllMuscles, setShowAllMuscles, calValues,
    enoughForTrends, refreshing, loading, loadError, hasData, handleRefresh,
  } = useProgressData();
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (a single
  // ScrollView), so an unmemoised call matches AddCustomFoodScreen's own
  // precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);

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
            screen exists for (training block, recovery signals, workload,
            session length, frequency, the 12-week training calendar) is
            untouched. */}
        {/* ── Fatigue signs banner ──
            D204 (founder rule 2026-09-26: "We don't want to be telling
            people to consider an easier session ... They don't choose
            sessions!"): this card said "Lighter week recommended" and its
            tooltip told the athlete how to run their own deload. It now
            DESCRIBES what the four-week check found, in the app's neutral
            card (no warning tone, the same call as the Weekly load card),
            and says plainly that the plan sets the sessions. Found by the
            plain-English sweep, 2026-09-26. */}
        {deloadAlert && (
          <Card style={styles.deloadBanner}>
            <Ionicons name="moon-outline" size={18} color={t.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deloadTitle, live.deloadTitle]}>Signs of building fatigue</Text>
              <Text style={[styles.deloadSub, live.deloadSub]}>
                {deloadAlert.reasons?.[0] ?? 'Your recent sessions show signs that fatigue is building up.'}
              </Text>
            </View>
            <InfoTooltip text={
              'This looks back over your last four weeks for signs that fatigue is building up, such as your reps dropping, ' +
              'or soreness or joint discomfort that keeps coming back.\n\n' +
              "It's a picture of how you've been recovering, not an instruction. Your plan sets your sessions."
            } size={13} />
          </Card>
        )}

        {loading ? (
          <View style={styles.section}>
            <SkeletonCard height={116} />
            <SkeletonCard height={148} />
            <SkeletonCard height={92} />
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

        {!loading && !loadError && !hasData ? (
          <EmptyState
            icon="barbell-outline"
            title="No consistency data yet"
            text="This page fills in after completed sessions, then shows rhythm, recovery signals and load trends."
            compact
          />
        ) : null}

        {/* ── Training block ── */}
        {!loading && hasData ? (
        <AnimatedEntrance index={0}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <SectionLabel>Training block</SectionLabel>
            {/* Stage 1 (2026-08-09): the old wording promised "a new block
                starts slightly heavier" automatically; no block is ever
                created without the user choosing, and the next block's
                starting volume is not an automatic increase. */}
            <InfoTooltip text={
              'Training gets harder each week across the block, then a lighter recovery week lets your body catch up.\n\n' +
              'After the recovery week you choose your next block. Building on what the last one showed is how you keep improving over months, not just weeks.'
            } />
          </View>
          {/* D2: programme-arc visibility, "Week N of M" dots + effort word,
              so the block reads as a journey with a destination (the recovery
              week) rather than an open-ended grind. Neutral orientation, shown
              alongside the existing (ungated) block cards. */}
          {currentMesoWeek?.plannedWeeks >= 2 ? (
            <BlockShapeCard
              weekIndex={currentMesoWeek.weekIndex}
              plannedWeeks={currentMesoWeek.plannedWeeks}
              isDeload={currentMesoWeek.isDeload}
              finished={!!currentMesoWeek.awaitingDecision}
            />
          ) : null}
          <MesocyclePulseCard
            meso={activeMeso}
            currentWeek={mesoCurrentWeek()}
            progress={mesoProgress()}
            tonnageBars={mesoTonnage}
            finished={!!currentMesoWeek?.awaitingDecision}
            onPress={() => navigateCrossTab(navigation, 'PlansTab', 'MesocycleBuilder')}
            onBuild={() => navigateCrossTab(navigation, 'PlansTab', 'PlanLibrary')}
          />
          {/* F5/D200 item 4 (progress-tab audit 2026-09-24, lane E): the
              workload card now sits directly beneath the plan card so the
              picture (the sparkline above) and its explanation (this card)
              are adjacent, instead of separated by Recovery signals below. */}
          {workloadData && workloadData.ratio !== null && (
            <WorkloadCard data={workloadData} />
          )}
          <FatigueTrendCard sessions={fatigueSessions} />
          <BlockProgressCard
            blockProgress={blockProgress}
            currentMesoWeek={currentMesoWeek}
            onPress={() => navigation.navigate('VolumeHeatmap')}
          />
        </View>
        </AnimatedEntrance>
        ) : null}

        {/* ── Sessions milestone ──
            Register D208 (founder question 2026-09-26, "a place in Progress
            exclusively for recovery"): the Recovery section moved to its own
            screen, reached from the Recovery row in the top card on Progress.
            Only the sessions milestone stays here, where it always sat. */}
        {!loading && hasData ? (
          <ReadinessCards
            userId={user?.id}
            sections="milestone"
          />
        ) : null}

        {/* ── Session length trend ── */}
        {hasData && enoughForTrends && durationBars.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Session length trend</SectionLabel>
            <SessionDurationChart bars={durationBars} />
          </View>
        )}

        {/* ── Training frequency ── */}
        {hasData && enoughForTrends && muscleFreq.length > 0 && (
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <SectionLabel>Training frequency</SectionLabel>
              <InfoTooltip text="How many sessions included each muscle group this week vs last." />
            </View>
            <MuscleFrequencyTable
              rows={muscleFreq}
              showAll={showAllMuscles}
              onToggle={() => setShowAllMuscles(v => !v)}
            />
          </View>
        )}

        {/* ── Training day calendar ── */}
        {hasData && enoughForTrends && (
          <View style={styles.section}>
            <SectionLabel>Training days (last 12 weeks)</SectionLabel>
            <TrainingCalendar values={calValues} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
  },
  // D204 addendum 2: the fatigue banner is a neutral description, so its
  // title takes the text colour, not the warning colour.
  deloadTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  deloadSub: { ...type.bodySm, color: colors.textSecondary },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
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
  };
}
