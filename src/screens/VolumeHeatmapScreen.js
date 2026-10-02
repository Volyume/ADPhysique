import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, fontSize, fontWeight, spacing, radius, type, buildVolumeStatusColor, circle, fontFamily,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEffectiveLandmarks, isManualEdit } from '../lib/effectiveLandmarks';
import BackHeader from '../components/BackHeader';
import ModalHeader from '../components/ModalHeader';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import RangeBar from '../components/RangeBar';
import { NavRow, NavGroup } from '../components/NavRow';
import { SkeletonCard } from '../components/Skeleton';
import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';
import { useToast } from '../components/Toast';
import {
  getCompletedWorkoutSets, getAllExercises, getWeeklyVolumeByMuscle, getActivePlan, getCurrentMesocycleWeek,
} from '../lib/database';
import { computeDivisionDiff, fingerprintMarkers, planWearsDivision } from '../lib/divisionDiff';
import { buildPlanInputs } from '../lib/planAutoGen';
import { GOAL_LABELS } from '../lib/coachingGoals';
import { logError } from '../lib/errorLog';
import { syncUserPref, notePrefWrite } from '../lib/sync';
import {
  calculateWeeklyVolume, calculateExcludedWeeklyVolume, VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES, getVolumeStatus, allocateExerciseVolume, isBallisticEvidenceRow,
} from '../lib/algorithms';
// D200-1 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
// the 2/4-week windows read the AVERAGE working sets per week against the
// unchanged weekly bands, instead of the window's raw total. D214 amends
// ruling 1's "1-week view unchanged": "This week" is now the Monday-anchored
// week so far (volumeWindow.js volumeWindowBounds), so the heatmap agrees
// with the Progress strip and the plan. See volumeWindow.js's header.
import {
  weeksCounted, perWeekVolume, volumeWindowBounds, normaliseWindowWeeks,
} from '../lib/volumeWindow';
import { resolveProgrammePosition } from '../lib/programmePosition';
import { isLighterTrainingState } from '../lib/recoveryState';
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
 * the figure with its ONE legend, the rows grouped by band with counts, the
 * trend card, and one "Volume targets" door to the editor.
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
 *  - Targets are described, and edited, as the bands in force: the editor
 *    seeds from them and saves ONLY the muscles the person touched.
 */

const WINDOW_OPTIONS = [
  { key: '1', label: 'This week', weeks: 1 },
  { key: '2', label: '2 weeks', weeks: 2 },
  { key: '4', label: '4 weeks', weeks: 4 },
];

// The row groups, in the order the screen reads them, named in the words of
// the figure's own legend (BodyDiagramHeatmap.js), the screen's one legend.
const BAND_GROUPS = [
  { status: 'over_mrv', label: 'Too much' },
  { status: 'near_mrv', label: 'Near the limit' },
  { status: 'optimal', label: 'In range' },
  { status: 'minimum', label: 'Just enough' },
  { status: 'below', label: 'Under the range' },
];
const BAND_LABEL = Object.fromEntries(BAND_GROUPS.map(g => [g.status, g.label]));

// Where a muscle's band came from (effectiveLandmarks.js source), as the
// one-line source a row shows when it is tapped.
const SOURCE_WORDS = {
  plan: 'your plan',
  research: 'research starting point',
  adapted: 'adjusted from your logged training',
  profile: 'matched to your profile',
  manual: 'your own targets',
};

const SUMMARY_TOOLTIP = 'A set counts once for the muscle it works most and half for each muscle that helps, '
  + 'so the rows add up to more than the sets you logged.';

const RECOVERY_WEEK_LINE = 'Recovery week: sets are planned lower this week';

const NO_MUSCLES = Object.freeze([]);
const LISTED_MUSCLES = Object.keys(VOLUME_LANDMARKS);
const LISTED_SET = new Set(LISTED_MUSCLES);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "Chest", "Chest and Back", "Chest, Back and Biceps".
function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function setAt(set) {
  const at = Number(set?.createdAt ?? set?.created_at);
  return Number.isFinite(at) ? at : null;
}

// The listed muscles one logged row credits, or none when the row does not
// count: a warm-up never counts and an explosive set never counts (the same two
// exclusions calculateWeeklyVolume makes), and a row whose exercise is unknown
// credits nothing. `cache` holds the per-exercise allocation so a long
// history is not re-allocated for every row.
function creditedMuscles(set, exerciseMap, cache) {
  if ((set.setType || set.set_type || 'straight') === 'warmup') return NO_MUSCLES;
  if (isBallisticEvidenceRow(set)) return NO_MUSCLES;
  const id = set.exerciseId || set.exercise_id;
  let list = cache.get(id);
  if (!list) {
    const exercise = exerciseMap[id];
    list = exercise
      ? allocateExerciseVolume(exercise).map(a => a.muscle).filter(m => LISTED_SET.has(m))
      : NO_MUSCLES;
    cache.set(id, list);
  }
  return list;
}

