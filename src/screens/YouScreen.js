/**
 * Coach home.
 *
 * Historical file/route name kept as YouScreen/You for navigation stability,
 * but the visible tab is now Coach. This is the coaching hub: every
 * destination is a clear Volyume flow with its own guardrails.
 *
 * D231 (app layout rework, batch 4): the Progress tab is gone and its rows live
 * here, top to bottom: This week (one card that changes through the week, with
 * Your week and Past decisions under it), Your progress and Looking back (the
 * Progress tab's rows, components/coach/CoachProgress.js), Your coaching setup,
 * Safety checks. The profile card (and the Athlete profile screen it opened),
 * the Injuries row (home: Train), the Community row and the Coaching reminders
 * row (home: Settings) left this screen.
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Text from '../components/Text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, iconSize, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import CoachingSetupCard from '../components/CoachingSetupCard';
import CoachProgress from '../components/coach/CoachProgress';
import useCoachingSetUp from '../hooks/useCoachingSetUp';
import { resolveCoachingCardMode, snoozeCoachingCard } from '../lib/coachingSetup';
import { NavRow, NavGroup } from '../components/NavRow';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  getAllWorkouts,
  getCoachOutputHistory,
  getLatestCheckin,
  getMorningWeightsLast14Days,
  getOpenEdPatternFlag,
} from '../lib/database';
import { logError } from '../lib/errorLog';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { buildCoachLedger } from '../lib/coachLedger';
import { completedDecisionsFrom, splitCoachDecisions } from '../lib/coachDecision';
import { localWeekStartMs, localDayKey } from '../lib/dayKey';
import { WELLBEING_KEY } from '../lib/wellbeing';
import { deriveSafetyState } from '../lib/safetyState';

// D231: how many of the latest coach outputs are read to find this week's
// decision and the most recent past one (completed ones only).
const DECISION_HISTORY_LIMIT = 8;

// D231: the slot the This week card holds while the first read settles (the
// card is 40 dp of icon inside 16 dp of padding each side, about 74 dp).
const CARD_SKELETON_HEIGHT = 74;

// D231: the This week card's line once this week's decision exists.
const THIS_WEEK_DECISION_TITLE = "This week's decision \u00B7 See why";

// D231 lead review: a person with an earlier completed decision is past their
// first check-in, so the card never says "First check-in" to them. Until this
// week's check-in is open they read the line the old Weekly check-in row gave
// them (`latestReview` branch), which is neutral under calm mode and an ED flag.
const ESTABLISHED_CHECKIN_TITLE = 'Answer a few questions so your coach knows how your week went.';

// UK short date (DD/MM/YYYY) for the pending-coach-decision title, which sits
// in a narrow card and wrapped to a second line with the long-form date
// (founder D13.1, 2026-07-09). Same en-GB locale as every other date on this
// screen, just the default numeric format instead of day/month/year options.
// R2-7 (remediation 2026-07-11, founder device walk build 2684): the check-in
// row's date fact reads as a calm British day-and-month line ("19 July"), not a
// numeric DD/MM/YYYY. It titles a one-line NavRow subtitle now that the
// explanatory sentence lives on WeeklyCheckInScreen (where it was already
// conveyed in full), so the row sits level with its one-line siblings.
function formatShortDate(ms) {
  if (!ms) return null;
  try {
    return new Date(Number(ms)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  } catch (_) {
    return null;
  }
}

function profileFocusLine(profile = {}) {
  const safeProfile = profile || {};
  const phase = PHASE_LABELS[safeProfile.trainingPhase] || null;
  const goal = GOAL_LABELS[safeProfile.trainingGoal] || null;
  const days = Number(safeProfile.daysPerWeek);
  return [
    phase,
    goal && goal !== 'Not competing' ? goal : null,
    Number.isFinite(days) && days > 0 ? `${days} days/week` : null,
  ].filter(Boolean).join(' - ');
}

function parseCheckinDay(rawPrefs) {
  try {
    const prefs = rawPrefs ? JSON.parse(rawPrefs) : null;
    return Number.isFinite(prefs?.checkinDay) ? prefs.checkinDay : 0;
  } catch (_) {
    return 0;
  }
}

function localMidnightMs(ms = Date.now()) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildPendingCoachCopy(readiness) {
  if (!readiness) {
    return {
      title: 'First check-in not open yet',
      body: 'Keep logging your morning weight and training as normal. Your first check-in opens once you have logged enough days of morning weights.',
    };
  }
  if (readiness.edSuppressed) {
    return {
      title: readiness.unlockDateMs
        ? `First check-in ${formatShortDate(readiness.unlockDateMs)}`
        : 'First check-in not open yet',
      body: 'Volyume is keeping this calm and will not push weigh-in counts here. Use the check-in when it opens.',
    };
  }
  if (!readiness.firstWeightAt) {
    return {
      title: 'First check-in starts after your first morning weight',
      body: "Log your first morning weight on the Today tab. Your coach will not change your targets until there are enough weigh-ins to go on.",
    };
  }
  const rows = readiness.ledger?.rows || [];
  const weighInsReady = rows.find(r => r.key === 'weighIns')?.done === true;
  const daysReady = rows.find(r => r.key === 'days')?.done === true;
  const unlockIsTodayOrPast = readiness.unlockDateMs != null
    && readiness.unlockDateMs <= localMidnightMs();
  if (unlockIsTodayOrPast && weighInsReady && daysReady) {
    return {
      // D231: the This week card reads "Check-in is open" (it was the Weekly
      // check-in row's "Weekly check-in is open").
      title: 'Check-in is open',
      open: true,
      body: "Answer the weekly check-in and your coach will make this week's decision. Until then, your targets stay the same.",
    };
  }
  if (daysReady && !weighInsReady) {
    return {
      title: 'First check-in needs more morning weights',
      body: 'Keep logging your morning weight. A few more and there will be enough for your first weekly review, since one morning on its own moves about too much to tell you anything.',
    };
  }
  return {
    title: readiness.unlockDateMs
      ? `First check-in ${formatShortDate(readiness.unlockDateMs)}`
      : 'First check-in not open yet',
    body: 'Keep logging your morning weight and training. Your coach waits until there are enough weigh-ins before changing your targets.',
  };
}

export default function YouScreen({ navigation, route }) {
  // Founder brief 2026-10-19 (coaching-first onboarding with an optional quick
  // start): the setup card sits at the top until coaching is set up; the rest
  // of the tab stays available (non-blocking).
  const coachingSetUp = useCoachingSetUp();
  // `tier` left this selector with the retired Partners row (blueprint
  // section 1, entry point 2): it was read only to pass through to the
  // partner hook, and nothing on this screen consults tier now (fully-free
  // product, D137).
  const { user, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
  })));
  // D231: this week's completed decision (null until one exists for the week)
  // and the most recent completed decision from an earlier week.
  const [thisWeekDecision, setThisWeekDecision] = useState(null);
  const [pastDecision, setPastDecision] = useState(null);
  const [coachReadiness, setCoachReadiness] = useState(null);
  // False until the first read settles (success or failure), so the This week
  // card never flashes a state ("First check-in not open yet") that the read is
  // about to replace with this week's decision.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // The permanent way into coaching setup: full unless "Not now" applies
  // (src/lib/coachingSetup.js). null until the read resolves, so no flash.
  const [coachingCardMode, setCoachingCardMode] = useState(null);
  useFocusEffect(useCallback(() => {
    if (!user?.id) return undefined;
    let alive = true;
    if (coachingSetUp) return undefined;
    resolveCoachingCardMode(user.id, 'coach_home').then((next) => { if (alive) setCoachingCardMode(next); });
    return () => { alive = false; };
  }, [user?.id, coachingSetUp]));
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // D231: the screen scrolls to the top on a re-tap of the tab (it was the
  // Progress tab's), and carries the `focusWeightTrend` arrival (the Today
  // weigh-in strip's trend door) to the Body row of Your progress.
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);
  const focusWeightTrend = !!route?.params?.focusWeightTrend;
  const clearFocusWeightTrend = useCallback(() => {
    navigation.setParams?.({ focusWeightTrend: undefined });
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    async function load() {
      if (!user?.id) {
        setLoadError(false);
        setCoachReadiness(null);
        return;
      }
      try {
        const [
          workoutsResult,
          historyResult,
          weightsResult,
          prefsResult,
          edFlagResult,
          wellbeingResult,
        ] = await Promise.allSettled([
          getAllWorkouts(user.id),
          // D231: the latest outputs; the COMPLETED ones decide this week's
          // card and the Past decisions row (lib/coachDecision.js).
          getCoachOutputHistory(user.id, DECISION_HISTORY_LIMIT),
          // FOUNDER DECISION (fully free, no tier split): these four used to
          // read Free as an empty/absent placeholder; they run unconditionally
          // now, for everyone.
          getMorningWeightsLast14Days(user.id),
          AsyncStorage.getItem('@volyume_notification_prefs'),
          getOpenEdPatternFlag(user.id),
          AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified'),
        ]);
        if (!alive) return;
        const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
        // An output is a decision only once the check-in it was built from
        // exists for the same week (coachDecision.js, PM-06). A failed
        // check-in read is a failed load, never a quiet "no decision".
        let decisions = [];
        let decisionsFailed = false;
        if (historyResult.status === 'fulfilled') {
          try {
            decisions = await completedDecisionsFrom(history, (weekStart) => getLatestCheckin(user.id, weekStart));
          } catch (e) {
            decisionsFailed = true;
            logError('YouScreen.decisions', e, { userId: user?.id, reloadKey });
          }
        }
        if (!alive) return;
        const failed = [workoutsResult, historyResult].some((r) => r.status === 'rejected') || decisionsFailed;
        if (failed) {
          logError('YouScreen.load', new Error('coach_hub_partial_load_failed'), {
            reloadKey,
            workouts: workoutsResult.status,
            history: historyResult.status,
            decisions: decisionsFailed ? 'rejected' : 'fulfilled',
          });
        }
        const workouts = workoutsResult.status === 'fulfilled' ? workoutsResult.value : [];
        const weights = weightsResult.status === 'fulfilled' ? weightsResult.value : [];
        const checkinDay = parseCheckinDay(prefsResult.status === 'fulfilled' ? prefsResult.value : null);
        const wellbeing = wellbeingResult.status === 'fulfilled' ? (wellbeingResult.value || 'unspecified') : 'read_failed';
        const edFlag = edFlagResult.status === 'fulfilled' ? edFlagResult.value : 'read_failed';
        const completed = (workouts || []).filter(w => !!(w.isCompleted ?? w.is_completed));
        // X11 (cross-surface consistency audit 2026-07-30): was a rolling
        // trailing-7-day window; every "this week" weigh-in count now shares
        // the same Monday-anchored boundary (dayKey.js) as CoachOutputScreen.
        const weekAgo = localWeekStartMs();
        // D93 (review B finding 1): distinct mornings, matching the engine's
        // per-day credit and the ledger label.
        const weighIns7d = new Set(
          (weights || [])
            .filter(w => Number.isFinite(Number(w.loggedAt ?? w.logged_at)) && Number(w.loggedAt ?? w.logged_at) >= weekAgo)
            .map(w => localDayKey(Number(w.loggedAt ?? w.logged_at)))
        ).size;
        const firstWeightAt = weights.length
          ? Math.min(...weights.map(w => w.loggedAt ?? w.logged_at ?? Infinity))
          : null;
        // D228 item 2: one composition (src/lib/safetyState.js); same verdict.
        const safety = deriveSafetyState({ mode: wellbeing, edFlag, scoffScore: userProfile?.scoffScore });
        const edSuppressed = safety.suppressed || safety.scoffPositive;
        // FOUNDER DECISION (fully free, no tier split): the ledger runs for
        // everyone now, not only Pro.
        const ledger = buildCoachLedger({
          weighIns7d,
          completedSessions: completed.length,
          firstWeightAt: Number.isFinite(firstWeightAt) ? firstWeightAt : null,
          checkinDay,
          edFlagOpen: edSuppressed,
        });
        if (historyResult.status === 'fulfilled' && !decisionsFailed) {
          const split = splitCoachDecisions(decisions);
          setThisWeekDecision(split.thisWeek);
          setPastDecision(split.past);
        }
        setCoachReadiness({
          ledger,
          unlockLabel: ledger.unlockLabel,
          unlockDateMs: ledger.unlockDate ? ledger.unlockDate.getTime() : null,
          firstWeightAt: Number.isFinite(firstWeightAt) ? firstWeightAt : null,
          edSuppressed,
        });

        setLoadError(failed);
        setLoaded(true);
      } catch (e) {
        if (alive) {
          logError('YouScreen.load', e, { userId: user?.id, reloadKey });
          setLoadError(true);
          setLoaded(true);
        }
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, reloadKey, userProfile]));

  const profileFocus = profileFocusLine(userProfile);
  const pendingCoachCopy = buildPendingCoachCopy(coachReadiness);
  // The one This week card: this week's decision once it exists, else the
  // check-in state (the countdown, then "Check-in is open"), in the Weekly
  // check-in row's own wording and with its neutral variants under calm mode
  // and an open ED flag (buildPendingCoachCopy owns that rule, unchanged).
  const cardEmphasised = !!thisWeekDecision || pendingCoachCopy.open === true;
  const cardTitle = thisWeekDecision
    ? THIS_WEEK_DECISION_TITLE
    : (pastDecision && pendingCoachCopy.open !== true ? ESTABLISHED_CHECKIN_TITLE : pendingCoachCopy.title);
  const openThisWeek = () => {
    if (thisWeekDecision) {
      navigation.navigate('CoachOutput', thisWeekDecision?.weekStart ? { weekStart: thisWeekDecision.weekStart } : undefined);
    } else {
      navigation.navigate('WeeklyCheckIn');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, live.content]}>
        <ScreenHeader
          title="Coach"
          right={(
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              style={[styles.settingsGear, live.settingsGear]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={t.colors.textPrimary} />
            </Pressable>
          )}
        />

        {!coachingSetUp && coachingCardMode ? (
          <CoachingSetupCard surface="coach_home"
            variant="coach"
            mode={coachingCardMode}
            onPress={() => navigation.navigate('CoachingSetup')}
            onNotNow={() => { if (user?.id) snoozeCoachingCard(user.id); setCoachingCardMode('compact'); }}
          />
        ) : null}

        {/* DD113 (design-consistency-audit-2026-08-06): documented exception,
            not bespoke drift. This is a slim degrade-in-place banner that sits
            ABOVE the rest of the screen, which keeps rendering as normal
            underneath it (the cards and nav sections) -- a load failure here
            never blocks the coaching nav the user still needs. Converting it
            to EmptyState would force it to take over the screen, breaking that
            in-place-degrade contract, so it stays a compact Card. Visual
            language (icon + title + body, warning tone) still matches the
            app's other failure states as closely as the inline layout
            allows. */}
        {loadError ? (
          <Card
            style={[styles.loadErrorCard, live.loadErrorCard]}
            onPress={() => setReloadKey((n) => n + 1)}
            accessibilityLabel="Try loading coach data again"
          >
            <View style={[styles.loadErrorIcon, live.loadErrorIcon]}>
              <Ionicons name="warning-outline" size={18} color={t.colors.warning} />
            </View>
            <View style={styles.loadErrorCopy}>
              <Text style={[styles.loadErrorTitle, live.loadErrorTitle]}>Could not refresh Coach</Text>
              <Text style={[styles.loadErrorBody, live.loadErrorBody]}>Your saved profile stays unchanged. Tap to try again.</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color={t.colors.textMuted} />
          </Card>
        ) : null}

        {/* D231 (batch 4): ONE card changes through the week. It replaces the
            "Weekly coaching decision" card and the three "This week" rows.
            Until this week's decision exists it is the check-in state, in the
            Weekly check-in row's own titles (the countdown such as "First
            check-in 19 July", then "Check-in is open"; R2-7: the title only,
            the explanatory sentence lives on WeeklyCheckInScreen) and opens the
            check-in; once it exists it reads "This week's decision · See why"
            and opens that week's CoachOutput. Under it: Your week, and Past
            decisions while a completed decision from an earlier week exists. */}
        <View style={styles.section}>
          <SectionLabel>This week</SectionLabel>
          {user?.id && !loaded ? (
            <SkeletonCard height={CARD_SKELETON_HEIGHT} />
          ) : (
            <Card
              style={styles.statusCard}
              tone={cardEmphasised ? 'primary' : undefined}
              onPress={openThisWeek}
              accessibilityLabel={thisWeekDecision ? "Open this week's coaching decision" : `Weekly check-in. ${cardTitle}`}
            >
              <View style={styles.statusTop}>
                <View style={[styles.statusIcon, cardEmphasised ? live.statusIcon : live.statusIconQuiet]}>
                  <Ionicons
                    name={thisWeekDecision ? 'git-branch-outline' : 'clipboard-outline'}
                    size={20}
                    color={cardEmphasised ? t.colors.primary : t.colors.textSecondary}
                  />
                </View>
                <View style={styles.statusText}>
                  <Text style={[styles.statusTitle, live.statusTitle]}>{cardTitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </View>
            </Card>
          )}
          <NavGroup>
            <NavRow
              icon="book-outline"
              label="Your week"
              sub="Your training, eating, weigh-ins and your coach's decision, in one place."
              onPress={() => navigation.navigate('WeeklyStory')}
            />
            {pastDecision ? (
              <NavRow
                icon="pulse-outline"
                label="Past decisions"
                onPress={() => navigation.navigate('CoachOutput', { weekStart: pastDecision.weekStart })}
              />
            ) : null}
          </NavGroup>
        </View>

        {/* D231 (batch 4): "Your progress" (Training, Body, Progress photos,
            Recovery) and "Looking back" (Consistency, Recaps, Year of lifts),
            the Progress tab's rows, moved unchanged. The Body row is the
            scroll target of `focusWeightTrend`. */}
        <CoachProgress
          navigation={navigation}
          scrollRef={scrollRef}
          focusBody={focusWeightTrend}
          onFocusBodyDone={clearFocusWeightTrend}
        />

        {/* FOUNDER DECISION (fully free, no tier split): the coaching setup
            renders for everyone now. */}
        {/* Coaching-first onboarding (founder brief 2026-10-19): the setup rows
            are coaching; until it is set up the card at the top is the way in.
            D231: "Goal and phase" carries the focus line (phase, goal, days a
            week) the profile card used to show, built by the same code;
            Coaching reminders left for Settings. */}
        {coachingSetUp ? (
        <View style={styles.section}>
          <SectionLabel>Your coaching setup</SectionLabel>
          <NavGroup>
          <NavRow
            icon="flag-outline"
            label="Goal and phase"
            sub={profileFocus || null}
            onPress={() => navigation.navigate('ProGoalSetup')}
          />
          <NavRow
            icon="nutrition-outline"
            label="Nutrition targets"
            sub="Your daily calories, protein, carbs and fat, and why they are set where they are."
            onPress={() => navigation.navigate('NutritionTargets')}
          />
          </NavGroup>
        </View>
        ) : null}

        {/* W-8 / C5-P7-07 (D96): this section used to sit inside the isPro
            branch, and YouScreen is the ONLY route to WellbeingCheckScreen in
            the whole app, so a Free user could never take or update the
            self-report screening, nor reach its result guidance (a positive
            result names a GP or dietitian).
            Both screens are registered ungated (RootNavigator) and both rows
            are guardrail INPUTS, not Pro features: the wellbeing check writes
            the SCOFF score the tier-blind safety system reads, and Goal lock
            sets the ED-pattern detector's threshold. CLAUDE.md Section 2 and
            proGate.js are explicit that guardrails never consult tier, so the
            section is tier-blind here too. No screen, question, score,
            threshold, flag or floor is changed by this move. */}
        <View style={styles.section}>
          <SectionLabel>Safety checks</SectionLabel>
          <NavGroup>
          <NavRow
            icon="shield-checkmark-outline"
            label="Goal lock"
            sub="Set the conservative limit for cutting goals."
            onPress={() => navigation.navigate('GoalLockConsent', { editMode: true })}
          />
          <NavRow
            icon="heart-outline"
            label="Wellbeing check"
            // Tier-blind wording now the row is (W-8): the answers shape the
            // safety checks every account gets, whether or not coaching is on.
            sub="Update the questions behind your safety checks."
            onPress={() => navigation.navigate('WellbeingCheck')}
          />
          </NavGroup>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  // Audit item 3: account/settings is demoted to this header gear (a
  // secondary entry point, not removed) so the coaching content leads the
  // scrollable body. Sized to match the ScreenHeader brand-mark box it
  // replaces on this one tab.
  settingsGear: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  loadErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: colors.warning,
  },
  loadErrorIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadErrorCopy: { flex: 1, minWidth: 0 },
  loadErrorTitle: { ...type.bodyStrong, color: colors.textPrimary },
  loadErrorBody: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  statusCard: { gap: spacing.md },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusText: { flex: 1 },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  // The countdown state is a fact, not an action: ink, not amber (D214 rule 3).
  statusIconQuiet: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // B-5: statusEyebrow's typography now comes from SectionLabel (tone="primary").
  statusTitle: { ...type.bodyStrong, color: colors.textPrimary },
  section: { gap: spacing.md },
  about: { alignItems: 'center', paddingTop: spacing.md, gap: spacing.xs },
  aboutName: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.textMuted },
  aboutVersion: { ...type.caption, color: colors.textMuted },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/height, no token) are correctly omitted --
// there is nothing to unfreeze for them. Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    content: { paddingHorizontal: t.screenPadding },
    safe: { backgroundColor: t.colors.background },
    settingsGear: { backgroundColor: t.colors.surface2 },
    loadErrorCard: { borderColor: t.colors.warning },
    loadErrorIcon: { backgroundColor: t.colors.warningBg },
    loadErrorTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    loadErrorBody: { ...t.type.caption, color: t.colors.textSecondary },
    statusIcon: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    statusIconQuiet: { backgroundColor: t.colors.surface2 },
    statusTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    aboutName: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    aboutVersion: { ...t.type.caption, color: t.colors.textMuted },
  };
}
