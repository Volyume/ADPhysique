import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';

// date-fns format() throws "Invalid time value" if given an Invalid Date.
// Body-metric rows pulled from older cloud snapshots occasionally have a
// missing or malformed metric_date, which used to take the whole screen
// down. Guard at the call site rather than letting one bad row crash a
// histogram of 30 good ones.
function safeFormatDate(value, fmt) {
  try {
    if (!value) return '';
    const d = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (!d || isNaN(d.getTime())) return '';
    return format(d, fmt);
  } catch (_) {
    return '';
  }
}
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import VolyumeChart from '../components/VolyumeChart';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import { useToast } from '../components/Toast';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logBodyMetric, updateBodyMetric, deleteBodyMetric, getBodyMetricLog, getMorningWeights, getOpenEdPatternFlag, getWorkoutSetsSince, getAllExercises } from '../lib/database';
import { appAlert } from '../components/AppAlert';
import { deriveRecomp, buildRecompShareParams } from '../lib/recompReframe';
import { localDayKey } from '../lib/dayKey';
import WindowChips from '../components/WindowChips';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import {
  TREND_WINDOWS, DEFAULT_WINDOW_KEY, windowByKey, filterByWindow,
  pickInitialWindowKey, weightTakeaway,
} from '../lib/chartWindows';
import { track } from '../lib/engineTelemetry';
import { getRecentIntakeSummary } from '../lib/food/db';
import { syncAll } from '../lib/sync';
import { computeEWMA, ewmaValues, computeWeeklyWeightChange, computeAdaptiveTDEEAdjustment } from '../lib/nutritionEngine';
import { robustValues } from '../lib/robustTrend';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { formatBodyWeight, formatBodyWeightShort, kgToStoneLbsStrings, kgToLbs } from '../lib/units';
import { isCalm, WELLBEING_HELPLINE, WELLBEING_KEY } from '../lib/wellbeing';
import { validateBodyMetricForm } from '../lib/bodyMetricValidate';
import { mergeMorningWeightsIntoHistory } from '../lib/bodyMetricsHistoryMerge';

const PHYSIQUE_PREF_KEY = '@volyume_physique_tracking_enabled';

// Resets when the app process restarts → "re-confirmation each session".
let bodyMetricsSessionConfirmed = false;

// form key  →  logBodyMetric() data field
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

function rowToEntry(row) {
  return {
    id: row.id,
    // TZ-1: local calendar day, matching morning-weight buckets.
    metric_date: localDayKey(new Date(row.loggedAt ?? row.createdAt ?? Date.now()).getTime()),
    body_weight: row.weightKg ?? null,
    body_fat:    row.bodyFatPercent ?? null,
    chest:       row.chestCm ?? null,
    shoulders:   row.shouldersCm ?? null,
    arms:        row.armCm ?? null,
    forearms:    row.forearmCm ?? null,
    waist:       row.waistCm ?? null,
    hips:        row.hipsCm ?? null,
    quads:       row.thighCm ?? null,
    hamstrings:  row.hamCm ?? null,
    calves:      row.calfCm ?? null,
    notes:       row.notes ?? '',
    // BUG-WEIGHT-HISTORY (2026-07-11): tags the row's writable table so
    // edit/delete (which only know how to reach body_metric_log via
    // updateBodyMetric/deleteBodyMetric) never fire on a merged-in
    // morning_weights row (see morningWeightToEntry below).
    source: 'body_metric_log',
  };
}

// BUG-WEIGHT-HISTORY (2026-07-11): see src/lib/bodyMetricsHistoryMerge.js for
// the root-cause note and the merge itself, split into a dependency-free lib
// module so it's unit-testable without mounting this screen (which pulls in
// react-native-svg via VolyumeChart).

// D16 (NAV-2): shared blank-form shape, reused for a fresh "New entry" and
// for closing an in-progress edit (never left holding a stale entry's data).
function blankMetricForm() {
  return {
    body_weight: '', body_weight_st: '', body_weight_st_lbs: '0', body_fat: '',
    chest: '', shoulders: '', arms: '', forearms: '',
    waist: '', hips: '', quads: '', hamstrings: '', calves: '',
    metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  };
}

const MEASUREMENTS = [
  { key: 'chest',       label: 'Chest' },
  { key: 'shoulders',   label: 'Shoulders' },
  { key: 'arms',        label: 'Arms (flex)' },
  { key: 'forearms',    label: 'Forearms' },
  { key: 'waist',       label: 'Waist' },
  { key: 'hips',        label: 'Hips' },
  { key: 'quads',       label: 'Quads' },
  { key: 'hamstrings',  label: 'Hamstrings' },
  { key: 'calves',      label: 'Calves' },
];

const NUTRITION_KEY = '@volyume_nutrition_targets';

// ─── Phase detection ──────────────────────────────────────────────────────────

