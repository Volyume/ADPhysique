import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

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
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logBodyMetric, getBodyMetricLog } from '../lib/database';
import { getRecentIntakeSummary } from '../lib/food/db';
import { EmptyBodyIllustration } from '../components/Illustrations';
import { syncBodyMetric } from '../lib/sync';
import { computeEWMA, computeWeeklyWeightChange } from '../lib/nutritionEngine';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { formatBodyWeight, formatBodyWeightShort, stoneLbsToKg, parseBodyWeightToKg } from '../lib/units';
import { getWellbeingMode, isCalm, WELLBEING_HELPLINE } from '../lib/wellbeing';

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
    metric_date: new Date(row.loggedAt ?? row.createdAt ?? Date.now())
      .toISOString().slice(0, 10),
    body_weight: row.weightKg ?? null,
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
const SCREEN_W = Dimensions.get('window').width;

// ─── Phase detection ──────────────────────────────────────────────────────────

function detectPhase(entries) {
  const withWeight = entries.filter(e => e.body_weight != null);
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

  if (slope > 0.15)       return { label: 'Gaining',     color: colors.success,  icon: 'trending-up' };
  if (slope < -0.15)      return { label: 'Losing weight', color: colors.warning,  icon: 'trending-down' };
  return { label: 'Maintaining', color: colors.primary, icon: 'remove-outline' };
}

// ─── Weight Trend Chart ───────────────────────────────────────────────────────

function WeightTrendChart({ entries, units, bodyWeightUnits }) {
  const withWeight = useMemo(() => {
    const sorted = entries
      .filter(e => e.body_weight != null)
      .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
      .slice(-12);
    return sorted;
  }, [entries]);

  if (withWeight.length < 2) {
    return (
      <View style={chartStyles.emptyHint}>
        <Text style={chartStyles.emptyHintText}>
          Log weight at least twice to see your trend chart.
        </Text>
      </View>
    );
  }

  const weights = withWeight.map(e => e.body_weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  // gifted-charts subtracts yAxisOffset from every value internally, so the
  // axis max must be the range (not the absolute max) for the line to fill
  // the chart height. Axis labels add yAxisOffset back for display.
  const axisRange = Math.max(maxW - minW, 1);

  const data = withWeight.map((e, i) => ({
    value: e.body_weight,
    label: i === 0 || i === withWeight.length - 1
      ? safeFormatDate(e.metric_date, 'MMM d')
      : '',
  }));

  const chartWidth = SCREEN_W - spacing.lg * 2 - 32;

  return (
    <View style={chartStyles.wrap}>
      <LineChart
        data={data}
        width={chartWidth}
        height={120}
        color={colors.primary}
        thickness={2}
        startFillColor={colors.primary + '30'}
        endFillColor={colors.primary + '05'}
        areaChart
        curved
        hideDataPoints={withWeight.length > 6}
        dataPointsColor={colors.primary}
        dataPointsRadius={3}
        yAxisLabelSuffix={bodyWeightUnits === 'st' ? ' kg' : ` ${bodyWeightUnits || 'kg'}`}
        yAxisTextStyle={chartStyles.axisText}
        xAxisLabelTextStyle={chartStyles.axisText}
        noOfSections={3}
        yAxisOffset={minW}
        maxValue={axisRange}
        backgroundColor={colors.surface}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="dashed"
        showVerticalLines={false}
      />
    </View>
  );
}

// ─── Measurement Trend Chart ──────────────────────────────────────────────────

function MeasurementTrendChart({ entries, measureKey, label }) {
  const withData = useMemo(() => {
    return entries
      .filter(e => e[measureKey] != null)
      .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
      .slice(-12);
  }, [entries, measureKey]);

  if (withData.length < 2) {
    return (
      <View style={chartStyles.emptyHint}>
        <Text style={chartStyles.emptyHintText}>
          Log {label.toLowerCase()} at least twice to see the trend.
        </Text>
      </View>
    );
  }

  const values = withData.map(e => e[measureKey]);
  const minV = Math.floor(Math.min(...values) - 1);
  const maxV = Math.ceil(Math.max(...values) + 1);
  const axisRange = Math.max(maxV - minV, 1);

  const data = withData.map((e, i) => ({
    value: e[measureKey],
    label: i === 0 || i === withData.length - 1
      ? safeFormatDate(e.metric_date, 'MMM d')
      : '',
  }));

  const chartWidth = SCREEN_W - spacing.lg * 2 - 32;

  return (
    <View style={chartStyles.wrap}>
      <LineChart
        data={data}
        width={chartWidth}
        height={100}
        color={colors.primary}
        thickness={2}
        startFillColor={colors.primary + '30'}
        endFillColor={colors.primary + '05'}
        areaChart
        curved
        hideDataPoints={withData.length > 6}
        dataPointsColor={colors.primary}
        dataPointsRadius={3}
        yAxisLabelSuffix=" cm"
        yAxisTextStyle={chartStyles.axisText}
        xAxisLabelTextStyle={chartStyles.axisText}
        noOfSections={3}
        yAxisOffset={minV}
        maxValue={axisRange}
        backgroundColor={colors.surface}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="dashed"
        showVerticalLines={false}
      />
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, marginHorizontal: -spacing.xs },
  emptyHint: { paddingTop: spacing.md },
  emptyHintText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  axisText: { color: colors.textMuted, fontSize: 10 },
});

