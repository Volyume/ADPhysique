import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { calculateNutritionTargets } from '../lib/nutritionEngine';
import { saveNutritionTargets, getNutritionTargets, logBodyMetric } from '../lib/database';
import useAppStore from '../store/useAppStore';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@volyume_nutrition_targets';

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',    label: 'Sedentary' },
  { key: 'light',        label: 'Light' },
  { key: 'moderate',     label: 'Moderate' },
  { key: 'active',       label: 'Active' },
  { key: 'very_active',  label: 'Very Active' },
];

const TRAINING_DAYS_OPTIONS = [3, 4, 5, 6];

const BF_SOURCES = [
  { key: 'visual',  label: 'Visual' },
  { key: 'bia',     label: 'BIA' },
  { key: 'caliper', label: 'Caliper' },
  { key: 'dexa',    label: 'DEXA' },
];

const GOALS = [
  { key: 'lean_gain',        label: 'Lean Gain',        detail: '+10% surplus' },
  { key: 'build',            label: 'Build Mass',        detail: '+17% surplus' },
  { key: 'maintain',         label: 'Maintain',          detail: '0%' },
  { key: 'recomp',           label: 'Recomposition',     detail: '−5%' },
  { key: 'mild_cut',         label: 'Mild Cut',          detail: '−13%' },
  { key: 'aggressive_cut',   label: 'Aggressive Cut',    detail: '−22%' },
];

const PHASE_DESCRIPTIONS = {
  lean_gain:       'A modest calorie surplus with controlled volume supports steady lean tissue accrual.',
  build:           'A larger surplus increases recovery capacity, allowing high training volume and progressive overload.',
  maintain:        'Maintenance calories sustain performance; moderate volume keeps adaptations without excessive fatigue.',
  recomp:          'A slight deficit with high protein enables simultaneous fat loss and muscle retention.',
  mild_cut:        'A conservative deficit preserves strength; volume is moderated to match reduced recovery.',
  aggressive_cut:  'A significant deficit impairs recovery; low volume limits muscle loss.',
};

const CONFIDENCE_LABELS = {
  high:   'High confidence — body-fat measured by a precise method.',
  medium: 'Medium confidence — based on formula estimate.',
  low:    'Low confidence — body-fat estimated visually.',
};

const CONFIDENCE_ICONS = { high: 'checkmark-circle', medium: 'information-circle', low: 'alert-circle' };
const CONFIDENCE_COLORS = { high: colors.success, medium: colors.warning, low: colors.error };

// ─── Small helpers ──────────────────────────────────────────────────────────────

