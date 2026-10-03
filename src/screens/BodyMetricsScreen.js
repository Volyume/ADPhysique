/**
 * BodyMetricsScreen: the weigh-ins, the trend and what changed this week.
 *
 * Rebuilt under D214 addendum 4 (Body metrics, lane 7; the spec is
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3, the findings are
 * 05-R3-BODY-METRICS-READ.md BM-1 to BM-51). The screen answers one question,
 * "Is my weight doing what the plan wants, and what changed this week?", in
 * this order: This week (the trend weight, the verdict, this week against
 * last, the usual day-to-day swing), the actions, the Trend card,
 * Maintenance calories, Recomposition, Body fat and measurements, History,
 * then the doors (photos, units).
 *
 * Withholds. Every withhold on this screen is `policy.show.<section>`, the
 * one pure rule in src/lib/bodyMetricsPolicy.js (ED-A, ED-B, ED-C, ED-E):
 * nothing below the header renders until BOTH safety reads have returned,
 * under an open flag or calm mode every direction word, rate, weekly
 * comparison, swing line, takeaway, maintenance figure, intake line,
 * recomposition card and measurement change line is withheld while the
 * person's own entries stay, and `policy.line` stands in the verdict's slot.
 * The screen never writes a gate of its own; the calm interstitial below
 * ("A gentle pause", once a session) is the existing mechanism and stays.
 *
 * One trend weight: it is the Progress root's reading (the hook's own
 * windowing, `trendWindowRows`, through the SAME deriveWeightTrend), so the
 * two screens print the same figure for the same person.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShallow } from 'zustand/react/shallow';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import VolyumeChart from '../components/VolyumeChart';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import InfoTooltip from '../components/InfoTooltip';
import LegendRow from '../components/LegendRow';
import { NavRow, NavGroup } from '../components/NavRow';
import Chip from '../components/Chip';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import SegmentedControl from '../components/SegmentedControl';
import PhotoDatePicker from '../components/PhotoDatePicker';
import { SkeletonCard } from '../components/Skeleton';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import { GLOSSARY } from '../lib/coachGlossary';
import { spacing, radius, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import {
  logBodyMetric, updateBodyMetric, deleteBodyMetric, getBodyMetricLog, getMorningWeights,
  getOpenEdPatternFlag, getWorkoutSetsSince, getExerciseLookup, updateMorningWeightById,
  deleteMorningWeightById, logMorningWeight, getNutritionTargets, getLatestCoachOutput,
} from '../lib/database';
import { logError } from '../lib/errorLog';
import { deriveRecomp, buildRecompShareParams, recompLines } from '../lib/recompReframe';
import { localDayKey, localWeekStartMs } from '../lib/dayKey';
import {
  WEIGHT_WINDOWS, DEFAULT_WINDOW_KEY, windowByKey, pickInitialWindowKey, weightTakeaway,
} from '../lib/chartWindows';
import { track } from '../lib/engineTelemetry';
import { getRecentIntakeSummary } from '../lib/food/db';
import { syncAll } from '../lib/sync';
import { computeEWMA, computeWeeklyWeightChange } from '../lib/nutritionEngine';
import { resolveEffectiveMaintenanceForUser } from '../lib/effectiveMaintenanceService';
import { readMaintenanceInputs } from '../lib/maintenanceInputs';
import { formatBodyWeight, kgToStoneLbsStrings, kgToLbs } from '../lib/units';
import { WELLBEING_HELPLINE, WELLBEING_KEY } from '../lib/wellbeing';
import { bodyMetricsPolicy } from '../lib/bodyMetricsPolicy';
// The shared derivation (the Progress root's own), so the verdict, the
// two-week reading and the steady rule are one definition on both screens.
import {
  deriveWeightTrend, twoWeekTrend, typicalDailySwingKg, coachVerdictInsight, lapsedInsight,
} from '../lib/weightTrend';
import {
  weightChartUnitLabel, weightChartValue, weightChartTooltipTitle,
  formatWeightAmount, formatWeightRatePerWeek, shortDate, weekdayDate, shortDateYear, weekdayDateYear,
  morningsCaption, twoWeekVerdictLine, notEnoughForDirectionLine, weekComparisonLine, noiseLine,
  TREND_WEIGHT_INFO, DAY_ZERO_LINE, startingWeightLine, lastWeighInCaption, coachVerdictFromOutput,
  trendTitle, chartUnitNote, trendInfo, fittedAxis, weeklyTickTimes, niceAxisTicks, axisGutterWidth,
  MAINTENANCE_TITLE, MAINTENANCE_INFO, maintenanceModel, intakeLine,
  weekGroupHeader, noteForDisplay, historyRowTitle, historyRowDetail, replaceNotice,
  BODY_FAT_METHOD_LABELS, readingChangeLine, MEASURE_HOW_INFO,
} from '../lib/bodyMetricsDisplay';
import {
  validateBodyMetricForm, weighInPlausibility, plausibilityMessage,
  BODY_FAT_METHODS, DEFAULT_BODY_FAT_METHOD, BODY_FAT_METHOD_CHOICE, CIRCUMFERENCE_FIELDS,
} from '../lib/bodyMetricValidate';
import {
  logRowToEntry, buildDayEntries, weighInsOf, weekAverage, previousWeekStart, morningsThisWeek,
  groupEntriesByWeek, readingsOf, hasEntryBefore, trendWindowRows, plausibilityReference,
  noonOfDay, HISTORY_PAGE_WEEKS, CHART_RANGE_DAYS, READING_FIELDS, ENROLMENT_NOTE,
} from '../lib/bodyMetricsHistoryMerge';
import { parseDecimalInput } from '../lib/parseDecimalInput';

const NUTRITION_KEY = '@volyume_nutrition_targets';
// COMP-019: per-chart window persistence.
const WEIGHT_WINDOW_STORE_KEY = '@volyume_chart_window_weight';
const DAY_MS = 86400000;
// The reads are bounded by date, with a row cap far above anything a person
// logs (one weigh-in a day for fifteen years is under 6,000 rows).
const LOG_CAP = 6000;
const MORNING_CAP = 6000;

// Resets when the app process restarts → "re-confirmation each session".
let bodyMetricsSessionConfirmed = false;

// form key  →  logBodyMetric() data field (the legacy AsyncStorage migration)
const FIELD_MAP = {
  body_weight: 'weightKg',
  chest:       'chestCm',
  shoulders:   'shouldersCm',
  arms:        'armCm',
  forearms:    'forearmCm',
  waist:       'waistCm',
  hips:        'hipsCm',
  quads:       'thighCm',
  hamstrings:  'hamCm',
  calves:      'calfCm',
};

const MEASUREMENTS = [
  { key: 'chest',       label: 'Chest' },
  { key: 'shoulders',   label: 'Shoulders' },
  { key: 'arms',        label: 'Arms (flexed)' },
  { key: 'forearms',    label: 'Forearms' },
  { key: 'waist',       label: 'Waist' },
  { key: 'hips',        label: 'Hips' },
  { key: 'quads',       label: 'Quads' },
  { key: 'hamstrings',  label: 'Hamstrings' },
  { key: 'calves',      label: 'Calves' },
];
const SITE_LABELS = Object.fromEntries(MEASUREMENTS.map((m) => [m.key, m.label]));

// D16 (NAV-2): shared blank-form shape, reused for a fresh entry and for
// closing an in-progress edit (never left holding a stale entry's data).
function blankMetricForm(todayKey) {
  return {
    body_weight: '', body_weight_st: '', body_weight_st_lbs: '0',
    body_fat: '', body_fat_source: DEFAULT_BODY_FAT_METHOD,
    chest: '', shoulders: '', arms: '', forearms: '',
    waist: '', hips: '', quads: '', hamstrings: '', calves: '',
    metric_date: todayKey, notes: '',
  };
}

// The form for an existing entry, with the weight turned back into the
// person's own units (mirrors TodayStrip's kg -> st/lb prefill) so editing in
// stones and pounds never shows a raw kilogram figure. The setup marker is
// not a note the person wrote, so it is not put in the note field.
function formFromEntry(entry, bwu, todayKey) {
  const form = blankMetricForm(todayKey);
  if (entry.body_weight) {
    if (bwu === 'st') {
      const { stoneStr, lbsStr } = kgToStoneLbsStrings(entry.body_weight);
      form.body_weight_st = stoneStr;
      form.body_weight_st_lbs = lbsStr;
    } else if (bwu === 'lbs') {
      form.body_weight = String(Math.round(kgToLbs(entry.body_weight) * 10) / 10);
    } else {
      form.body_weight = String(Math.round(entry.body_weight * 10) / 10);
    }
  }
  if (entry.body_fat != null) {
    form.body_fat = String(entry.body_fat);
    form.body_fat_source = BODY_FAT_METHODS.some((m) => m.value === entry.body_fat_source)
      ? entry.body_fat_source : DEFAULT_BODY_FAT_METHOD;
  }
  for (const m of MEASUREMENTS) form[m.key] = entry[m.key] != null ? String(entry[m.key]) : '';
  form.metric_date = entry.metric_date || todayKey;
  form.notes = String(entry.notes || '').trim() === 'enrolment' ? '' : (entry.notes || '');
  return form;
}

// Is the weight in the form the one the entry already holds, at the
// precision the form shows? Then the stored figure is kept (a note edit never
// moves a weight by rounding).
function sameTypedWeight(kg, storedKg, bwu) {
  if (!(Number(kg) > 0) || !(Number(storedKg) > 0)) return false;
  if (bwu === 'st') {
    const a = kgToStoneLbsStrings(kg);
    const b = kgToStoneLbsStrings(storedKg);
    return a.stoneStr === b.stoneStr && a.lbsStr === b.lbsStr;
  }
  if (bwu === 'lbs') return Math.round(kgToLbs(kg) * 10) === Math.round(kgToLbs(storedKg) * 10);
  return Math.round(kg * 10) === Math.round(storedKg * 10);
}

const hasMoreThanWeight = (data) => data.bodyFatPercent != null
  || CIRCUMFERENCE_FIELDS.some((f) => data[f.dbField] != null);

// The legacy AsyncStorage migration (unchanged): a person who logged before
// the SQLite table existed has their entries moved over once.
async function migrateFromAsyncStorage(userId) {
  if (!userId) return;
  const MIGRATED_KEY = `@volyume_body_metrics_migrated_${userId}`;
  const STORAGE_KEY = `@volyume_body_metrics_${userId}`;
  try {
    const done = await AsyncStorage.getItem(MIGRATED_KEY);
    if (done === 'true') return;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const legacy = raw ? JSON.parse(raw) : [];
    // Track per-row failures rather than letting one bad row abort the whole
    // migration: a thrown logBodyMetric (a NaN getting through) used to trip
    // the outer catch, MIGRATED_KEY was never written, and the loop reran the
    // partial migration on every launch, duplicating the rows that succeeded.
    let migrated = 0;
    let failed = 0;
    for (const entry of legacy) {
      try {
        const data = { notes: entry.notes || null };
        const d = entry.metric_date ? new Date(entry.metric_date) : new Date();
        data.loggedAt = Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
        for (const [formKey, dbField] of Object.entries(FIELD_MAP)) {
          if (entry[formKey] != null && entry[formKey] !== '') {
            const num = parseDecimalInput(entry[formKey]);
            if (Number.isFinite(num)) data[dbField] = num;
          }
        }
        await logBodyMetric(userId, data);
        migrated++;
      } catch (rowErr) {
        failed++;
        logError('BodyMetricsScreen.migrate', rowErr, { userId });
      }
    }
    // Mark migrated only if we made some forward progress. If every single
    // row failed we leave the flag unset so a later launch can retry.
    if (migrated > 0 || failed === 0) {
      await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    }
  } catch (e) {
    logError('BodyMetricsScreen.migrateFromAsyncStorage', e, { userId });
  }
}

// The start of the range a read covers: the whole chart range (a year), or
// further when the History has been paged back past it.
function rangeStartFor(nowMs, weeks) {
  const chartStart = nowMs - CHART_RANGE_DAYS * DAY_MS;
  const d = new Date(localWeekStartMs(nowMs));
  d.setDate(d.getDate() - 7 * Math.max(0, weeks - 1));
  return Math.min(chartStart, d.getTime());
}

const readErrorLine = (what) => `Couldn't load your ${what} just now.`;

// ─── Main Screen ──────────────────────────────────────────────────────────────

// The form's one label column and the note field's three lines, named so no
// raw dp sits in the styles (styling rule; review N9).
const FORM_LABEL_WIDTH = 96;
const NOTE_FIELD_MIN_HEIGHT = 72;

export default function BodyMetricsScreen() {
  const navigation = useNavigation();
  const { user, session, units, bodyWeightUnits, userProfile, profileStamps } = useAppStore(useShallow((s) => ({
    user: s.user,
    session: s.session,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    userProfile: s.userProfile,
    profileStamps: s.userProfileFieldUpdatedAt,
  })));
  // Energy DISPLAY unit (kcal | kj). Display-only: stored intake stays kcal.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const bwu = bodyWeightUnits || 'st';
  const toast = useToast();
  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;

  // ── The two safety reads (ED-C). Both stay `undefined` until they return,
  // and nothing below the header renders until then; a failed read counts as
  // an open flag, or as calm mode, never the other way. ──
  const [edFlag, setEdFlag] = useState(undefined);
  const [wellbeingMode, setWellbeingMode] = useState(undefined);
  const policy = useMemo(() => bodyMetricsPolicy({ edFlag, wellbeingMode }), [edFlag, wellbeingMode]);
  const [sessionConfirmed, setSessionConfirmed] = useState(bodyMetricsSessionConfirmed);

  // ── The data ──
  const [clock, setClock] = useState(() => Date.now());
  const [entries, setEntries] = useState([]);
  const [morningRows, setMorningRows] = useState([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [entriesStatus, setEntriesStatus] = useState('loading');
  const [historyWeeks, setHistoryWeeks] = useState(HISTORY_PAGE_WEEKS);
  const historyWeeksRef = useRef(historyWeeks);
  historyWeeksRef.current = historyWeeks;
  const [windowKey, setWindowKey] = useState(DEFAULT_WINDOW_KEY);
  const windowInitRef = useRef(false);
  const [coachVerdict, setCoachVerdict] = useState(null);
  const [maintenance, setMaintenance] = useState({ status: 'loading', authority: null });
  const [intake, setIntake] = useState(null);
  const [liftSets, setLiftSets] = useState([]);
  const [exercises, setExercises] = useState(null);

  // ── The entry form (new, measurements, or an edit in place) ──
  const [formMode, setFormMode] = useState(null); // null | 'weight' | 'measure' | 'edit'
  const [form, setForm] = useState(() => blankMetricForm(localDayKey()));
  const [editingEntry, setEditingEntry] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const readSafety = useCallback(() => {
    // Fail CLOSED: the RAW wellbeing key (never getWellbeingMode(), which
    // swallows a read error into 'unspecified' and would fail OPEN), a read
    // error becoming the 'read_failed' sentinel that the policy counts as calm.
    AsyncStorage.getItem(WELLBEING_KEY)
      .then((v) => v || 'unspecified')
      .catch(() => 'read_failed')
      .then((mode) => { if (mountedRef.current) setWellbeingMode(mode); });
    // The open ED-pattern flag: a read error becomes the truthy sentinel, which
    // the policy counts as an open flag.
    const flagRead = user?.id
      ? getOpenEdPatternFlag(user.id).catch(() => 'read_failed')
      : Promise.resolve(null);
    flagRead.then((flag) => { if (mountedRef.current) setEdFlag(flag ?? null); });
  }, [user?.id]);

  const loadAll = useCallback(async (weeksArg) => {
    const uid = user?.id;
    if (!uid) {
      setEntriesStatus('ready');
      setMaintenance({ status: 'ready', authority: null });
      return;
    }
    const weeks = weeksArg ?? historyWeeksRef.current;
    const now = Date.now();
    const rangeStartMs = rangeStartFor(now, weeks);
    const asRows = (rows) => (Array.isArray(rows) ? rows : []);
    let morningAll = [];
    try {
      // BM-5: the data for the range the screen shows, by DATE (a year for the
      // chart, further when the History is paged back), never the newest fifty
      // rows. The log table is read by `sinceMs` and probed for anything older;
      // morning_weights is one row a day, read whole and cut to the range here.
      const [logRows, olderProbe, morning, pref] = await Promise.all([
        getBodyMetricLog(uid, LOG_CAP, { sinceMs: rangeStartMs }),
        getBodyMetricLog(uid, 1, { untilMs: rangeStartMs }),
        getMorningWeights(uid, MORNING_CAP),
        AsyncStorage.getItem(WEIGHT_WINDOW_STORE_KEY).catch(() => null),
      ]);
      morningAll = asRows(morning);
      const inRange = morningAll.filter((r) => Number(r?.loggedAt) >= rangeStartMs);
      const dayEntries = buildDayEntries(asRows(logRows).map(logRowToEntry), inRange);
      const older = asRows(olderProbe).length > 0
        || morningAll.some((r) => Number(r?.loggedAt) < rangeStartMs && Number(r?.weightKg) > 0 && r?.deletedAt == null);
      if (!mountedRef.current) return;
      setClock(now);
      setEntries(dayEntries);
      setMorningRows(morningAll);
      setHasOlder(older);
      if (!windowInitRef.current) {
        // The saved window if it holds two weigh-ins, else the narrowest that
        // does; read with the data so the chart never draws one window and
        // then flips to another (BM-48).
        windowInitRef.current = true;
        setWindowKey(pickInitialWindowKey(
          weighInsOf(dayEntries), (w) => w.ms, WEIGHT_WINDOWS, pref || DEFAULT_WINDOW_KEY, now,
        ));
      }
      setEntriesStatus('ready');
    } catch (e) {
      logError('BodyMetricsScreen.loadEntries', e, { userId: uid });
      if (mountedRef.current) setEntriesStatus('error');
      return;
    }

    // The rest of the page, each read on its own: a failure hides that card's
    // content and says so, and never the weigh-ins above it.
    try {
      // Each secondary read fails on its own and says so in the log (N8).
      const quiet = (label, fallback) => (e) => { logError(`BodyMetricsScreen.loadAll.${label}`, e, { userId: uid }); return fallback; };
      const [summary, dbTargets, mirror, lastCoach, sets, ex] = await Promise.all([
        getRecentIntakeSummary(uid).catch(quiet('intake', null)),
        getNutritionTargets(uid).catch(quiet('targets', null)),
        AsyncStorage.getItem(NUTRITION_KEY).then((raw) => (raw ? JSON.parse(raw) : null)).catch(quiet('nutritionMirror', null)),
        getLatestCoachOutput(uid).catch(quiet('coachOutput', null)),
        // A year of sets is the most the recomposition read can use; a
        // failure just hides the strength line, never the body history.
        getWorkoutSetsSince(uid, now - 365 * DAY_MS).catch(quiet('sets', [])),
        // D218: the shared, unfiltered exercise lookup, as Lift Progress
        // reads it, so the strength line names a lift on a since-deleted
        // custom exercise or a retired id, with its own load rules.
        getExerciseLookup().catch(quiet('exercises', null)),
      ]);
      if (mountedRef.current) {
        setIntake(summary);
        setCoachVerdict(coachVerdictFromOutput(lastCoach));
        setLiftSets(asRows(sets));
        setExercises(ex ?? null);
      }
      // BM-14: the resolver's inputs through the ONE mapping every surface
      // uses (maintenanceInputs.js: stored body profile, latest body
      // composition WITH its source, saved targets). The saved targets come
      // from the database as on every other surface, the AsyncStorage mirror
      // only when there is no database row. A display surface never persists a
      // revalidation marker.
      const weights90 = morningAll.slice(-90);
      const inputs = await readMaintenanceInputs(uid, {
        userProfile: userProfileRef.current, weights: weights90, targets: dbTargets ?? mirror,
      });
      const authority = await resolveEffectiveMaintenanceForUser(uid, inputs, {
        weights: weights90, intake: summary ?? undefined, persistRevalidationMarker: false,
      });
      if (mountedRef.current) setMaintenance({ status: 'ready', authority });
    } catch (e) {
      logError('BodyMetricsScreen.loadMaintenance', e, { userId: uid });
      if (mountedRef.current) setMaintenance({ status: 'error', authority: null });
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      readSafety();
      (async () => {
        await migrateFromAsyncStorage(user?.id);
        await loadAll();
      })();
      return undefined;
    }, [readSafety, loadAll, user?.id]),
  );

  // ── Derived values ──
  const todayKey = useMemo(() => localDayKey(clock), [clock]);
  const thisWeekStart = useMemo(() => localWeekStartMs(clock), [clock]);
  // Weigh-ins only up to today, oldest first, each anchored at its day's noon.
  const weighIns = useMemo(() => weighInsOf(entries).filter((w) => w.dayKey <= todayKey), [entries, todayKey]);

  // The trend weight is the Progress root's own reading: the hook's windowing
  // (trendWindowRows: the real trailing 90 days, a weigh-in inside 14 days)
  // through the same smoother and the same deriveWeightTrend.
  const trendRead = useMemo(() => {
    const weights90 = morningRows.slice(-90);
    const windowed = trendWindowRows(weights90);
    const ewmaData = computeEWMA(windowed);
    const weeklyChange = computeWeeklyWeightChange(ewmaData);
    const lastWeighInMs = weights90.reduce((m, w) => {
      const at = Number(w?.loggedAt);
      return Number.isFinite(at) && at > m ? at : m;
    }, 0) || null;
    return { ewmaData, weeklyChange, lastWeighInMs };
  // `clock` re-reads the windows against the time of the latest load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morningRows, clock]);
  const adaptiveBurn = useMemo(() => {
    const resolved = maintenance.authority?.resolved;
    if (!resolved || resolved.source === 'formula_prior') return null;
    return {
      adjustedTDEE: resolved.effectiveMaintenanceKcal,
      confidence: resolved.status === 'current' ? 'high' : 'low',
      source: resolved.source,
      status: resolved.status,
    };
  }, [maintenance]);
  const weightTrendVm = useMemo(() => deriveWeightTrend({
    ewmaData: trendRead.ewmaData,
    weeklyChange: trendRead.weeklyChange,
    adaptiveBurn,
    edFlagOpen: policy.edFlagOpen,
    coachVerdict,
    lastWeighInMs: trendRead.lastWeighInMs,
    nowMs: clock,
  }), [trendRead, adaptiveBurn, policy.edFlagOpen, coachVerdict, clock]);
  const twoWeek = useMemo(() => twoWeekTrend(trendRead.ewmaData, clock), [trendRead, clock]);
  // The hero's name (closing review S2): "first weigh-in" only when it is the
  // person's only weigh-in ever; "latest weigh-in" when the trend's own 90-day
  // window holds one point but older weigh-ins exist; else the trend weight.
  const heroLabel = trendRead.ewmaData.length === 1
    ? (weighIns.length === 1 && !hasOlder ? 'first weigh-in' : 'latest weigh-in')
    : 'trend weight';

  // This week against last, the mornings weighed, the usual swing: every
  // weekly figure from the one helper over the one day-entry list.
  const week = useMemo(() => ({
    thisWeek: weekAverage(entries, thisWeekStart, { untilKey: todayKey }),
    lastWeek: weekAverage(entries, previousWeekStart(thisWeekStart)),
    mornings: morningsThisWeek(entries, clock),
  }), [entries, thisWeekStart, todayKey, clock]);
  const swing = useMemo(
    () => typicalDailySwingKg(
      weighIns.map((w) => ({ weightKg: w.kg, loggedAt: w.ms })),
      { nowMs: noonOfDay(todayKey) },
    ),
    [weighIns, todayKey],
  );

  // The chart: the trend over the weigh-ins, for the window shown (BM-5).
  const chart = useMemo(() => {
    const win = windowByKey(WEIGHT_WINDOWS, windowKey) ?? windowByKey(WEIGHT_WINDOWS, DEFAULT_WINDOW_KEY);
    const windowStartKey = localDayKey(clock - win.days * DAY_MS);
    // The smoother is seeded from at least 90 days, so the first point of a
    // short window is already smoothed (and the last point matches the trend
    // weight above whenever both read the same weigh-ins).
    const seedStartKey = localDayKey(Math.min(clock - win.days * DAY_MS, clock - 90 * DAY_MS));
    const seedSet = weighIns.filter((w) => w.dayKey >= seedStartKey);
    // The line's last point IS the trend weight above (closing review S2): the
    // smoother restarts where the hero's own series starts (the trailing 90
    // days, trendWindowRows), so older weigh-ins in a long window are smoothed
    // as their own segment and never carry memory into the figure the Progress
    // root prints.
    const heroStartKey = localDayKey(clock - 90 * DAY_MS);
    const smoothSegment = (segment) => {
      const smoothed = computeEWMA(segment.map((w) => ({ weightKg: w.kg, loggedAt: w.ms })));
      return segment.map((w, i) => ({ ...w, trend: smoothed[i]?.ewma ?? w.kg }));
    };
    const rows = [
      ...smoothSegment(seedSet.filter((w) => w.dayKey < heroStartKey)),
      ...smoothSegment(seedSet.filter((w) => w.dayKey >= heroStartKey)),
    ];
    const inWin = rows.filter((w) => w.dayKey >= windowStartKey);
    const count = inWin.length;
    if (count < 2) return { win, count, ready: false, rows: inWin };
    const first = inWin[0];
    const last = inWin[count - 1];
    // A window that crosses a year names the year, so "1 year" never reads
    // "17 Sep to 17 Sep" (review S2).
    const crossesYear = String(first.dayKey).slice(0, 4) !== String(last.dayKey).slice(0, 4);
    const fmtDate = crossesYear ? shortDateYear : shortDate;
    const fmtDay = crossesYear ? weekdayDateYear : weekdayDate;
    const spanDays = (last.ms - first.ms) / DAY_MS;
    const coversAll = !(hasOlder || weighIns.some((w) => w.dayKey < windowStartKey));
    const averageKg = inWin.reduce((s, w) => s + w.kg, 0) / count;
    const midT = (first.ms + last.ms) / 2;
    let midIdx = 0;
    let best = Infinity;
    inWin.forEach((w, i) => {
      const d = Math.abs(w.ms - midT);
      if (d < best) { best = d; midIdx = i; }
    });
    const labelIdx = new Set([0, count - 1]);
    if (count >= 3 && midIdx !== 0 && midIdx !== count - 1) labelIdx.add(midIdx);
    // The axis fits the window's data plus the person's typical swing (never
    // a fixed pad); it reads in kilograms for a stone user (A1, with a note).
    const axisKg = fittedAxis([...inWin.map((w) => w.kg), ...inWin.map((w) => w.trend)], swing ?? 0);
    const axisMin = weightChartValue(axisKg.min, bwu);
    const axisMax = weightChartValue(axisKg.max, bwu);
    const yTicks = niceAxisTicks(axisMin, axisMax);
    const gutter = axisGutterWidth(yTicks.map((v) => `${v} ${weightChartUnitLabel(bwu)}`));
    const takeaway = weightTakeaway({
      coversAll,
      from: first.dayKey,
      to: last.dayKey,
      count,
      averageKg,
      trendStartKg: first.trend,
      trendEndKg: last.trend,
      spanDays,
      formatWeight: (kg) => formatBodyWeight(kg, bwu),
      formatAmount: (kg) => formatWeightAmount(kg, bwu),
      formatRate: (kgPerWeek) => formatWeightRatePerWeek(kgPerWeek, bwu),
      formatDate: fmtDate,
      edFlagOpen: policy.edFlagOpen,
    });
    return {
      win,
      count,
      ready: true,
      rows: inWin,
      first,
      last,
      takeaway,
      fmtDay,
      axis: { min: axisMin, max: axisMax },
      yTicks,
      gutter,
      data: inWin.map((w, i) => ({
        value: weightChartValue(w.trend, bwu),
        t: w.ms,
        date: fmtDate(w.dayKey),
        label: labelIdx.has(i) ? fmtDate(w.dayKey) : '',
      })),
      data2: inWin.map((w) => ({ value: weightChartValue(w.kg, bwu), t: w.ms })),
      xTicks: weeklyTickTimes(first.ms, last.ms),
    };
  }, [weighIns, windowKey, clock, hasOlder, swing, bwu, policy.edFlagOpen]);

  const readings = useMemo(() => ({
    bodyFat: readingsOf(entries, 'body_fat'),
    sites: MEASUREMENTS
      .map((m) => ({ ...m, ...readingsOf(entries, m.key) }))
      .filter((r) => r.latest),
  }), [entries]);

  // Recomposition: suppressed by the policy, never by a gate of this screen's.
  const recompVm = useMemo(
    () => deriveRecomp(entries, liftSets, exercises, { suppressed: !policy.show.recomposition, nowMs: clock }),
    [entries, liftSets, exercises, policy.show.recomposition, clock],
  );

  const maintenanceVm = useMemo(
    () => (maintenance.authority ? maintenanceModel(maintenance.authority, { energyUnit, nowMs: clock }) : null),
    [maintenance, energyUnit, clock],
  );
  const intakeText = useMemo(() => intakeLine(intake, energyUnit), [intake, energyUnit]);

  const historyView = useMemo(
    () => groupEntriesByWeek(entries, { nowMs: clock, weeks: historyWeeks }),
    [entries, clock, historyWeeks],
  );
  const firstShownKey = useMemo(() => {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - 7 * Math.max(0, historyWeeks - 1));
    return localDayKey(d.getTime());
  }, [thisWeekStart, historyWeeks]);
  const canShowEarlier = hasOlder || hasEntryBefore(entries, firstShownKey);

  // The newest weigh-in of any kind, for the card when there is no trend weight.
  const lastWeighIn = useMemo(() => {
    const fromEntries = weighIns.length ? weighIns[weighIns.length - 1] : null;
    const newestRow = morningRows.length ? morningRows[morningRows.length - 1] : null;
    const rowMs = Number(newestRow?.loggedAt);
    if (fromEntries && (!Number.isFinite(rowMs) || fromEntries.ms >= rowMs)) {
      return { kg: fromEntries.kg, dayKey: fromEntries.dayKey, ms: fromEntries.entry.loggedAt };
    }
    if (newestRow && Number(newestRow.weightKg) > 0) {
      return { kg: Number(newestRow.weightKg), dayKey: localDayKey(rowMs), ms: rowMs };
    }
    return null;
  }, [weighIns, morningRows]);

  // Day zero is "no weigh-in the person made": the starting weight typed at
  // setup is a point of the series (its row keeps its real date and its note)
  // but not a morning weighed, so on its own it does not make a trend weight.
  // Its figure and date are what the card then shows, as what they are.
  const dayZero = useMemo(() => {
    const realInEntries = weighIns.some((w) => !w.entry.isEnrolmentSeed);
    const realInRows = morningRows.some((r) => r?.deletedAt == null && Number(r?.weightKg) > 0
      && String(r?.notes || '').trim() !== ENROLMENT_NOTE);
    if (realInEntries || realInRows) return null;
    const seeds = weighIns.filter((w) => w.entry.isEnrolmentSeed);
    const seed = seeds.length ? seeds[seeds.length - 1] : null;
    return { seed: seed ? { kg: seed.kg, ms: Number(seed.entry.loggedAt) } : null };
  }, [weighIns, morningRows]);

  // The replace notice, said BEFORE saving: a weigh-in typed for a day that
  // already holds one.
  const replaceText = useMemo(() => {
    if (!formMode) return null;
    const typed = bwu === 'st' ? !!form.body_weight_st : !!form.body_weight;
    if (!typed) return null;
    const existing = entries.find((e) => e.metric_date === form.metric_date
      && (!editingEntry || e.id !== editingEntry.id));
    return replaceNotice({ existing, todayKey, bwu });
  }, [formMode, form, bwu, entries, editingEntry, todayKey]);

  const onboardingWeightKg = userProfile?.weightKg ?? userProfile?.bodyWeightKg ?? null;

  // ── Actions ──
  const syncNow = useCallback(() => {
    if (session?.user?.id && user?.id) {
      syncAll({ userId: session.user.id, localUserId: user.id, triggeredBy: 'write' }).catch(() => {});
    }
  }, [session?.user?.id, user?.id]);

  const closeForm = useCallback(() => {
    setFormMode(null);
    setEditingEntry(null);
    setShowMore(false);
    setShowDatePicker(false);
    setForm(blankMetricForm(localDayKey()));
  }, []);

  function openNew(mode) {
    setEditingEntry(null);
    setForm(blankMetricForm(localDayKey()));
    setShowMore(mode === 'measure');
    setFormMode(mode);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }

  function openEdit(entry) {
    setForm(formFromEntry(entry, bwu, localDayKey()));
    setEditingEntry(entry);
    setShowMore(entry.source === 'body_metric_log' && READING_FIELDS.some((k) => entry[k] != null));
    setFormMode('edit');
  }

  function selectWindow(key) {
    setWindowKey(key);
    AsyncStorage.setItem(WEIGHT_WINDOW_STORE_KEY, key).catch(() => {});
    try { track(user?.id, 'chart_window_changed', { chart_id: 'weight', window: key })?.catch?.(() => {}); } catch (_) { /* best-effort telemetry */ }
  }

  function showEarlier() {
    const next = historyWeeks + HISTORY_PAGE_WEEKS;
    setHistoryWeeks(next);
    historyWeeksRef.current = next;
    // The loaded range already covers a year; paging back past it reads more.
    if (rangeStartFor(Date.now(), next) < rangeStartFor(Date.now(), historyWeeks)) loadAll(next);
  }

  function fireFirstWeighIn() {
    // Activation funnel (lead activation ruling, 2026-09-03): a genuine
    // deliberate weigh-in through this form, once per user, count only, never
    // the value. Never fired by the legacy migration or an edit.
    try {
      // eslint-disable-next-line global-require
      const { trackFirst } = require('../lib/telemetry/firsts');
      trackFirst(user.id, 'first_weigh_in').catch(() => {});
    } catch (_) { /* best-effort telemetry */ }
  }

  // A new entry on a day that already holds a log row REPLACES into it (a day
  // holds one weigh-in; the notice said so before saving). The row's other
  // readings stay unless the new entry carries its own.
  function replacementPayload(existing, data) {
    const payload = {
      loggedAt: data.loggedAt,
      weightKg: data.weightKg,
      bodyFatPercent: data.bodyFatPercent ?? existing.body_fat ?? null,
      bodyFatSource: data.bodyFatPercent != null
        ? data.bodyFatSource
        : (existing.body_fat != null ? existing.body_fat_source ?? null : null),
      notes: data.notes ?? (String(existing.notes || '').trim() || null),
    };
    for (const f of CIRCUMFERENCE_FIELDS) payload[f.dbField] = data[f.dbField] ?? existing[f.key] ?? null;
    return payload;
  }

  async function saveNew(data, dayKey) {
    const existing = entries.find((e) => e.metric_date === dayKey) ?? null;
    if (existing && existing.source === 'body_metric_log' && data.weightKg != null) {
      const ok = await updateBodyMetric(user.id, existing.id, replacementPayload(existing, data));
      if (!ok) throw new Error('updateBodyMetric: no live row matched');
    } else {
      await logBodyMetric(user.id, data);
    }
    if (data.weightKg != null) fireFirstWeighIn();
  }

  async function saveEdit(data, entry, newDayKey) {
    const dateChanged = newDayKey !== entry.metric_date;
    if (entry.source === 'body_metric_log') {
      // A body-fat figure left as it was, with the method control untouched,
      // keeps the method it was stored with: a setup-wizard 'dexa' is never
      // overwritten on a note edit, and a 'typed in' row never becomes 'best
      // estimate' because that is the control's seed (N4; D214 addendum 11). A
      // method the person changed on purpose is stored as chosen.
      const sameBodyFat = data.bodyFatPercent != null && Number(data.bodyFatPercent) === Number(entry.body_fat);
      const seededSource = BODY_FAT_METHODS.some((m) => m.value === entry.body_fat_source)
        ? entry.body_fat_source : DEFAULT_BODY_FAT_METHOD;
      const methodUntouched = !BODY_FAT_METHOD_CHOICE || data.bodyFatSource === seededSource;
      const payload = sameBodyFat && methodUntouched
        ? { ...data, bodyFatSource: entry.body_fat_source ?? 'manual' }
        : data;
      const ok = await updateBodyMetric(user.id, entry.id, payload);
      if (!ok) throw new Error('updateBodyMetric: no live row matched');
      if (dateChanged) {
        // The entry moved: the old day's weigh-in and any older rows of it go too.
        for (const id of entry.morningIds) await deleteMorningWeightById(user.id, id);
        for (const id of entry.logIds.filter((i) => i !== entry.id)) await deleteBodyMetric(user.id, id);
      }
      return;
    }
    // A Home weigh-in: it holds a weight, a date and a note.
    if (hasMoreThanWeight(data)) {
      // Adding body fat or measurements makes it the day's full entry.
      await logBodyMetric(user.id, data);
      if (dateChanged) for (const id of entry.morningIds) await deleteMorningWeightById(user.id, id);
      return;
    }
    const originalNote = String(entry.notes || '').trim() === 'enrolment' ? '' : String(entry.notes || '');
    const noteChanged = String(data.notes || '') !== originalNote;
    if (!dateChanged) {
      // BM-1: the weight is `data.weightKg` (the validator's key); the note
      // only when it was edited, so a setup marker is never cleared by a save
      // that did not touch the note.
      const ok = await updateMorningWeightById(user.id, entry.id, {
        weightKg: data.weightKg,
        ...(noteChanged ? { notes: data.notes } : {}),
      });
      if (!ok) throw new Error('updateMorningWeightById: no live row matched');
      return;
    }
    // Moved to another day: write it there first, then retract the old row.
    await logMorningWeight(user.id, {
      weightKg: data.weightKg, loggedAt: data.loggedAt, notes: noteChanged ? data.notes : (entry.notes ?? null),
    });
    for (const id of entry.morningIds) await deleteMorningWeightById(user.id, id);
  }

  async function runSave(data, entry) {
    setSaving(true);
    try {
      const dayKey = localDayKey(data.loggedAt);
      if (entry) await saveEdit(data, entry, dayKey);
      else await saveNew(data, dayKey);
      syncNow();
      closeForm();
      await loadAll();
      // A save or delete can raise or clear the ED flag: re-read it (N7).
      readSafety();
    } catch (e) {
      logError('BodyMetricsScreen.save', e, { editing: !!entry });
      toast.show("Couldn't save. Try again.", { variant: 'error' });
      await loadAll();
      // A save or delete can raise or clear the ED flag: re-read it (N7).
      readSafety();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  function saveEntry() {
    // DATA-001: one shared, pure save-gate; impossible values and future dates
    // are refused with a calm toast rather than stored.
    const result = validateBodyMetricForm(form, { bwu });
    if (!result.ok) {
      toast.show(result.message, { variant: 'warning' });
      return;
    }
    const data = result.data;
    const entry = formMode === 'edit' ? editingEntry : null;
    // A weigh-in entry keeps its weight (closing review S3): clearing the field
    // and saving used to leave the morning row behind, so the weigh-in stayed in
    // the history and the trend as if nothing had happened. Removal is the
    // delete path, with its own confirm.
    if (entry && Number(entry.body_weight) > 0 && data.weightKg == null) {
      toast.show('This entry holds a weigh-in, so a weight is needed. To remove the weigh-in, use Delete this entry.', { variant: 'warning' });
      return;
    }
    // A save that leaves the weight as shown keeps the stored figure.
    if (entry && data.weightKg != null && sameTypedWeight(data.weightKg, entry.body_weight, bwu)) {
      data.weightKg = entry.body_weight;
    }
    const weightChanged = !entry || !(Number(entry.body_weight) > 0) || data.weightKg !== entry.body_weight;
    const go = () => runSave(data, entry);
    // BM-40: a typed weight far from the last weigh-in is asked about first.
    if (data.weightKg != null && weightChanged) {
      const ref = plausibilityReference(entries, localDayKey(data.loggedAt));
      if (ref && weighInPlausibility(data.weightKg, ref.kg).implausible) {
        appAlert(
          'Check this weigh-in',
          plausibilityMessage({ kg: data.weightKg, lastKg: ref.kg, bwu, withholdFigures: policy.withhold }),
          [
            { text: 'Change it', style: 'cancel' },
            { text: 'Save anyway', onPress: go },
          ],
        );
        return;
      }
    }
    go();
  }

  function confirmDelete(entry) {
    const hasWeight = Number(entry.body_weight) > 0;
    const hasMore = READING_FIELDS.some((k) => entry[k] != null);
    let message = 'This removes the weigh-in from your history and your trend.';
    if (hasWeight && hasMore) {
      message = 'This removes the weigh-in and the measurements logged that day from your history, and the weigh-in from your trend.';
    } else if (!hasWeight) {
      message = 'This removes the measurements logged that day from your history.';
    }
    appAlert(
      'Delete this entry?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry) },
      ],
    );
  }

  async function deleteEntry(entry) {
    try {
      // BM-2: the day's weigh-in leaves the history AND the trend. The log rows
      // are tombstoned (so the delete syncs) and so is the day's morning
      // weight, through the existing deleteMorningWeightById.
      let removed = false;
      for (const id of entry.logIds) {
        if (await deleteBodyMetric(user.id, id)) removed = true;
      }
      if (Number(entry.body_weight) > 0) {
        for (const id of entry.morningIds) {
          if (await deleteMorningWeightById(user.id, id)) removed = true;
        }
      }
      if (!removed) throw new Error('delete: no live row matched');
      syncNow();
      toast.show('Entry deleted.', { variant: 'success' });
      closeForm();
    } catch (e) {
      logError('BodyMetricsScreen.deleteEntry', e, { entryId: entry.id });
      toast.show("Couldn't delete. Try again.", { variant: 'error' });
    }
    await loadAll();
    // A save or delete can raise or clear the ED flag: re-read it (N7).
    readSafety();
  }

  // ── Before the safety reads have returned, nothing below the header (ED-C) ──
  if (!policy.ready) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Body metrics" />
      </SafeAreaView>
    );
  }

  // Calmer experience: gentle re-confirmation once per app session. The
  // policy's withholds apply after it.
  if (policy.calm && !sessionConfirmed) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Body metrics" />
        <ScrollView contentContainerStyle={styles.optInContent}>
          <View style={[styles.confirmCard, live.confirmCard]}>
            <Ionicons name="leaf-outline" size={32} color={t.colors.textSecondary} />
            <Text style={[styles.confirmTitle, live.confirmTitle]}>A gentle pause</Text>
            <Text style={[styles.confirmBody, live.confirmBody]}>
              You asked for a calmer experience. Body measurements can be a
              sensitive space. Open it only if it feels right for you today.
            </Text>
            <Button
              title="Continue"
              onPress={() => {
                bodyMetricsSessionConfirmed = true;
                setSessionConfirmed(true);
              }}
              accessibilityLabel="Continue"
              size="lg"
              style={styles.confirmBtn}
            />
            <Text style={[styles.confirmHelpline, live.confirmHelpline]}>{WELLBEING_HELPLINE}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render helpers: plain functions, never components declared here, so a
  // TextInput keeps one identity across keystrokes (innerComponentRemount). ──

  function titleRow(title, info) {
    return (
      <View style={styles.titleRow}>
        <SectionLabel heading>{title}</SectionLabel>
        {info ? <InfoTooltip text={info} size={14} /> : null}
      </View>
    );
  }

  function errorCard(title, what) {
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow(title)}
        <Text style={live.bodySm}>{readErrorLine(what)}</Text>
        <Button
          title="Try again"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => loadAll()}
          accessibilityLabel={`Try loading your ${what} again`}
        />
      </Card>
    );
  }

  function renderThisWeek() {
    if (entriesStatus === 'loading') return <SkeletonCard height={190} />;
    if (entriesStatus === 'error') return errorCard('This week', 'weigh-ins');

    // The verdict's slot: the policy's own line when set, else the coach's
    // fresh sentence, else the two-week direction with its rate, else the
    // denominator that says how far from a direction the person is.
    const coachLine = coachVerdictInsight(coachVerdict, clock);
    let verdict = null;
    if (policy.line) verdict = policy.line;
    else if (policy.show.verdict) {
      if (weightTrendVm.lapsed) verdict = weightTrendVm.insight;
      else if (coachLine && weightTrendVm.insight === coachLine) verdict = weightTrendVm.insight;
      else verdict = twoWeekVerdictLine(twoWeek, bwu) ?? notEnoughForDirectionLine(twoWeek);
    }
    const hasTrend = weightTrendVm.render && !weightTrendVm.lapsed && weightTrendVm.ewmaNow != null;

    let body;
    if (!dayZero && hasTrend) {
      const comparison = policy.show.weekComparison
        ? weekComparisonLine({ thisWeek: week.thisWeek, lastWeek: week.lastWeek, bwu }) : null;
      const noise = policy.show.noiseLine ? noiseLine(swing, bwu) : null;
      body = (
        <>
          {policy.show.trendWeight ? (
            <View style={styles.hero}>
              <Text style={live.heroNumber}>{formatBodyWeight(weightTrendVm.ewmaNow, bwu)}</Text>
              <View style={styles.heroLabelRow}>
                <Text style={live.heroLabel}>{heroLabel}</Text>
                <InfoTooltip text={TREND_WEIGHT_INFO} size={14} />
              </View>
              {policy.show.morningsCount ? <Text style={live.bodySm}>{morningsCaption(week.mornings)}</Text> : null}
            </View>
          ) : null}
          {verdict ? <Text style={live.body}>{verdict}</Text> : null}
          {comparison ? <Text style={live.bodySm}>{comparison}</Text> : null}
          {noise ? <Text style={live.bodySm}>{noise}</Text> : null}
        </>
      );
    } else if (!dayZero && lastWeighIn) {
      // A trend that has lapsed has no figure; the last weigh-in is still the
      // person's own number, named as what it is.
      let lapsed = verdict;
      if (!policy.line && policy.show.verdict && !weightTrendVm.lapsed) {
        lapsed = lastWeighIn.ms < clock - 14 * DAY_MS
          ? lapsedInsight(lastWeighIn.ms, clock)
          : notEnoughForDirectionLine({ count: 0 });
      }
      body = (
        <>
          {policy.show.trendWeight ? (
            <View style={styles.hero}>
              <Text style={live.heroNumber}>{formatBodyWeight(lastWeighIn.kg, bwu)}</Text>
              <Text style={live.heroLabel}>{lastWeighInCaption(lastWeighIn.dayKey)}</Text>
            </View>
          ) : null}
          {lapsed ? <Text style={live.body}>{lapsed}</Text> : null}
        </>
      );
    } else {
      // Day zero: no weigh-in is made up. The setup weight is shown as what it
      // is, from its own row when there is one (its real date), else from the
      // profile it was typed into.
      const starting = dayZero?.seed
        ? startingWeightLine({ kg: dayZero.seed.kg, ms: dayZero.seed.ms, bwu })
        : startingWeightLine({ kg: onboardingWeightKg, ms: Number(profileStamps?.weightKg), bwu });
      body = policy.show.trendWeight ? (
        <>
          <Text style={live.heroDayZero}>{starting ?? 'No weigh-ins yet.'}</Text>
          <Text style={live.bodySm}>{DAY_ZERO_LINE}</Text>
        </>
      ) : null;
    }
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow('This week')}
        {body}
      </Card>
    );
  }

  function dateLabelFor(dayKey) {
    if (dayKey === todayKey) return 'Today';
    const sameYear = String(dayKey).slice(0, 4) === todayKey.slice(0, 4);
    return `${weekdayDate(dayKey)}${sameYear ? '' : ` ${String(dayKey).slice(0, 4)}`}`;
  }

  // The label column of a form row: one width, so every field starts at the same edge.
  function rowLabel(text) {
    return (
      <View style={styles.rowLabel}>
        <Text style={live.formLabel}>{text}</Text>
      </View>
    );
  }

  function unitField({ value, onChangeText, label, unit, keyboardType, maxLength, flex = true }) {
    return (
      <View style={[styles.unitField, flex ? styles.unitFieldFlex : null]}>
        <TextField
          containerStyle={styles.fieldContainer}
          fieldStyle={styles.field}
          inputStyle={styles.fieldText}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          accessibilityLabel={label}
        />
        <Text style={live.unitText}>{unit}</Text>
      </View>
    );
  }

  function renderEntryForm({ inline = false } = {}) {
    const editing = formMode === 'edit';
    const title = editing ? 'Edit weigh-in' : (formMode === 'measure' ? 'Add measurements' : 'Log weight');
    const content = (
      <View style={styles.formBody}>
        <Text style={live.formTitle}>{title}</Text>

        <View style={styles.formRow}>
          {rowLabel('Date')}
          <TouchableOpacity
            style={[styles.dateField, live.dateField]}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Date, ${dateLabelFor(form.metric_date)}. Change the date.`}
          >
            <Text style={live.dateText}>{dateLabelFor(form.metric_date)}</Text>
            <Ionicons name="calendar-outline" size={iconSize.sm} color={t.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          {rowLabel('Weight')}
          {bwu === 'st' ? (
            <View style={styles.weightInputs}>
              {unitField({
                value: form.body_weight_st,
                onChangeText: (v) => setForm((f) => ({ ...f, body_weight_st: v })),
                label: 'Weight, stone',
                unit: 'st',
                keyboardType: 'number-pad',
                maxLength: 3,
              })}
              {unitField({
                value: form.body_weight_st_lbs,
                onChangeText: (v) => setForm((f) => ({ ...f, body_weight_st_lbs: v })),
                label: 'Weight, pounds',
                unit: 'lbs',
                keyboardType: 'decimal-pad',
                maxLength: 4,
              })}
            </View>
          ) : (
            unitField({
              value: form.body_weight,
              onChangeText: (v) => setForm((f) => ({ ...f, body_weight: v })),
              label: `Weight in ${bwu === 'kg' ? 'kilograms' : 'pounds'}`,
              unit: bwu,
              keyboardType: 'decimal-pad',
            })
          )}
        </View>

        {replaceText ? <Text style={live.noticeText}>{replaceText}</Text> : null}

        <View style={styles.noteBlock}>
          <Text style={live.formLabel}>Note</Text>
          <TextField
            containerStyle={styles.noteContainer}
            fieldStyle={styles.noteField}
            inputStyle={styles.noteText}
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Shown beside this weigh-in in your history"
            placeholderTextColor={t.colors.textMuted}
            multiline
            accessibilityLabel="Note"
          />
        </View>

        {showMore ? (
          <View style={styles.moreBlock}>
            <View style={styles.formRow}>
              {rowLabel('Body fat')}
              {unitField({
                value: form.body_fat,
                onChangeText: (v) => setForm((f) => ({ ...f, body_fat: v })),
                label: 'Body fat percentage',
                unit: '%',
                keyboardType: 'decimal-pad',
                maxLength: 4,
              })}
            </View>
            {/* The method row, as the setup wizard asks it (BODY_FAT_METHOD_CHOICE, founder 2026-10-02). */}
            {form.body_fat && BODY_FAT_METHOD_CHOICE ? (
              <View style={styles.methodBlock}>
                <View style={styles.titleRow}>
                  <Text style={live.formLabel}>How it was measured</Text>
                  <InfoTooltip text={GLOSSARY.bodyFatMethod} size={13} />
                </View>
                <SegmentedControl
                  options={BODY_FAT_METHODS}
                  value={form.body_fat_source}
                  onChange={(v) => setForm((f) => ({ ...f, body_fat_source: v }))}
                  accessibilityLabel="Body fat method"
                  equalWidth={false}
                />
              </View>
            ) : null}
            <View style={styles.titleRow}>
              <Text style={live.formLabel}>Measurements</Text>
              <InfoTooltip text={MEASURE_HOW_INFO} size={13} />
            </View>
            {MEASUREMENTS.map((m) => (
              <View key={m.key} style={styles.formRow}>
                {rowLabel(m.label)}
                {unitField({
                  value: form[m.key],
                  onChangeText: (v) => setForm((f) => ({ ...f, [m.key]: v })),
                  label: `${m.label} in centimetres`,
                  unit: 'cm',
                  keyboardType: 'decimal-pad',
                })}
              </View>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.moreToggle, live.moreToggle]}
            onPress={() => setShowMore(true)}
            accessibilityRole="button"
            accessibilityLabel="Add body fat and measurements"
          >
            <Text style={live.moreToggleText}>Add body fat and measurements</Text>
            <Ionicons name="chevron-down" size={16} color={t.colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.formButtons}>
          <Button
            title={editing ? 'Save changes' : 'Save'}
            onPress={saveEntry}
            disabled={saving}
            loading={saving}
            style={styles.formBtn}
            accessibilityLabel={editing ? 'Save changes' : 'Save entry'}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={closeForm}
            disabled={saving}
            style={styles.formBtn}
            accessibilityLabel="Cancel"
          />
        </View>
        {editing && editingEntry ? (
          <Button
            title="Delete this entry"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => confirmDelete(editingEntry)}
            disabled={saving}
            accessibilityLabel="Delete this entry"
          />
        ) : null}
      </View>
    );
    return inline ? content : <Card padding="lg" style={styles.card}>{content}</Card>;
  }

  function renderActions() {
    if (!policy.show.actions) return null;
    if (formMode === 'weight' || formMode === 'measure') return renderEntryForm();
    return (
      <View style={styles.actionRow}>
        <Button
          title="Log weight"
          icon="add-circle"
          style={styles.actionBtn}
          onPress={() => openNew('weight')}
          accessibilityLabel="Log weight"
        />
        <Button
          title="Add measurements"
          variant="secondary"
          style={styles.actionBtn}
          onPress={() => openNew('measure')}
          accessibilityLabel="Add measurements"
        />
      </View>
    );
  }

  function renderTrend() {
    if (!policy.show.chart) return null;
    // A window is named only once there is a series to window (day zero and a
    // single weigh-in read plain "Trend", never "last year" over nothing).
    const heading = weighIns.length >= 2 ? trendTitle(windowKey) : 'Trend';
    if (entriesStatus === 'loading') return <SkeletonCard height={300} />;
    if (entriesStatus === 'error') return errorCard(heading, 'trend');
    const unit = weightChartUnitLabel(bwu);
    const chartWidth = windowWidth - spacing.lg * 2 - spacing.lg * 2;
    const summary = chart.ready
      ? (policy.show.takeaway && chart.takeaway
        ? `${heading}. ${chart.takeaway}`
        : `${heading}. ${chart.count} weigh-ins from ${shortDate(chart.first.dayKey)} to ${shortDate(chart.last.dayKey)}.`)
      : heading;
    const note = chartUnitNote(bwu);
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow(heading, trendInfo(bwu, { includeSteady: policy.show.takeaway }))}
        {weighIns.length >= 2 ? (
          <View style={styles.chipRow} accessibilityRole="tablist">
            {WEIGHT_WINDOWS.map((w) => (
              <Chip
                key={w.key}
                label={w.label}
                selected={w.key === windowKey}
                onPress={() => selectWindow(w.key)}
                accessibilityRole="tab"
                accessibilityLabel={`weight trend window: ${w.label}`}
                numberOfLines={1}
                // The card's own window control is drawn in ink when selected, so
                // Log weight is the one amber on the screen (addendum 9, the amber
                // rule as written; the mockup follows).
                style={[styles.windowChip, w.key === windowKey && live.chipInkSelected]}
                selectedLabelStyle={live.chipTextInkSelected}
              />
            ))}
          </View>
        ) : null}
        {chart.ready ? (
          <>
            <View style={styles.chartWrap}>
              <VolyumeChart
                data={chart.data}
                data2={chart.data2}
                dots2
                width={chartWidth}
                height={160}
                color={t.colors.textPrimary}
                color2={t.colors.textMuted}
                thickness={2}
                curved={false}
                min={chart.axis.min}
                max={chart.axis.max}
                sections={3}
                yTicks={chart.yTicks}
                yAxisWidth={chart.gutter}
                yAxisSuffix={` ${unit}`}
                xTicks={chart.xTicks}
                showViewData={false}
                backgroundColor={t.colors.surface}
                interactive
                accessibilityLabel={summary}
                formatTooltip={(i) => {
                  const w = chart.rows[i];
                  if (!w) return null;
                  return {
                    title: weightChartTooltipTitle(w.kg, bwu),
                    sub: `${(chart.fmtDay ?? weekdayDate)(w.dayKey)} · trend ${weightChartValue(w.trend, bwu).toFixed(1)} ${unit}`,
                  };
                }}
              />
            </View>
            <LegendRow
              items={[
                { key: 'trend', label: 'Trend', swatch: { fill: t.colors.textPrimary } },
                { key: 'weighins', label: 'Weigh-ins', swatch: { fill: t.colors.textMuted } },
              ]}
            />
            {note ? <Text style={live.caption}>{note}</Text> : null}
            {policy.show.takeaway && chart.takeaway ? <Text style={live.bodySm}>{chart.takeaway}</Text> : null}
          </>
        ) : (
          <Text style={live.bodySm}>
            {weighIns.length < 2
              ? 'The chart starts once you have two weigh-ins.'
              : 'Fewer than two weigh-ins fall in this window.'}
          </Text>
        )}
      </Card>
    );
  }

  function renderCalories() {
    if (!policy.show.maintenance) return null;
    if (maintenance.status === 'loading') return <SkeletonCard height={150} />;
    if (maintenance.status === 'error') {
      return (
        <Card padding="lg" style={styles.card}>
          {titleRow(MAINTENANCE_TITLE, MAINTENANCE_INFO)}
          <Text style={live.bodySm}>{readErrorLine('maintenance estimate')}</Text>
        </Card>
      );
    }
    if (!maintenanceVm) return null;
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow(MAINTENANCE_TITLE, MAINTENANCE_INFO)}
        {maintenanceVm.figure ? (
          <View style={styles.hero}>
            <View style={styles.figureRow}>
              <Text style={live.heroNumber}>{maintenanceVm.figure.number}</Text>
              <Text style={live.figureUnit}>{maintenanceVm.figure.unit}</Text>
            </View>
            <Text style={live.bodySm}>{maintenanceVm.figure.estimated}</Text>
          </View>
        ) : null}
        <Text style={live.body}>{maintenanceVm.line}</Text>
        {policy.show.intake && intakeText ? <Text style={live.bodySm}>{intakeText}</Text> : null}
      </Card>
    );
  }

  function renderRecomposition() {
    if (!policy.show.recomposition || !recompVm.render) return null;
    const lines = recompLines(recompVm, units);
    const shareParams = buildRecompShareParams(recompVm, units);
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow('Recomposition', GLOSSARY.recomposition)}
        {lines.map((line, i) => (
          <Text key={line} style={i === 0 ? live.bodyStrong : live.body}>{line}</Text>
        ))}
        {shareParams ? (
          <TouchableOpacity
            style={[styles.shareRow, live.shareRow]}
            onPress={() => navigation.navigate('ShareCard', { milestoneData: shareParams })}
            accessibilityRole="button"
            accessibilityLabel="Create share image"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="image-outline" size={16} color={t.colors.textSecondary} />
            <Text style={live.shareText}>Create share image</Text>
          </TouchableOpacity>
        ) : null}
      </Card>
    );
  }

  function readingRow({ key, label, value, unit, latest, previous, detail, changeUnit }) {
    const change = policy.show.measurementChange ? readingChangeLine(latest, previous, changeUnit) : null;
    return (
      <View key={key} style={styles.readingRow}>
        <View style={styles.readingHead}>
          <Text style={live.readingLabel}>{label}</Text>
          <Text style={live.readingValue}>{`${value}${unit}`}</Text>
        </View>
        <Text style={live.caption}>{detail}</Text>
        {change ? <Text style={live.bodySm}>{change}</Text> : null}
      </View>
    );
  }

  function renderReadings() {
    if (!policy.show.measurements || entriesStatus !== 'ready') return null;
    const { bodyFat, sites } = readings;
    if (!bodyFat.latest && !sites.length) return null;
    return (
      <Card padding="lg" style={styles.card}>
        {titleRow('Body fat and measurements')}
        {bodyFat.latest ? readingRow({
          key: 'body_fat',
          label: 'Body fat',
          value: String(Math.round(bodyFat.latest.value * 10) / 10),
          unit: '%',
          latest: bodyFat.latest,
          previous: bodyFat.previous,
          changeUnit: '%',
          detail: [
            shortDate(bodyFat.latest.metric_date),
            BODY_FAT_METHOD_LABELS[bodyFat.latest.entry.body_fat_source] ?? null,
          ].filter(Boolean).join(' · '),
        }) : null}
        {sites.map((s) => readingRow({
          key: s.key,
          label: s.label,
          value: String(Math.round(s.latest.value * 10) / 10),
          unit: ' cm',
          latest: s.latest,
          previous: s.previous,
          changeUnit: 'cm',
          detail: shortDate(s.latest.metric_date),
        }))}
      </Card>
    );
  }

  function renderHistoryRow(entry) {
    if (formMode === 'edit' && editingEntry?.id === entry.id) {
      return <View key={entry.id} style={styles.inlineForm}>{renderEntryForm({ inline: true })}</View>;
    }
    const title = historyRowTitle(entry, bwu);
    const detail = historyRowDetail(entry, SITE_LABELS);
    const note = noteForDisplay(entry);
    return (
      <TouchableOpacity
        key={entry.id}
        style={[styles.historyRow, live.historyRow]}
        onPress={() => openEdit(entry)}
        accessibilityRole="button"
        accessibilityLabel={`Edit weigh-in. ${title.replace(' · ', ', ')}${note ? `. ${note}` : ''}`}
      >
        <View style={styles.historyText}>
          <Text style={live.historyTitle}>{title}</Text>
          {detail ? <Text style={live.caption}>{detail}</Text> : null}
          {note ? <Text style={live.bodySm}>{note}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>
    );
  }

  function renderHistory() {
    if (!policy.show.history) return null;
    if (entriesStatus === 'loading') return <SkeletonCard height={220} />;
    if (entriesStatus === 'error') return errorCard('History', 'history');
    const { groups, future } = historyView;
    if (!groups.length && !future.length && !canShowEarlier) return null;
    return (
      <View style={styles.section}>
        <SectionLabel heading>History</SectionLabel>
        {future.length ? (
          <Card padding="md" style={styles.card}>
            <Text style={live.groupHeader}>Future dates</Text>
            {future.map(renderHistoryRow)}
          </Card>
        ) : null}
        {groups.map((g) => (
          <Card key={g.key} padding="md" style={styles.card}>
            <Text style={live.groupHeader}>
              {weekGroupHeader({
                weekStartMs: g.weekStartMs, count: g.count, averageKg: g.averageKg, open: g.open, bwu,
                withholdAverage: policy.withhold,
              })}
            </Text>
            {g.entries.map(renderHistoryRow)}
          </Card>
        ))}
        {!groups.length && !future.length ? (
          <Text style={live.bodySm}>No entries in these weeks.</Text>
        ) : null}
        {canShowEarlier ? (
          <Button
            title="Show earlier weeks"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={showEarlier}
            accessibilityLabel="Show earlier weeks"
          />
        ) : null}
      </View>
    );
  }

  function renderDoors() {
    return (
      <NavGroup>
        <NavRow
          icon="camera-outline"
          label="Progress photos"
          sub="Private to this device"
          onPress={() => navigation.navigate('ProgressPhotos')}
        />
        <NavRow
          icon="scale-outline"
          label="Weight units"
          sub={`Shown in ${bwu === 'st' ? 'stones and pounds' : (bwu === 'lbs' ? 'pounds' : 'kilograms')}`}
          // SettingsWorkout lives in ProfileTab; a bare navigate from the
          // Progress stack is the F4 dead-tap class.
          onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'SettingsWorkout')}
        />
      </NavGroup>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Body metrics" />
      {/* L03-C5 (2026-07-09 design audit): the app's KeyboardAvoidingView
          pattern, so the entry form's fields stay reachable above the keyboard. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          // A2 (pre-release sweep 2026-07-27): without this, a tap on a button
          // while a field is focused only dismisses the keyboard.
          keyboardShouldPersistTaps="handled"
        >
          {renderThisWeek()}
          {renderActions()}
          {renderTrend()}
          {renderCalories()}
          {renderRecomposition()}
          {renderReadings()}
          {renderHistory()}
          {renderDoors()}
        </ScrollView>
      </KeyboardAvoidingView>
      <PhotoDatePicker
        visible={showDatePicker}
        valueMs={noonOfDay(form.metric_date)}
        onChange={(ms) => setForm((f) => ({ ...f, metric_date: localDayKey(ms) }))}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  optInContent: { padding: spacing.lg },
  confirmCard: {
    borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, gap: spacing.md, alignItems: 'flex-start',
  },
  confirmTitle: {},
  confirmBody: {},
  confirmBtn: { marginTop: spacing.sm },
  confirmHelpline: { marginTop: spacing.sm },

  card: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hero: { gap: spacing.xxs },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },

  formBody: { gap: spacing.md },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // One label column, so every field of the form starts at the same edge.
  rowLabel: { width: FORM_LABEL_WIDTH },
  dateField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: touchTarget.minimum, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1,
  },
  weightInputs: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  unitField: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unitFieldFlex: { flex: 1 },
  fieldContainer: { flex: 1 },
  field: { borderRadius: radius.sm, minHeight: touchTarget.minimum },
  fieldText: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  noteBlock: { gap: spacing.xs },
  noteContainer: { gap: 0 },
  noteField: { minHeight: NOTE_FIELD_MIN_HEIGHT },
  noteText: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: NOTE_FIELD_MIN_HEIGHT, textAlignVertical: 'top',
  },
  moreBlock: { gap: spacing.md },
  methodBlock: { gap: spacing.xs },
  moreToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderTopWidth: 1,
  },
  formButtons: { flexDirection: 'row', gap: spacing.sm },
  formBtn: { flex: 1 },
  inlineForm: { paddingVertical: spacing.sm },

  chipRow: { flexDirection: 'row', gap: spacing.xs },
  windowChip: {
    flex: 1, alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: spacing.xs,
  },
  chartWrap: { marginHorizontal: -spacing.xs },

  shareRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs,
    minHeight: touchTarget.minimum, borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: spacing.sm, marginTop: spacing.xs,
  },

  readingRow: { gap: spacing.xxs, paddingVertical: spacing.xs },
  readingHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },

  section: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: touchTarget.minimum, paddingVertical: spacing.sm, gap: spacing.sm,
    borderTopWidth: 1,
  },
  historyText: { flex: 1, gap: spacing.xxs },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above carries
// layout and spacing at rest; every colour and type role is read from the live
// theme here, so the screen follows dark, light, higher-contrast and
// colour-blind-safe without a restart. Amber appears once on this screen, on
// the "Log weight" action (Button's own primary treatment); facts are ink.
function buildLiveStyles(t) {
  const c = t.colors;
  const ty = t.type;
  return {
    safe: { backgroundColor: c.background },
    confirmCard: { backgroundColor: c.surface, borderColor: c.border },
    confirmTitle: { ...ty.h3, color: c.textPrimary },
    confirmBody: { ...ty.bodySm, color: c.textSecondary },
    confirmHelpline: { ...ty.caption, color: c.textMuted },

    heroNumber: { ...ty.num('h2'), color: c.textPrimary },
    heroLabel: { ...ty.bodyStrong, color: c.textPrimary },
    chipInkSelected: { backgroundColor: c.surface3, borderColor: c.textPrimary },
    chipTextInkSelected: { color: c.textPrimary },
    heroDayZero: { ...ty.bodyStrong, color: c.textPrimary },
    figureUnit: { ...ty.bodyStrong, color: c.textPrimary },
    body: { ...ty.body, color: c.textPrimary },
    bodyStrong: { ...ty.bodyStrong, color: c.textPrimary },
    bodySm: { ...ty.bodySm, color: c.textSecondary },
    caption: { ...ty.caption, color: c.textMuted },

    formTitle: { ...ty.title, color: c.textPrimary },
    formLabel: { ...ty.bodySm, color: c.textSecondary },
    unitText: { ...ty.bodySm, color: c.textSecondary },
    noticeText: { ...ty.bodySm, color: c.textPrimary },
    dateField: { backgroundColor: c.surface2, borderColor: c.border },
    dateText: { ...ty.bodyStrong, color: c.textPrimary },
    moreToggle: { borderTopColor: c.border },
    moreToggleText: { ...ty.bodySm, color: c.textSecondary },

    shareRow: { borderColor: c.border, backgroundColor: c.surface2 },
    shareText: { ...ty.label, color: c.textPrimary },

    readingLabel: { ...ty.bodyStrong, color: c.textPrimary },
    readingValue: { ...ty.num('bodyStrong'), color: c.textPrimary },

    groupHeader: { ...ty.label, color: c.textSecondary },
    historyRow: { borderTopColor: c.borderSubtle },
    historyTitle: { ...ty.num('bodyStrong'), color: c.textPrimary },
  };
}