// CP-10 batch G lane 1 (2026-07-11): accepts the live theme's colour map
// (t.colors) on the buildVolumeStatusColor(t.colors) precedent -- the
// weight-trend -> label + tone mapping is byte-identical in meaning, only
// the token SOURCE moved from the frozen import to the live theme.
function detectPhase(entries, c = colors) {
  // DATA-001: require a real positive weight, not just non-null. A stray 0 kg
  // or negative row (legacy import artefact) must not skew the slope.
  const withWeight = entries.filter(e => Number(e.body_weight) > 0);
  if (withWeight.length < 3) return null;

  // Use most recent 8 entries (sorted oldest first)
  const sorted = [...withWeight]
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .slice(-8);

  const n = sorted.length;
  const xMean = (n - 1) / 2;
  const yMean = sorted.reduce((s, e) => s + e.body_weight, 0) / n;

  let num = 0, den = 0;
  sorted.forEach((e, i) => {
    num += (i - xMean) * (e.body_weight - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den; // kg per entry

  if (slope > 0.15)       return { label: 'Gaining',     color: c.success,  icon: 'trending-up' };
  if (slope < -0.15)      return { label: 'Losing weight', color: c.warning,  icon: 'trending-down' };
  return { label: 'Maintaining', color: c.primary, icon: 'remove-outline' };
}

// ─── Weight Trend Chart ───────────────────────────────────────────────────────

// COMP-019: per-chart window persistence.
const WEIGHT_WINDOW_STORE_KEY = '@volyume_chart_window_weight';
const weightDateOf = (e) => new Date(e.metric_date).getTime();

// CP-10 batch G lane 1 (2026-07-11): WeightTrendChart is a sibling
// function-component scope (not prop-drilled `live`/`t` from
// BodyMetricsScreen), so its own useTheme() call is cleaner than threading
// two extra props through. Same rationale for BodyFatTrendChart and
// MeasurementTrendChart below; all three share buildChartLiveStyles(t) for
// the separate chartStyles StyleSheet.
function WeightTrendChart({ entries, bodyWeightUnits, edFlagOpen, userId }) {
  const t = useTheme();
  const chartLive = useMemo(() => buildChartLiveStyles(t), [t]);
  // Live-subscribing so a resize (e.g. Android split-screen/freeform) picks
  // up the correct chart width, matching RestTimer.js's useWindowDimensions
  // pattern rather than a frozen module-scope Dimensions.get().
  const { width: windowWidth } = useWindowDimensions();
  // All weight entries with a usable date, oldest → newest (no count slicing,
  // COMP-019 windows by date instead).
  const allWeights = useMemo(() => entries
    // DATA-001: > 0, not just non-null, so an impossible weight never plots.
    .filter(e => Number(e.body_weight) > 0 && e.metric_date)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date)), [entries]);

  const [windowKey, setWindowKey] = useState(DEFAULT_WINDOW_KEY);

  // On load (and when the dataset size changes), keep the persisted window if it
  // holds enough points, otherwise widen to the narrowest one that does.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pref = DEFAULT_WINDOW_KEY;
      try { const v = await AsyncStorage.getItem(WEIGHT_WINDOW_STORE_KEY); if (v) pref = v; } catch (_) {}
      if (cancelled) return;
      setWindowKey(pickInitialWindowKey(allWeights, weightDateOf, TREND_WINDOWS, pref));
    })();
    return () => { cancelled = true; };
  // Re-evaluate only when the dataset size changes (not on every array identity).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWeights.length]);

  function selectWindow(key) {
    setWindowKey(key);
    AsyncStorage.setItem(WEIGHT_WINDOW_STORE_KEY, key).catch(() => {});
    try { track(userId, 'chart_window_changed', { chart_id: 'weight', window: key })?.catch?.(() => {}); } catch (_) {}
  }

  if (allWeights.length < 2) {
    return (
      <View style={chartStyles.emptyHint}>
        <Text maxFontSizeMultiplier={1.3} style={[chartStyles.emptyHintText, chartLive.emptyHintText]}>
          Log weight at least twice to see your trend chart.
        </Text>
      </View>
    );
  }

  const win = windowByKey(TREND_WINDOWS, windowKey) ?? windowByKey(TREND_WINDOWS, DEFAULT_WINDOW_KEY);
  const windowed = filterByWindow(allWeights, weightDateOf, win.days);
  const coversAll = windowed.length === allWeights.length;
  const chartWidth = windowWidth - spacing.lg * 2 - 32;

  const sparse = windowed.length < 2;
  const weights = windowed.map(e => e.body_weight);
  // COMP-024: the displayed weight trend uses the water-weight-robust smoother
  // (raw dots stay visible beside it). Display-only promotion; coaching
  // decisions + safety keep the plain EWMA (see weeklyCoach §12 note).
  const smoothed = sparse ? [] : robustValues(weights);
  const takeaway = sparse ? '' : weightTakeaway({
    windowKey, coversAll, points: windowed, dateOf: weightDateOf,
    ewma: smoothed, unit: 'kg', edFlagOpen,
  });

  return (
    <View>
      <WindowChips windows={TREND_WINDOWS} selectedKey={windowKey} onSelect={selectWindow}
        accessibilityPrefix="weight trend window" />
      {!!takeaway && <Text maxFontSizeMultiplier={1.3} style={[chartStyles.takeaway, chartLive.takeaway]}>{takeaway}</Text>}
      {sparse ? (
        <View style={chartStyles.emptyHint}>
          <Text maxFontSizeMultiplier={1.3} style={[chartStyles.emptyHintText, chartLive.emptyHintText]}>Not enough data in this window yet.</Text>
        </View>
      ) : (
        <View style={chartStyles.wrap}>
          <VolyumeChart
            data={windowed.map((e, i) => ({
              value: e.body_weight,
              label: i === 0 || i === windowed.length - 1 ? safeFormatDate(e.metric_date, 'd MMM') : '',
            }))}
            width={chartWidth}
            height={120}
            color={t.colors.primary}
            thickness={2}
            area
            curved
            showDots={windowed.length <= 6}
            dotRadius={3}
            yAxisSuffix={bodyWeightUnits === 'st' ? ' kg' : ` ${bodyWeightUnits || 'kg'}`}
            sections={3}
            min={Math.floor(Math.min(...weights) - 1)}
            max={Math.ceil(Math.max(...weights) + 1)}
            backgroundColor={t.colors.surface}
            interactive
            accessibilityLabel="Weight trend chart"
            formatTooltip={(i) => {
              const e = windowed[i];
              if (!e) return null;
              const unit = bodyWeightUnits === 'st' ? 'kg' : (bodyWeightUnits || 'kg');
              const trend = smoothed[i];
              return {
                title: `${e.body_weight} ${unit}`,
                sub: `${safeFormatDate(e.metric_date, 'd MMM')}${trend != null ? ` - trend ${trend.toFixed(1)} ${unit}` : ''}`,
              };
            }}
          />
        </View>
      )}
    </View>
  );
}

// ─── Body Fat Trend Chart ─────────────────────────────────────────────────────

function BodyFatTrendChart({ entries }) {
  const t = useTheme();
  const chartLive = useMemo(() => buildChartLiveStyles(t), [t]);
  const { width: windowWidth } = useWindowDimensions();
  const withData = useMemo(() => {
    return entries
      // DATA-001: > 0, not just non-null (a 0 or negative body fat is corrupt).
      .filter(e => Number(e.body_fat) > 0)
      .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
      .slice(-12);
  }, [entries]);

  if (withData.length < 2) {
    return (
      <View style={chartStyles.emptyHint}>
        <Text maxFontSizeMultiplier={1.3} style={[chartStyles.emptyHintText, chartLive.emptyHintText]}>
          Log body fat at least twice to see the trend.
        </Text>
      </View>
    );
  }

  const values = withData.map(e => e.body_fat);
  // Smooth the trend so the line follows the direction, not day-to-day
  // noise (same EWMA the weight trend uses). The raw readings stay
  // visible as a faint second line.
  const smoothed = ewmaValues(values);
  const allVals = [...values, ...smoothed];
  const minV = Math.floor(Math.min(...allVals) - 1);
  const maxV = Math.ceil(Math.max(...allVals) + 1);

  const data = withData.map((e, i) => ({
    value: smoothed[i],
    label: i === 0 || i === withData.length - 1
      ? safeFormatDate(e.metric_date, 'd MMM')
      : '',
  }));
  const rawData = values.map(v => ({ value: v }));

  const chartWidth = windowWidth - spacing.lg * 2 - 32;

  return (
    <View style={chartStyles.wrap}>
      <VolyumeChart
        data={data}
        data2={rawData}
        width={chartWidth}
        height={100}
        color={t.colors.primary}
        color2={withAlpha(t.colors.textMuted, alpha.strong)}
        thickness={2}
        thickness2={1}
        area
        curved
        showDots={withData.length <= 6}
        dotRadius={3}
        yAxisSuffix=" %"
        sections={3}
        min={minV}
        max={maxV}
        backgroundColor={t.colors.surface}
      />
      <Text maxFontSizeMultiplier={1.3} style={[chartStyles.smoothedHint, chartLive.smoothedHint]}>Smoothed trend, faint line is each reading</Text>
    </View>
  );
}

// ─── Measurement Trend Chart ──────────────────────────────────────────────────

function MeasurementTrendChart({ entries, measureKey, label }) {
  const t = useTheme();
  const chartLive = useMemo(() => buildChartLiveStyles(t), [t]);
  const { width: windowWidth } = useWindowDimensions();
  const withData = useMemo(() => {
    return entries
      // DATA-001: > 0, not just non-null, so an impossible measurement is dropped.
      .filter(e => Number(e[measureKey]) > 0)
      .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
      .slice(-12);
  }, [entries, measureKey]);

  if (withData.length < 2) {
    return (
      <View style={chartStyles.emptyHint}>
        <Text maxFontSizeMultiplier={1.3} style={[chartStyles.emptyHintText, chartLive.emptyHintText]}>
          Log {label.toLowerCase()} at least twice to see the trend.
        </Text>
      </View>
    );
  }

  const values = withData.map(e => e[measureKey]);
  const minV = Math.floor(Math.min(...values) - 1);
  const maxV = Math.ceil(Math.max(...values) + 1);

  const data = withData.map((e, i) => ({
    value: e[measureKey],
    label: i === 0 || i === withData.length - 1
      ? safeFormatDate(e.metric_date, 'd MMM')
      : '',
  }));

  const chartWidth = windowWidth - spacing.lg * 2 - 32;

  return (
    <View style={chartStyles.wrap}>
      <VolyumeChart
        data={data}
        width={chartWidth}
        height={100}
        color={t.colors.primary}
        thickness={2}
        area
        curved
        showDots={withData.length <= 6}
        dotRadius={3}
        yAxisSuffix=" cm"
        sections={3}
        min={minV}
        max={maxV}
        backgroundColor={t.colors.surface}
      />
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, marginHorizontal: -spacing.xs },
  takeaway: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.sm },
  emptyHint: { paddingTop: spacing.md },
  emptyHintText: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },
  smoothedHint: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `chartStyles` block above