// ─── Opt-in gate ─────────────────────────────────────────────────────────────

function PhysiqueOptIn({ onEnable }) {
  return (
    <View style={styles.optInCard}>
      <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
      <Text style={styles.optInTitle}>Physique Tracking</Text>
      <Text style={styles.optInBody}>
        Track your body weight and measurements over time. All data stays on your
        device. It is never shared or uploaded.
      </Text>
      <TouchableOpacity style={styles.optInBtn} onPress={onEnable}>
        <Ionicons name="body-outline" size={18} color={colors.background} />
        <Text style={styles.optInBtnText}>Enable Physique Tracking</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BodyMetricsScreen({ navigation }) {
  const { user, session, units, bodyWeightUnits, tier, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    session: s.session,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    tier: s.tier,
    userProfile: s.userProfile,
  })));
  // Onboarding weight — surfaced in the empty state so a user who just
  // completed Pro onboarding doesn't see a misleading "No entries yet"
  // when they did, in fact, give us a starting bodyweight.
  const onboardingWeightKg = userProfile?.weightKg ?? userProfile?.bodyWeightKg ?? null;
  const bwu = bodyWeightUnits || 'st';
  const [physiqueEnabled, setPhysiqueEnabled] = useState(null); // null = loading
  const [calm, setCalm] = useState(false);
  const [sessionConfirmed, setSessionConfirmed] = useState(bodyMetricsSessionConfirmed);
  const [history, setHistory] = useState([]);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [recentIntake, setRecentIntake] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [form, setForm] = useState({
    body_weight: '', body_weight_st: '', body_weight_st_lbs: '0',
    chest: '', shoulders: '', arms: '', forearms: '',
    waist: '', hips: '', quads: '', hamstrings: '', calves: '',
    metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [ewmaData, setEwmaData] = useState([]);

  const measurementsWithData = useMemo(() =>
    MEASUREMENTS.filter(m => history.some(e => e[m.key] != null)),
    [history],
  );

  // Auto-select first measurement that has data
  useEffect(() => {
    if (selectedMeasurement == null && measurementsWithData.length > 0) {
      setSelectedMeasurement(measurementsWithData[0].key);
    }
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
      getWellbeingMode().then(m => setCalm(isCalm(m)));
    }, []),
  );

  useEffect(() => {
    if (!physiqueEnabled) return;
    (async () => {
      await migrateFromAsyncStorage();
      await loadHistory();
      await loadNutritionTargets();
      await loadRecentIntake();
    })();
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
      // every launch — potentially duplicating rows that did succeed.
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
      if (rows.length === 0 && onboardingKg && onboardingKg > 0) {
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

      const entries = rows.map(rowToEntry);
      setHistory(entries);
      const sorted = [...entries].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
      const weightPoints = sorted
        .filter(m => m.body_weight)
        .map(m => ({ date: m.metric_date, weightKg: m.body_weight }));
      if (weightPoints.length >= 3) {
        const ewma = computeEWMA(weightPoints);
        setEwmaData(ewma);
      } else {
        setEwmaData([]);
      }
    } catch (_e) { setHistory([]); setEwmaData([]); }
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

  async function enablePhysique() {
    await AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'true');
    setPhysiqueEnabled(true);
  }

  async function saveMetrics() {
    const hasBW = bwu === 'st' ? !!form.body_weight_st : !!form.body_weight;
    if (!hasBW && !form.chest) {
      Alert.alert('Missing data', 'Enter at least body weight or one measurement.');
      return;
    }
    setSaving(true);
    try {
      const data = { notes: form.notes || null };
      const d = form.metric_date ? new Date(form.metric_date) : new Date();
      data.loggedAt = isNaN(d.getTime()) ? Date.now() : d.getTime();
      // Body weight — convert to kg for storage
      if (bwu === 'st' && form.body_weight_st) {
        const kg = stoneLbsToKg(form.body_weight_st, form.body_weight_st_lbs || '0');
        if (!isNaN(kg) && kg > 0) data.weightKg = kg;
      } else if (form.body_weight) {
        const kg = parseBodyWeightToKg(form.body_weight, bwu);
        if (!isNaN(kg) && kg > 0) data.weightKg = kg;
      }
      // Measurements (cm) — stored as-is
      for (const [formKey, dbField] of Object.entries(FIELD_MAP)) {
        if (formKey === 'body_weight') continue; // handled above
        if (form[formKey] !== '' && form[formKey] != null) {
          const n = parseFloat(form[formKey]);
          if (!isNaN(n)) data[dbField] = n;
        }
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
      setShowForm(false);
      setForm({
        body_weight: '', body_weight_st: '', body_weight_st_lbs: '0',
        chest: '', shoulders: '', arms: '', forearms: '',
        waist: '', hips: '', quads: '', hamstrings: '', calves: '',
        metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
      });
      // Background: persist to SQLite + cloud. On success, replace the
      // optimistic entry with the real saved row. On failure, remove
      // the optimistic entry and show a toast.
      try {
        const saved = await logBodyMetric(user.id, data);
        if (session?.user?.id) {
          syncBodyMetric(session.user.id, { id: saved?.id ?? saved, ...data }).catch(() => {});
        }
        // Reload to pick up the real id + any DB-computed fields (the
        // optimistic entry was missing things like a properly formatted
        // loggedAt). Cheap — same SQLite query as before.
        await loadHistory();
      } catch (e) {
        setHistory(prev => prev.filter(h => h.id !== optimisticEntry.id));
        try {
          // eslint-disable-next-line global-require
          require('../components/Toast'); // ensure module loaded
        } catch (_) {}
        // Surface the failure — body weight is important; user needs to
        // know it didn't save so they can retry.
        Alert.alert('Could not save', e?.message ?? 'Try again in a moment.');
      }
    } finally {
      setSaving(false);
    }
  }

  // Loading state — return the dark background, not null, to avoid a white flash
  if (physiqueEnabled === null) return <SafeAreaView style={styles.safe} edges={['bottom']} />;

  // Opt-in gate
  if (!physiqueEnabled) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.optInContent}>
          <PhysiqueOptIn onEnable={enablePhysique} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Calmer experience: gentle re-confirmation once per app session.
  if (calm && !sessionConfirmed) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.optInContent}>
          <View style={styles.confirmCard}>
            <Ionicons name="leaf-outline" size={32} color={colors.primary} />
            <Text style={styles.confirmTitle}>A gentle check-in</Text>
            <Text style={styles.confirmBody}>
              You asked for a calmer experience. Body measurements can be a
              sensitive space. Open it only if it feels right for you today.
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                bodyMetricsSessionConfirmed = true;
                setSessionConfirmed(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>Continue</Text>
            </TouchableOpacity>
            <Text style={styles.confirmHelpline}>{WELLBEING_HELPLINE}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const latest = history[0];
  const prev = history[1];
  const phase = detectPhase(history);

  function getDelta(key) {
    if (!latest?.[key] || !prev?.[key]) return null;
    return (latest[key] - prev[key]).toFixed(1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Body Metrics is for body weight + measurements only. Nutrition
            Targets have their own dedicated screen reachable from
            Athlete Hub → Nutrition targets and Settings → Nutrition. */}

        {/* Weight trend + snapshot */}
        {history.length > 0 ? (
          <View style={styles.snapshotCard}>
            {/* Header row with phase chip */}
            <View style={styles.snapshotHeader}>
              <Text style={styles.sectionTitle}>
                Weight · {safeFormatDate(latest?.metric_date, 'MMM d, yyyy') || 'Today'}
              </Text>
              {phase && (
                <View style={[styles.phaseChip, { borderColor: phase.color }]}>
                  <Ionicons name={phase.icon} size={12} color={phase.color} />
                  <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
                </View>
              )}
            </View>

            {latest.body_weight && (
              <View style={styles.weightRow}>
                <Text style={styles.weightValue}>{formatBodyWeight(latest.body_weight, bwu)}</Text>
                {getDelta('body_weight') && (
                  <DeltaBadge delta={parseFloat(getDelta('body_weight'))} units={bwu === 'st' ? 'kg' : bwu} />
                )}
              </View>
            )}

            {/* Weight trend chart */}
            <WeightTrendChart entries={history} units={units} bodyWeightUnits={bwu} />

            {history.length < 3 && (
              <Text style={styles.trendHint}>
                Log weight 3 or more times to reveal a clearer trend.
              </Text>
            )}

            {/* EWMA smoothed weight trend card */}
            <View style={styles.ewmaCard}>
              {ewmaData.length >= 7 ? (
                <>
                  <Text style={styles.ewmaLabel}>Weight trend</Text>
                  <Text style={styles.ewmaValue}>
                    {ewmaData[ewmaData.length - 1]?.ewma?.toFixed(1)} kg
                  </Text>
                  {(() => {
                    const weeklyChange = computeWeeklyWeightChange(ewmaData);
                    if (weeklyChange == null) return null;
                    const sign = weeklyChange >= 0 ? '+' : '';
                    return (
                      <Text style={styles.ewmaWeekly}>
                        Weekly change: {sign}{weeklyChange.toFixed(1)} kg
                      </Text>
                    );
                  })()}
                  <Text style={styles.ewmaMuted}>
                    Smoothed across daily fluctuations. More reliable than a single weigh-in.
                  </Text>
                  {recentIntake?.daysLogged > 0 && (
                    <Text style={styles.ewmaIntake}>
                      Avg intake last 7d: {recentIntake.avgKcal} kcal across {recentIntake.daysLogged} {recentIntake.daysLogged === 1 ? 'day' : 'days'}.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.ewmaMuted}>
                  Log your weight for 7 days to see your smoothed trend.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyBodyIllustration size={140} />
            <Text style={styles.emptyTitle}>No entries logged yet</Text>
            {onboardingWeightKg ? (
              <>
                <Text style={styles.emptyText}>
                  We have your onboarding bodyweight saved as a starting point ({formatBodyWeightShort(onboardingWeightKg, bodyWeightUnits)}). Tap Log Weight to record a fresh entry. That's when the trend starts tracking.
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Log your body weight and measurements to track your physique over time.
              </Text>
            )}
          </View>
        )}

        {/* Log Button */}
        <TouchableOpacity style={styles.logBtn} onPress={() => { setShowForm(!showForm); setShowMeasurements(false); }}>
          <Ionicons name={showForm ? 'chevron-up' : 'add-circle'} size={20} color={colors.background} />
          <Text style={styles.logBtnText}>{showForm ? 'Cancel' : 'Log Weight'}</Text>
        </TouchableOpacity>

        {/* Log Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Entry</Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={form.metric_date}
                onChangeText={v => setForm(f => ({ ...f, metric_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            {bwu === 'st' ? (
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Body weight</Text>
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={form.body_weight_st}
                    onChangeText={v => setForm(f => ({ ...f, body_weight_st: v }))}
                    keyboardType="number-pad"
                    placeholder="12 st"
                    placeholderTextColor={colors.textMuted}
                    maxLength={3}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={form.body_weight_st_lbs}
                    onChangeText={v => setForm(f => ({ ...f, body_weight_st_lbs: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0 lbs"
                    placeholderTextColor={colors.textMuted}
                    maxLength={4}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Body weight ({bwu})</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.body_weight}
                  onChangeText={v => setForm(f => ({ ...f, body_weight: v }))}
                  keyboardType="decimal-pad"
                  placeholder={bwu === 'lbs' ? '176' : '82.5'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            {/* Measurements section — collapsed by default */}
            <TouchableOpacity
              style={styles.measureToggle}
              onPress={() => setShowMeasurements(v => !v)}
            >
              <Text style={styles.measureToggleText}>
                {showMeasurements ? 'Hide measurements' : 'Add measurements (optional)'}
              </Text>
              <Ionicons
                name={showMeasurements ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showMeasurements && MEASUREMENTS.map(m => (
              <View key={m.key} style={styles.formRow}>
                <Text style={styles.formLabel}>{m.label} (cm)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form[m.key]}
                  onChangeText={v => setForm(f => ({ ...f, [m.key]: v }))}
                  keyboardType="decimal-pad"
                  placeholder=""
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}

            <TextInput
              style={[styles.formInput, styles.notesInput]}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={saveMetrics}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Measurements snapshot + trend charts */}
        {latest && MEASUREMENTS.some(m => latest[m.key]) && (
          <View style={styles.snapshotCard}>
            <Text style={styles.sectionTitle}>Measurements</Text>
            <View style={styles.measureGrid}>
              {MEASUREMENTS.map(m => latest[m.key] ? (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.measureCell, selectedMeasurement === m.key && styles.measureCellActive]}
                  onPress={() => setSelectedMeasurement(m.key === selectedMeasurement ? null : m.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.measureValue, selectedMeasurement === m.key && styles.measureValueActive]}>
                    {latest[m.key]} cm
                  </Text>
                  <Text style={[styles.measureLabel, selectedMeasurement === m.key && styles.measureLabelActive]}>
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
                      style={[styles.measureTab, selectedMeasurement === m.key && styles.measureTabActive]}
                      onPress={() => setSelectedMeasurement(m.key === selectedMeasurement ? null : m.key)}
                    >
                      <Text style={[styles.measureTabText, selectedMeasurement === m.key && styles.measureTabTextActive]}>
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
          </View>
        )}

        {/* History */}
        {history.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            {history.slice(0, 12).map(entry => {
              const measuredKeys = MEASUREMENTS.filter(m => entry[m.key] != null);
              return (
                <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{safeFormatDate(entry.metric_date, 'MMM d, yyyy') || '—'}</Text>
                  <View style={styles.historyValues}>
                    {entry.body_weight ? (
                      <Text style={styles.historyWeight}>{formatBodyWeightShort(entry.body_weight, bwu)}</Text>
                    ) : null}
                    {measuredKeys.slice(0, 2).map(m => (
                      <Text key={m.key} style={styles.historyMeasure}>
                        {m.label.split(' ')[0]} {entry[m.key]}cm
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeltaBadge({ delta, units, small }) {
  const isUp = delta > 0;
  const color = isUp ? colors.success : colors.error;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={small ? 11 : 14} color={color} />
      <Text style={{ fontSize: small ? 10 : fontSize.xs, color, fontWeight: fontWeight.semibold }}>
        {isUp ? '+' : ''}{delta} {units}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  optInContent: { padding: spacing.lg, paddingTop: spacing.xxl },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, letterSpacing: 0.2,
  },

  optInCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.lg,
  },
  optInTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  optInBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },
  optInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, marginTop: spacing.md,
  },
  optInBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  confirmCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md, alignItems: 'flex-start',
  },
  confirmTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  confirmBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 },
  confirmBtn: {
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.sm,
  },
  confirmBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  confirmHelpline: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },

  nutritionCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  nutritionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutritionCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nutritionCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  nutritionCardLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  nutritionGrid: { flexDirection: 'row', gap: spacing.md },
  nutritionCell: { flex: 1, alignItems: 'center', gap: 2 },
  nutritionValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  nutritionLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  nutritionEmpty: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xxl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  snapshotCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  snapshotHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  phaseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  phaseLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weightValue: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  trendHint: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  measureCell: {
    minWidth: '30%', backgroundColor: colors.surface2, borderRadius: radius.md,
    padding: spacing.md, gap: 2, borderWidth: 1, borderColor: 'transparent',
  },
  measureCellActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  measureValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  measureValueActive: { color: colors.primary },
  measureLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  measureLabelActive: { color: colors.primaryDim },
  measureTabRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.sm },
  measureTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  measureTabActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  measureTabText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary },
  measureTabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
  },
  logBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  formCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formLabel: { width: 140, fontSize: fontSize.sm, color: colors.textSecondary },
  formInput: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  notesInput: { flex: undefined, minHeight: 60 },
  measureToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  measureToggleText: { fontSize: fontSize.sm, color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  section: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  historyDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyValues: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyWeight: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  historyMeasure: { fontSize: fontSize.xs, color: colors.textMuted },

  ewmaCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, gap: spacing.xs,
  },
  ewmaLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  ewmaValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  ewmaWeekly: { fontSize: fontSize.sm, color: colors.textSecondary },
  ewmaMuted: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  ewmaIntake: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
});
