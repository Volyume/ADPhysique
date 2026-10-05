import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, radius, type, circle,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlanLandmarks, getPlanRoles } from '../lib/effectiveLandmarks';
import BackHeader from '../components/BackHeader';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import RangeBar from '../components/RangeBar';
import { SkeletonCard } from '../components/Skeleton';
import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';
import {
  getCompletedWorkoutSets, getAllExercises, getExerciseLookup, getWeeklyVolumeByMuscle, getActivePlan,
  getCurrentMesocycleWeek,
} from '../lib/database';
import { computeDivisionDiff, fingerprintMarkers, planWearsDivision } from '../lib/divisionDiff';
import { buildPlanInputs } from '../lib/planAutoGen';
import { GOAL_LABELS } from '../lib/coachingGoals';
import { logError } from '../lib/errorLog';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
// D214 addendum 9 (census 0.24, W4): the band words are written ONCE, in
// volumeBandLabels.js, and read by this screen and the Workout Summary alike.
// D219 (design 5.3, lane A5): the words and the verdict are the ONE judgement
// every surface that judges a muscle's weekly sets reads (volumeJudgement.js):
// the role-aware band function with the muscle's role from the active plan's
// facts, so a muscle the person picked to bring up reads inside its focus range.
import { VOLUME_BAND_LABELS } from '../lib/volumeBandLabels';
import {
  GROUP_ORDER, judgeWeek, roleFor, rangeBarFor, toneColors, toneForGroup,
} from '../lib/volumeJudgement';
// D200-1 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
// the 2/4-week windows read the AVERAGE working sets per week against the
// unchanged weekly bands, instead of the window's raw total. D214 amends
// ruling 1's "1-week view unchanged": "This week" is now the Monday-anchored
// week so far (volumeWindow.js volumeWindowBounds), so the heatmap agrees
// with the Progress strip and the plan. See volumeWindow.js's header.
import { normaliseWindowWeeks } from '../lib/volumeWindow';
// D214 (lane 5 review S5): the ONE definition of a logged set, of the window
// readings built on it and of the row-group rule lives in volumeLogged.js, so
// the Progress strip reads the same functions as this screen and the two
// cannot disagree.
import {
  LISTED_MUSCLES, NO_SETS_GROUP, buildDataset, loggedRowsBetween, buildWindowView,
  planTrainedMuscles, bandGroupFor,
} from '../lib/volumeLogged';
import { resolveProgrammePosition } from '../lib/programmePosition';
import { RECOVERY_STATE } from '../lib/recoveryState';
import { SESSION_STATE } from '../lib/blockProgression';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import WindowChips from '../components/WindowChips';
import VolyumeChart from '../components/VolyumeChart';
import { VOLUME_WINDOWS, windowByKey, volumeTakeaway } from '../lib/chartWindows';
import { track } from '../lib/engineTelemetry';
import { trainingRecency } from '../lib/trainingRecency';
import { touchTarget } from '../styles/layout';
// D200 item 3 (Q3) last clause: the volume trend's buckets anchor on the
// Monday-anchored week end, matching every other "this week" reading on the
// tab, instead of a rolling window off the wall clock (F4).
import { localWeekEndMs } from '../lib/dayKey';

/*
 * Volume heatmap (register D214, build lane 5 of the Progress elevation; plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.4, with the five rules of 7.0).
 *
 * The screen's question: "Am I doing enough for each muscle this week?"
 * Order: the window control, the summary line (logged sets, never credits),
 * the figure with its ONE legend, the rows grouped by band with counts, and
 * the trend card. The screen ends there: the "Volume targets" door and its
 * editor are removed (D219, founder answer 2026-10-05, "Remove the editor":
 * one set of numbers everywhere, so the person's own targets are neither
 * shown nor applied).
 *
 * Standing rules held here:
 *  - D204 and D204 addendum 3: the screen describes and never instructs, so no
 *    row says how many sets to add and no copy tells the athlete what to do.
 *  - One number, rounded once: the figure on a row and the figure judged
 *    against the band are the same rounded value (VH-2).
 *  - "N sets" totals count logged working-set rows (warm-ups and explosive
 *    sets excluded), never the per-muscle credits summed (VH-16); the rows
 *    credit a set once to the muscle it works most and half to each helper,
 *    which the summary's (i) says.
 *  - A recovery week (the block's planned light week) is planned lower, so no
 *    verdict colour or band word is drawn: the figure uses one neutral shade
 *    and the rows print their figures alone (PR-14, VH-10).
 *  - Nothing is judged until a set is logged in the window shown (D214
 *    addendum 9, census 6.4): with no logged set the rows are the same flat
 *    list a recovery week draws, so a plan that programmes every muscle never
 *    reads "Under the range" on a Monday morning before the first set.
 *  - A row says what it is: "5 sets so far this week, range 6 to 22" (an
 *    average over 2 and 4 weeks), the range being the fewest weekly sets that
 *    still help the muscle grow to the most it can recover from (census 0.4).
 *  - D219 (design 5.3, lane A5): the rows read the one judgement every surface
 *    that judges a muscle's weekly sets reads (volumeJudgement.js: Below
 *    maintenance up to Beyond the studied range, the focus range split by the
 *    muscle's role in the active plan, so a muscle picked to bring up reads
 *    inside its Focus range with the reason on a tap), then No sets (plan 7.4
 *    item 5). Nothing reads "Too much" or "Near the limit". The Below
 *    maintenance group's population is the Progress strip's: with a plan, the
 *    muscles it programmes; without one, the muscles with logged sets. A muscle
 *    outside it with no sets is "No sets" and carries no verdict
 *    (volumeLogged.js bandGroupFor).
 *  - One set of numbers: the screen reads no stored target of the person's
 *    own. Every row is judged by the plan's evidence-based role bands
 *    (volumeJudgement.js), the same ones every other screen reads.
 */

