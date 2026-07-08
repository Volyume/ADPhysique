/**
 * WeeklyStoryScreen — Audit §15 item 1: connected weekly story surface.
 *
 * One calm, read-only screen narrating THIS WEEK'S story: train -> eat ->
 * weigh -> decision. The fragmentation fix from the 2026-07-08 launch audit
 * (00-full-audit.md §2/§15): today the connected narrative is real in the
 * data layer but scattered across Home banners, Analytics cards, Profile
 * tiles and Check-in. This screen composes the SAME already-computed data
 * those surfaces read — no new data source, no new engine, no AI:
 *
 *   - training  -> getWeeklySessionStats + getWeeklyPRCount (same pair
 *                  CoachOutputScreen already loads for its own week view)
 *   - eating    -> getRecentIntakeSummary + getNutritionTargets (same pair
 *                  CoachOutputScreen already loads for the safety-floor read)
 *   - body      -> getLatestCoachOutput(...).trend, the engine's own
 *                  EWMA-derived weekly weight trend
 *   - decision  -> getLatestCoachOutput(...): whyThisWeek + heldDecisions,
 *                  the engine's own already-written explanation
 *
 * The pure composition lives in src/lib/weeklyStory.js (buildWeeklyStory);
 * this screen only fetches the already-existing reads and renders the
 * result. Pro-gated the same way as CoachOutputScreen (withProGuard in
 * RootNavigator), since it narrates nutrition/coaching content.
 *
 * ED-safety: mirrors CoachHeldHistoryScreen/CoachOutputScreen's fail-CLOSED
 * suppression contract — an open ED-pattern flag, calm mode, or a failed
 * safety read all suppress the body (weigh-in) chapter's numbers.
 */
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  getWeeklySessionStats,
  getWeeklyPRCount,
  getNutritionTargets,
  getLatestCoachOutput,
  getOpenEdPatternFlag,
} from '../lib/database';
import { getRecentIntakeSummary } from '../lib/food/db';
import { localWeekStartMs } from '../lib/dayKey';
import { weekRangeLabel } from '../lib/coachOutput/viewCopy';
import { buildWeeklyStory } from '../lib/weeklyStory';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { logError } from '../lib/errorLog';

const EMPTY = { weekLabel: null, chapters: [] };

export default function WeeklyStoryScreen() {
  const { user } = useAppStore(useShallow(s => ({ user: s.user })));
  const [story, setStory] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setStory(EMPTY);
      setLoading(false);
      return;
    }
    const weekStart = localWeekStartMs();
    try {
      // ED-safety, fail CLOSED: same contract as CoachHeldHistoryScreen /
      // CoachOutputScreen — a failed flag or wellbeing read suppresses the
      // body chapter's numbers rather than risk showing them over an
      // undetected open flag.
      const [sessionStats, prsThisWeek, nutritionTargets, coachOutput, edFlag, wellbeing] = await Promise.all([
        getWeeklySessionStats(user.id, weekStart).catch(() => null),
        getWeeklyPRCount(user.id, weekStart).catch(() => null),
        getNutritionTargets(user.id).catch(() => null),
        getLatestCoachOutput(user.id).catch(() => null),
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      const intake = await getRecentIntakeSummary(user.id).catch(() => null);

      const suppress = !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing);
      const isCurrentWeek = coachOutput?.weekStart != null && Number(coachOutput.weekStart) === weekStart;

      setStory(buildWeeklyStory({
        weekLabel: weekRangeLabel(weekStart),
        sessionStats,
        prsThisWeek,
        intake,
        targetKcal: nutritionTargets?.targetKcal ?? null,
        coachOutput,
        isCurrentWeek,
        suppress,
      }));
      setLoading(false);
    } catch (e) {
      logError('WeeklyStoryScreen.load', e, { userId: user?.id });
      // Fail closed on an unexpected read error: no fabricated numbers, and
      // the body chapter reads as suppressed rather than risk showing a
      // number over an undetected open ED flag.
      setStory(buildWeeklyStory({ weekLabel: weekRangeLabel(weekStart), suppress: true }));
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <BackHeader title="Your week" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {story.weekLabel ? `The week of ${story.weekLabel}, in one place.` : 'This week, in one place.'}
        </Text>

        {loading && (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard height={92} />
            <SkeletonCard height={92} />
            <SkeletonCard height={92} />
            <SkeletonCard height={92} />
          </View>
        )}

        {!loading && story.chapters.map((c) => (
          <View key={c.key} style={styles.chapterCard}>
            <View style={styles.chapterHeaderRow}>
              <Ionicons name={c.icon} size={18} color={colors.primary} />
              <Text style={styles.chapterHeading}>{c.heading}</Text>
            </View>
            <Text style={[styles.chapterBody, c.empty && styles.chapterBodyEmpty]}>{c.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  intro: {
    ...type.bodySm,
    color: colors.textMuted,
  },

  chapterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chapterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chapterHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  chapterBody: {
    ...type.body,
    color: colors.textPrimary,
  },
  chapterBodyEmpty: {
    color: colors.textMuted,
  },
});