// One pass over the whole history: the account's earliest set (the divisor's
// anchor, D200-1) and, per muscle, the latest row that credits it. The
// recency read counts secondary credit and untyped sets, so "Trained 3 days
// ago" agrees with the row's own sets (VH-18).
function buildDataset(sets, exerciseMap, nowMs) {
  const cache = new Map();
  const lastTrained = {};
  let earliestSetMs = null;
  for (const s of sets) {
    const at = setAt(s);
    if (at === null) continue;
    if (earliestSetMs === null || at < earliestSetMs) earliestSetMs = at;
    for (const m of creditedMuscles(s, exerciseMap, cache)) {
      if (!(lastTrained[m] >= at)) lastTrained[m] = at;
    }
  }
  return { sets, exerciseMap, cache, earliestSetMs, lastTrained, loadedAtMs: nowMs };
}

// Logged working-set ROWS inside [startMs, endMs): what "N sets logged" means
// everywhere on this screen (never the credits summed, VH-16).
function loggedRowsBetween(ds, startMs, endMs) {
  let n = 0;
  for (const s of ds.sets) {
    const at = setAt(s);
    if (at === null || at < startMs || at >= endMs) continue;
    if (creditedMuscles(s, ds.exerciseMap, ds.cache).length > 0) n += 1;
  }
  return n;
}

// Everything one window chip reads, from the loaded history alone (no I/O), so
// switching the window never re-reads the database.
function buildWindowView(ds, windowWeeks) {
  const { weeks, startMs, endMs } = volumeWindowBounds({ windowWeeks, nowMs: ds.loadedAtMs });
  const windowSets = ds.sets.filter((s) => {
    const at = setAt(s);
    return at !== null && at >= startMs;
  });
  // D200-1: the divisor is the weeks of the window the account has data for.
  // "This week" is one Monday-anchored week, so it always divides by 1.
  const divisor = weeks === 1
    ? 1
    : weeksCounted({ windowStartMs: startMs, windowEndMs: endMs, earliestSetMs: ds.earliestSetMs });
  const raw = calculateWeeklyVolume(windowSets, ds.exerciseMap);
  const excluded = calculateExcludedWeeklyVolume(windowSets, ds.exerciseMap);
  let loggedRows = 0;
  for (const s of windowSets) {
    if (creditedMuscles(s, ds.exerciseMap, ds.cache).length > 0) loggedRows += 1;
  }
  return {
    weeks,
    divisor,
    raw,
    perWeek: perWeekVolume(raw, divisor),
    loggedRows,
    musclesWorked: LISTED_MUSCLES.filter(m => (raw[m]?.workingSets || 0) > 0).length,
    hasExcludedWork: Object.keys(excluded).length > 0,
  };
}

// The programme position behind "N sessions left" and the recovery-week
// framing. Best effort: an unreadable block is not evidence of anything, so a
// failure reads as "no plan" and never blocks the screen. The recovery-week
// flag is the programme position's GATED recovery state (programmePosition.js:
// the planned recovery week cannot be the live phase while a required
// accumulation session is outstanding, and an adaptive adjustment is lighter
// training too), read through recoveryState.js's isLighterTrainingState, the
// same reading the plan-week card and the Progress strip make; the calendar
// flag (currentMesoWeek.isDeload) is only the fallback when the position
// cannot be read. "Sessions left" is the required sessions of the plan week
// the programme is on that are still outstanding.
async function readPlanContext(userId) {
  const out = { recoveryWeek: false, hasPlan: false, sessionsLeft: null };
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
    out.recoveryWeek = isLighterTrainingState(position.recoveryState);
    return out;
  }
  try {
    const week = await getCurrentMesocycleWeek(userId);
    // A finished block clamps to its final (recovery) row while it awaits the
    // athlete's decision (database.js getCurrentMesocycleWeek): that is no live
    // recovery week, so it is never framed as one.
    out.recoveryWeek = week?.isDeload === true && week?.awaitingDecision !== true;
  } catch (_) { /* best effort: no recovery-week framing */ }
  return out;
}

