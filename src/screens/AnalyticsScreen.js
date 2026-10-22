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

import { colors, fontSize, fontWeight, spacing, radius, type, iconSize, withAlpha, alpha, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import ScreenHeader from '../components/ScreenHeader';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedEntrance from '../components/AnimatedEntrance';
import EmptyState from '../components/EmptyState';
import { NavRow, NavGroup } from '../components/NavRow';
import useAppStore from '../store/useAppStore';
import useProgressData from '../hooks/useProgressData';
import useWeightTrend from '../hooks/useWeightTrend';
import useVisualPillar from '../hooks/useVisualPillar';
import {
  bodyPillarCopy, computeTrainingPillarSummary, buildVisualPillarCopy, trainingPillarCopy,
} from '../lib/progress/pillars';

// Recaps unlock after this many logged sessions (COMP-005, ~a fortnight); the
// one number the door row, its toast and the recap banner all read.
const RECAP_GATE = 10;
// Year of lifts appears once the first session is a year old (as it always has).
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// D214 (PR-17): the loading slot is the real slot's height, not one 168 dp
// block for a four-row card, so little jumps when the content arrives (measured
// on the paper render at a 412 dp phone: the four pillar rows about 410 to 450
// dp). D231 (app layout rework, batch 2): the plan-week card and its strip left
// this screen for Train, so the pillars are the only loading slot left.
const PILLARS_SKELETON_HEIGHT = 410;

// D214 (PR-2): what the Training row prints when a load failed and it has no
// earlier copy to keep: its label alone, so the one error state below speaks.
const NO_TRAINING_COPY = Object.freeze({ state: null, evidence: null });

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
  const bodyWeightUnits = useAppStore(s => s.bodyWeightUnits);
  const units = useAppStore(s => s.units);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
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
  // D231 (app layout rework, batch 2): the plan-week card and the volume strip
  // under it (with the plan context they read) left this screen for Train
  // (src/hooks/useTrainWeek.js); so did Recent sessions.

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
    allSets, exerciseMap, exerciseLookup, earliestWorkoutAt, completedWorkoutCount,
    sessionCount,
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


  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingHorizontal: t.screenPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.colors.primary}
          />
        }
      >
        {/* ── Header (R1) ───────────────────────────────────── */}
        <ScreenHeader title="Progress" />

        {/* D231 (app layout rework, batch 2): "Your plan week" (the plan-week card
            and the volume strip inside it) moved to Train, with Recent sessions
            below. This screen's first object is Your progress. */}

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
            rows above already cover them. D231 (app layout rework, batch 2): the
            Volume heatmap and Full history rows are gone with the strip and
            Recent sessions they duplicated; both live on Train now. The Partners
            tile stays removed (blueprint section 1, entry point 4): Community
            is not a stat. ── */}
        <View style={styles.section}>
          <SectionLabel>More</SectionLabel>
          <NavGroup>
            <NavRow icon="pulse" label="Consistency" onPress={() => navigation.navigate('Consistency')} />
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  content:     { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section:     { gap: spacing.md },

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
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this screen's function-component scopes (AnalyticsScreen and its
// sibling PillarRow; VolumeStrip and the session card moved to Train, D231) so
// they can never drift out of step with each other or the frozen block. Pure layout
// keys (flex/gap/padding/width/borderWidth, no token) are correctly omitted
// -- there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    answerDivider: { backgroundColor: t.colors.border },
    pillarLabel: { ...t.type.overline, color: t.colors.textMuted },
    pillarState: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pillarEvidence: { ...t.type.bodySm, color: t.colors.textSecondary },
    recapCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    recapCardText: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
  };
}