const WINDOW_OPTIONS = [
  { key: '1', label: 'This week', weeks: 1 },
  { key: '2', label: '2 weeks', weeks: 2 },
  { key: '4', label: '4 weeks', weeks: 4 },
];

// The row groups, in the order the screen reads them (plan 7.4 item 5): the
// bands from the lowest up, then "No sets" for a muscle outside the verdict
// population with no sets (volumeLogged.js bandGroupFor). D219: the groups are
// volumeJudgement's (a band, with the focus range split by the muscle's role),
// named by the one shared map the Workout Summary reads too
// (volumeBandLabels.js); the figure's legend names the four tones they paint.
const BAND_GROUPS = [
  ...GROUP_ORDER.map((group) => ({ status: group, label: VOLUME_BAND_LABELS[group] })),
  { status: NO_SETS_GROUP, label: 'No sets' },
];
const BAND_LABEL = Object.fromEntries(BAND_GROUPS.map(g => [g.status, g.label]));

const SUMMARY_TOOLTIP = 'A set counts once for the muscle it works most and half for each muscle that helps, '
  + 'so the rows add up to more than the sets you logged.';

const RECOVERY_WEEK_LINE = 'Recovery week: sets are planned lower this week';

// D214 addendum 9 (census 6.5). An ADAPTIVE adjustment (recovery evidence easing
// one accumulation week) is never called a recovery week, so the muscles are
// still judged and these words never appear. The bands the rows judge against
// do NOT drop with it: they come from the adapted, plan-routine and
// profile layers (effectiveLandmarks.js), none of which the adjustment writes
// (it flips the week's flag and cuts planned_muscle_volume, which no band
// reads), so a muscle can read under its range while the coach holds sets back.
const ADAPTIVE_ADJUSTMENT_LINE = 'Training is lighter for now: your coach is holding back some of your sets, so a muscle can read under its range.';

// D214 addendum 9 (census 6.4, H6): the one line under the summary when the
// window holds no logged set and the rows are therefore not judged.
const NOTHING_JUDGED_LINE = 'Nothing is judged until a set is logged.';

// The recovery week's own explanation of the neutral figure (census 0.16).
const RECOVERY_NOTE = 'No muscle is judged this week. Every muscle you trained is shown in one colour on the figure.';

// Census H1: a window with no sets names the wider views instead of telling the
// person to switch. Only the views that really reach further back are named: at
// 2 weeks that is the 4 weeks view, and at 4 weeks there is none.
const WIDER_VIEWS_LINE = {
  1: ' The 2 weeks and 4 weeks views reach further back.',
  2: ' The 4 weeks view reaches further back.',
  4: '',
};

// The plan context a screen without a plan (or before it has read one) holds:
// no recovery week, no sessions-left clause, no plan-trained muscle.
const NO_PLAN_MUSCLES = new Set();
const EMPTY_PLAN_CONTEXT = Object.freeze({
  recoveryWeek: false, adaptiveAdjustment: false, hasPlan: false, sessionsLeft: null, planTrained: NO_PLAN_MUSCLES,
  roles: Object.freeze({}),
});

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The plan context behind "N sessions left", the recovery-week framing and the
// plan-trained muscle set. Best effort: an unreadable block is not evidence of
// anything, so a failure reads as "no plan" and never blocks the screen.
//
// The recovery week is the programme position's GATED state, read exactly as
// the plan-week card reads it (progress/planWeek.js):
// `position.recoveryState.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY`,
// the block's own planned recovery week, held back while a required
// accumulation session is outstanding (programmePosition.js). It is not
// `isLighterTrainingState`: recoveryState.js's own rule is that an adaptive
// recovery adjustment (recovery evidence easing one accumulation week) is never
// called a recovery week, so the screen keeps judging every muscle in it. The
// calendar flag (`getCurrentMesocycleWeek().isDeload`, which is also true on an
// adaptive week) is read only when the position cannot be read at all.
// "Sessions left" is the required sessions of the plan week the programme is
// on that are still outstanding. The plan-trained set is the plan layer's own
// (the plan's weekly sets per muscle, effectiveLandmarks.getPlanLandmarks),
// never the merged source map, so no other layer can drop a muscle from it.
async function readPlanContext(userId, userProfile) {
  const out = { ...EMPTY_PLAN_CONTEXT };
  let position = null;
  try {
    position = await resolveProgrammePosition(userId);
    const sessions = Array.isArray(position?.sessions) ? position.sessions : [];
    if (position && sessions.length > 0) {
      out.hasPlan = true;
      out.sessionsLeft = sessions.filter(s => s?.state === SESSION_STATE.OUTSTANDING).length;
    }
  } catch (_) { /* best effort: no sessions-left clause */ }
  if (position) {
    out.recoveryWeek = position.recoveryState?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
    // Read from the position only: the calendar row's flag cannot tell the two
    // kinds of lighter week apart, so without a position nothing is claimed.
    out.adaptiveAdjustment = position.recoveryState?.state === RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT;
  } else {
    try {
      const week = await getCurrentMesocycleWeek(userId);
      // A finished block clamps to its final (recovery) row while it awaits the
      // athlete's decision (database.js getCurrentMesocycleWeek): that is no live
      // recovery week, so it is never framed as one.
      out.recoveryWeek = week?.isDeload === true && week?.awaitingDecision !== true;
    } catch (_) { /* best effort: no recovery-week framing */ }
  }
  // D219 (design 5.3): each muscle's role in the active plan, from the plan's
  // facts (getPlanRoles never throws; an empty map reads every muscle standard).
  out.roles = await getPlanRoles(userId);
  try {
    out.planTrained = planTrainedMuscles(await getPlanLandmarks(userId, { userProfile }));
  } catch (e) {
    // Without the plan's set, a muscle with no sets reads "No sets": the
    // no-plan grouping, never a crash.
    logError('VolumeHeatmapScreen.readPlanTrained', e, { userId });
  }
  return out;
}