function SectionHeading({ title }) {
  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function PillGroup({ options, selected, onSelect, keyExtractor, labelExtractor }) {
  return (
    <View style={styles.pillWrap}>
      {options.map(opt => {
        const key   = keyExtractor ? keyExtractor(opt) : opt.key ?? opt;
        const label = labelExtractor ? labelExtractor(opt) : opt.label ?? String(opt);
        const active = selected === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(key)}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MacroCard({ label, grams, perKg, perKgLbm, basis }) {
  const ratioText =
    basis === 'lbm' && perKgLbm != null
      ? `${perKgLbm} g/kg lean`
      : perKg != null
        ? `${perKg} g/kg`
        : null;
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroGrams}>{grams}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
      {ratioText ? (
        <Text style={styles.macroPerKg}>{ratioText}</Text>
      ) : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BODY_METRICS_KEY_PREFIX = '@volyume_body_metrics_';

export default function NutritionTargetsScreen() {
  const { user } = useAppStore();

  // ── Form state ────────────────────────────────────────────────────────────────
  const [sex,          setSex]          = useState('male');
  const [age,          setAge]          = useState('');
  const [heightFt,     setHeightFt]     = useState('');
  const [heightIn,     setHeightIn]     = useState('');
  const [weight,       setWeight]       = useState('');
  const [bodyFat,      setBodyFat]      = useState('');
  const [bfSource,     setBfSource]     = useState('visual');
  const [activity,     setActivity]     = useState('moderate');
  const [trainingDays, setTrainingDays] = useState(4);
  const [goal,         setGoal]         = useState('lean_gain');
  const [consent,      setConsent]      = useState(false);

  // ── Results / UI state ──────────────────────────────────────────────────────────
  const [results,      setResults]      = useState(null);
  const [expanded,     setExpanded]     = useState(false);
  const [calculating,  setCalculating]  = useState(false);
  const [calm,         setCalm]         = useState(false);

  // ── Load saved targets on mount — SQLite primary, AsyncStorage fallback ────────────
  useEffect(() => {
    getWellbeingMode().then(m => {
      const c = isCalm(m);
      setCalm(c);
      // If the aggressive cut was previously selected, step back to a
      // gentler default when calmer experience is on.
      if (c) setGoal(g => (g === 'aggressive_cut' ? 'mild_cut' : g));
    });
  }, []);

  useEffect(() => {
    async function loadSaved() {
      try {
        // Try SQLite first (authoritative store)
        if (user?.id) {
          const fromDb = await getNutritionTargets(user.id).catch(() => null);
          if (fromDb) { setResults(fromDb); return; }
        }
        // Fall back to AsyncStorage (legacy or pre-SQLite data)
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setResults(JSON.parse(raw));
      } catch (_) {}
    }
    loadSaved();
  }, [user?.id]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const formComplete =
    sex && age.trim() && heightFt.trim() && weight.trim() && consent;

  // ── Calculate ──────────────────────────────────────────────────────────────
  async function handleCalculate() {
    if (!formComplete) return;

    const ageNum    = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const bfNum     = bodyFat.trim() ? parseFloat(bodyFat) : null;
    const ftNum     = parseInt(heightFt, 10) || 0;
    const inNum     = parseFloat(heightIn) || 0;
    const heightNum = ftNum * 30.48 + inNum * 2.54; // convert to cm

    if (!ageNum || !heightNum || !weightNum) {
      Alert.alert('Invalid input', 'Age, height, and weight must be valid numbers.');
      return;
    }

    setCalculating(true);
    try {
      const targets = calculateNutritionTargets({
        sex,
        ageYears:       ageNum,
        heightCm:       heightNum,
        weightKg:       weightNum,
        bodyFatPercent: bfNum,
        bodyFatSource:  bfNum != null ? bfSource : null,
        activityLevel:  activity,
        goal,
      });

      setResults(targets);
      // Write to both stores: SQLite (primary) + AsyncStorage (read by other screens)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      if (user?.id) {
        saveNutritionTargets(user.id, { ...targets, gdprConsented: true }).catch(() => {});
      }

      // Auto-seed Body Metrics with today's weight if no entry exists for today
      if (user?.id && weightNum) {
        try {
          const metricsKey = BODY_METRICS_KEY_PREFIX + user.id;
          const today = format(new Date(), 'yyyy-MM-dd');
          const raw = await AsyncStorage.getItem(metricsKey);
          const entries = raw ? JSON.parse(raw) : [];
          const hasToday = entries.some(e => e.metric_date === today);
          if (!hasToday) {
            const entry = { id: Date.now().toString(), metric_date: today, body_weight: weightNum };
            if (bfNum) entry.body_fat = bfNum;
            entries.unshift(entry);
            await AsyncStorage.setItem(metricsKey, JSON.stringify(entries));
            // Also write to SQLite so BodyMetricsScreen picks it up
            logBodyMetric(user.id, {
              weightKg: weightNum,
              bodyFatPercent: bfNum ?? null,
              bodyFatSource: bfNum != null ? bfSource : null,
              loggedAt: Date.now(),
            }).catch(() => {});
          }
        } catch (_e) {}
      }
    } catch (e) {
      Alert.alert('Calculation error', e.message || 'Something went wrong.');
    } finally {
      setCalculating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Nutrition Targets</Text>
          <Text style={styles.pageSubtitle}>
            Calculate your personalised daily calorie and macro goals.
          </Text>

          {/* ── SECTION 1: ABOUT YOU ───────────────────────────────────────────────────── */}

          <SectionHeading title="ABOUT YOU" />

          {/* Biological sex */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Biological sex</Text>
            <PillGroup
              options={[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }]}
              selected={sex}
              onSelect={setSex}
            />
          </View>

          {/* Age */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.numInput}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* Height */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Height</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightUnit}>
                <TextInput
                  style={styles.numInput}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <Text style={styles.unitLabel}>ft</Text>
              </View>
              <View style={styles.heightUnit}>
                <TextInput
                  style={styles.numInput}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={4}
                />
                <Text style={styles.unitLabel}>in</Text>
              </View>
            </View>
          </View>

          {/* Weight */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Current weight (kg)</Text>
            <TextInput
              style={styles.numInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 82"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </View>

          {/* Body fat */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Body fat % <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.numInput}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="e.g. 15"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={4}
            />
          </View>

          {/* BF Source — only shown when BF is entered */}
          {bodyFat.trim() ? (
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Body fat source</Text>
              <PillGroup
                options={BF_SOURCES}
                selected={bfSource}
                onSelect={setBfSource}
              />
            </View>
          ) : null}

          {/* ── SECTION 2: ACTIVITY & TRAINING ────────────────────────────────────────── */}

          <SectionHeading title="ACTIVITY & TRAINING" />

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Activity level</Text>
            <PillGroup
              options={ACTIVITY_OPTIONS}
              selected={activity}
              onSelect={setActivity}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Training days / week</Text>
            <PillGroup
              options={TRAINING_DAYS_OPTIONS}
              selected={trainingDays}
              onSelect={setTrainingDays}
              keyExtractor={d => d}
              labelExtractor={d => String(d)}
            />
          </View>

          {/* ── SECTION 3: GOAL & PHASE ────────────────────────────────────────────────────── */}

          <SectionHeading title="GOAL & PHASE" />

          <View style={styles.goalGrid}>
            {GOALS.filter(g => !(calm && g.key === 'aggressive_cut')).map(g => {
              const active = goal === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalCard, active && styles.goalCardActive]}
                  onPress={() => setGoal(g.key)}
                >
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={colors.primary}
                      style={styles.goalCheck}
                    />
                  )}
                  <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>
                    {g.label}
                  </Text>
                  <Text style={[styles.goalDetail, active && styles.goalDetailActive]}>
                    {g.detail}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── GDPR Consent ───────────────────────────────────────────────────────────────────── */}

          <View style={styles.consentCard}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
            <View style={styles.consentBody}>
              <Text style={styles.consentText}>
                Your body data is stored only on this device. It is never shared and you can delete it at any time.
              </Text>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsent(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                  {consent && <Ionicons name="checkmark" size={13} color={colors.background} />}
                </View>
                <Text style={styles.consentCheckLabel}>
                  I consent to storing this data on my device
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Calculate button ──────────────────────────────────────────────────────────────── */}

          <TouchableOpacity
            style={[styles.calcBtn, (!formComplete || calculating) && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={!formComplete || calculating}
          >
            <Ionicons
              name={calculating ? 'hourglass-outline' : 'calculator-outline'}
              size={20}
              color={formComplete ? colors.background : colors.textDisabled}
            />
            <Text style={[styles.calcBtnText, !formComplete && styles.calcBtnTextDisabled]}>
              {calculating ? 'Calculating…' : 'Calculate Targets'}
            </Text>
          </TouchableOpacity>

          {/* ── RESULTS ─────────────────────────────────────────────────────────────────────── */}

          {results ? (
            <View style={styles.resultsSection}>
              {/* Hero card. targetKcal is persisted but the ±10% range is
                  not, so a record loaded from the DB has no kcalMin/kcalMax
                  — derive them rather than crash on undefined. */}
              {(() => {
                const tk = Math.round(Number(results.targetKcal) || 0);
                const kMin = Math.round(Number(results.kcalMin) || tk * 0.9);
                const kMax = Math.round(Number(results.kcalMax) || tk * 1.1);
                return (
                  <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>Daily Energy Target</Text>
                    <Text style={styles.heroKcal}>
                      {tk.toLocaleString()} kcal
                    </Text>
                    <Text style={styles.heroRange}>
                      Estimated range: {kMin.toLocaleString()} – {kMax.toLocaleString()} kcal
                    </Text>
                  </View>
                );
              })()}

              {/* Macro cards */}
              <View style={styles.macroRow}>
                <MacroCard
                  label="Protein"
                  grams={results.proteinG}
                  perKg={results.proteinGPerKg}
                  perKgLbm={results.proteinGPerKgLbm}
                  basis={results.proteinBasis}
                />
                <MacroCard label="Carbs" grams={results.carbsG} />
                <MacroCard label="Fat"   grams={results.fatG}   />
              </View>

              {/* Phase card */}
              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>{results.phase}</Text>
                <Text style={styles.phaseDesc}>
                  {PHASE_DESCRIPTIONS[results.goal] ?? results.phase}
                </Text>
              </View>

              {/* Confidence card */}
              <View style={[styles.confidenceCard, { borderColor: CONFIDENCE_COLORS[results.confidence] + '40' }]}>
                <Ionicons
                  name={CONFIDENCE_ICONS[results.confidence]}
                  size={20}
                  color={CONFIDENCE_COLORS[results.confidence]}
                />
                <Text style={styles.confidenceText}>
                  {CONFIDENCE_LABELS[results.confidence]}
                </Text>
              </View>

              {/* Warnings */}
              {results.warnings && results.warnings.length > 0 && results.warnings.map((w, i) => (
                <View key={i} style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={16} color={colors.warning} />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}

              {/* How calculated (expandable) */}
              <TouchableOpacity
                style={styles.expandHeader}
                onPress={() => setExpanded(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.expandTitle}>How was this calculated?</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {expanded && (
                <View style={styles.expandBody}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Formula</Text>
                    <Text style={styles.calcValue}>{results.bmrFormula}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>BMR</Text>
                    <Text style={styles.calcValue}>{results.bmrKcal} kcal</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Maintenance (TDEE)</Text>
                    <Text style={styles.calcValue}>{results.maintenanceKcal} kcal</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Phase adjustment</Text>
                    <Text style={styles.calcValue}>{results.phase}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Est. rate</Text>
                    <Text style={styles.calcValue}>
                      {results.targetRateKgPerWeek > 0 ? '+' : ''}
                      {results.targetRateKgPerWeek} kg/week
                    </Text>
                  </View>
                  <Text style={styles.disclaimer}>
                    These targets are estimates, not medical advice. Consult a qualified professional before making significant dietary changes.
                  </Text>
                </View>
              )}

              {/* Recalculate */}
              <TouchableOpacity
                style={styles.recalcBtn}
                onPress={handleCalculate}
                disabled={!formComplete || calculating}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.recalcBtnText}>Recalculate</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  pageTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  pageSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: -spacing.sm,
  },

  // ── Section heading ───────────────────────────────────────────────────────────────────

  sectionHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },

  // ── Form groups ────────────────────────────────────────────────────────────────────

  formGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  optional: {
    fontWeight: fontWeight.regular,
    color: colors.textMuted,
  },
  numInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  heightRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  heightUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unitLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },

  // ── Pills ────────────────────────────────────────────────────────────────────────

  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // ── Goal grid ────────────────────────────────────────────────────────────────────

  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  goalCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  goalCardActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  goalCheck: {
    marginBottom: 2,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  goalLabelActive: {
    color: colors.primary,
  },
  goalDetail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  goalDetailActive: {
    color: colors.primaryDim,
  },

  // ── Consent ───────────────────────────────────────────────────────────────────────

  consentCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  consentBody: {
    flex: 1,
    gap: spacing.md,
  },
  consentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentCheckLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },

  // ── Calculate button ──────────────────────────────────────────────────────────────────

  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  calcBtnDisabled: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  calcBtnTextDisabled: {
    color: colors.textDisabled,
  },

  // ── Results section ──────────────────────────────────────────────────────────────────

  resultsSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroKcal: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    color: colors.primary,
    lineHeight: 48,
  },
  heroRange: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  macroGrams: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  macroLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroPerKg: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  phaseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  phaseTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  phaseDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  confidenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
  },
  confidenceText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 18,
  },

  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  expandBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcKey: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  calcValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },

  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  recalcBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