export default function VolumeHeatmapScreen({ route }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
  })));
  const toast = useToast();
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
  const [customLandmarks, setCustomLandmarks] = useState(null);
  // D90 #3 (2026-08-06): display statuses read the ONE resolved precedence
  // (manual > adapted > plan > profile > research, effectiveLandmarks.js).
  // D214: the editor now seeds from that same resolved table (the band in
  // force), and saves only what the person touched.
  const [resolvedLandmarks, setResolvedLandmarks] = useState(null);
  // C6 closeout B1 (founder-approved): the per-muscle source map, kept
  // beside the resolved table so a row can say WHERE its band came from
  // when it is tapped (D214: one line in the row's tap, no caption per row).
  const [resolvedSource, setResolvedSource] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  // The editor is a native Modal, which sits above the app's toast and alert
  // hosts, so what it has to say (a failed write, a muscle handed back) is said
  // inside it, and the "back to Volyume's targets" confirmation is inline.
  const [editNotice, setEditNotice] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // The values each field was SEEDED with when the editor opened (the band in
  // force). A muscle is saved only when it was touched or differs from this,
  // never when it merely differs from the research table: a plan band is not
  // a manual edit (the Stage 6 blocker stays closed).
  const editSeedRef = useRef({});
  // C8 Work 3 (RA6-6): which muscles the user actually TOUCHED in this
  // editing session. A deliberate save is user intent even when the
  // chosen number equals the value it was seeded with or the research
  // default, and intent must never be inferred from the number - but simply
  // opening the editor and tapping Save must NOT mark every muscle manual
  // (that was the Stage 6 blocker that disabled adaptation body-wide).
  const touchedMusclesRef = useRef(new Set());
  const [trendData, setTrendData] = useState([]);
  // COMP-019: the volume trend section gets its own window (4W/8W/3M/6M). Kept
  // at 4W by default to preserve the section's current shape; chips widen it.
  const [trendWindowKey, setTrendWindowKey] = useState('4W');
  const trendKeyRef = useRef('4W');
  // D214: the plan context behind the summary's "N sessions left" and the
  // recovery-week framing.
  const [planContext, setPlanContext] = useState({ recoveryWeek: false, hasPlan: false, sessionsLeft: null });
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

  // The resolved bands and their sources, read afresh (after a save or a
  // release, so the rows and the editor follow the bands now in force).
  async function resolveLandmarksNow() {
    const r = await getEffectiveLandmarks(user.id, { userProfile });
    setResolvedLandmarks(r?.table ?? null);
    setResolvedSource(r?.source ?? null);
    return r;
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
      setPlanContext({ recoveryWeek: false, hasPlan: false, sessionsLeft: null });
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

      const allExercises = await getAllExercises();
      if (!isCurrentRequest()) return;
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      const ds = buildDataset(allSets, exerciseMap, now);
      datasetRef.current = ds;
      setDataset(ds);

      const plan = await readPlanContext(user.id);
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

      // Custom volume targets. Stored in AsyncStorage under an @volyume_
      // key, which the generic user_prefs sync round-trips to cloud (push
      // in bulkUploadLocalData, restore in pullFromCloud), so the setting
      // survives a reinstall or a sign-out/in on the same account. Saving
      // and releasing below also push immediately via syncUserPref so the
      // change is not stranded until the next bulk sync.
      const stored = await AsyncStorage.getItem(`@volyume_landmarks_${user.id}`).catch(() => null);
      if (!isCurrentRequest()) return;
      let parsed = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (_) {}
      }
      setCustomLandmarks(parsed);
      // D214: the bands in force are read BEFORE the first paint, so the rows,
      // the figure and each row's source all come from the same resolution
      // (a late resolution used to draw research values under a caption that
      // said otherwise, VH-4).
      try {
        const r = await getEffectiveLandmarks(user.id, { userProfile });
        if (!isCurrentRequest()) return;
        setResolvedLandmarks(r?.table ?? null);
        setResolvedSource(r?.source ?? null);
      } catch (_) {
        if (!isCurrentRequest()) return;
        setResolvedLandmarks(null);
        setResolvedSource(null);
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

  const effectiveLandmarks = resolvedLandmarks ?? customLandmarks ?? null;
  const muscles = LISTED_MUSCLES;

  // The band in force for a muscle: what the rows judge by and the editor seeds.
  const bandFor = useCallback((muscle) => effectiveLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle],
    [effectiveLandmarks]);

  function openEditor() {
    const seed = {};
    const values = {};
    for (const muscle of muscles) {
      const band = bandFor(muscle);
      seed[muscle] = { mev: Number(band.mev) || 0, mav: Number(band.mav) || 0, mrv: Number(band.mrv) || 0 };
      values[muscle] = { ...seed[muscle] };
    }
    editSeedRef.current = seed;
    touchedMusclesRef.current = new Set();
    setEditValues(values);
    setEditNotice(null);
    setConfirmingReset(false);
    setEditing(true);
  }

  function cancelEditing() {
    // Review D4: an abandoned edit is not intent. Cancel discards both the
    // typed values (the editor is re-seeded on the next open) and the record
    // of which muscles were touched, so a later save in the same visit cannot
    // stamp them as the user's own setting (which would be permanent and
    // outrank everything, including adaptive learning).
    touchedMusclesRef.current = new Set();
    setEditing(false);
  }

  async function saveLandmarks() {
    if (!user?.id) return;
    // Stage 6 review blocker #1, closed again under D214: persist ONLY what the
    // person set. A muscle is written when it was touched in this editing
    // session or its numbers differ from the values the editor SEEDED (the band
    // in force), never because it differs from the research table: seeded from
    // a plan, an untouched muscle already differs from research and must not
    // become a manual edit. A muscle that already holds a saved edit keeps it.
    const stored = customLandmarks || {};
    const seed = editSeedRef.current || {};
    const map = {};
    for (const muscle of muscles) {
      const vals = editValues[muscle] || {};
      const entry = {
        mev: parseInt(vals.mev, 10) || 0,
        mav: parseInt(vals.mav, 10) || 0,
        mrv: parseInt(vals.mrv, 10) || 0,
      };
      const seeded = seed[muscle];
      const touched = touchedMusclesRef.current.has(muscle);
      const changedFromSeed = !!seeded
        && (entry.mev !== seeded.mev || entry.mav !== seeded.mav || entry.mrv !== seeded.mrv);
      const prior = stored[muscle];
      if (touched || changedFromSeed) {
        // C8 Work 3 (RA6-6): a deliberate edit is the person's own setting even
        // when they landed on the value it was seeded with; `explicit` records
        // the intent so no reader has to infer it from the number.
        map[muscle] = { ...entry, explicit: true };
      } else if (prior && (prior.explicit === true || isManualEdit(prior, VOLUME_LANDMARKS[muscle]))) {
        map[muscle] = prior; // an earlier real edit stays exactly as saved
      }
    }
    const key = `@volyume_landmarks_${user.id}`;
    try {
      if (Object.keys(map).length === 0) {
        touchedMusclesRef.current = new Set();
        if (customLandmarks) {
          // Only neutral legacy entries were stored: nothing is the person's
          // own, so the blob goes (same semantics as a reset).
          await AsyncStorage.removeItem(key);
          // Campaign 1 P0-8 D10: stamp the local write so a stale cloud copy
          // of the landmark blob cannot be applied back over this edit.
          notePrefWrite(key).catch(() => {});
          syncUserPref(user.id, key, '').catch(() => {});
          setCustomLandmarks(null);
          toast.show('Volume targets saved', { variant: 'success' });
        }
        setEditing(false);
        return;
      }
      const json = JSON.stringify(map);
      await AsyncStorage.setItem(key, json);
      // Campaign 1 P0-8 D10: stamp the local write (see above).
      notePrefWrite(key).catch(() => {});
      // Push straight to cloud so the targets survive a reinstall even if no
      // bulk sync runs before then. Best-effort: a failure just defers the
      // push to the next bulk sync, which still covers this key.
      syncUserPref(user.id, key, json).catch(() => {});
      touchedMusclesRef.current = new Set();
      setCustomLandmarks(map);
      setEditing(false);
      toast.show('Volume targets saved', { variant: 'success' });
      resolveLandmarksNow().catch(() => {});
    } catch (e) {
      logError('VolumeHeatmapScreen.saveLandmarks', e, { muscle: 'all' });
      setEditNotice("Couldn't save your volume targets. Try again.");
    }
  }

  // C14 job 7 (RA6-6): a muscle is Volyume-managed when the user holds no
  // saved override for it AND has not touched it in this editing session.
  // The control only appears when there is something to hand back.
  function isMuscleManaged(muscle) {
    return !customLandmarks?.[muscle] && !touchedMusclesRef.current.has(muscle);
  }

  // Hand ONE muscle back to Volyume's targets. Drops its saved entry (explicit
  // marker and all) and the session's record that it was touched, then writes
  // the remaining table through the same path a save uses, so the cloud copy
  // cannot ride the next pull back in and undo it. An empty table is a full
  // reset, which is what removing the last override means; the reader treats a
  // falsy stored value as "use the targets Volyume works out".
  async function clearMuscleOverride(muscle) {
    const hadSaved = !!customLandmarks?.[muscle];
    touchedMusclesRef.current.delete(muscle);
    if (!hadSaved) {
      // Only typed in this editing session, never saved: nothing is stored for
      // it, so nothing is written. The fields go back to what they were seeded
      // with, the band Volyume is using.
      const seeded = editSeedRef.current?.[muscle];
      if (seeded) setEditValues(prev => ({ ...prev, [muscle]: { ...seeded } }));
      setEditNotice(`${MUSCLE_DISPLAY_NAMES[muscle]} is back to Volyume's targets.`);
      return;
    }
    const next = { ...(customLandmarks || {}) };
    delete next[muscle];
    const key = `@volyume_landmarks_${user.id}`;
    const empty = Object.keys(next).length === 0;
    try {
      if (empty) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(next));
      notePrefWrite(key).catch(() => {});
      syncUserPref(user.id, key, empty ? '' : JSON.stringify(next)).catch(() => {});
    } catch (e) {
      logError('VolumeHeatmapScreen.clearMuscleOverride', e, { muscle });
      setEditNotice("Couldn't save that change. Try again.");
      return;
    }
    setCustomLandmarks(empty ? null : next);
    // The muscle's band is now whatever Volyume works out for it, so the
    // editor's fields for that muscle follow it.
    try {
      const r = await resolveLandmarksNow();
      const band = r?.table?.[muscle] || VOLUME_LANDMARKS[muscle];
      const seeded = { mev: Number(band.mev) || 0, mav: Number(band.mav) || 0, mrv: Number(band.mrv) || 0 };
      editSeedRef.current = { ...editSeedRef.current, [muscle]: seeded };
      setEditValues(prev => ({ ...prev, [muscle]: { ...seeded } }));
    } catch (_) { /* best-effort: the fields keep what they show */ }
    setEditNotice(`${MUSCLE_DISPLAY_NAMES[muscle]} is back to Volyume's targets.`);
  }

  // Every muscle back to the bands the app would use without the person's
  // edits (plan, adjusted, profile or research). Confirmed inline in the editor
  // (confirmingReset) before it runs.
  async function resetToVolyumeTargets() {
    const key = `@volyume_landmarks_${user.id}`;
    try {
      await AsyncStorage.removeItem(key);
      // Campaign 1 P0-8 D10: stamp the local write so a stale cloud
      // copy cannot ride back in and undo the reset.
      notePrefWrite(key).catch(() => {});
      // Clear the cloud copy too. Without this the old custom targets
      // would ride pullFromCloud back onto the device on the next
      // reinstall and silently undo the reset. There is no pref-delete
      // RPC, so an empty value is the "no custom targets" sentinel:
      // loadData treats a falsy stored value as no custom targets.
      syncUserPref(user.id, key, '').catch(() => {});
    } catch (e) {
      logError('VolumeHeatmapScreen.resetToVolyumeTargets', e, {});
      setConfirmingReset(false);
      setEditNotice("Couldn't save that change. Try again.");
      return;
    }
    touchedMusclesRef.current = new Set();
    setCustomLandmarks(null);
    setConfirmingReset(false);
    setEditing(false);
    resolveLandmarksNow().catch(() => {});
    toast.show("Volume targets back to Volyume's targets", { variant: 'success' });
  }

  // ScrollView + per-row offsets so the body diagram can scroll the user to a
  // muscle's row when its region is tapped. A row's y is relative to its group,
  // the group's to the list, the list's to the scroll content.
  const scrollRef = useRef(null);
  const listY = useRef(0);
  const groupY = useRef({});
  const rowY = useRef({});
  // A4 (pre-release sweep 2026-07-27): the volume-targets Min/Target/Max
  // fields are all number-pad (no Return key on iOS), so returnKeyType/
  // onSubmitEditing would be inert -- chain focus instead via TextField's
  // numeric Done-bar "Next" affordance. Keyed by `${muscle}:${key}` since
  // every muscle row renders its own MEV/MAV/MRV trio.
  const editFieldRefs = useRef({});

  // Everything the current chip reads, from the loaded history.
  const view = useMemo(() => (dataset ? buildWindowView(dataset, windowWeeks) : null), [dataset, windowWeeks]);
  const recoveryWeek = planContext.recoveryWeek === true;

  // One model per muscle: the rounded figure that is both shown and judged
  // (D214, VH-2: round once), its band word, the bar's numbers and the recency.
  const rowModels = useMemo(() => {
    const resolveColor = buildVolumeStatusColor(t.colors);
    return muscles.map((muscle) => {
      const credit = view?.raw[muscle]?.workingSets || 0;
      const avg = view?.perWeek[muscle]?.workingSets || 0;
      const sets = Math.round(avg);
      const total = Math.round(credit);
      const band = bandFor(muscle);
      const { status } = getVolumeStatus(sets, muscle, effectiveLandmarks);
      // "6 to 22" when the helpful range starts above zero; a range that starts
      // at 0 (Front delts) reads "up to 14", never "0 to 14".
      const range = (Number(band.mev) || 0) > 0 ? `${band.mev} to ${band.mrv}` : `up to ${band.mrv}`;
      const figureText = windowWeeks === 1
        ? `${sets} of ${range} sets this week`
        : `An average of ${sets} of ${range} sets a week`;
      const lastMs = dataset?.lastTrained?.[muscle] ?? null;
      const recency = trainingRecency(lastMs, dataset?.loadedAtMs ?? Date.now());
      const source = resolvedSource?.[muscle] && SOURCE_WORDS[resolvedSource[muscle]]
        ? resolvedSource[muscle]
        : null;
      const spokenFigure = windowWeeks === 1
        ? `${sets} of ${range} sets this week`
        : `an average of ${sets} of ${range} sets a week over the last ${windowWeeks} weeks, ${total} in total`;
      const a11yLabel = [
        `${MUSCLE_DISPLAY_NAMES[muscle]}: ${spokenFigure}`,
        recoveryWeek ? null : BAND_LABEL[status],
        recency.known ? recency.label : null,
        source ? `source: ${SOURCE_WORDS[source]}` : null,
      ].filter(Boolean).join(', ');
      return {
        muscle,
        name: MUSCLE_DISPLAY_NAMES[muscle],
        sets,
        total,
        hasCredit: credit > 0,
        status,
        color: recoveryWeek ? undefined : resolveColor(status),
        band,
        // The bar's track runs to the limit, or to the value when it is past it.
        max: Math.max(Number(band.mrv) || 0, sets),
        figureText,
        recencyText: recency.known ? recency.label : null,
        source,
        a11yLabel,
      };
    });
  }, [view, dataset, windowWeeks, recoveryWeek, resolvedSource, effectiveLandmarks, bandFor, muscles, t]);

  // The figure's input. An entry with no colour draws as "No sets", so a muscle
  // with no sets in the window carries none; in a recovery week every trained
  // muscle takes one neutral shade (no verdict colour, D214 section 7.4 item 3).
  const volumeByMuscle = useMemo(() => {
    const resolveColor = buildVolumeStatusColor(t.colors);
    const map = {};
    for (const r of rowModels) {
      map[r.muscle] = {
        workingSets: r.sets,
        status: r.status,
        label: BAND_LABEL[r.status],
        ...(r.hasCredit ? { color: recoveryWeek ? t.colors.surface3 : resolveColor(r.status) } : {}),
      };
    }
    return map;
  }, [rowModels, recoveryWeek, t]);

  // The rows, grouped by band with counts in the order the screen reads them
  // (a group with no rows is omitted). A recovery week prints no band word, so
  // its rows are one flat list.
  const groups = useMemo(() => {
    if (recoveryWeek) return [{ key: 'flat', label: null, status: null, rows: rowModels }];
    return BAND_GROUPS
      .map(g => ({ key: g.status, label: g.label, status: g.status, rows: rowModels.filter(r => r.status === g.status) }))
      .filter(g => g.rows.length > 0);
  }, [rowModels, recoveryWeek]);

  const manualNames = useMemo(() => muscles
    .filter(m => resolvedSource?.[m] === 'manual')
    .map(m => MUSCLE_DISPLAY_NAMES[m]), [resolvedSource, muscles]);

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
  const volTakeaway = volumeTakeaway({
    windowKey: trendWindowKey, coversAll: false, spanDays: 0, weeklySets: volWeeklyTotals,
    phraseOverride: fullWeeksCount > 0
      ? (fullWeeksCount === 1 ? 'Last full week' : `Last ${fullWeeksCount} full weeks`)
      : undefined,
    currentWeekTotal,
  });
  const trendWeeks = (windowByKey(VOLUME_WINDOWS, trendWindowKey) ?? windowByKey(VOLUME_WINDOWS, '4W')).weeks;

  const showNoVolumeGuidance = !view || view.musclesWorked === 0;
  const noVolumeTitle = hasAnyCompletedSets
    ? (windowWeeks === 1 ? 'No sets since Monday' : `No sets in the last ${windowWeeks} weeks`)
    : 'Volume appears after your first workout';
  const noVolumeText = hasAnyCompletedSets
    ? 'Your training history is still saved. Switch to a wider window if you want to see older volume.'
    : 'Finish a workout and this screen will show, for each muscle, your weekly sets and its target range.';

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
      + (divisor > 0 && divisor < windowWeeks ? ` (your log covers ${divisor} of them)` : '');

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

  const resolveBandColor = buildVolumeStatusColor(t.colors);

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
              <Text style={[styles.recoveryNote, live.recoveryNote]}>
                No muscle is judged this week. The ones you trained share one shade on the figure, and its legend says only which were trained.
              </Text>
            </>
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
                  <View style={[styles.groupDot, { backgroundColor: resolveBandColor(group.status) }]} />
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
          {'Targets start from research figures and adjust to your plan and your logged sessions'}
          {manualNames.length
            ? `; ${joinNames(manualNames)} ${manualNames.length === 1 ? 'uses' : 'use'} your own targets.`
            : '.'}
        </Text>

        {/* Sets a week: the trend card. The chips name the window, and a chip
            reloads only this card. */}
        {trainedMuscles.length > 0 && (
          <Card style={styles.section}>
            <SectionLabel variant="title" heading>{`Sets a week, last ${trendWeeks} weeks`}</SectionLabel>
            <WindowChips windows={VOLUME_WINDOWS} selectedKey={trendWindowKey} onSelect={selectTrendWindow}
              accessibilityPrefix="volume trend window" />
            {!!volTakeaway && <Text style={[styles.trendTakeaway, live.trendTakeaway]}>{volTakeaway}</Text>}
            {trainedMuscles.map(muscle => (
              <MuscleTrendRow
                key={muscle}
                muscle={muscle}
                trendData={trendData}
                landmarks={effectiveLandmarks}
              />
            ))}
          </Card>
        )}

        {/* Volume targets: one door to the editor. */}
        <NavGroup>
          <NavRow
            icon="stats-chart-outline"
            label="Volume targets"
            sub="How many sets each muscle gets each week."
            onPress={openEditor}
          />
        </NavGroup>
      </ScrollView>

      {/* The editor: the bands in force, one box each, saving only the muscles
          the person touches. */}
      <Modal visible={editing} animationType="slide" onRequestClose={cancelEditing}>
        <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
          <ModalHeader title="Volume targets" onClose={cancelEditing} />
          <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.editSubtitle, live.editSubtitle]}>
                Weekly sets per muscle: minimum, target and ceiling. Each box starts at the target Volyume is using for you today, and only the muscles you change are saved as your own.
              </Text>
              {/* D93 (Campaign 2, Phase 7): the second consequence of a manual
                  override was disclosed nowhere - a manually-set block is also
                  skipped by the learned-range replay (learnedRange.js min
                  evidence, D91-12), so hand-set targets pause learning too. */}
              <Text style={[styles.editSubtitle, live.editSubtitle]}>
                Your numbers set the targets from here; a block already underway keeps its written plan. While your own settings are in place, the app stops adjusting these ranges from your finished blocks.
              </Text>
              {editNotice ? (
                <Text style={[styles.editNotice, live.editNotice]} accessibilityLiveRegion="polite">{editNotice}</Text>
              ) : null}
              {muscles.map(muscle => (
                <View key={muscle} style={[styles.editRow, live.editRow]}>
                  <View style={styles.editRowHeader}>
                    <Text style={[styles.editMuscleName, live.editMuscleName]}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                    {/* C14 job 7 (RA6-6): the distinct "hand this one back"
                        action. Explicit intent is a CHOICE, so it can only be
                        undone by another choice. Releasing here returns this
                        muscle to Volyume's targets and drops its explicit
                        marker, without the user having to move a number away
                        and back again to prove they meant it. */}
                    {isMuscleManaged(muscle) ? null : (
                      <TouchableOpacity
                        onPress={() => clearMuscleOverride(muscle)}
                        accessibilityRole="button"
                        accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} back to Volyume's targets`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.editRowClear, live.editRowClear]}>Back to Volyume's targets</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.editInputs}>
                    {[['mev', 'Min'], ['mav', 'Target'], ['mrv', 'Max']].map(([key, label], idx, arr) => {
                      const nextKey = arr[idx + 1]?.[0];
                      return (
                        <TextField
                          key={key}
                          ref={el => { editFieldRefs.current[`${muscle}:${key}`] = el; }}
                          label={label}
                          value={String(editValues[muscle]?.[key] ?? '')}
                          onChangeText={v => {
                            touchedMusclesRef.current.add(muscle); // C8 RA6-6
                            setEditValues(prev => ({
                              ...prev,
                              [muscle]: { ...prev[muscle], [key]: v },
                            }));
                          }}
                          keyboardType="number-pad"
                          selectTextOnFocus
                          accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} ${label}`}
                          containerStyle={styles.editInputGroup}
                          labelStyle={[styles.editInputLabel, live.editInputLabel]}
                          fieldStyle={styles.editInputField}
                          inputStyle={styles.editInputText}
                          onAccessoryNext={nextKey ? () => editFieldRefs.current[`${muscle}:${nextKey}`]?.focus() : undefined}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
              {(customLandmarks && Object.keys(customLandmarks).length > 0) || touchedMusclesRef.current.size > 0 ? (
                <View style={styles.resetBlock}>
                  {confirmingReset ? (
                    <>
                      <Text style={[styles.editSubtitle, live.editSubtitle]}>
                        Your own targets are removed. Each muscle goes back to the target Volyume works out from your plan and your logged training.
                      </Text>
                      <View style={styles.resetActions}>
                        <Button
                          title="Keep mine"
                          variant="secondary"
                          size="sm"
                          onPress={() => setConfirmingReset(false)}
                          accessibilityLabel="Keep my own targets"
                          style={styles.editActionButton}
                        />
                        <Button
                          title="Back to Volyume's targets"
                          size="sm"
                          onPress={resetToVolyumeTargets}
                          accessibilityLabel="Confirm all muscles back to Volyume's targets"
                          style={styles.editActionButton}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.editSubtitle, live.editSubtitle]}>
                        The targets Volyume would use without your edits come from your plan and your logged training.
                      </Text>
                      <Button
                        title="Back to Volyume's targets"
                        variant="secondary"
                        size="sm"
                        onPress={() => setConfirmingReset(true)}
                        accessibilityLabel="All muscles back to Volyume's targets"
                      />
                    </>
                  )}
                </View>
              ) : null}
            </ScrollView>
            <View style={[styles.editFooter, live.editFooter]}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={cancelEditing}
                accessibilityLabel="Cancel"
                style={styles.editActionButton}
              />
              <Button
                title="Save"
                size="sm"
                onPress={saveLandmarks}
                accessibilityLabel="Save volume targets"
                style={styles.editActionButton}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  const sourceLine = row.source ? `Source: ${SOURCE_WORDS[row.source]}` : null;
  return (
    <View onLayout={onLayout}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => onToggle(row.muscle)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={row.a11yLabel}
        accessibilityHint={sourceLine ? 'Shows where this target comes from' : undefined}
        accessibilityState={{ expanded }}
      >
        <View style={styles.rowHead}>
          <Text style={[styles.muscleName, rowLive.muscleName]}>{row.name}</Text>
          {row.recencyText ? <Text style={[styles.recency, rowLive.recency]}>{row.recencyText}</Text> : null}
        </View>
        <Text style={[styles.figure, rowLive.figure]}>{row.figureText}</Text>
        <RangeBar
          value={row.sets}
          max={row.max}
          rangeStart={Number(row.band.mev) || 0}
          rangeEnd={Number(row.band.mrv) || 0}
          bandStart={(Number(row.band.mev) || 0) + 2}
          bandEnd={Number(row.band.mav) || 0}
          fillColor={row.color}
        />
        {expanded && sourceLine ? <Text style={[styles.sourceLine, rowLive.sourceLine]}>{sourceLine}</Text> : null}
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
function MuscleTrendRow({ muscle, trendData, landmarks }) {
  // trendData is the window's weekly array (oldest to newest), each entry has
  // volumeByMuscle. COMP-019 Stage 1b: bars render through VolyumeChart's bar
  // variant with tap-and-hold scrub; since a 24px row has no room for a tooltip
  // card, the scrubbed week's count surfaces in the label above instead.
  const t = useTheme();
  const trendLive = useMemo(() => buildTrendLiveStyles(t), [t]);
  const resolveVolumeStatusColor = buildVolumeStatusColor(t.colors);
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
    return resolveVolumeStatusColor(getVolumeStatus(count, muscle, landmarks).status);
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
  keyboardAvoid: { flex: 1 },
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
  editContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  editSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  editRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  editMuscleName: { ...type.label, color: colors.textSecondary },
  editRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  editRowClear: { ...type.caption, color: colors.primary },
  editInputs: { flexDirection: 'row', gap: spacing.sm },
  editInputGroup: { flex: 1, gap: spacing.xs },
  editInputLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  // R2 (2026-07-11): input class -> radius.md (control/input/icon-backing,
  // FOOD-DESIGN-STANDARD.md section 4). Was radius.sm.
  editInputField: { borderRadius: radius.md },
  // Numeric target input: tabular figures so the min/target/max values align.
  editInputText: { textAlign: 'center', fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  editNotice: { ...type.bodySm, color: colors.textPrimary },
  resetBlock: { gap: spacing.sm },
  resetActions: { flexDirection: 'row', gap: spacing.md },
  editFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  editActionButton: {
    flex: 1,
  },
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
    groupLabel: { ...t.type.overline, color: t.colors.textSecondary },
    muscleName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    recency: { ...t.type.caption, color: t.colors.textMuted },
    figure: { ...t.type.bodySm, color: t.colors.textSecondary },
    sourceLine: { ...t.type.caption, color: t.colors.textMuted },
    footerNote: { ...t.type.bodySm, color: t.colors.textMuted },
    trendTakeaway: { ...t.type.bodySm, color: t.colors.textSecondary },
    editSubtitle: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    editNotice: { ...t.type.bodySm, color: t.colors.textPrimary },
    editRow: { borderBottomColor: t.colors.borderSubtle },
    editMuscleName: { ...t.type.label, color: t.colors.textSecondary },
    editRowClear: { ...t.type.caption, color: t.colors.primary },
    editInputLabel: { ...t.type.caption, color: t.colors.textMuted },
    editFooter: { borderTopColor: t.colors.borderSubtle },
  };
}