// stays byte-identical. This mirrors ONLY the colour/type-bearing sub-
// properties of the matching frozen style, so the chart sub-components
// carry no static island under a live theme toggle. emptyHint/wrap (pure
// layout, no token) are correctly omitted.
function buildChartLiveStyles(t) {
  return {
    takeaway: { ...t.type.bodySm, color: t.colors.textSecondary },
    emptyHintText: { ...t.type.caption, color: t.colors.textMuted },
    smoothedHint: { ...t.type.caption, color: t.colors.textMuted },
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BodyMetricsScreen() {
  const navigation = useNavigation();
  const { user, session, units, bodyWeightUnits, tier, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    session: s.session,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    tier: s.tier,
    userProfile: s.userProfile,
  })));
  // Energy DISPLAY unit (kcal | kj) for the average-intake readout below.
  // Display-only: recentIntake.avgKcal stays kcal for the adherence ratio maths.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  // Onboarding weight, surfaced in the empty state so a user who just
  // completed Pro onboarding doesn't see a misleading "No entries yet"
  // when they did, in fact, give us a starting bodyweight.
  const onboardingWeightKg = userProfile?.weightKg ?? userProfile?.bodyWeightKg ?? null;
  const bwu = bodyWeightUnits || 'st';
  const toast = useToast();
  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  // Memoised: this screen renders a mapped measurement/history list.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // E10 read-only lapse views (founder decision 2026-07-02, "view yes, log
  // no"): a non-Pro user reaches this screen only through withReadOnlyProGuard
  // (they have logged body metrics), and it renders view-only: history, trends
  // and charts stay; the Log Weight form and the auto-seed write are hidden.
  // Derived from the store inside the screen, never trusted from a prop.
  const readOnly = tier !== 'pro';
  const [physiqueEnabled, setPhysiqueEnabled] = useState(null); // null = loading
  const [calm, setCalm] = useState(false);
  const [edFlagOpen, setEdFlagOpen] = useState(false);
  // Until the calm / open-ED flags have actually loaded, the recomp reframe is
  // treated as suppressed (safe default), so it can't flash before the async
  // safety reads resolve (NA-coaching-6).
  const [wellbeingLoaded, setWellbeingLoaded] = useState(false);
  const [sessionConfirmed, setSessionConfirmed] = useState(bodyMetricsSessionConfirmed);
  const [history, setHistory] = useState([]);
  // Lift data for the recomposition reframe's strength delta (ULTIMATE-RECOMP-01).
  const [liftSets, setLiftSets] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [recentIntake, setRecentIntake] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [form, setForm] = useState(blankMetricForm());
  const [saving, setSaving] = useState(false);
  // D16 (NAV-2): null while logging a new entry; set to an existing entry's
  // id while editing it, so saveMetrics() knows whether to insert or correct.
  const [editingId, setEditingId] = useState(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [ewmaData, setEwmaData] = useState([]);
  // D16 (NAV-2): scroll the "New entry"/"Edit entry" form into view when the
  // user taps Edit on a history row further down the page.
  const scrollRef = useRef(null);

  // Estimated daily burn: Precision Coaching's reverse-engineered TDEE from
  // the weight trend and logged intake. A point estimate with a confidence
  // tier, not a fabricated history line. Returns insufficient_data until there
  // are about two weeks of weigh-ins plus targets, which the card renders as an
  // honest cold-start line.
  const adaptiveBurn = useMemo(() => {
    const prescribedKcal = nutritionTargets?.targetKcal ?? null;
    const currentTDEEEstimate = nutritionTargets?.tdee ?? nutritionTargets?.maintenanceKcal ?? null;
    const adherenceFactor =
      recentIntake?.avgKcal && prescribedKcal ? recentIntake.avgKcal / prescribedKcal : 1.0;
    return computeAdaptiveTDEEAdjustment({
      ewmaData,
      prescribedKcal,
      currentTDEEEstimate,
      adherenceFactor,
    });
  }, [ewmaData, nutritionTargets, recentIntake]);

  const measurementsWithData = useMemo(() =>
    MEASUREMENTS.filter(m => history.some(e => e[m.key] != null)),
    [history],
  );

  // Recomposition reframe (ULTIMATE-RECOMP-01). Read-only derivation; suppressed
  // under calm mode / open ED flag so a "weight flat, fat down" read can never
  // reinforce restriction (NA-coaching-6). Renders nothing when not warranted.
  const recompVm = useMemo(
    () => deriveRecomp(history, liftSets, exercises, { suppressed: !wellbeingLoaded || calm || edFlagOpen }),
    [history, liftSets, exercises, wellbeingLoaded, calm, edFlagOpen],
  );

  // Auto-select first measurement that has data
  useEffect(() => {
    if (selectedMeasurement == null && measurementsWithData.length > 0) {
      setSelectedMeasurement(measurementsWithData[0].key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementsWithData]);

  const STORAGE_KEY = `@volyume_body_metrics_${user?.id}`;
  const MIGRATED_KEY = `@volyume_body_metrics_migrated_${user?.id}`;

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PHYSIQUE_PREF_KEY).then(v => {
        if (v === 'true' || tier === 'pro') {
          if (tier === 'pro' && v !== 'true') {
            AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'true').catch(() => {});
          }
          setPhysiqueEnabled(true);
        } else {
          setPhysiqueEnabled(false);
        }
      });
      // COMP-019: suppress the weight takeaway's rate-of-change under an open ED
      // pattern flag (COMP-004 safety behaviour), in addition to calmer mode.
      // Mark the wellbeing flags loaded only once BOTH reads settle, so the
      // recomp reframe stays suppressed until the real calm/ED state is known.
      // Fail CLOSED: read the raw wellbeing flag rather than getWellbeingMode()
      // (which swallows a storage read error down to 'unspecified'). A genuine
      // read failure on either the wellbeing flag or the ED flag must suppress.
      Promise.allSettled([
        AsyncStorage.getItem(WELLBEING_KEY)
          .then(v => v || 'unspecified')
          .catch(() => 'read_failed')
          .then(m => setCalm(isCalm(m) || m === 'read_failed')),
        user?.id
          ? getOpenEdPatternFlag(user.id).then(f => setEdFlagOpen(!!f)).catch(() => setEdFlagOpen(true))
          : Promise.resolve(),
      ]).finally(() => setWellbeingLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    // Read-only users skip the opt-in gate (see the render below), so their
    // data load must not wait on the physique pref either. null still means
    // "pref not read yet" and defers the load one tick.
    if (physiqueEnabled === null || (!physiqueEnabled && !readOnly)) return;
    (async () => {
      // Hostile review (E10 #3): the legacy AsyncStorage migration WRITES
      // body-metric rows (logBodyMetric + a sync schedule), so like the
      // auto-seed it never runs in the view-only state. It resumes if the
      // user returns to Pro.
      if (!readOnly) await migrateFromAsyncStorage();
      await loadHistory();
      await loadNutritionTargets();
      await loadRecentIntake();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physiqueEnabled, user?.id]);

  async function migrateFromAsyncStorage() {
    if (!user?.id) return;
    try {
      const done = await AsyncStorage.getItem(MIGRATED_KEY);
      if (done === 'true') return;
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const legacy = raw ? JSON.parse(raw) : [];
      // Track per-row failures rather than letting one bad row abort
      // the whole migration. Previously, a thrown logBodyMetric (e.g.
      // a NaN value getting through) tripped the outer catch, MIGRATED_KEY
      // was never written, and the loop reran the partial migration on
      // every launch, potentially duplicating rows that did succeed.
      let migrated = 0;
      let failed = 0;
      for (const entry of legacy) {
        try {
          const data = { notes: entry.notes || null };
          const d = entry.metric_date ? new Date(entry.metric_date) : new Date();
          data.loggedAt = isNaN(d.getTime()) ? Date.now() : d.getTime();
          for (const [formKey, dbField] of Object.entries(FIELD_MAP)) {
            if (entry[formKey] != null && entry[formKey] !== '') {
              const num = parseFloat(entry[formKey]);
              if (Number.isFinite(num)) data[dbField] = num;
            }
          }
          await logBodyMetric(user.id, data);
          migrated++;
        } catch (rowErr) {
          failed++;
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logWarn('BodyMetricsScreen.migrate', 'row failed', { error: rowErr?.message }); } catch (_) {}
        }
      }
      // Mark migrated only if we made some forward progress. If every
      // single row failed we leave the flag unset so the user (or a
      // future fix) can retry.
      if (migrated > 0 || failed === 0) {
        await AsyncStorage.setItem(MIGRATED_KEY, 'true');
      }
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('BodyMetricsScreen.migrateFromAsyncStorage', e, { userId: user?.id }); } catch (_) {}
    }
  }

  async function loadHistory() {
    if (!user?.id) return;
    try {
      let rows = await getBodyMetricLog(user.id, 50);

      // Auto-seed the first entry from the onboarding bodyweight so the
      // screen isn't a blank slate on first visit. We only do this once
      // (gated by a per-user AsyncStorage flag) so manually deleting all
      // entries doesn't re-create them on next visit.
      const SEED_KEY = `@volyume_body_metric_seeded_${user.id}`;
      const onboardingKg = userProfile?.weightKg ?? userProfile?.bodyWeightKg ?? null;
      // E10 read-only: the auto-seed is a WRITE (it logs a body metric row),
      // so it never runs in the view-only state.
      if (rows.length === 0 && onboardingKg && onboardingKg > 0 && !readOnly) {
        const alreadySeeded = await AsyncStorage.getItem(SEED_KEY).catch(() => null);
        if (!alreadySeeded) {
          try {
            await logBodyMetric(user.id, { weightKg: onboardingKg, notes: 'Starting weight (from onboarding)' });
            await AsyncStorage.setItem(SEED_KEY, 'true').catch(() => {});
            rows = await getBodyMetricLog(user.id, 50);
            // eslint-disable-next-line global-require
            try { require('../lib/errorLog').logInfo('BodyMetricsScreen.autoSeed', `seeded onboarding weight ${onboardingKg}kg`); } catch (_) {}
          } catch (e) {
            // eslint-disable-next-line global-require
            try { require('../lib/errorLog').logWarn('BodyMetricsScreen.autoSeed', 'seed failed', { error: e?.message }); } catch (_) {}
          }
        }
      }

      const bodyMetricEntries = rows.map(rowToEntry);

      // BUG-WEIGHT-HISTORY: fold in any calendar day that only has a
      // morning_weights row (Home's quick weigh-in), so it appears as a
      // dated historical record here too.
      let morningRows = [];
      try { morningRows = await getMorningWeights(user.id, 90); } catch (_e) { morningRows = []; }
      const entries = mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows, 50);
      setHistory(entries);
      const sorted = [...entries].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
      const weightPoints = sorted
        // DATA-001: require a positive weight, not just a truthy value, so a
        // 0 kg / negative row can't feed the EWMA smoother.
        .filter(m => Number(m.body_weight) > 0)
        .map(m => ({ date: m.metric_date, weightKg: m.body_weight }));
      if (weightPoints.length >= 3) {
        const ewma = computeEWMA(weightPoints);
        setEwmaData(ewma);
      } else {
        setEwmaData([]);
      }
    } catch (_e) { setHistory([]); setEwmaData([]); }

    // Lift data for the recomposition reframe's strength delta (read-only;
    // a failure just hides the strength line, never the body history above).
    // Bounded to the last year rather than all-time: deriveRecomp only inspects
    // the recent flat-weight window, so a full set-history read would be wasted
    // work on a long-term user's every screen focus.
    try {
      const RECOMP_SET_WINDOW_MS = 365 * 86400000;
      const [ls, ex] = await Promise.all([
        getWorkoutSetsSince(user.id, Date.now() - RECOMP_SET_WINDOW_MS),
        getAllExercises(),
      ]);
      setLiftSets(ls || []);
      setExercises(ex || []);
    } catch (_e) { setLiftSets([]); setExercises([]); }
  }

  async function loadNutritionTargets() {
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      setNutritionTargets(raw ? JSON.parse(raw) : null);
    } catch (_e) { setNutritionTargets(null); }
  }

  async function loadRecentIntake() {
    if (!user?.id) { setRecentIntake(null); return; }
    try {
      const summary = await getRecentIntakeSummary(user.id);
      setRecentIntake(summary);
    } catch (_e) { setRecentIntake(null); }
  }

  // D16 (NAV-2): closes the New/Edit entry form and always drops back to a
  // blank, non-editing state, so Cancel from an edit can never leave a stale
  // editingId around to silently redirect the next "Log weight" tap.
  function closeMetricForm() {
    setShowForm(false);
    setShowMeasurements(false);
    setEditingId(null);
    setForm(blankMetricForm());
  }

  // D16 (NAV-2): prefill the existing New-entry form from a history row and
  // switch it into edit mode. Converts the entry's stored kg back into the
  // user's display unit (mirrors TodayStrip's kg -> st/lb prefill) so editing
  // in stone-and-pounds never shows a raw kilogram figure.
  function startEditEntry(entry) {
    if (useAppStore.getState().tier !== 'pro') return;
    const hasMeasurements = MEASUREMENTS.some(m => entry[m.key] != null);
    let body_weight = '';
    let body_weight_st = '';
    let body_weight_st_lbs = '0';
    if (entry.body_weight) {
      if (bwu === 'st') {
        const { stoneStr, lbsStr } = kgToStoneLbsStrings(entry.body_weight);
        body_weight_st = stoneStr;
        body_weight_st_lbs = lbsStr;
      } else if (bwu === 'lbs') {
        body_weight = String(Math.round(kgToLbs(entry.body_weight) * 10) / 10);
      } else {
        body_weight = String(Math.round(entry.body_weight * 10) / 10);
      }
    }
    setForm({
      body_weight, body_weight_st, body_weight_st_lbs,
      body_fat: entry.body_fat != null ? String(entry.body_fat) : '',
      chest: entry.chest != null ? String(entry.chest) : '',
      shoulders: entry.shoulders != null ? String(entry.shoulders) : '',
      arms: entry.arms != null ? String(entry.arms) : '',
      forearms: entry.forearms != null ? String(entry.forearms) : '',
      waist: entry.waist != null ? String(entry.waist) : '',
      hips: entry.hips != null ? String(entry.hips) : '',
      quads: entry.quads != null ? String(entry.quads) : '',
      hamstrings: entry.hamstrings != null ? String(entry.hamstrings) : '',
      calves: entry.calves != null ? String(entry.calves) : '',
      metric_date: entry.metric_date || format(new Date(), 'yyyy-MM-dd'),
      notes: entry.notes || '',
    });
    setShowMeasurements(hasMeasurements);
    setEditingId(entry.id);
    setShowForm(true);
    // Jump the form into view: the History row that started the edit can be
    // well below the fold.
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }

  // D16 (NAV-2): calm confirm, the app's existing workout delete-confirm
  // idiom (appAlert, neutral "Cancel"/"Delete" pair, no haptics). Plain,
  // factual copy only, no judgement of the values being removed.
  function confirmDeleteEntry(entry) {
    if (useAppStore.getState().tier !== 'pro') return;
    appAlert(
      'Delete this entry?',
      'The weight and any measurements logged for this date are removed from your history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMetricEntry(entry) },
      ],
    );
  }

  async function deleteMetricEntry(entry) {
    if (useAppStore.getState().tier !== 'pro') return;
    const prevHistory = history;
    // Optimistic removal; restored on failure.
    setHistory(prev => prev.filter(h => h.id !== entry.id));
    if (editingId === entry.id) closeMetricForm();
    try {
      const ok = await deleteBodyMetric(user.id, entry.id);
      if (!ok) throw new Error('deleteBodyMetric: no live row matched');
      if (session?.user?.id) {
        syncAll({ userId: session.user.id, localUserId: user.id, triggeredBy: 'write' }).catch(() => {});
      }
      toast.show('Entry deleted.', { variant: 'success' });
      await loadHistory();
    } catch (e) {
      setHistory(prevHistory);
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('BodyMetricsScreen.deleteEntry', e, { entryId: entry.id }); } catch (_) {}
      toast.show("Couldn't delete. Try again.", { variant: 'error' });
    }
  }

  async function saveMetrics() {
    // Live-tier re-check (hostile review E10 #1 class): a pro-to-free flip
    // while the form is open must not let this closure write.
    if (useAppStore.getState().tier !== 'pro') return;
    // DATA-001: one shared, pure save-gate. "At least one measurement" now means
    // ANY non-empty VALID field (body weight, body fat, or any single
    // circumference, not just chest), and any impossible value (non-finite,
    // non-positive or outside a realistic range) is rejected here with a calm
    // toast rather than silently stored. See src/lib/bodyMetricValidate.js.
    const result = validateBodyMetricForm(form, { bwu });
    if (!result.ok) {
      toast.show(result.message, { variant: 'warning' });
      return;
    }
    const data = result.data;
    // D16 (NAV-2): captured before the form resets under us.
    const targetId = editingId;
    const isEdit = !!targetId;
    setSaving(true);
    try {
      if (isEdit) {
        // Optimistic UI: replace the edited row in place, in the same
        // rowToEntry() shape every other history entry is in, so the
        // snapshot/trend/history all reflect the correction immediately
        // rather than showing blank fields until the reload below lands.
        const optimisticEntry = rowToEntry({ id: targetId, ...data });
        setHistory(prev => prev.map(h => (h.id === targetId ? optimisticEntry : h)));
        closeMetricForm();
        try {
          const ok = await updateBodyMetric(user.id, targetId, data);
          if (!ok) throw new Error('updateBodyMetric: no live row matched');
          if (session?.user?.id) {
            syncAll({ userId: session.user.id, localUserId: user.id, triggeredBy: 'write' }).catch(() => {});
          }
          // Reload so downstream reads (trend chart, EWMA, recomp reframe)
          // recompute from the corrected series, not the optimistic guess.
          await loadHistory();
        } catch (_e) {
          await loadHistory(); // revert the optimistic row to the real (unsaved) state
          toast.show('Couldn\'t save. Try again.', { variant: 'error' });
        }
        return;
      }

      // Optimistic UI: insert the new entry at the top of the history
      // list immediately so the user sees it land in real time, rather
      // than waiting for the SQLite write + a full reload. Same pattern
      // as set logging in ActiveWorkoutScreen.
      const optimisticEntry = {
        id: `tmp-${Date.now()}`, // replaced when SQLite returns
        loggedAt: Date.now(),
        ...data,
      };
      setHistory(prev => [optimisticEntry, ...prev]);
      closeMetricForm();
      // Background: persist to SQLite + cloud. On success, replace the
      // optimistic entry with the real saved row. On failure, remove
      // the optimistic entry and show a toast.
      try {
        await logBodyMetric(user.id, data);
        if (session?.user?.id) {
          // E12 step 1: push through the registry runner (the legacy per-save
          // syncBodyMetric dual writer is retired; the body_composition_log
          // handler reads the row logBodyMetric just saved).
          syncAll({ userId: session.user.id, localUserId: user.id, triggeredBy: 'write' }).catch(() => {});
        }
        // Reload to pick up the real id + any DB-computed fields (the
        // optimistic entry was missing things like a properly formatted
        // loggedAt). Cheap, same SQLite query as before.
        await loadHistory();
      } catch (_e) {
        setHistory(prev => prev.filter(h => h.id !== optimisticEntry.id));
        // Surface the failure, body weight is important; user needs to
        // know it didn't save so they can retry.
        toast.show('Couldn\'t save. Try again.', { variant: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  // Loading state, return the dark background, not null, to avoid a white flash
  if (physiqueEnabled === null) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Body metrics" />
      </SafeAreaView>
    );
  }

  // L04-7 (design audit 2026-07-09): the opt-in gate that used to render here
  // was confirmed dead code — Pro users have physiqueEnabled force-set true
  // above before this point ever runs, and read-only (free) users are
  // excluded by the readOnly guard itself, so no real user could ever reach
  // it. Removed rather than re-gated: there is no live scenario today where a
  // user should see a tracking pitch on a screen they were already routed
  // into (Pro users already have tracking on; free users only land here via
  // withReadOnlyProGuard once they already have history to view).

  // Calmer experience: gentle re-confirmation once per app session.
  if (calm && !sessionConfirmed) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Body metrics" />
        <ScrollView contentContainerStyle={styles.optInContent}>
          <View style={[styles.confirmCard, live.confirmCard]}>
            <Ionicons name="leaf-outline" size={32} color={t.colors.primary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.confirmTitle, live.confirmTitle]}>A gentle check-in</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.confirmBody, live.confirmBody]}>
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
              textStyle={styles.confirmBtnText}
            />
            <Text maxFontSizeMultiplier={1.3} style={[styles.confirmHelpline, live.confirmHelpline]}>{WELLBEING_HELPLINE}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const latest = history[0];
  const prev = history[1];
  const phase = detectPhase(history, t.colors);

  function getDelta(key) {
    if (!latest?.[key] || !prev?.[key]) return null;
    return (latest[key] - prev[key]).toFixed(1);
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Body metrics" />
      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern (same behavior prop as PlansScreen /
          ManualBuilderScreen) so the "New entry" form's fields stay
          reachable above the keyboard, for consistency, no fixed footer
          was found below this scroll. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>

        {/* E10 read-only lapse views: say plainly what this state is, and keep
            the one honest way out. Calm voice, no shame. */}
        {readOnly ? (
          <View style={[styles.readOnlyCard, live.readOnlyCard]}>
            <View style={styles.readOnlyRow}>
              <Ionicons name="eye-outline" size={16} color={t.colors.textSecondary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.readOnlyText, live.readOnlyText]}>
                Your history is view-only on the free plan. Everything you logged is safe and stays yours.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.readOnlyCtaButton, live.readOnlyCtaButton]}
              onPress={() => navigation.navigate('ProUpgrade', { source: 'body_metrics' })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro to log weight again"
            >
              <Ionicons name="lock-open-outline" size={16} color={t.colors.textSecondary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.readOnlyCta, live.readOnlyCta]}>Log weight again with Pro</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Progress photos (gap #9): private, device-local only. */}
        <TouchableOpacity
          style={[styles.photosRow, live.photosRow]}
          onPress={() => navigation.navigate('ProgressPhotos')}
          accessibilityRole="button"
          accessibilityLabel="Progress photos, private to this device"
        >
          <Ionicons name="camera-outline" size={20} color={t.colors.primary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.photosRowText, live.photosRowText]}>Progress photos</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Body Metrics is for body weight + measurements only. Nutrition
            Targets have their own dedicated screen reachable from
            Athlete Hub → Nutrition targets and Settings → Nutrition. */}

        {/* Weight trend + snapshot */}
        {history.length > 0 ? (
          <Card style={styles.snapshotCard}>
            {/* Header row with phase chip */}
            <View style={styles.snapshotHeader}>
              <SectionLabel>
                Weight - {safeFormatDate(latest?.metric_date, 'd MMM yyyy') || 'Today'}
              </SectionLabel>
              {phase && (
                <View style={[styles.phaseChip, { borderColor: phase.color }]}>
                  <Ionicons name={phase.icon} size={12} color={phase.color} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.phaseLabel, live.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
                </View>
              )}
            </View>

            {latest.body_weight && (
              <View style={styles.weightRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.weightValue, live.weightValue]}>{formatBodyWeight(latest.body_weight, bwu)}</Text>
                {getDelta('body_weight') && (
                  <DeltaBadge delta={parseFloat(getDelta('body_weight'))} units={bwu === 'st' ? 'kg' : bwu} />
                )}
              </View>
            )}

            {/* Weight trend chart */}
            <WeightTrendChart entries={history} units={units} bodyWeightUnits={bwu} edFlagOpen={calm || edFlagOpen} userId={user?.id} />

            {history.length < 3 && (
              <Text maxFontSizeMultiplier={1.3} style={[styles.trendHint, live.trendHint]}>
                Log weight 3 or more times to reveal a clearer trend.
              </Text>
            )}

            {/* EWMA smoothed weight trend card */}
            <Card radius="md" padding="md" style={styles.ewmaCard}>
              {ewmaData.length >= 7 ? (
                <>
                  <View style={styles.labelTipRow}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaLabel, live.ewmaLabel]}>Weight trend</Text>
                    {/* U-D-3: one-tap gloss for the smoothed-weight (EWMA) concept. */}
                    <InfoTooltip text={GLOSSARY.ewma} size={13} />
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaValue, live.ewmaValue]}>
                    {ewmaData[ewmaData.length - 1]?.ewma?.toFixed(1)} kg
                  </Text>
                  {(() => {
                    const weeklyChange = computeWeeklyWeightChange(ewmaData);
                    if (weeklyChange == null) return null;
                    const sign = weeklyChange >= 0 ? '+' : '';
                    return (
                      <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaWeekly, live.ewmaWeekly]}>
                        Weekly change: {sign}{weeklyChange.toFixed(1)} kg
                      </Text>
                    );
                  })()}
                  <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaMuted, live.ewmaMuted]}>
                    Smoothed out across day-to-day ups and downs, so it's more reliable than a single weigh-in.
                  </Text>
                  {recentIntake?.daysLogged > 0 && (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaIntake, live.ewmaIntake]}>
                      Average intake {toEnergy(recentIntake.avgKcal, energyUnit)} {energyUnitLabel(energyUnit)} over the last {recentIntake.daysLogged} {recentIntake.daysLogged === 1 ? 'day' : 'days'}.
                    </Text>
                  )}
                </>
              ) : (
                <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaMuted, live.ewmaMuted]}>
                  Log your weight for 7 days to see your smoothed trend.
                </Text>
              )}
            </Card>

            {ewmaData.length >= 7 ? (
              <Card radius="md" padding="md" style={styles.burnCard}>
                <View style={styles.labelTipRow}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.burnLabel, live.burnLabel]}>Estimated daily burn</Text>
                  {/* U-D-3: one-tap gloss for the adaptive-TDEE concept. */}
                  <InfoTooltip text={GLOSSARY.adaptiveTdee} size={13} />
                </View>
                {adaptiveBurn.confidence === 'insufficient_data' ? (
                  <Text maxFontSizeMultiplier={1.3} style={[styles.burnMuted, live.burnMuted]}>
                    Your coach estimates your daily burn from your weight trend and what you log. Keep logging your morning weight and meals for about two weeks and it appears here.
                  </Text>
                ) : (
                  <>
                    <View style={styles.burnRow}>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.burnValue, live.burnValue]}>{adaptiveBurn.adjustedTDEE}</Text>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.burnUnit, live.burnUnit]}>kcal/day</Text>
                    </View>
                    {adaptiveBurn.insight ? (
                      <Text maxFontSizeMultiplier={1.3} style={[styles.burnMuted, live.burnMuted]}>{adaptiveBurn.insight}</Text>
                    ) : null}
                    <View style={styles.burnConfidenceRow}>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.burnConfidence, live.burnConfidence]}>
                        {adaptiveBurn.confidence === 'high'
                          ? 'High confidence'
                          : adaptiveBurn.confidence === 'medium'
                            ? 'Firming up'
                            : 'Early estimate'}, from {adaptiveBurn.weeks} {adaptiveBurn.weeks === 1 ? 'week' : 'weeks'} of data
                      </Text>
                      <InfoTooltip text="More weeks of consistent weight and food logging tighten this estimate. It settles on its own; nothing to do." />
                    </View>
                  </>
                )}
              </Card>
            ) : null}

            {/* Recomposition reframe (ULTIMATE-RECOMP-01): when weight has held
                steady but shape and/or strength kept moving, say so in numbers.
                Renders nothing when not warranted or under calm/ED suppression. */}
            <RecompCard
              vm={recompVm}
              weightUnits={units}
              onMakeCard={(milestoneData) => navigation.navigate('ShareCard', { milestoneData })}
            />

            {/* Body composition: body fat % + its own trend, shown once
                the user has logged it. The delta is rendered neutrally
                (no good/bad colour) given the sensitivity of this screen. */}
            {latest?.body_fat != null && (
              <View style={[styles.bodyFatBlock, live.bodyFatBlock]}>
                <View style={styles.bodyFatRow}>
                  <SectionLabel>Body fat</SectionLabel>
                  <View style={styles.bodyFatValueRow}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.bodyFatValue, live.bodyFatValue]}>{latest.body_fat}%</Text>
                    {getDelta('body_fat') && (
                      <DeltaBadge delta={parseFloat(getDelta('body_fat'))} units="%" small />
                    )}
                  </View>
                </View>
                <BodyFatTrendChart entries={history} />
              </View>
            )}
          </Card>
        ) : (
          <EmptyState
            icon="body-outline"
            title="No body metrics yet"
            text={onboardingWeightKg && !readOnly
              ? `We have your onboarding body weight saved as a starting point (${formatBodyWeightShort(onboardingWeightKg, bodyWeightUnits)}). Log a fresh weight to start the trend.`
              : 'Log body weight or measurements when you want this trend to start.'}
          />
        )}

        {/* Log Button. E10 read-only: logging is a write; the button and the
            form below never render in the view-only state. */}
        {!readOnly && (
          <Button
            title={showForm ? 'Cancel' : 'Log weight'}
            icon={showForm ? 'chevron-up' : 'add-circle'}
            style={styles.logBtn}
            onPress={() => {
              // D16 (NAV-2): opening fresh always starts a new entry, even if
              // the form was last left mid-edit; closing always clears edit
              // state too, so a stray editingId can never redirect a later
              // "Log weight" tap into silently overwriting a past entry.
              if (showForm) closeMetricForm();
              else { setEditingId(null); setShowForm(true); setShowMeasurements(false); }
            }}
            accessibilityState={{ expanded: showForm }}
            accessibilityLabel={showForm ? 'Cancel' : 'Log weight'}
            size="lg"
            textStyle={styles.logBtnText}
          />
        )}

        {/* Log / Edit Form */}
        {!readOnly && showForm && (
          <View style={[styles.formCard, live.formCard]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.formTitle, live.formTitle]}>{editingId ? 'Edit entry' : 'New entry'}</Text>
            <View style={styles.formRow}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.formLabel, live.formLabel]}>Date</Text>
              <TextField
                containerStyle={styles.formFieldContainer}
                fieldStyle={styles.formField}
                inputStyle={styles.formInputText}
                value={form.metric_date}
                onChangeText={v => setForm(f => ({ ...f, metric_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={t.colors.textMuted}
                accessibilityLabel="Date, year month day"
              />
            </View>
            {bwu === 'st' ? (
              <View style={styles.formRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.formLabel, live.formLabel]}>Body weight</Text>
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
                  <TextField
                    containerStyle={styles.formSplitFieldContainer}
                    fieldStyle={styles.formField}
                    inputStyle={styles.formInputText}
                    value={form.body_weight_st}
                    onChangeText={v => setForm(f => ({ ...f, body_weight_st: v }))}
                    keyboardType="number-pad"
                    placeholder="12 st"
                    placeholderTextColor={t.colors.textMuted}
                    maxLength={3}
                    accessibilityLabel="Body weight, stone"
                  />
                  <TextField
                    containerStyle={styles.formSplitFieldContainer}
                    fieldStyle={styles.formField}
                    inputStyle={styles.formInputText}
                    value={form.body_weight_st_lbs}
                    onChangeText={v => setForm(f => ({ ...f, body_weight_st_lbs: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0 lbs"
                    placeholderTextColor={t.colors.textMuted}
                    maxLength={4}
                    accessibilityLabel="Body weight, pounds"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.formLabel, live.formLabel]}>Body weight ({bwu})</Text>
                <TextField
                  containerStyle={styles.formFieldContainer}
                  fieldStyle={styles.formField}
                  inputStyle={styles.formInputText}
                  value={form.body_weight}
                  onChangeText={v => setForm(f => ({ ...f, body_weight: v }))}
                  keyboardType="decimal-pad"
                  placeholder={bwu === 'lbs' ? '176' : '82.5'}
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel={`Body weight in ${bwu}`}
                />
              </View>
            )}

            <View style={styles.formRow}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.formLabel, live.formLabel]}>Body fat (%)</Text>
              <TextField
                containerStyle={styles.formFieldContainer}
                fieldStyle={styles.formField}
                inputStyle={styles.formInputText}
                value={form.body_fat}
                onChangeText={v => setForm(f => ({ ...f, body_fat: v }))}
                keyboardType="decimal-pad"
                placeholder="optional"
                placeholderTextColor={t.colors.textMuted}
                maxLength={4}
                accessibilityLabel="Body fat percentage"
              />
            </View>

            {/* Measurements section, collapsed by default */}
            <TouchableOpacity
              style={[styles.measureToggle, live.measureToggle]}
              onPress={() => setShowMeasurements(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showMeasurements }}
              accessibilityLabel={showMeasurements ? 'Hide measurements' : 'Add measurements'}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.measureToggleText, live.measureToggleText]}>
                {showMeasurements ? 'Hide measurements' : 'Add measurements (optional)'}
              </Text>
              <Ionicons
                name={showMeasurements ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={t.colors.textMuted}
              />
            </TouchableOpacity>

            {showMeasurements && MEASUREMENTS.map(m => (
              <View key={m.key} style={styles.formRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.formLabel, live.formLabel]}>{m.label} (cm)</Text>
                <TextField
                  containerStyle={styles.formFieldContainer}
                  fieldStyle={styles.formField}
                  inputStyle={styles.formInputText}
                  value={form[m.key]}
                  onChangeText={v => setForm(f => ({ ...f, [m.key]: v }))}
                  keyboardType="decimal-pad"
                  placeholder=""
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel={`${m.label} in centimetres`}
                />
              </View>
            ))}

            <TextField
              containerStyle={styles.notesInputContainer}
              fieldStyle={styles.notesField}
              inputStyle={styles.notesInputText}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Notes (optional)"
              placeholderTextColor={t.colors.textMuted}
              multiline
              accessibilityLabel="Notes"
            />
            <Button
              title={editingId ? 'Save changes' : 'Save entry'}
              onPress={saveMetrics}
              disabled={saving}
              loading={saving}
              style={styles.saveBtn}
              textStyle={styles.saveBtnText}
              accessibilityLabel={editingId ? 'Save changes' : 'Save entry'}
            />
          </View>
        )}

        {/* Measurements snapshot + trend charts */}
        {latest && MEASUREMENTS.some(m => latest[m.key]) && (
          <Card style={styles.snapshotCard}>
            <SectionLabel>Measurements</SectionLabel>
            <View style={styles.measureGrid}>
              {MEASUREMENTS.map(m => latest[m.key] ? (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.measureCell, live.measureCell, selectedMeasurement === m.key && [styles.measureCellActive, live.measureCellActive]]}
                  onPress={() => setSelectedMeasurement(m.key === selectedMeasurement ? null : m.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMeasurement === m.key }}
                  accessibilityLabel={`${m.label} ${latest[m.key]} centimetres`}
                >
                  <Text maxFontSizeMultiplier={1.3} style={[styles.measureValue, live.measureValue, selectedMeasurement === m.key && [styles.measureValueActive, live.measureValueActive]]}>
                    {latest[m.key]} cm
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.measureLabel, live.measureLabel, selectedMeasurement === m.key && [styles.measureLabelActive, live.measureLabelActive]]}>
                    {m.label}
                  </Text>
                  {getDelta(m.key) && (
                    <DeltaBadge delta={parseFloat(getDelta(m.key))} units="cm" small />
                  )}
                </TouchableOpacity>
              ) : null)}
            </View>

            {/* Measurement trend chart */}
            {measurementsWithData.length > 0 && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.measureTabRow}
                >
                  {measurementsWithData.map(m => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.measureTab, live.measureTab, selectedMeasurement === m.key && [styles.measureTabActive, live.measureTabActive]]}
                      onPress={() => setSelectedMeasurement(m.key === selectedMeasurement ? null : m.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedMeasurement === m.key }}
                      accessibilityLabel={m.label}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={[styles.measureTabText, live.measureTabText, selectedMeasurement === m.key && [styles.measureTabTextActive, live.measureTabTextActive]]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedMeasurement && (
                  <MeasurementTrendChart
                    entries={history}
                    measureKey={selectedMeasurement}
                    label={MEASUREMENTS.find(m => m.key === selectedMeasurement)?.label ?? ''}
                  />
                )}
              </>
            )}
          </Card>
        )}

        {/* History. D16 (NAV-2): full weigh-in management, edit any entry,
            delete entries, visible history list, so this now shows from a
            single logged entry (not only once there are 2+), and every row
            carries a calm edit/delete pair for Pro (view-only free users see
            the list with no write affordances, matching the rest of this
            screen). */}
        {history.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>History</SectionLabel>
            {history.slice(0, 12).map(entry => {
              const measuredKeys = MEASUREMENTS.filter(m => entry[m.key] != null);
              const entryLabel = safeFormatDate(entry.metric_date, 'd MMM yyyy') || 'this date';
              return (
                <Card key={entry.id} radius="md" padding="md" style={styles.historyRow}>
                  <View style={styles.historyMain}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.historyDate, live.historyDate]}>{safeFormatDate(entry.metric_date, 'd MMM yyyy') || '-'}</Text>
                    <View style={styles.historyValues}>
                      {entry.body_weight ? (
                        <Text maxFontSizeMultiplier={1.3} style={[styles.historyWeight, live.historyWeight]}>{formatBodyWeightShort(entry.body_weight, bwu)}</Text>
                      ) : null}
                      {measuredKeys.slice(0, 2).map(m => (
                        <Text maxFontSizeMultiplier={1.3} key={m.key} style={[styles.historyMeasure, live.historyMeasure]}>
                          {m.label.split(' ')[0]} {entry[m.key]}cm
                        </Text>
                      ))}
                    </View>
                  </View>
                  {/* BUG-WEIGHT-HISTORY: a row merged in from morning_weights has no
                      body_metric_log id, so startEditEntry/deleteMetricEntry (which
                      call updateBodyMetric/deleteBodyMetric against body_metric_log)
                      would silently no-op on it. Those rows are logged from Home's
                      quick weigh-in, which has never had its own edit/delete affordance
                      either, so omitting the actions here is not a new regression. */}
                  {!readOnly && entry.source !== 'morning_weight' && (
                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        style={[styles.historyActionBtn, live.historyActionBtn]}
                        onPress={() => startEditEntry(entry)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit entry from ${entryLabel}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={16} color={t.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.historyActionBtn, live.historyActionBtn]}
                        onPress={() => confirmDeleteEntry(entry)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete entry from ${entryLabel}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={t.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Recomposition reframe card (ULTIMATE-RECOMP-01). Presentation-only: every fact
// is pre-derived by deriveRecomp; this renders the numbers-first read plus one
// plain sentence. Class-B body data, no valence colour (COMP-027). Returns null
// when the reframe is not warranted, exactly like WeightTrendCard on !vm.render.
// CP-10 batch G lane 1 (2026-07-11): own useTheme() call, same rationale
// as the chart components above.
function RecompCard({ vm, weightUnits = 'kg', onMakeCard }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  if (!vm || !vm.render) return null;

  const parts = ['Weight steady.'];
  if (vm.bodyFat) {
    const d = vm.bodyFat.deltaPP;
    parts.push(`Body fat ${d < 0 ? 'down' : 'up'} ${Math.abs(d)}%.`);
  }
  if (vm.measurement) {
    const d = vm.measurement.deltaCm;
    parts.push(`${vm.measurement.label} ${d < 0 ? 'down' : 'up'} ${Math.abs(d)} cm.`);
  }
  if (vm.lift) {
    parts.push(`${vm.lift.name} up ${vm.lift.deltaKg} ${weightUnits}.`);
  }

  // One plain, honesty-test-passing sentence (true if the user only logged).
  const shapeMoved = !!(vm.bodyFat || vm.measurement);
  const moved = shapeMoved && vm.lift ? 'shape and strength'
    : vm.lift ? 'strength' : 'shape';
  const sentence = `Your weight has held while your ${moved} kept moving.`;

  // S4 (world-class audit 04a): share image extended to this insight, the
  // most only-Volyume read in the app, previously unshareable. Privacy gate
  // lives in buildRecompShareParams: it returns null unless the strength
  // signal fired, so a share card NEVER carries a body fat or measurement
  // delta, only ever the lift gain (pure training data).
  const shareParams = onMakeCard ? buildRecompShareParams(vm, weightUnits) : null;

  return (
    <View style={[styles.recompBlock, live.recompBlock]}>
      <View style={styles.recompHeaderRow}>
        <Ionicons name="sync-outline" size={14} color={t.colors.textMuted} />
        <SectionLabel>Recomposition</SectionLabel>
        <InfoTooltip text={GLOSSARY.recomposition} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.recompRead, live.recompRead]}>{parts.join(' ')}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.recompNote, live.recompNote]}>{sentence}</Text>
      {shareParams ? (
        <TouchableOpacity
          style={[styles.recompCtaRow, live.recompCtaRow]}
          onPress={() => onMakeCard(shareParams)}
          accessibilityRole="button"
          accessibilityLabel="Create share image"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="image-outline" size={16} color={t.colors.textSecondary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.recompCta, live.recompCta]}>Create share image</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Class B body-data surface (COMP-027): on a body metric, direction is not
// valence. Losing or gaining weight / fat / a measurement is neither "good"
// (green) nor "bad" (red), so the badge carries no state colour: the arrow
// and sign show direction, the figure stays textPrimary, the arrow textMuted.
// (The `neutral` prop is retained for call-site compatibility; every delta is
// neutral now.)
// CP-10 batch G lane 1 (2026-07-11): own useTheme() call, same rationale
// as the chart components above.
function DeltaBadge({ delta, units, small }) {
  const t = useTheme();
  const isUp = delta > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
      <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={small ? 11 : 14} color={t.colors.textMuted} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: small ? 10 : t.fontSize.xs, color: t.colors.textPrimary, fontWeight: fontWeight.semibold }}>
        {isUp ? '+' : ''}{delta} {units}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  photosRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  photosRowText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  // E10 read-only lapse views: the view-only notice card.
  readOnlyCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  readOnlyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  readOnlyText: { ...type.bodySm, color: colors.textSecondary, flex: 1 },
  readOnlyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  readOnlyCta: { ...type.label, color: colors.textPrimary },
  confirmCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md, alignItems: 'flex-start',
  },
  confirmTitle: { ...type.h3, color: colors.textPrimary },
  confirmBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 },
  // Button adoption: box/fill/radius/padding now come from <Button size="lg">
  // (primary variant, fullWidth default matches the original alignSelf:
  // 'stretch'); only the top margin survives as a local override.
  confirmBtn: {
    marginTop: spacing.sm,
  },
  confirmBtnText: {},
  confirmHelpline: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },

  snapshotCard: {
    gap: spacing.md,
  },
  snapshotHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  phaseChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
  },
  phaseLabel: { ...type.captionStrong },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weightValue: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  trendHint: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },
  bodyFatBlock: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  recompBlock: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  recompHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recompRead: { ...type.bodyStrong, color: colors.textPrimary },
  recompNote: { ...type.bodySm, color: colors.textMuted },
  recompCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  recompCta: { ...type.label, color: colors.textPrimary },
  bodyFatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bodyFatValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bodyFatValue: { ...type.num('h3'), color: colors.textPrimary },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  measureCell: {
    minWidth: '30%', backgroundColor: colors.surface2, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.xxs, borderWidth: 1, borderColor: 'transparent',
  },
  measureCellActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  measureValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  measureValueActive: { color: colors.primary },
  measureLabel: { ...type.caption, color: colors.textMuted },
  measureLabelActive: { color: colors.primaryDim },
  measureTabRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.sm },
  measureTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  measureTabActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  measureTabText: { ...type.captionStrong, color: colors.textSecondary },
  measureTabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },

  logBtn: {
    paddingVertical: spacing.lg,
  },
  logBtnText: { ...type.title, color: colors.onPrimary },
  formCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  formTitle: { ...type.title, color: colors.textPrimary },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formLabel: { width: 140, fontSize: fontSize.sm, color: colors.textSecondary },
  formFieldContainer: { flex: 1 },
  formSplitFieldContainer: { flex: 1 },
  formField: {
    borderRadius: radius.sm,
    minHeight: 44,
  },
  formInputText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesInputContainer: { gap: 0 },
  notesField: {
    minHeight: 80,
  },
  notesInputText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  measureToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  measureToggleText: { fontSize: fontSize.sm, color: colors.textMuted },
  saveBtn: {
    marginTop: spacing.sm,
  },
  saveBtnText: { ...type.bodyStrong, color: colors.onPrimary },
  section: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  // D16 (NAV-2): date + values sit in their own flexible row so the
  // edit/delete pair (historyActions) can sit alongside without the two
  // competing for the same justify-content: space-between.
  historyMain: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  historyDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyValues: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyWeight: { ...type.num('bodyStrong'), color: colors.textPrimary },
  historyMeasure: { ...type.num('caption'), color: colors.textMuted },
  historyActions: { flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm },
  // Quiet destructive affordance, same neutral-until-confirm treatment as
  // WorkoutHistoryScreen's deleteBtn (no shouting red, no haptics).
  historyActionBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },

  ewmaCard: {
    gap: spacing.xs,
  },
  labelTipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  ewmaLabel: { ...type.caption, color: colors.textSecondary },
  ewmaValue: { ...type.num('h3'), color: colors.textPrimary },
  ewmaWeekly: { fontSize: fontSize.sm, color: colors.textSecondary },
  ewmaMuted: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },
  ewmaIntake: { ...type.num('caption'), color: colors.textSecondary, marginTop: spacing.xs },
  burnCard: {
    gap: spacing.xs, marginTop: spacing.md,
  },
  burnLabel: { ...type.caption, color: colors.textSecondary },
  burnRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  burnValue: { ...type.num('h2'), color: colors.textPrimary },
  burnUnit: { fontSize: fontSize.sm, color: colors.textSecondary },
  burnMuted: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },
  burnConfidence: { ...type.caption, color: colors.textSecondary },
  burnConfidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/margin/borderRadius/borderWidth/minWidth, no
