import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type } from '../styles/theme';
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
import StreakWeeksSection from '../components/StreakWeeksSection';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Consistency and recovery. The one place for "am I training often enough, and
// is my body keeping up": the training block, recovery signals, training load,
// session length, how often each muscle gets hit, and the 12-week calendar.
// Pulled off the Progress landing so the landing reads as a hub, not a wall.
export default function ConsistencyScreen({ navigation }) {
  const { user, tier, scoffScore } = useAppStore(useShallow(s => ({
    user: s.user, tier: s.tier, scoffScore: s.userProfile?.scoffScore,
  })));
  const {
    activeMeso, mesoTonnage, mesoProgress, mesoCurrentWeek,
    fatigueSessions, blockProgress, currentMesoWeek,
    deloadAlert, workloadData, durationBars, muscleFreq,
    showAllMuscles, setShowAllMuscles, calValues,
    enoughForTrends, refreshing, loading, hasData, handleRefresh,
  } = useProgressData();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Consistency" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Your weeks (COMP-018 consistency streak) ── */}
        <StreakWeeksSection userId={user?.id} scoffScore={scoffScore} />

        {/* ── Lighter week banner ── */}
        {deloadAlert && (
          <Card tone="warning" style={styles.deloadBanner}>
            <Ionicons name="moon-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deloadTitle}>Lighter week recommended</Text>
              <Text style={styles.deloadSub}>
                {deloadAlert.reasons?.[0] ?? 'Your body is signalling it needs a recovery week.'}
              </Text>
            </View>
            <InfoTooltip text={
              'A lighter recovery week means keeping the same exercises but dropping the weights by around 10 to 20%. ' +
              'Stop well before failure. Sessions should feel almost too easy.\n\n' +
              'This gives your body a chance to recover and absorb all the work you have been putting in.\n\n' +
              'Most people feel noticeably stronger in the first session back after a proper recovery week.'
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

        {!loading && !hasData ? (
          <EmptyState
            icon="barbell-outline"
            title="Your consistency picture starts with your first session"
            text="Log a workout and this screen will begin showing training rhythm, recovery signals and load trends."
            actionLabel="Start a workout"
            onAction={() => navigateCrossTab(navigation, 'HomeTab', 'BuildWorkout')}
            compact
          />
        ) : null}

        {/* ── Training block ── */}
        {!loading && hasData ? (
        <AnimatedEntrance index={0}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <SectionLabel>Training block</SectionLabel>
            <InfoTooltip text={
              'Training gets harder each week across the block, then a lighter recovery week lets your body catch up.\n\n' +
              'After the recovery week, a new block starts slightly heavier than the last. That is how you keep improving over months, not just weeks.'
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
            />
          ) : null}
          <MesocyclePulseCard
            meso={activeMeso}
            currentWeek={mesoCurrentWeek()}
            progress={mesoProgress()}
            tonnageBars={mesoTonnage}
            onPress={() => navigateCrossTab(navigation, 'PlansTab', 'MesocycleBuilder')}
            onBuild={() => navigateCrossTab(navigation, 'PlansTab', 'PlanLibrary')}
          />
          <FatigueTrendCard sessions={fatigueSessions} />
          <BlockProgressCard blockProgress={blockProgress} currentMesoWeek={currentMesoWeek} />
        </View>
        </AnimatedEntrance>
        ) : null}

        {/* ── Recovery signals ── */}
        {!loading && hasData ? <ReadinessCards userId={user?.id} tier={tier} /> : null}

        {/* ── Training load (ACWR) ── */}
        {hasData && workloadData && workloadData.ratio !== null && (
          <View style={styles.section}>
            <WorkloadCard data={workloadData} />
          </View>
        )}

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
  deloadTitle: { ...type.bodyStrong, color: colors.warning, marginBottom: spacing.xxs },
  deloadSub: { ...type.bodySm, color: colors.textSecondary },
});
