import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logBodyMetric, getBodyMetricLog } from '../lib/database';
import useAppStore from '../store/useAppStore';
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

function WeightTrendChart({ entries, units }) {
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
      ? format(parseISO(e.metric_date), 'MMM d')
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
        yAxisLabelSuffix={` ${units}`}
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
  const { user, units } = useAppStore();
  const [physiqueEnabled, setPhysiqueEnabled] = useState(null); // null = loading
  const [calm, setCalm] = useState(false);
  const [sessionConfirmed, setSessionConfirmed] = useState(bodyMetricsSessionConfirmed);
  const [history, setHistory] = useState([]);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [form, setForm] = useState({
    body_weight: '', chest: '', shoulders: '', arms: '', forearms: '',
    waist: '', hips: '', quads: '', hamstrings: '', calves: '',
    metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [saving, setSaving] = useState(false);

  const STORAGE_KEY = `@volyume_body_metrics_${user?.id}`;
  const MIGRATED_KEY = `@volyume_body_metrics_migrated_${user?.id}`;

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PHYSIQUE_PREF_KEY).then(v => setPhysiqueEnabled(v === 'true'));
      getWellbeingMode().then(m => setCalm(isCalm(m)));
    }, []),
  );

  useEffect(() => {
    if (!physiqueEnabled) return;
    (async () => {
      await migrateFromAsyncStorage();
      await loadHistory();
      await loadNutritionTargets();
    })();
  }, [physiqueEnabled, user?.id]);

  async function migrateFromAsyncStorage() {
    if (!user?.id) return;
    try {
      const done = await AsyncStorage.getItem(MIGRATED_KEY);
      if (done === 'true') return;
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const legacy = raw ? JSON.parse(raw) : [];
      for (const entry of legacy) {
        const data = { notes: entry.notes || null };
        const d = entry.metric_date ? new Date(entry.metric_date) : new Date();
        data.loggedAt = isNaN(d.getTime()) ? Date.now() : d.getTime();
        for (const [formKey, dbField] of Object.entries(FIELD_MAP)) {
          if (entry[formKey] != null && entry[formKey] !== '') {
            data[dbField] = parseFloat(entry[formKey]);
          }
        }
        await logBodyMetric(user.id, data);
      }
      await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    } catch (_e) {}
  }

  async function loadHistory() {
    if (!user?.id) return;
    try {
      const rows = await getBodyMetricLog(user.id, 50);
      setHistory(rows.map(rowToEntry));
    } catch (_e) { setHistory([]); }
  }

  async function loadNutritionTargets() {
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      setNutritionTargets(raw ? JSON.parse(raw) : null);
    } catch (_e) { setNutritionTargets(null); }
  }

  async function enablePhysique() {
    await AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'true');
    setPhysiqueEnabled(true);
  }

  async function saveMetrics() {
    if (!form.body_weight && !form.chest) {
      Alert.alert('Missing data', 'Enter at least body weight or one measurement.');
      return;
    }
    setSaving(true);
    try {
      const data = { notes: form.notes || null };
      const d = form.metric_date ? new Date(form.metric_date) : new Date();
      data.loggedAt = isNaN(d.getTime()) ? Date.now() : d.getTime();
      for (const [formKey, dbField] of Object.entries(FIELD_MAP)) {
        if (form[formKey] !== '' && form[formKey] != null) {
          const n = parseFloat(form[formKey]);
          if (!isNaN(n)) data[dbField] = n;
        }
      }
      await logBodyMetric(user.id, data);
      setShowForm(false);
      setForm({
        body_weight: '', chest: '', shoulders: '', arms: '', forearms: '',
        waist: '', hips: '', quads: '', hamstrings: '', calves: '',
        metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
      });
      await loadHistory();
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (physiqueEnabled === null) return null;

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

        {/* Nutrition Targets Card */}
        <View style={styles.nutritionCard}>
          <View style={styles.nutritionCardHeader}>
            <View style={styles.nutritionCardLeft}>
              <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
              <Text style={styles.nutritionCardTitle}>Nutrition Targets</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'NutritionTargets', initial: false })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.nutritionCardLink}>
                {nutritionTargets ? 'Edit' : 'Calculate'}
              </Text>
            </TouchableOpacity>
          </View>
          {nutritionTargets ? (
            <View style={styles.nutritionGrid}>
              {nutritionTargets.targetKcal ? (
                <View style={styles.nutritionCell}>
                  <Text style={styles.nutritionValue}>{Math.round(nutritionTargets.targetKcal)}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
              ) : null}
              {nutritionTargets.proteinG ? (
                <View style={styles.nutritionCell}>
                  <Text style={styles.nutritionValue}>{Math.round(nutritionTargets.proteinG)}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
              ) : null}
              {nutritionTargets.carbsG ? (
                <View style={styles.nutritionCell}>
                  <Text style={styles.nutritionValue}>{Math.round(nutritionTargets.carbsG)}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
              ) : null}
              {nutritionTargets.fatG ? (
                <View style={styles.nutritionCell}>
                  <Text style={styles.nutritionValue}>{Math.round(nutritionTargets.fatG)}g</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.nutritionEmpty}>
              No targets set yet. Head to Profile to calculate your daily calories and macros.
            </Text>
          )}
        </View>

        {/* Weight trend + snapshot */}
        {history.length > 0 ? (
          <View style={styles.snapshotCard}>
            {/* Header row with phase chip */}
            <View style={styles.snapshotHeader}>
              <Text style={styles.sectionTitle}>
                Weight · {latest?.metric_date ? format(new Date(latest.metric_date), 'MMM d, yyyy') : 'Today'}
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
                <Text style={styles.weightValue}>{latest.body_weight} {units}</Text>
                {getDelta('body_weight') && (
                  <DeltaBadge delta={parseFloat(getDelta('body_weight'))} units={units} />
                )}
              </View>
            )}

            {/* Weight trend chart */}
            <WeightTrendChart entries={history} units={units} />

            {history.length < 3 && (
              <Text style={styles.trendHint}>
                Log weight 3 or more times to reveal a clearer trend.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="body-outline" size={40} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Log your body weight and measurements to track your physique over time.
            </Text>
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
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Body weight ({units})</Text>
              <TextInput
                style={styles.formInput}
                value={form.body_weight}
                onChangeText={v => setForm(f => ({ ...f, body_weight: v }))}
                keyboardType="decimal-pad"
                placeholder="82.5"
                placeholderTextColor={colors.textMuted}
              />
            </View>

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
                  placeholder="—"
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

        {/* Measurements snapshot */}
        {latest && MEASUREMENTS.some(m => latest[m.key]) && (
          <View style={styles.snapshotCard}>
            <Text style={styles.sectionTitle}>Measurements</Text>
            <View style={styles.measureGrid}>
              {MEASUREMENTS.map(m => latest[m.key] ? (
                <View key={m.key} style={styles.measureCell}>
                  <Text style={styles.measureValue}>{latest[m.key]} cm</Text>
                  <Text style={styles.measureLabel}>{m.label}</Text>
                  {getDelta(m.key) && (
                    <DeltaBadge delta={parseFloat(getDelta(m.key))} units="cm" small />
                  )}
                </View>
              ) : null)}
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            {history.slice(0, 10).map(entry => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{format(new Date(entry.metric_date), 'MMM d, yyyy')}</Text>
                {entry.body_weight && (
                  <Text style={styles.historyWeight}>{entry.body_weight} {units}</Text>
                )}
              </View>
            ))}
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
    padding: spacing.md, gap: 2,
  },
  measureValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  measureLabel: { fontSize: fontSize.xs, color: colors.textMuted },

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
  historyWeight: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
});