// token) and fontWeight (not part of useTheme()'s shape) are correctly
// omitted. measureCell's `transparent` borderColor and phaseChip's fully
// inline borderColor (phase.color, already resolved from the live theme by
// detectPhase(history, t.colors)) need no live entry -- there is nothing
// frozen to unfreeze for them. The weight-logging form, ED-safety calm-mode
// gate and every safety threshold are untouched -- colours only.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    photosRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    photosRowText: { color: t.colors.textPrimary, fontSize: t.fontSize.md },
    readOnlyCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    readOnlyText: { ...t.type.bodySm, color: t.colors.textSecondary },
    readOnlyCtaButton: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    readOnlyCta: { ...t.type.label, color: t.colors.textPrimary },
    confirmCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    confirmTitle: { ...t.type.h3, color: t.colors.textPrimary },
    confirmBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    confirmHelpline: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    phaseLabel: { ...t.type.captionStrong },
    weightValue: { fontSize: t.fontSize.xxxl, color: t.colors.textPrimary },
    trendHint: { ...t.type.caption, color: t.colors.textMuted },
    bodyFatBlock: { borderTopColor: t.colors.border },
    recompBlock: { borderTopColor: t.colors.border },
    recompRead: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    recompNote: { ...t.type.bodySm, color: t.colors.textMuted },
    recompCtaRow: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    recompCta: { ...t.type.label, color: t.colors.textPrimary },
    bodyFatValue: { ...t.type.num('h3'), color: t.colors.textPrimary },
    measureCell: { backgroundColor: t.colors.surface2 },
    measureCellActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    measureValue: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    measureValueActive: { color: t.colors.primary },
    measureLabel: { ...t.type.caption, color: t.colors.textMuted },
    measureLabelActive: { color: t.colors.primaryDim },
    measureTab: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    measureTabActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    measureTabText: { ...t.type.captionStrong, color: t.colors.textSecondary },
    measureTabTextActive: { color: t.colors.primary },
    logBtnText: { ...t.type.title, color: t.colors.onPrimary },
    formCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    formTitle: { ...t.type.title, color: t.colors.textPrimary },
    formLabel: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    measureToggle: { borderTopColor: t.colors.border },
    measureToggleText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    saveBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    historyDate: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    historyWeight: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    historyMeasure: { ...t.type.num('caption'), color: t.colors.textMuted },
    historyActionBtn: { borderColor: t.colors.border },
    ewmaLabel: { ...t.type.caption, color: t.colors.textSecondary },
    ewmaValue: { ...t.type.num('h3'), color: t.colors.textPrimary },
    ewmaWeekly: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    ewmaMuted: { ...t.type.caption, color: t.colors.textMuted },
    ewmaIntake: { ...t.type.num('caption'), color: t.colors.textSecondary },
    burnLabel: { ...t.type.caption, color: t.colors.textSecondary },
    burnValue: { ...t.type.num('h2'), color: t.colors.textPrimary },
    burnUnit: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    burnMuted: { ...t.type.caption, color: t.colors.textMuted },
    burnConfidence: { ...t.type.caption, color: t.colors.textSecondary },
  };
}

