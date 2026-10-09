import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/Toast';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import { loadMuscleRecovery } from '../lib/recovery/load';
import { buildRecoveryPillarCopy } from '../lib/recovery/recoveryPillar';
import { format } from 'date-fns/format';
import { safeDate, safeFormatDate } from '../lib/safeFormat';

import { colors, fontSize, fontWeight, spacing, radius, type, iconSize, withAlpha, alpha, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import Button from '../components/Button';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import ScreenHeader from '../components/ScreenHeader';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedEntrance from '../components/AnimatedEntrance';
import EmptyState from '../components/EmptyState';
import InfoTooltip from '../components/InfoTooltip';
import PlanWeekCard from '../components/PlanWeekCard';
import LegendRow from '../components/LegendRow';
import { NavRow, NavGroup } from '../components/NavRow';
import useAppStore from '../store/useAppStore';
import useProgressData from '../hooks/useProgressData';
import useWeightTrend from '../hooks/useWeightTrend';
import useVisualPillar from '../hooks/useVisualPillar';
import { sessionSummaryParams } from '../lib/sessionReport';
import { getPlanLandmarks, getPlanRoles } from '../lib/effectiveLandmarks';
import { resolveProgrammePosition } from '../lib/programmePosition';
import { planTrainedMuscles } from '../lib/volumeLogged';
import { logError } from '../lib/errorLog';
import { buildPlanWeekSummary } from '../lib/progress/planWeek';
// The strip's (i) text lives with its legend words in the pure model
// (STRIP_TOOLTIP, STRIP_RECOVERY_TOOLTIP), so the words the (i) names are the
// words the legend prints.
import {
  buildVolumeStrip, isStripRecoveryWeek, stripLegendItems, stripToneColors,
  STRIP_TOOLTIP, STRIP_RECOVERY_TOOLTIP,
} from '../lib/progress/volumeStrip';
import {
  bodyPillarCopy, computeTrainingPillarSummary, buildVisualPillarCopy, trainingPillarCopy,
} from '../lib/progress/pillars';

// Recaps unlock after this many logged sessions (COMP-005, ~a fortnight); the
// one number the door row, its toast and the recap banner all read.
const RECAP_GATE = 10;
// Year of lifts appears once the first session is a year old (as it always has).
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// D214 (PR-17): the loading slots are the real slots' heights, not one 168 dp
// block for a four-row card, so little jumps when the content arrives (measured
// on the paper render at a 412 dp phone: the plan-week card and the strip under
// it are about 250 dp together, the four pillar rows about 410 to 450 dp).
const PLAN_WEEK_SKELETON_HEIGHT = 250;
const PILLARS_SKELETON_HEIGHT = 410;

// D214 (PR-2): what the Training row prints when a load failed and it has no
// earlier copy to keep: its label alone, so the one error state below speaks.
const NO_TRAINING_COPY = Object.freeze({ state: null, evidence: null });

// What the screen holds for the plan context before it is read (undefined) and
// when there is no signed-in account (no plan, nothing plan-trained, no roles,
// so every muscle reads the standard bands).
const NO_PLAN_CONTEXT = Object.freeze({ position: null, planTrained: new Set(), roles: Object.freeze({}) });

// The person's own word for a session's difficulty (1 to 5), the words the
// Workout Summary rates it in; the spoken label carries "4 of 5" (D214, PR-1).
const DIFFICULTY_WORDS = ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'];

// COMP-005: which monthly recap the Recaps tile / ephemeral card opens. The last
// completed calendar month when the user was training before this month began;
// otherwise the current month-to-date (so a just-unlocked user in their first
// month sees "June so far" rather than an empty last month). Local time, like
// the app's week rule. Returns RecapStory route params.
function recentMonthRecapParams(earliestWorkoutAt) {
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  if (earliestWorkoutAt != null && earliestWorkoutAt < curMonthStart) {
    return {
      variant: 'month',
      startMs: prevMonthStart,
      endMs: curMonthStart,
      monthLabel: format(new Date(prevMonthStart), 'MMMM'),
    };
  }
  return {
    variant: 'month',
    startMs: curMonthStart,
    endMs: startOfTomorrow,
    monthLabel: `${format(new Date(curMonthStart), 'MMMM')} so far`,
  };
}

// S6-7 (progress-tab audit 2026-09-24): the recap banner used to strip
// " so far" from monthLabel unconditionally, so a first-month user read
// "Your September recap is ready" and then opened a deck headed "September
// so far, in numbers" -- the banner's promise didn't match the deck it
// opened. The banner now agrees with the deck: an in-progress month keeps
// "so far" in both places. Exported (one of the file's two deliberate named
// exports, alongside the default) so this pure copy rule can be pinned
// directly -- the real banner is only visible in the first 7 days of a
// month, which a mounted render cannot pin deterministically on every day
// the test suite happens to run.
export function recapBannerText(monthLabel) {
  return monthLabel.endsWith(' so far')
    ? `Your recap of ${monthLabel} is ready - 45 seconds`
    : `Your ${monthLabel} recap is ready - 45 seconds`;
}

// D214 addendum 4 (BM-15): a pillar row is spoken as one group, its label, its
// headline and its evidence joined by full stops. Every Body headline the shared
// derivation returns already ENDS in a full stop ("Trending down over the last 2
// weeks."), so the join strips a trailing stop from a part that is followed by
// another rather than adding a second ("weeks.. 80.7 kg"); the last part keeps
// its own punctuation. The same join serves the Training, Progress photos and
// Recovery rows (none of whose headlines ends in a stop today). Exported (the
// second deliberate named export) so the rule is pinned directly.
export function spokenRowLabel(label, stateText, evidenceText) {
  const parts = [label, stateText, evidenceText].filter(Boolean).map(String);
  return parts
    .map((part, i) => (i < parts.length - 1 ? part.replace(/[.\s]+$/, '') : part))
    .filter(Boolean)
    .join('. ');
}

// Campaign 23 (§8/§21/§22 R2): the Training pillar's copy is built by the pure
// `trainingPillarCopy` in src/lib/progress/pillars.js (moved there under D214 so
// the ladder, the first-day baseline and the verdict words are tested without
// mounting this screen): factual evidence statements only, over a ROLLING
// 30-day window (S6-4, D200-3), never a calendar month.

// Campaign 23 (§15/§22 R2): the Body pillar's copy is the SAME weightTrend
// view-model WeightTrendCard already renders (useWeightTrend/deriveWeightTrend)
// -- no new derivation, only a compact two-line read of fields that already
// exist. The full chart/maintenance detail stays one tap away in BodyMetrics
// (WeightTrendCard renders there unchanged).
// D214: the copy builder lives in src/lib/progress/pillars.js (pure, tested
// without mounting the screen) and honours the derivation's `pillarFigure`
// flag, so the weight figure is withheld here under calm mode AND an open ED
// flag by the shared derivation's own word, never by a screen-local gate.

export default function AnalyticsScreen({ navigation, route }) {
  const toast = useToast();
  const user = useAppStore(s => s.user);
  const tier = useAppStore(s => s.tier);
  const userProfile = useAppStore(s => s.userProfile);
  const bodyWeightUnits = useAppStore(s => s.bodyWeightUnits);
  const units = useAppStore(s => s.units);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // because this screen renders a recent-sessions list.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // COMP-004 "Body pillar". FOUNDER DECISION (fully free, no tier split):
  // morning weighing runs for every account now, so the Pro-only ternary
  // that withheld the userId is retired.
  const weightTrend = useWeightTrend(user?.id);
  // Campaign 23 R1 (§16/§22 R2): the Visual pillar's derived signal. Fails
  // closed under calm mode/open ED flag regardless of tier (usePhotoSuppression
  // inside the hook); only fetches scan data for a Pro user once suppression
  // is confirmed lifted.
  const visualPillar = useVisualPillar(user?.id, tier);

  // Register D208: the Recovery row's own read, the same per-muscle estimate
  // the Recovery screen draws. undefined while loading, the loader's result
  // after (its `degraded` shape on a failed read); refreshed on every focus
  // so the row agrees with a session just logged.
  const [recoveryLoad, setRecoveryLoad] = useState(undefined);
  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      let cancelled = false;
      if (!user?.id) { setRecoveryLoad(null); return undefined; }
      loadMuscleRecovery(user.id)
        .then((r) => { if (!cancelled) setRecoveryLoad(r ?? null); })
        .catch(() => { if (!cancelled) setRecoveryLoad(null); });
      return () => { cancelled = true; };
    }, [user?.id]),
  );
  const recoveryCopy = useMemo(() => buildRecoveryPillarCopy(recoveryLoad), [recoveryLoad]);

  // Founder device order 2026-08-17: the lifetime-tonnage landmark Moment
  // (the last survivor of the COMP-018 landmark family) is retired - it sat
  // between Recent sessions and More stats serving no decision, off the
  // screen's style. The R5 Moment slot is recap-only now; the share surface
  // for training wins lives on Recaps and LiftProgress. tonnageMilestone.js
  // remains in the tree, production-unreferenced.
  //
  // D214 (plan 7.1 item 2, PR-10, PR-14, PR-16): the plan context the plan-week
  // card and the volume strip read, re-read on EVERY focus and on pull-to-
  // refresh so it agrees with a session just logged or a target just edited:
  //   - the programme position (resolveProgrammePosition: null on a read
  //     failure or with no block, which reads as no plan);
  //   - the plan-trained muscle set, the plan layer's own source map exactly as
  //     VolumeHeatmapScreen reads it (never the merged source);
  //   - each muscle's role in the active plan (getPlanRoles, D219), the roles
  //     both screens judge by (volumeJudgement.js: the one band function).
  // undefined until the first read settles; every read is best effort, so a
  // failure degrades to the no-plan, research-table reading and is logged.
  const [planContext, setPlanContext] = useState(undefined);
  const planRequestRef = useRef(0);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const loadPlanContext = useCallback(async () => {
    const requestId = planRequestRef.current + 1;
    planRequestRef.current = requestId;
    if (!user?.id) { setPlanContext(NO_PLAN_CONTEXT); return; }
    const profile = userProfileRef.current;
    try {
      const [position, planLayer, roles] = await Promise.all([
        resolveProgrammePosition(user.id).catch(() => null),
        getPlanLandmarks(user.id, { userProfile: profile }).catch((e) => {
          logError('AnalyticsScreen.readPlanLandmarks', e, { userId: user.id });
          return null;
        }),
        getPlanRoles(user.id),
      ]);
      if (planRequestRef.current !== requestId) return;
      setPlanContext({
        position: position ?? null,
        planTrained: planTrainedMuscles(planLayer),
        roles: roles ?? {},
      });
    } catch (e) {
      // Never an unread plan slot forever: whatever failed, the screen reads as
      // no plan with the research table, and the failure is logged.
      logError('AnalyticsScreen.loadPlanContext', e, { userId: user.id });
      if (planRequestRef.current === requestId) setPlanContext(NO_PLAN_CONTEXT);
    }
  }, [user?.id]);
  useFocusEffect(
    useCallback(() => { loadPlanContext(); }, [loadPlanContext]),
  );

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  // COMP-004 door: arriving from the Home TodayStrip weight cell scrolls the
  // Body pillar row into view (once the Answer Block has rendered), then
  // clears the param so a normal re-focus does not re-scroll. Programmatic
  // navigation does not fire 'tabPress', so this never fights the
  // scroll-to-top above.
  const trendSectionY = useRef(0);
  useEffect(() => {
    if (!route?.params?.focusWeightTrend) return undefined;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, trendSectionY.current - 12), animated: true });
    }, 350);
    navigation.setParams({ focusWeightTrend: undefined });
    return () => clearTimeout(timer);
  }, [route?.params?.focusWeightTrend, navigation]);

  const {
    loading, refreshing, loadError,
    recentSessions, allSets, exerciseMap, exerciseLookup, earliestWorkoutAt, completedWorkoutCount,
    sessionCount, currentMesoWeek, calValues,
    hasData,
    handleRefresh,
  } = useProgressData();

  // Campaign 23 (§8/§21/§22 R2): the Training pillar's numeric summary
  // (trailing-month strength-direction count + named bests, per-exercise-
  // per-day deduplicated, IA-3; D214 PR-3: an exercise's first local day is its
  // baseline). Derived from the already-loaded data, no new query. D218: it
  // reads the shared exercise lookup, so a set whose id this install does not
  // hold is named and typed by its own name snapshot, as every other session
  // reader does (the plain map is only the fallback before the lookup loads).
  const exercisesForSets = exerciseLookup ?? exerciseMap;
  const trainingSummary = useMemo(
    () => computeTrainingPillarSummary(allSets, exercisesForSets, { windowDays: 30 }),
    [allSets, exercisesForSets],
  );
  const lastSessionAt = useMemo(
    () => allSets.reduce((m, s) => Math.max(m, s.createdAt ?? s.created_at ?? 0), 0) || null,
    [allSets],
  );
  const unitsLabel = units === 'lbs' ? 'lbs' : 'kg';
  const trainingCopy = useMemo(
    () => trainingPillarCopy({ completedWorkoutCount, summary: trainingSummary, lastSessionAt, unitsLabel }),
    [completedWorkoutCount, trainingSummary, lastSessionAt, unitsLabel],
  );
  // D214 (PR-2): a load that FAILED clears the counts, which would read "No
  // sessions logged yet" directly above the error state. The Training row keeps
  // the last copy it read from a successful load instead, and the one error
  // state below speaks.
  const lastTrainingCopyRef = useRef(null);
  useEffect(() => {
    if (!loading && !loadError) lastTrainingCopyRef.current = trainingCopy;
  }, [loading, loadError, trainingCopy]);
  const trainingRow = loadError ? (lastTrainingCopyRef.current ?? NO_TRAINING_COPY) : trainingCopy;
  const bodyCopy = useMemo(() => bodyPillarCopy(weightTrend, bodyWeightUnits || 'st'), [weightTrend, bodyWeightUnits]);
  const visualCopy = useMemo(() => buildVisualPillarCopy({
    hasScan: visualPillar.hasScan,
    hasNote: visualPillar.hasNote,
    packet: visualPillar.packet,
    capturedAt: visualPillar.capturedAt,
  }), [visualPillar.hasScan, visualPillar.hasNote, visualPillar.packet, visualPillar.capturedAt]);

  // D214 (plan 7.1 item 2): "Your plan week", the screen's one session count.
  // The plan-week card is ONE view-model shared with Consistency
  // (src/lib/progress/planWeek.js): the plan week's completed-over-required
  // count named as the plan week, the Monday-anchored seven cells and the next
  // session, or the calendar count ("2 sessions so far this week") with no plan.
  // D214 addendum 9 (census 6.13): the seven cells light on the days a
  // completed workout STARTED, the twelve-week grid's own days (calValues), so
  // "a day with a completed session" means one thing on the card, the grid and
  // the caption.
  const completedDays = useMemo(() => calValues.map((v) => v.date), [calValues]);
  const planWeekSummary = useMemo(
    () => (planContext
      ? buildPlanWeekSummary({ position: planContext.position, sets: allSets, completedDays, finished: !!currentMesoWeek?.awaitingDecision })
      : null),
    [planContext, allSets, completedDays, currentMesoWeek],
  );
  // The strip under it: this Monday week so far, in logged sets (never the
  // credits summed), judged by the same one judgement (each muscle's role in
  // the active plan, volumeJudgement.js) and the same plan-trained set the
  // Volume heatmap reads, so its "below maintenance" count is that screen's
  // first group (src/lib/progress/volumeStrip.js). The
  // recovery week is the programme position's GATED planned recovery week,
  // with the calendar flag only as the fallback when the position is unread.
  const recoveryWeek = useMemo(
    () => isStripRecoveryWeek({ position: planContext?.position ?? null, currentMesoWeek }),
    [planContext, currentMesoWeek],
  );
  const strip = useMemo(() => buildVolumeStrip({
    allSets,
    exerciseMap: exercisesForSets,
    nowMs: Date.now(),
    roles: planContext?.roles ?? null,
    planTrained: planContext?.planTrained ?? null,
    recoveryWeek,
  }), [allSets, exercisesForSets, planContext, recoveryWeek]);
  const legendItems = useMemo(
    () => stripLegendItems({ colors: t.colors, recoveryWeek }),
    [t, recoveryWeek],
  );

  // One session count for Recaps everywhere on this screen: the sessions
  // milestone's own definition, a completed workout with at least one set
  // (D214, PR-12), where the door used to count completed workouts with a start
  // time. The recap banner and the Recaps row read the same number.
  const loggedSessionCount = sessionCount;
  // D214 addendum 6 (lane 3 review 2): the count is 0 until the read settles
  // and after a failed load, so the gate text ("10 sessions to go") prints
  // only once the read has landed; until then, and on a failed load, the
  // door carries no claim and the toast says only when recaps open.
  const sessionsRead = !loading && !loadError;
  const recapUnlocked = sessionsRead && loggedSessionCount >= RECAP_GATE;
  const recapToGo = Math.max(0, RECAP_GATE - loggedSessionCount);
  const yearOfLiftsUnlocked = !!earliestWorkoutAt && (Date.now() - earliestWorkoutAt) >= YEAR_MS;

  // COMP-005: ephemeral recap card, for the first 7 days of the month, once
  // the user has unlocked recaps. R5 (§22): at most one Moment at a time,
  // recap outranks the tonnage milestone.
  const [recapCardHidden, setRecapCardHidden] = useState(true);
  const recapMonthKey = format(new Date(), 'yyyy-MM');
  useEffect(() => {
    if (new Date().getDate() > 7 || loggedSessionCount < RECAP_GATE) { setRecapCardHidden(true); return; }
    AsyncStorage.getItem(`@volyume_recap_card_${recapMonthKey}`)
      .then(v => setRecapCardHidden(v === 'dismissed'))
      .catch(() => setRecapCardHidden(false));
  }, [loggedSessionCount, recapMonthKey]);
  const dismissRecapCard = () => {
    setRecapCardHidden(true);
    AsyncStorage.setItem(`@volyume_recap_card_${recapMonthKey}`, 'dismissed').catch(() => {});
  };

  // Pull to refresh re-reads the plan context beside the progress data.
  const onRefresh = () => { loadPlanContext(); handleRefresh(); };

  // The plan-week slot: a skeleton in the real slot until both the progress
  // data and the plan context have been read, then the card; nothing at all
  // after a failed load (a card built from nothing would claim "0 sessions").
  const planSlotLoading = !loadError && (loading || planContext === undefined);
  const showPlanWeek = !loadError && !loading && planContext !== undefined && !!planWeekSummary;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
          />
        }
      >
        {/* ── Header (R1) ───────────────────────────────────── */}
        <ScreenHeader title="Progress" />

        {/* ── Your plan week (D214, plan 7.1 item 2): the screen's first
            object, "2 of 4 sessions in week 2 of your plan · Upper A is next"
            with the seven day cells, drawn by the shared PlanWeekCard from the
            one view-model. Inside the same card, under a hairline (the spec's
            "one Card"), the week's volume line and strip, in logged sets, so
            far. ── */}
        {!loadError ? <SectionLabel>Your plan week</SectionLabel> : null}
        {planSlotLoading ? (
          <SkeletonCard height={PLAN_WEEK_SKELETON_HEIGHT} />
        ) : null}
        {showPlanWeek ? (
          <AnimatedEntrance>
            <View style={styles.planWeek}>
              <PlanWeekCard summary={planWeekSummary}>
                {hasData ? (
                  <VolumeStrip
                    strip={strip}
                    legendItems={legendItems}
                    onOpen={() => navigation.navigate('VolumeHeatmap', { windowWeeks: 1 })}
                  />
                ) : null}
              </PlanWeekCard>
            </View>
          </AnimatedEntrance>
        ) : null}

        {/* ── Your progress: three or four compact pillar rows inside one
            container, never hero cards (§26). Each headline is a verdict in
            words. No share CTA, no imperative copy, evidence statements only
            (§14). The Answer Block (R2, always). ── */}
        <SectionLabel>Your progress</SectionLabel>
        {loading ? (
          <SkeletonCard height={PILLARS_SKELETON_HEIGHT} />
        ) : (
          <AnimatedEntrance>
            {/* D3 (design audit 03): the hero is the screen's ONLY elevated
                object, so surfaceElevated ranks it above every flat surface
                card in the stack. The Answer Block is what the Progress tab
                is FOR -- it says where training, body and photos stand -- but
                it rendered on plain `surface`, pixel-identical to each
                session card listed beneath it, so the screen's answer had no
                more weight than one row of its evidence. Its two internal
                dividers deliberately stay on `border`: on the raised surface
                borderSubtle falls to 1.17:1 and the three pillars would run
                together. */}
            <Card padding="none" surface="surfaceElevated" style={styles.answerBlock}>
              <PillarRow
                icon="barbell-outline"
                label="Training"
                stateText={trainingRow.state}
                evidenceText={trainingRow.evidence}
                onPress={() => navigation.navigate('LiftProgress')}
              />
              <View style={[styles.answerDivider, live.answerDivider]} />
              <View onLayout={(e) => { trendSectionY.current = e.nativeEvent.layout.y; }}>
                <PillarRow
                  icon="scale-outline"
                  label="Body"
                  stateText={bodyCopy.state}
                  evidenceText={bodyCopy.evidence}
                  onPress={() => navigation.navigate('BodyMetrics')}
                />
              </View>
              {!visualPillar.suppressed && (
                <>
                  <View style={[styles.answerDivider, live.answerDivider]} />
                  {/* Founder device order 2026-08-17: the row is named after
                      the feature it reads from and opens - "Visual" was
                      internal architecture vocabulary users cannot decode. */}
                  <PillarRow
                    icon="camera-outline"
                    label="Progress photos"
                    stateText={!visualPillar.loading ? visualCopy.state : null}
                    evidenceText={!visualPillar.loading ? visualCopy.evidence : null}
                    onPress={() => navigation.navigate('ProgressPhotos')}
                  />
                </>
              )}
              {/* Register D208 (founder question 2026-09-26: "a place in
                  Progress exclusively for recovery ... it looks like a good
                  feature now hard to find"): Recovery joins the top card,
                  after the rows that were already there (their order is
                  unchanged), and opens the Recovery screen. */}
              <View style={[styles.answerDivider, live.answerDivider]} />
              <PillarRow
                icon="battery-charging-outline"
                label="Recovery"
                stateText={recoveryCopy.state}
                evidenceText={recoveryCopy.evidence}
                onPress={() => navigation.navigate('Recovery')}
              />
            </Card>
          </AnimatedEntrance>
        )}

        {/* EP-09/P-06 (Codex end-user-polish audit): a load that FAILED must
            never read as "no training trends yet" -- that used to happen
            because useProgressData's loadError was ignored here entirely.
            Shown ahead of the real empty state and gated on it (loadError can
            stay true briefly after data existed from a prior successful
            load; hasData / allSets still reflect whatever was last
            committed, so this only replaces the messaging when there is
            nothing to fall back on). D214 (PR-2): this is the ONE error state
            on the screen; the Training row above keeps its last copy rather
            than printing "No sessions logged yet" beside it. */}
        {!loading && loadError && allSets.length === 0 && (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load your training trends"
            text="Your training history is safe. This is a loading problem, not lost data."
            actionLabel="Retry"
            onAction={handleRefresh}
            actionAccessibilityLabel="Retry loading training trends"
          />
        )}

        {/* ── Empty state (U-D-4: encouragement-framed, matching BodyMetrics) ──
            C5-P35-01 (D96): the second sentence named three destinations
            that were Pro-locked for a free user with no history. FOUNDER
            DECISION (fully free, no tier split): every destination is open to
            every account, so there is one sentence, not a tier fork. D214
            (PR-11): the sentence used to say those destinations were "still
            available below" while they are the rows ABOVE it. */}
        {!loading && !loadError && allSets.length === 0 && (
          <EmptyState
            icon="analytics-outline"
            title="No training trends yet"
            text="Training charts appear here once sessions are logged. Weigh-ins, photos and scans are in the rows above."
          />
        )}

        {/* ── Evidence trail (R3, cond: any sessions exist). D214: the old
            "N sessions this week" context line is gone, the plan-week card's
            count is the one session count on the screen. ── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <SectionLabel>Recent sessions</SectionLabel>
              {/* R9 (D70): seeAllButton -> shared Button outline sm. */}
              <Button
                variant="outline"
                size="sm"
                fullWidth={false}
                icon="list-outline"
                title="All sessions"
                onPress={() => navigation.navigate('WorkoutHistory')}
                accessibilityLabel="See all sessions"
              />
            </View>
            {recentSessions.map(w => {
              // L04-1 (design audit 2026-07-09): these cards used to render
              // with no onPress while sharing the same tappable-looking Card
              // styling as every other navigating card on this screen. Wire
              // them to WorkoutSummary (read-only).
              //
              // D218 (founder order 2026-10-03, audit F-2): the params are the
              // shared session report's (src/lib/sessionReport.js), the very
              // object History's "View summary" and "Rate your last session"
              // carry, over the unfiltered, survivor-aware exercise lookup the
              // hook returns (null until loaded, which the helper accepts). This
              // card used to count raw ids, name them through the filtered
              // library and cut the id list to four BEFORE dropping the ones it
              // could not name, so it could list fewer names than History for
              // one workout.
              const mySets = allSets.filter(s => s.workoutId === w.id);
              return (
                <SessionCard
                  key={w.id}
                  workout={w}
                  onPress={() => navigation.navigate('WorkoutSummary', {
                    ...sessionSummaryParams(w, mySets, exerciseLookup),
                    // Founder device report 2026-08-24: without the routine
                    // the summary has nothing to title the session with and
                    // its share card falls back to a join of the first two
                    // exercise names, which then moves whenever an exercise
                    // is swapped. getAllWorkouts joins the routine, so both
                    // are already on the row (the report's params carry them
                    // too; named here so every route into the summary reads
                    // as carrying its routine).
                    routineId: w.routineId ?? null,
                    routineName: w.routineName ?? null,
                  })}
                />
              );
            })}
          </View>
        )}

        {/* ── Moments (R5, cond). Recap-only since the founder device
            order of 2026-08-17 retired the tonnage-milestone row; the
            recap card remains transient and dismissible. ── */}
        {!recapCardHidden ? (
          <TouchableOpacity
            style={[styles.recapCard, live.recapCard]}
            activeOpacity={0.85}
            onPress={() => { dismissRecapCard(); navigation.navigate('RecapStory', recentMonthRecapParams(earliestWorkoutAt)); }}
            accessibilityRole="button"
            accessibilityLabel="Open your monthly recap, about 45 seconds"
          >
            <Ionicons name="newspaper-outline" size={18} color={t.colors.primary} />
            <Text style={[styles.recapCardText, live.recapCardText]}>
              {recapBannerText(recentMonthRecapParams(earliestWorkoutAt).monthLabel)}
            </Text>
            <TouchableOpacity
              onPress={dismissRecapCard}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}

        {/* ── Utilities (R6, always): the doors, one grouped list (D214 plan
            7.1 item 6). Body Metrics and Lifts are not doors here: the pillar
            rows above already cover them. The Volume heatmap is a PERSISTENT
            door (PR-15), never conditional on this week's data. The Partners
            tile stays removed (blueprint section 1, entry point 4): Community
            is not a stat. ── */}
        <View style={styles.section}>
          <SectionLabel>More</SectionLabel>
          <NavGroup>
            <NavRow icon="pulse" label="Consistency" onPress={() => navigation.navigate('Consistency')} />
            <NavRow icon="body-outline" label="Volume heatmap" onPress={() => navigation.navigate('VolumeHeatmap')} />
            <NavRow icon="time-outline" label="Full history" onPress={() => navigation.navigate('WorkoutHistory')} />
            {/* COMP-005: Recaps replaces the year-long locked Year-of-Lifts
                tile. It unlocks after RECAP_GATE logged sessions (~a fortnight,
                not a year) and opens the most recent monthly recap; before
                that the row carries its gate text and a tap says the same in a
                toast. */}
            <NavRow
              icon="newspaper-outline"
              label="Recaps"
              sub={recapUnlocked || !sessionsRead ? null : `${recapToGo} session${recapToGo === 1 ? '' : 's'} to go`}
              onPress={() => {
                if (!recapUnlocked) {
                  // R9 (D70): a blocking alert for purely informational
                  // copy diverged from the house rule (toast for
                  // non-destructive feedback; alerts for destructive
                  // confirms only).
                  toast.show(sessionsRead
                    ? `Your first monthly recap is ready after ${RECAP_GATE} logged sessions. ${recapToGo} to go.`
                    : `Your first monthly recap is ready after ${RECAP_GATE} logged sessions.`, { variant: 'info' });
                  return;
                }
                navigation.navigate('RecapStory', recentMonthRecapParams(earliestWorkoutAt));
              }}
            />
            {/* Year of Lifts: the annual crown, shown only once unlocked, so it
                is never shown dimmed for a year. */}
            {yearOfLiftsUnlocked ? (
              <NavRow icon="calendar-outline" label="Year of lifts" onPress={() => navigation.navigate('YearOfLifts')} />
            ) : null}
          </NavGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Campaign 23 (§21/§22 R2): one row inside the Answer Block.
// FOUNDER DECISION (fully free, no tier split): the `proGated` variant
// (ProBadge + "Part of Pro" dimmed treatment) is retired -- every pillar
// always shows its real state/evidence copy now. D214 (PR-17): the icons are
// ink (`textSecondary`), never amber: amber means "the thing to do" and a
// status row is a fact.
function PillarRow({ icon, label, stateText, evidenceText, onPress }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const a11y = spokenRowLabel(label, stateText, evidenceText);
  return (
    <TouchableOpacity
      style={styles.pillarRow}
      onPress={() => { haptics.selection(); onPress?.(); }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Ionicons name={icon} size={22} color={t.colors.textSecondary} />
      <View style={styles.pillarTextWrap}>
        <View style={styles.pillarLabelRow}>
          <Text style={[styles.pillarLabel, live.pillarLabel]}>{label}</Text>
        </View>
        {/* Founder device order 2026-08-17: the two-line clamps cut
            pillar sentences mid-word ("Maintenance comes fr..."), so
            nearly every box at the top of Progress ran out of space.
            Evidence text wraps in full now; the row grows instead of
            truncating. */}
        {stateText ? <Text style={[styles.pillarState, live.pillarState]}>{stateText}</Text> : null}
        {evidenceText ? <Text style={[styles.pillarEvidence, live.pillarEvidence]}>{evidenceText}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </TouchableOpacity>
  );
}

// D214 (plan 7.1 item 2, line 3 and the strip): this Monday week so far, in
// logged working sets, over a segmented bar in three named tones. The model is
// pure (src/lib/progress/volumeStrip.js: the count is volumeLogged.js's one
// definition, the "under" count is the Volume heatmap's first group by
// construction); this only draws it. The line and bar open the heatmap on
// "This week"; the legend and its (i) sit outside that touch target so a
// screen reader reaches each. In a recovery week no verdict is drawn: one
// neutral shade named "Trained", the recovery sentence under the line.
// CP-10 batch G (2026-07-11): sibling function-component scope, own
// useTheme() call (same reasoning as PillarRow above), same shared
// buildLiveStyles(t).
function VolumeStrip({ strip, legendItems, onOpen }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const tone = stripToneColors(t.colors);
  return (
    <View testID="volume-strip" style={styles.strip}>
      <TouchableOpacity
        style={styles.stripTouch}
        onPress={() => { haptics.selection(); onOpen?.(); }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={strip.spoken}
        accessibilityHint="Opens the Volume heatmap for this week"
      >
        <View style={styles.stripTop}>
          <View style={styles.stripText}>
            <Text style={[styles.stripLine, live.stripLine]}>{strip.line}</Text>
            {strip.recoveryLine ? (
              <Text style={[styles.stripNote, live.stripNote]}>{strip.recoveryLine}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </View>
        {strip.hasSetsThisWeek ? (
          <View
            style={styles.volStackBar}
            testID="volume-strip-bar"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {strip.segments.map(seg => (
              <View
                key={seg.muscle}
                style={[
                  styles.volStackSegment,
                  { flex: Math.max(seg.sets, 0.5), backgroundColor: strip.recoveryWeek ? tone.neutral : tone[seg.tone] },
                  strip.recoveryWeek ? live.stripNeutralSegment : null,
                ]}
              />
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
      {strip.hasSetsThisWeek ? (
        <LegendRow
          items={legendItems}
          trailing={<InfoTooltip text={strip.recoveryWeek ? STRIP_RECOVERY_TOOLTIP : STRIP_TOOLTIP} />}
        />
      ) : null}
    </View>
  );
}

// CP-10 batch G (2026-07-11): sibling function-component scope, own
// useTheme() call (same reasoning as PillarRow above), same shared
// buildLiveStyles(t).
function SessionCard({ workout, onPress }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // D214 (PR-9): the routine's name, else the session's own `name`, else
  // "Session", the order Home's last-session card reads
  // (HomeLastSessionCard.js). `name` is overwritten at finish with an
  // exercise-derived summary, so it is only the right title for a session with
  // no routine; every session used to read "Session" here.
  const title = workout.routineName || workout.name || 'Session';
  const at = workout.startedAt ?? workout.createdAt ?? workout.created_at ?? 0;
  // D214 (PR-1): the difficulty is rated 1 to 5, so the chip prints the
  // person's own word ("Hard") and the spoken label carries "4 of 5", never
  // "/10". A value outside 1 to 5 draws no chip rather than a wrong one.
  const diff = Number(workout.sessionDifficulty);
  const diffWord = Number.isInteger(diff) && diff >= 1 && diff <= 5 ? DIFFICULTY_WORDS[diff] : null;
  // R9 (D70): radius="md" -> default (radius.lg).
  return (
    <Card
      style={styles.sessionCard}
      onPress={onPress}
      accessibilityLabel={diffWord ? `View summary for ${title}, difficulty ${diffWord}, ${diff} of 5` : `View summary for ${title}`}
    >
      <View style={styles.sessionLeft}>
        <Text style={[styles.sessionName, live.sessionName]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.sessionMeta, live.sessionMeta]}>
          {at && safeDate(at) ? safeFormatDate(at, 'EEE d MMM') : ''}
          {workout.durationMinutes ? `${at && safeDate(at) ? ' · ' : ''}${workout.durationMinutes} min` : ''}
        </Text>
      </View>
      {diffWord ? (
        <View style={[styles.diffChip, live.diffChip]} testID="session-difficulty-chip">
          <Text style={[styles.diffText, live.diffText]}>{diffWord}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </Card>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  content:     { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section:     { gap: spacing.md },
  rowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Your plan week and the volume strip (D214, plan 7.1 item 2) ──
  planWeek: { gap: spacing.sm },
  strip: { gap: spacing.md },
  stripTouch: { gap: spacing.md },
  stripTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stripText: { flex: 1, gap: spacing.xxs },
  // The strip's line is a sentence of numbers, so it wears tabular figures.
  stripLine: { ...type.num('bodySm'), color: colors.textPrimary },
  stripNote: { ...type.bodySm, color: colors.textSecondary },
  volStackBar: { flexDirection: 'row', height: 8, gap: spacing.xxs },
  volStackSegment: { borderRadius: radius.hair },

  // ── Answer Block (R2) ──
  answerBlock: {},
  answerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  pillarRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  pillarTextWrap: { flex: 1, gap: spacing.xxs },
  pillarLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pillarLabel: { ...type.overline, color: colors.textMuted },
  pillarState: { ...type.bodyStrong, color: colors.textPrimary },
  pillarEvidence: { ...type.bodySm, color: colors.textSecondary },

  // ── Moments (R5) ──
  recapCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  recapCardText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  // ── Recent sessions (R3) ──
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md,
  },
  sessionLeft:  { flex: 1 },
  sessionName:  { ...type.bodyStrong, color: colors.textPrimary },
  sessionMeta:  { ...type.num('caption'), color: colors.textSecondary, marginTop: spacing.xxs },
  // D214 (PR-1): the chip prints the person's own word for a 1 to 5 rating, in
  // ink: a rating is a fact the person gave, not a verdict, so it carries no
  // warning or error tone (the old tones fired at 6 and 8, which 1 to 5 never
  // reaches).
  diffChip:     { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs, backgroundColor: colors.surface2 },
  diffText:     { ...type.captionStrong, color: colors.textSecondary },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this screen's several function-component scopes (AnalyticsScreen and
// its sibling PillarRow/VolumeStrip/SessionCard) so they can
// never drift out of step with each other or the frozen block. Pure layout
// keys (flex/gap/padding/width/borderWidth, no token) are correctly omitted
// -- there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    stripLine: { ...t.type.num('bodySm'), color: t.colors.textPrimary },
    stripNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    // A recovery week's one neutral shade needs a hairline to read on the card.
    stripNeutralSegment: { borderWidth: 1, borderColor: t.colors.border },
    answerDivider: { backgroundColor: t.colors.border },
    pillarLabel: { ...t.type.overline, color: t.colors.textMuted },
    pillarState: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pillarEvidence: { ...t.type.bodySm, color: t.colors.textSecondary },
    recapCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    recapCardText: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    sessionName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sessionMeta: { ...t.type.num('caption'), color: t.colors.textSecondary },
    diffChip: { backgroundColor: t.colors.surface2 },
    diffText: { ...t.type.captionStrong, color: t.colors.textSecondary },
  };
}