export default function VolumeHeatmapScreen({ route }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
  })));
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // because this screen renders a muscle-row list and a trend list.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // NAV-8: first paint showed an empty diagram while sets loaded; skeleton
  // cards cover the read instead. Only the FIRST load gates the render;
  // window switches update in place.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // The loaded history (sets, exercise map, earliest set, per-muscle recency);
  // every window reading is derived from it, so a chip never re-reads the DB.
  const [dataset, setDataset] = useState(null);
  const [hasAnyCompletedSets, setHasAnyCompletedSets] = useState(false);
  // D214: "This week" (1), 2 or 4 weeks. route.params.windowWeeks (1, 2 or 4) is
  // the window the screen opens on (the Progress strip opens it on 1); anything
  // else reads as 1.
  const [windowWeeks, setWindowWeeks] = useState(() => normaliseWindowWeeks(route?.params?.windowWeeks));
  const routeWindowWeeks = route?.params?.windowWeeks;
  useEffect(() => {
    if (routeWindowWeeks != null) setWindowWeeks(normaliseWindowWeeks(routeWindowWeeks));
  }, [routeWindowWeeks]);
  const [trendData, setTrendData] = useState([]);
  // COMP-019: the volume trend section gets its own window (4W/8W/3M/6M). Kept
  // at 4W by default to preserve the section's current shape; chips widen it.
  const [trendWindowKey, setTrendWindowKey] = useState('4W');
  const trendKeyRef = useRef('4W');
  // D214: the plan context behind the summary's "N sessions left", the
  // recovery-week framing and the plan-trained set that decides which rows are
  // judged (readPlanContext).
  const [planContext, setPlanContext] = useState(EMPTY_PLAN_CONTEXT);
  // A4: division fingerprint markers ({ muscle: 'elevated'|'capped' }) + the
  // division's display label. Set only when the ACTIVE plan is the generated
  // division plan for the profile's goal; null for everyone else, so no
  // tier check is needed here (the data simply does not exist otherwise).
  const [divisionMarkers, setDivisionMarkers] = useState(null);
  const [divisionLabel, setDivisionLabel] = useState(null);
  // The muscle drawn selected on the figure and opened (its source line shown)
  // in the list: a figure tap and a row tap share it.
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const loadRequestRef = useRef(0);
  const trendRequestRef = useRef(0);
  const datasetRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { loadData(); }, [user?.id, userProfile?.trainingGoal]));

  // Restore the persisted trend window on mount.
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@volyume_chart_window_volume');
        if (v && windowByKey(VOLUME_WINDOWS, v)) {
          trendKeyRef.current = v;
          setTrendWindowKey(v);
          // The history may already be loaded; if not, loadData reads the key
          // from the ref when it reaches the trend.
          if (datasetRef.current) loadTrend(v, datasetRef.current);
        }
      } catch (_) { /* best-effort: the default window stands */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // D214: a chip reloads ONLY the trend (its own query), never the whole screen.
  function selectTrendWindow(key) {
    trendKeyRef.current = key;
    setTrendWindowKey(key);
    AsyncStorage.setItem('@volyume_chart_window_volume', key).catch(() => {});
    try { track(user?.id, 'chart_window_changed', { chart_id: 'volume', window: key })?.catch?.(() => {}); } catch (_) {}
    if (datasetRef.current) loadTrend(key, datasetRef.current);
  }

  // The trend: per-muscle credits by Monday week from the database, plus the
  // LOGGED working-set rows per week computed from the sets this screen has
  // already loaded (the trend query counts credits, so it cannot supply the
  // "N sets logged" totals, VH-16). Best effort: a failure hides the card and
  // never fails the screen.
  async function loadTrend(windowKey, ds) {
    if (!user?.id || !ds) { setTrendData([]); return; }
    const requestId = trendRequestRef.current + 1;
    trendRequestRef.current = requestId;
    try {
      const trendWin = windowByKey(VOLUME_WINDOWS, windowKey) ?? windowByKey(VOLUME_WINDOWS, '4W');
      // D200-3 (F4): Monday-anchored weeks, matching the weekly check-in's own
      // call -- the last bucket is the current week SO FAR. Label it "Now"
      // here (never in database.js, where weekLabel stays W1..WN).
      const trend = await getWeeklyVolumeByMuscle(user.id, trendWin.weeks, localWeekEndMs(ds.loadedAtMs));
      if (trendRequestRef.current !== requestId) return;
      const labelled = (trend || []).map((w, i, all) => ({
        ...w,
        weekLabel: i === all.length - 1 ? 'Now' : w.weekLabel,
        loggedSets: loggedRowsBetween(ds, w.weekStart, w.weekEnd),
      }));
      setTrendData(labelled);
    } catch (e) {
      if (trendRequestRef.current !== requestId) return;
      logError('VolumeHeatmapScreen.loadTrend', e, { userId: user?.id, windowKey });
      setTrendData([]);
    }
  }

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!user?.id) {
      datasetRef.current = null;
      setDataset(null);
      setTrendData([]);
      setHasAnyCompletedSets(false);
      setDivisionMarkers(null);
      setDivisionLabel(null);
      setPlanContext(EMPTY_PLAN_CONTEXT);
      setLoadError(false);
      setLoading(false);
      return;
    }
    if (loading || loadError) setLoading(true);
    setLoadError(false);
    try {
      const now = Date.now();
      const allSets = await getCompletedWorkoutSets(user.id);
      if (!isCurrentRequest()) return;
      setHasAnyCompletedSets(allSets.length > 0);

      // D218 (founder order 2026-10-03, audit F-3 and P14): the rows, "N sets
      // logged", the per-week totals and "Trained N days ago" are REPORTING
      // reads of logged sets, so they resolve each set through the shared
      // lookup (unfiltered, survivor-aware, name-snapshot fallback). The
      // filtered library hid a soft-deleted custom exercise (EL-18), so its
      // sets were dropped here while the trend card under them (an unfiltered
      // SQL read) counted them: two totals for one week on one screen. A
      // failed read is the screen's own retry state, never a silent zero.
      const lookup = await getExerciseLookup();
      if (!isCurrentRequest()) return;
      // Plan generation keeps the filtered library: the division fingerprint
      // below must recompute exactly what generation applied, and a deleted
      // custom exercise is never generated into a plan.
      const allExercises = await getAllExercises();
      if (!isCurrentRequest()) return;

      const ds = buildDataset(allSets, lookup, now);
      datasetRef.current = ds;
      setDataset(ds);

      const plan = await readPlanContext(user.id, userProfile);
      if (!isCurrentRequest()) return;
      setPlanContext(plan);

      // A4: division fingerprint. Pure re-presentation of the volume overlay
      // the plan generator already applied: diff the division plan's weekly
      // set counts against the general plan for the SAME profile inputs
      // (deterministic engine, so this recomputes exactly what was applied).
      // Only claimed when the active plan IS the generated division plan;
      // best-effort, markers simply stay absent on any failure.
      try {
        const goal = userProfile?.trainingGoal;
        const active = await getActivePlan(user.id).catch(() => null);
        if (!isCurrentRequest()) return;
        const inputs = active && planWearsDivision(active.name, goal)
          ? buildPlanInputs(userProfile)
          : null;
        if (inputs) {
          // D112 R2 (CC33 audit T1-02): the fingerprint claims to
          // recompute "exactly what was applied", which is only true
          // through the SAME generation filter the plan generator used -
          // this was one of two paths handing the engine the raw
          // library, so a capability-shaped plan diffed against an
          // unconstrained recompute.
          // Round 7 (R6-1's class): the SCOPED loader, so a block-scoped
          // avoidance is live here exactly as it was for the generation.
          // Round 8 (A1): an UNAVAILABLE lane read is a failed read -
          // the old fallback rendered from the raw library, a
          // fingerprint of a plan generation never built; the markers
          // now stay absent instead. The recompute also carries
          // generation's demonstrated-structure and canonical-name
          // inputs through generation's own exported paths.
          let scoped = null;
          try {
            // eslint-disable-next-line global-require
            const { loadScopedIntentState } = require('../lib/sessionEffective');
            scoped = await loadScopedIntentState(user.id);
          } catch (_) { scoped = null; }
          if (!scoped || scoped.unavailable || scoped.capability?.unavailable) {
            if (!isCurrentRequest()) return;
            setDivisionMarkers(null);
            setDivisionLabel(null);
          } else {
            // eslint-disable-next-line global-require
            const { filterLibraryForGeneration } = require('../lib/exercise/generation');
            const generationLibrary = filterLibraryForGeneration(allExercises, scoped).library;
            let extras = {};
            try {
              // eslint-disable-next-line global-require
              const { readDemonstratedStructure, canonicalNameSet } = require('../lib/planAutoGen');
              extras = {
                canonicalNames: canonicalNameSet(allExercises),
                demonstratedStructure: await readDemonstratedStructure(user.id, inputs?.daysPerWeek),
              };
            } catch (_) { extras = {}; }
            if (!isCurrentRequest()) return;
            const diff = computeDivisionDiff({ ...inputs, ...extras, exerciseLibrary: generationLibrary });
            setDivisionMarkers(fingerprintMarkers(diff));
            setDivisionLabel(GOAL_LABELS[goal] ?? null);
          }
        } else {
          setDivisionMarkers(null);
          setDivisionLabel(null);
        }
      } catch (_) {
        if (!isCurrentRequest()) return;
        setDivisionMarkers(null);
        setDivisionLabel(null);
      }

      await loadTrend(trendKeyRef.current, ds);
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('VolumeHeatmapScreen.loadData', e, { userId: user?.id, windowWeeks });
      datasetRef.current = null;
      setDataset(null);
      setTrendData([]);
      setHasAnyCompletedSets(false);
      setDivisionMarkers(null);
      setDivisionLabel(null);
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  const muscles = LISTED_MUSCLES;

  // ScrollView + per-row offsets so the body diagram can scroll the user to a
  // muscle's row when its region is tapped. A row's y is relative to its group,
  // the group's to the list, the list's to the scroll content.
  const scrollRef = useRef(null);
  const listY = useRef(0);
  const groupY = useRef({});
  const rowY = useRef({});

  // Everything the current chip reads, from the loaded history.
  const view = useMemo(() => (dataset ? buildWindowView(dataset, windowWeeks) : null), [dataset, windowWeeks]);
  const recoveryWeek = planContext.recoveryWeek === true;
  const adaptiveAdjustment = planContext.adaptiveAdjustment === true;
  // Nothing is judged in a recovery week (planned lower) or until a set is
  // logged in the window shown (census 6.4): the rows are then one flat list with
  // no band header and no verdict colour. A window that HAS sets keeps lane 5's
  // population rule (a plan-programmed muscle with no sets lists under Under the
  // range), so the rule below is only about a window with nothing logged.
  const unjudged = recoveryWeek || !view || view.loggedRows === 0;

  // One model per muscle: the rounded figure that is both shown and judged
  // (D214, VH-2: round once), its band word, the bar's numbers and the recency.
  const rowModels = useMemo(() => {
    const tones = toneColors(t.colors);
    return muscles.map((muscle) => {
      const credit = view?.raw[muscle]?.workingSets || 0;
      const avg = view?.perWeek[muscle]?.workingSets || 0;
      const sets = Math.round(avg);
      const total = Math.round(credit);
      // D219: the ONE judgement, on the figure shown (round once, D214 VH-2),
      // with this muscle's role in the active plan.
      const judgement = judgeWeek({ muscle, sets, role: roleFor(planContext.roles, muscle) });
      const status = judgement.group;
      const hasCredit = credit > 0;
      // The below-maintenance group's population is the plan's (volumeLogged.js):
      // a muscle outside it with no sets is "No sets" and carries no verdict.
      const group = bandGroupFor({ muscle, status, hasCredit, planTrained: planContext.planTrained });
      const judged = !unjudged && group !== NO_SETS_GROUP;
      const setsWords = plural(sets, 'set', 'sets');
      const figureText = windowWeeks === 1
        ? `${setsWords} so far this week`
        : `An average of ${setsWords} a week`;
      const lastMs = dataset?.lastTrained?.[muscle] ?? null;
      const recency = trainingRecency(lastMs, dataset?.loadedAtMs ?? Date.now());
      // The spoken label says the same words as the row, then names the window.
      const spokenFigure = windowWeeks === 1
        ? figureText
        : `${figureText.charAt(0).toLowerCase()}${figureText.slice(1)}, over the last ${windowWeeks} weeks, ${total} in total`;
      const a11yLabel = [
        `${MUSCLE_DISPLAY_NAMES[muscle]}: ${spokenFigure}`,
        judged ? BAND_LABEL[status] : null,
        recency.known ? recency.label : null,
      ].filter(Boolean).join(', ');
      return {
        muscle,
        name: MUSCLE_DISPLAY_NAMES[muscle],
        sets,
        total,
        hasCredit,
        status,
        group,
        color: judged ? tones[judgement.tone] : undefined,
        // The bar's numbers (the studied range, the zone the plan aims at) and
        // what a tap explains, both from the one judgement (D219).
        bar: rangeBarFor(judgement.role, sets),
        why: judged ? judgement.why : [],
        figureText,
        recencyText: recency.known ? recency.label : null,
        a11yLabel,
      };
    });
  }, [view, dataset, windowWeeks, unjudged, muscles, t,
    planContext.planTrained, planContext.roles]);

  // The figure's input. An entry with no colour draws as "No sets", so a muscle
  // with no sets in the window carries none; in a recovery week every trained
  // muscle takes one neutral shade (no verdict colour, D214 section 7.4 item 3).
  const volumeByMuscle = useMemo(() => {
    const tones = toneColors(t.colors);
    const map = {};
    for (const r of rowModels) {
      map[r.muscle] = {
        workingSets: r.sets,
        status: r.status,
        label: BAND_LABEL[r.status],
        ...(r.hasCredit ? { color: recoveryWeek ? t.colors.surface3 : tones[toneForGroup(r.status)] } : {}),
      };
    }
    return map;
  }, [rowModels, recoveryWeek, t]);

  // The rows, grouped by band with counts in the order the screen reads them
  // (a group with no rows is omitted). An unjudged window (a recovery week, or
  // no logged set) prints no band word, so its rows are one flat list.
  const groups = useMemo(() => {
    if (unjudged) return [{ key: 'flat', label: null, status: null, rows: rowModels }];
    return BAND_GROUPS
      .map(g => ({ key: g.status, label: g.label, status: g.status, rows: rowModels.filter(r => r.group === g.status) }))
      .filter(g => g.rows.length > 0);
  }, [rowModels, unjudged]);


  // Muscles trained at least once in the trend window, in heatmap order.
  const trainedMuscles = useMemo(() => {
    if (!trendData.length) return [];
    return muscles.filter(muscle =>
      trendData.some(week => (week.volumeByMuscle?.[muscle] || 0) > 0),
    );
  }, [trendData, muscles]);

  // The takeaway, in LOGGED sets (D214, VH-16). `trendData`'s last entry is the
  // current Monday-anchored week SO FAR, never a completed week -- it is never
  // mixed into an average. Weeks with no training are dropped from the average
  // (leading empties signal the window reaches past the account's start).
  const fullWeeksCount = Math.max(0, trendData.length - 1);
  const volWeeklyTotals = useMemo(() => trendData.slice(0, -1)
    .map(week => week.loggedSets || 0)
    .filter(n => n > 0), [trendData]);
  const currentWeekTotal = trendData.length ? (trendData[trendData.length - 1].loggedSets || 0) : undefined;
  // H5: `fullWeeks` lets the takeaway say how many of those weeks had sets, since
  // a full week with nothing logged is left out of the average.
  const volTakeaway = volumeTakeaway({
    windowKey: trendWindowKey, coversAll: false, spanDays: 0, weeklySets: volWeeklyTotals,
    phraseOverride: fullWeeksCount > 0
      ? (fullWeeksCount === 1 ? 'Last full week' : `Last ${fullWeeksCount} full weeks`)
      : undefined,
    currentWeekTotal,
    fullWeeks: fullWeeksCount,
  });
  const trendWeeks = (windowByKey(VOLUME_WINDOWS, trendWindowKey) ?? windowByKey(VOLUME_WINDOWS, '4W')).weeks;

  const showNoVolumeGuidance = !view || view.musclesWorked === 0;
  const noVolumeTitle = hasAnyCompletedSets
    ? (windowWeeks === 1 ? 'No sets since Monday' : `No sets in the last ${windowWeeks} weeks`)
    : 'Volume appears after your first workout';
  const noVolumeText = hasAnyCompletedSets
    ? `Your training history is still saved.${WIDER_VIEWS_LINE[windowWeeks] ?? ''}`
    : 'For each muscle, this screen shows your weekly sets and its range once you have finished a workout.';

  const handleMuscleTap = useCallback((muscleKey) => {
    setSelectedMuscle(muscleKey);
    const pos = rowY.current[muscleKey];
    if (!pos || !scrollRef.current) return;
    // A little headroom above the row so its name is visible below the figure.
    const y = listY.current + (groupY.current[pos.group] || 0) + pos.y;
    scrollRef.current.scrollTo({ y: Math.max(y - spacing.lg, 0), animated: true });
  }, []);

  const toggleRow = useCallback((muscle) => {
    setSelectedMuscle(prev => (prev === muscle ? null : muscle));
  }, []);

  // D214: the one line under the chips says what the window is. D200-1 still
  // governs the 2- and 4-week windows (weekly averages, the partial-history
  // divisor); "This week" is the Monday-anchored week so far.
  const divisor = view?.divisor ?? 1;
  const windowNoteText = windowWeeks === 1
    ? 'Sets logged since Monday'
    : `Average sets a week over the last ${windowWeeks} weeks`
      + (divisor > 0 && divisor < windowWeeks ? ` (you logged in ${divisor} of those weeks)` : '');

  // The summary: logged working-set rows, never the credits summed (VH-16).
  const sessionsClause = (windowWeeks === 1 && planContext.hasPlan && planContext.sessionsLeft != null)
    ? (planContext.sessionsLeft === 0 ? 'no sessions left' : `${plural(planContext.sessionsLeft, 'session', 'sessions')} left`)
    : null;
  let summaryText;
  if (!view || view.loggedRows === 0) {
    summaryText = windowWeeks === 1
      ? 'No sets logged so far this week'
      : `No sets logged in the last ${windowWeeks} weeks`;
  } else if (windowWeeks === 1) {
    summaryText = `${plural(view.loggedRows, 'set', 'sets')} logged so far this week across ${plural(view.musclesWorked, 'muscle', 'muscles')}`;
  } else {
    const perWeekRows = divisor > 0 ? Math.round(view.loggedRows / divisor) : view.loggedRows;
    summaryText = `${plural(perWeekRows, 'set', 'sets')} a week on average across ${plural(view.musclesWorked, 'muscle', 'muscles')}`;
  }
  if (sessionsClause) summaryText = `${summaryText} · ${sessionsClause}`;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Volume heatmap" />
        <View style={styles.loadingStack} accessibilityLabel="Loading volume heatmap">
          <SkeletonCard height={220} />
          <SkeletonCard height={92} />
          <SkeletonCard height={160} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Volume heatmap" />
        <View style={styles.content}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load volume heatmap"
            text="Couldn't load this on your device. Try again."
            actionLabel="Try again"
            onAction={loadData}
          />
        </View>
      </SafeAreaView>
    );
  }

  const bandTones = toneColors(t.colors);

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Volume heatmap" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* The window control sits ABOVE the figure it changes (VH-7). */}
        <WindowChips
          windows={WINDOW_OPTIONS}
          selectedKey={String(windowWeeks)}
          onSelect={(key) => setWindowWeeks(normaliseWindowWeeks(key))}
          accessibilityPrefix="volume window"
        />

        <View style={styles.noteRow}>
          <Ionicons name="time-outline" size={14} color={t.colors.textMuted} />
          <Text style={[styles.noteText, live.noteText]}>{windowNoteText}</Text>
        </View>

        {/* The summary: logged sets, the muscles they reached and the sessions
            left in the plan week. The (i) carries the one sum a reader could
            trip on. */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, live.summaryText]} accessibilityRole="header">{summaryText}</Text>
            {view && view.loggedRows > 0 ? <InfoTooltip size={14} text={SUMMARY_TOOLTIP} /> : null}
          </View>
          {recoveryWeek ? (
            <>
              <Text style={[styles.recoveryLine, live.recoveryLine]}>{RECOVERY_WEEK_LINE}</Text>
              <Text style={[styles.recoveryNote, live.recoveryNote]}>{RECOVERY_NOTE}</Text>
            </>
          ) : null}
          {/* An adaptive adjustment: said in the coach's own plain words, never as a
              recovery week, and the muscles stay judged (census 6.5). */}
          {adaptiveAdjustment && !unjudged ? (
            <Text style={[styles.recoveryLine, live.recoveryLine]}>{ADAPTIVE_ADJUSTMENT_LINE}</Text>
          ) : null}
          {/* No set logged in the window: nothing is judged (census 6.4). A recovery
              week already says so above. */}
          {!recoveryWeek && unjudged ? (
            <Text style={[styles.recoveryLine, live.recoveryLine]}>{NOTHING_JUDGED_LINE}</Text>
          ) : null}
        </View>

        {/* A7: explosive lifts are dropped from the volume read (EL-7
            ballistic exclusion, algorithms.js calculateWeeklyVolume). Say so
            when the window actually contains some, so a swing-heavy week is
            not read as an empty one. Circuit rounds DO count toward volume,
            so they are not named here. */}
        {view?.hasExcludedWork && (
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
            <Text style={[styles.noteText, live.noteText]}>
              Explosive lifts like swings, cleans, snatches and jumps are not counted here or used to judge your weekly volume.
            </Text>
          </View>
        )}

        {showNoVolumeGuidance && (
          <EmptyState
            icon={hasAnyCompletedSets ? 'time-outline' : 'barbell-outline'}
            title={noVolumeTitle}
            text={noVolumeText}
            compact
          />
        )}

        {/* Anatomical body heatmap, with its ONE legend: a sighted-only
            tap-to-jump-to-its-row convenience. AX-04 (launch accessibility
            audit): for assistive tech this diagram is a single decorative or
            summary image (see BodyDiagramHeatmap.js); the muscle rows below are
            the real accessible + operable path to the same name, volume and
            band data, each one an independently focusable >=44dp control. */}
        <BodyDiagramHeatmap
          volumeByMuscle={volumeByMuscle}
          neutralVolume={recoveryWeek}
          selectedMuscle={selectedMuscle}
          onMuscleTap={handleMuscleTap}
          divisionMarkers={divisionMarkers}
          divisionLabel={divisionLabel}
        />

        {/* The rows, grouped by band with counts, so the strip's count lands on
            a list (VH-13). */}
        <View
          style={[styles.listCard, live.listCard]}
          onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}
        >
          {groups.map(group => (
            <View
              key={group.key}
              style={styles.group}
              onLayout={(e) => { groupY.current[group.key] = e.nativeEvent.layout.y; }}
            >
              {group.label ? (
                <View
                  style={styles.groupHeader}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${group.label}, ${plural(group.rows.length, 'muscle', 'muscles')}`}
                >
                  <View
                    style={group.status === NO_SETS_GROUP
                      ? [styles.groupDot, styles.groupDotNone, live.groupDotNone]
                      : [styles.groupDot, { backgroundColor: bandTones[toneForGroup(group.status)] }]}
                  />
                  <Text style={[styles.groupLabel, live.groupLabel]}>{`${group.label} · ${group.rows.length}`}</Text>
                </View>
              ) : null}
              {group.rows.map(row => (
                <VolumeRow
                  key={row.muscle}
                  row={row}
                  expanded={selectedMuscle === row.muscle}
                  onToggle={toggleRow}
                  onLayout={(e) => { rowY.current[row.muscle] = { group: group.key, y: e.nativeEvent.layout.y }; }}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={[styles.footerNote, live.footerNote]}>
          {'Bands come from studies of weekly sets. A muscle you picked as a focus in your plan reads against its focus range.'}
        </Text>

        {/* Sets a week: the trend card. The chips name the window, and a chip
            reloads only this card. */}
        {trainedMuscles.length > 0 && (
          <Card style={styles.section}>
            <SectionLabel variant="title" heading>{`Sets a week, last ${trendWeeks} weeks`}</SectionLabel>
            {/* The card's own window control draws its selected chip in ink, so the
                screen carries ONE amber chip: the top window control that changes
                what the whole screen shows (D214 addendum 9, census 6.2 and 6.3). */}
            <WindowChips windows={VOLUME_WINDOWS} selectedKey={trendWindowKey} onSelect={selectTrendWindow}
              accessibilityPrefix="volume trend window" inkSelected />
            {!!volTakeaway && <Text style={[styles.trendTakeaway, live.trendTakeaway]}>{volTakeaway}</Text>}
            {trainedMuscles.map(muscle => (
              <MuscleTrendRow
                key={muscle}
                muscle={muscle}
                trendData={trendData}
                role={roleFor(planContext.roles, muscle)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// One muscle's row: the name, when it was last trained (ink, no colour), the
// figure as a sentence, the range bar, and (when tapped) where its band came
// from. The row is ONE accessible control (a combined spoken label, >=44dp),
// the real accessible path for the figure above it (AX-04).
function VolumeRow({ row, expanded, onToggle, onLayout }) {
  const t = useTheme();
  const rowLive = useMemo(() => buildLiveStyles(t), [t]);
  // D219: a tap explains the band for THIS muscle, in the one judgement's words
  // (the reason for a muscle the plan raised, the evidence sentence for the
  // band), where it used to name the landmark table the range came from.
  const whyLines = Array.isArray(row.why) ? row.why : [];
  return (
    <View onLayout={onLayout}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => onToggle(row.muscle)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={row.a11yLabel}
        accessibilityHint={whyLines.length ? 'Shows why this muscle sits in this band' : undefined}
        accessibilityState={{ expanded }}
      >
        <View style={styles.rowHead}>
          <Text style={[styles.muscleName, rowLive.muscleName]}>{row.name}</Text>
          {row.recencyText ? <Text style={[styles.recency, rowLive.recency]}>{row.recencyText}</Text> : null}
        </View>
        <Text style={[styles.figure, rowLive.figure]}>{row.figureText}</Text>
        <RangeBar
          value={row.sets}
          max={row.bar.max}
          rangeStart={row.bar.rangeStart}
          rangeEnd={row.bar.rangeEnd}
          bandStart={row.bar.bandStart}
          bandEnd={row.bar.bandEnd}
          fillColor={row.color}
        />
        {expanded && whyLines.length ? whyLines.map((line) => (
          <Text key={line} style={[styles.sourceLine, rowLive.sourceLine]}>{line}</Text>
        )) : null}
      </TouchableOpacity>
    </View>
  );
}

const SPARK_BAR_WIDTH = 8;
const SPARK_BAR_GAP = 2;
const SPARK_MAX_HEIGHT = 24;

// CP-10 batch G (2026-07-11): sibling function-component scope (rendered
// once per trained muscle inside the ScrollView, not prop-drilled `live`/`t`
// from VolumeHeatmapScreen), so its own useTheme() call is cleaner than
// threading two extra props through. Own buildTrendLiveStyles(t) below since
// this component already has its own separate `trendStyles` block.
function MuscleTrendRow({ muscle, trendData, role }) {
  // trendData is the window's weekly array (oldest to newest), each entry has
  // volumeByMuscle. COMP-019 Stage 1b: bars render through VolyumeChart's bar
  // variant with tap-and-hold scrub; since a 24px row has no room for a tooltip
  // card, the scrubbed week's count surfaces in the label above instead.
  const t = useTheme();
  const trendLive = useMemo(() => buildTrendLiveStyles(t), [t]);
  const tones = toneColors(t.colors);
  // Rounded once: the figure shown and the figure judged are the same number.
  const counts = trendData.map(w => Math.round(w.volumeByMuscle?.[muscle] || 0));
  const lastIdx = counts.length - 1;
  const [scrubIdx, setScrubIdx] = useState(null);

  // A completed week is judged against the weekly band; the current week is
  // half done, so it is never coloured by a full-week band (VH-19) -- it takes
  // ink. A week with no sets is the empty track.
  const barColorFor = (count, idx) => {
    if (count === 0) return t.colors.surface3;
    if (idx === lastIdx) return t.colors.textSecondary;
    // D219: a completed week is judged by the one judgement, with the muscle's role.
    return tones[judgeWeek({ muscle, sets: count, role }).tone];
  };

  const barData = counts.map((c, i) => ({ value: c, color: barColorFor(c, i) }));
  const chartWidth = counts.length * SPARK_BAR_WIDTH + Math.max(0, counts.length - 1) * SPARK_BAR_GAP;

  const showIdx = scrubIdx != null && scrubIdx >= 0 && scrubIdx < counts.length ? scrubIdx : lastIdx;
  const showCount = counts[showIdx] ?? 0;
  const setsWord = showCount === 1 ? 'set' : 'sets';
  let figureLabel;
  if (showIdx === lastIdx) figureLabel = `this week so far: ${showCount} ${setsWord}`;
  else if (lastIdx - showIdx === 1) figureLabel = `last week: ${showCount} ${setsWord}`;
  else figureLabel = `${lastIdx - showIdx} weeks ago: ${showCount} ${setsWord}`;

  return (
    <View style={trendStyles.row}>
      <View style={trendStyles.head}>
        <Text style={[trendStyles.muscleName, trendLive.muscleName]} numberOfLines={1}>
          {MUSCLE_DISPLAY_NAMES[muscle]}
        </Text>
        <Text style={[trendStyles.figure, trendLive.figure]}>{figureLabel}</Text>
      </View>
      <View style={trendStyles.sparkContainer}>
        <VolyumeChart
          variant="bar"
          data={barData}
          width={chartWidth}
          height={SPARK_MAX_HEIGHT}
          barWidth={SPARK_BAR_WIDTH}
          barGap={SPARK_BAR_GAP}
          color={t.colors.textSecondary}
          interactive
          onScrubIndex={setScrubIdx}
          accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} weekly volume trend`}
          formatTooltip={(i) => ({
            title: MUSCLE_DISPLAY_NAMES[muscle],
            sub: `${trendData[i]?.weekLabel ?? `week ${i + 1}`}: ${counts[i]} sets`,
          })}
        />
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  muscleName: {
    ...type.label,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  // The week's figure, labelled and in ink: a fact, never a band colour.
  figure: {
    ...type.num('caption'),
    color: colors.textSecondary,
  },
  sparkContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARK_MAX_HEIGHT,
  },
});

// CP-10 batch G (2026-07-11): the frozen `trendStyles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so
// MuscleTrendRow carries no static island under a live theme toggle. Pure
// layout keys (flex/gap/padding/width, no token) are correctly omitted --
// there is nothing to unfreeze for them. Own function since MuscleTrendRow
// has its own separate style block, unlike sibling components elsewhere
// that reuse the SAME style block as their parent.
function buildTrendLiveStyles(t) {
  return {
    muscleName: { ...t.type.label, color: t.colors.textSecondary },
    figure: { ...t.type.num('caption'), color: t.colors.textSecondary },
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingStack: { padding: spacing.lg, gap: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Sentences wear bodySm, never the 11 px caption (docs/rules/styling.md).
  noteText: {
    ...type.bodySm,
    color: colors.textMuted,
    flex: 1,
  },
  summaryBlock: { gap: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  recoveryLine: { ...type.bodySm, color: colors.textSecondary },
  recoveryNote: { ...type.bodySm, color: colors.textMuted },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  group: { gap: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: circle(spacing.sm),
  },
  // "No sets" is the legend's own hollow swatch: no fill, a 1 dp border hairline.
  groupDotNone: { borderWidth: 1, borderColor: colors.border },
  groupLabel: { ...type.overline, color: colors.textSecondary },
  row: {
    gap: spacing.xs,
    // AX-04 (launch accessibility audit): this row is the real accessible +
    // operable path for the volume-by-muscle data (the diagram above is a
    // decorative/summary image for assistive tech), so it carries the same
    // >=44dp minimum target/focus height as any other operable control.
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  muscleName: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  // A recency is a fact about the past: ink-muted, no colour (VH-11).
  recency: { ...type.caption, color: colors.textMuted },
  figure: { ...type.bodySm, color: colors.textSecondary },
  sourceLine: { ...type.caption, color: colors.textMuted },
  footerNote: { ...type.bodySm, color: colors.textMuted },
  section: {
    gap: spacing.sm,
  },
  trendTakeaway: { ...type.bodySm, color: colors.textSecondary },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/borderWidth, no token) are correctly omitted
// -- there is nothing to unfreeze for them. Same pattern as
// WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    noteText: { ...t.type.bodySm, color: t.colors.textMuted },
    summaryText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    recoveryLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    recoveryNote: { ...t.type.bodySm, color: t.colors.textMuted },
    listCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    groupDotNone: { borderColor: t.colors.border },
    groupLabel: { ...t.type.overline, color: t.colors.textSecondary },
    muscleName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    recency: { ...t.type.caption, color: t.colors.textMuted },
    figure: { ...t.type.bodySm, color: t.colors.textSecondary },
    sourceLine: { ...t.type.caption, color: t.colors.textMuted },
    footerNote: { ...t.type.bodySm, color: t.colors.textMuted },
    trendTakeaway: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
