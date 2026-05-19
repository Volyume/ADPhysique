import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import { calculateNutritionTargets, PROTEIN_APPROACHES } from '../lib/nutritionEngine';
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

function WhySection({ icon, color, title, body }) {
  return (
    <View style={styles.whySection}>
      <View style={styles.whySectionHeader}>
        <View style={[styles.whySectionIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={styles.whySectionTitle}>{title}</Text>
      </View>
      <Text style={styles.whySectionBody}>{body}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BODY_METRICS_KEY_PREFIX = '@volyume_body_metrics_';
const PHYSIQUE_PREF_KEY = '@volyume_physique_tracking_enabled';

export default function NutritionTargetsScreen() {
  const { user } = useAppStore();

  // ── Form state ────────────────────────────────────────────────────────────────
  const [sex,            setSex]            = useState('male');
  const [age,            setAge]            = useState('');
  const [heightFt,       setHeightFt]       = useState('');
  const [heightIn,       setHeightIn]       = useState('');
  const [weight,         setWeight]         = useState('');
  const [bodyFat,        setBodyFat]        = useState('');
  const [bfSource,       setBfSource]       = useState('visual');
  const [activity,       setActivity]       = useState('moderate');
  const [trainingDays,   setTrainingDays]   = useState(4);
  const [goal,           setGoal]           = useState('lean_gain');
  const [proteinApproach, setProteinApproach] = useState('optimised');
  const [customProteinGPerKg, setCustomProteinGPerKg] = useState('');
  const [consent,        setConsent]        = useState(false);

  // ── Results / UI state ──────────────────────────────────────────────────────────
  const [results,      setResults]      = useState(null);
  const [expanded,     setExpanded]     = useState(false);
  const [whyExpanded,  setWhyExpanded]  = useState(true);
  const [calculating,  setCalculating]  = useState(false);
  const [calm,         setCalm]         = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

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
        ageYears:           ageNum,
        heightCm:           heightNum,
        weightKg:           weightNum,
        bodyFatPercent:     bfNum,
        bodyFatSource:      bfNum != null ? bfSource : null,
        activityLevel:      activity,
        goal,
        proteinApproach,
        customProteinGPerKg: proteinApproach === 'custom' && customProteinGPerKg.trim()
          ? parseFloat(customProteinGPerKg)
          : null,
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

      // Auto-enable physique tracking
      AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'true').catch(() => {});
      // Collapse form to show results prominently
      setFormCollapsed(true);
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
          keyboardDismissMode="on-drag"
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.pageTitle}>Nutrition Targets</Text>
            <InfoTooltip
              size={14}
              text={
                'How calories are calculated:\n' +
                '• BMR: Mifflin-St Jeor formula (sex, age, height, weight). If you enter body fat from a measured source (BIA, caliper, or DEXA), Katch-McArdle is used instead — it\'s more accurate because it scales to your actual lean mass, not total weight.\n' +
                '• TDEE: BMR × activity multiplier (1.2 sedentary → 1.9 very active).\n' +
                '• Target: TDEE adjusted by your goal (e.g. +10% for Lean Gain, −13% for Mild Cut).\n\n' +
                'How macros are calculated:\n' +
                '• Protein: 2.2–3.3 g/kg bodyweight (or g/kg lean mass if body fat was measured). Rates rise in deeper deficits to protect muscle — based on Helms et al. 2014 and the RP Hypertrophy framework.\n' +
                '• Fat: 25% of total calories, minimum 0.5 g/kg bodyweight to support hormonal health.\n' +
                '• Carbs: all remaining calories after protein and fat are set.\n\n' +
                'Results are estimates — adjust based on real-world progress over 2–4 weeks.'
              }
            />
          </View>
          <Text style={styles.pageSubtitle}>
            Calculate your personalised daily calorie and macro goals.
          </Text>

          {!formCollapsed ? (
          <>

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

          {/* ── SECTION 4: PROTEIN APPROACH ───────────────────────────────────────────────── */}

          <SectionHeading title="PROTEIN TARGET" />

          <View style={styles.approachNote}>
            <InfoTooltip size={12} text={
              "Different apps and guidelines use different protein targets:\n\n" +
              "• 1.2–1.5 g/kg — mainstream sports nutrition (ISSN, NHS). Adequate for general athletes; easy to hit day-to-day.\n\n" +
              "• 1.6–2.2 g/kg — current hypertrophy research consensus (Morton et al. 2018 meta-analysis). Most evidence suggests gains plateau around 1.62 g/kg bodyweight; going to 2.0 g/kg gives a comfortable buffer above that ceiling without being excessive.\n\n" +
              "• 2.2–3.3 g/kg — RP Hypertrophy / Helms et al. 2014 framework, used by competitive bodybuilders. Rates rise in deficits specifically to prevent muscle breakdown. Effective but harder to sustain.\n\n" +
              "There is no single right answer. Pick the level you can consistently hit. Consistency over weeks matters more than hitting an aggressive target occasionally."
            } />
            <Text style={styles.approachNoteText}>Different guidelines use different targets. Pick the level you can consistently sustain.</Text>
          </View>

          {['standard', 'optimised', 'maximum', 'custom'].map(key => {
            const ap = PROTEIN_APPROACHES[key];
            const active = proteinApproach === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.approachCard, active && styles.approachCardActive]}
                onPress={() => setProteinApproach(key)}
                activeOpacity={0.8}
              >
                <View style={styles.approachCardHeader}>
                  {active && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.approachCardLabel, active && styles.approachCardLabelActive]}>
                    {ap.label}
                  </Text>
                  <Text style={[styles.approachCardRange, active && styles.approachCardRangeActive]}>
                    {key !== 'custom' ? ap.range : ''}
                  </Text>
                  {key === 'optimised' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>Recommended</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.approachCardDesc, active && styles.approachCardDescActive]}>
                  {ap.description}
                </Text>
                {active && key === 'custom' && (
                  <View style={styles.customProteinRow}>
                    <Text style={styles.customProteinLabel}>Protein target</Text>
                    <TextInput
                      style={styles.customProteinInput}
                      value={customProteinGPerKg}
                      onChangeText={setCustomProteinGPerKg}
                      placeholder="e.g. 2.0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      maxLength={4}
                    />
                    <Text style={styles.customProteinUnit}>g / kg</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

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

          </>) : null}

          {formCollapsed ? (
            <View style={styles.collapsedSummary}>
              <View style={styles.collapsedRow}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <Text style={styles.collapsedText} numberOfLines={1}>
                  {sex === 'male' ? 'Male' : 'Female'} · {age}yrs
                  {heightFt ? ` · ${heightFt}ft ${heightIn}in` : ''}
                  {weight ? ` · ${weight}kg` : ''} · {GOALS.find(g => g.key === goal)?.label ?? goal}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormCollapsed(false)} style={styles.reconfigureBtn}>
                <Ionicons name="settings-outline" size={13} color={colors.primary} />
                <Text style={styles.reconfigureBtnText}>Reconfigure</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Calculate button ──────────────────────────────────────────────────────────────── */}

          <TouchableOpacity
            style={[styles.calcBtn, (!formComplete || calculating) && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={!formComplete || calculating}
          >
            <Ionicons
              name={calculating ? 'hourglass-outline' : formCollapsed ? 'refresh-outline' : 'calculator-outline'}
              size={20}
              color={formComplete ? colors.background : colors.textDisabled}
            />
            <Text style={[styles.calcBtnText, !formComplete && styles.calcBtnTextDisabled]}>
              {calculating ? 'Calculating…' : formCollapsed ? 'Recalculate' : 'Calculate Targets'}
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

              {/* ── Why these numbers for you? ─────────────────────── */}
              {(() => {
                // Derive weight from form state; fall back to back-calculation from protein ratio
                const weightKg = parseFloat(weight) > 0
                  ? parseFloat(weight)
                  : results.proteinGPerKg > 0
                    ? Math.round(results.proteinG / results.proteinGPerKg)
                    : null;
                const lbmKg = results.proteinBasis === 'lbm' && results.proteinGPerKgLbm > 0
                  ? Math.round(results.proteinG / results.proteinGPerKgLbm * 10) / 10
                  : null;
                const surplusDelta = Math.round(results.targetKcal - results.maintenanceKcal);
                const isUp = surplusDelta >= 0;
                const absPct = Math.round(Math.abs(surplusDelta / results.maintenanceKcal) * 100);
                const rateAbs = Math.abs(results.targetRateKgPerWeek);
                const rateDir = results.targetRateKgPerWeek >= 0 ? 'gain' : 'lose';
                const fatFloorG = weightKg ? Math.round(Math.max(0.5 * weightKg, 30)) : 30;
                const fatKcal = results.fatG * 9;
                const fatPct = Math.round(fatKcal / results.targetKcal * 100);
                const carbKcal = results.carbsG * 4;

                // Goal-aware text helpers
                const isGain  = ['lean_gain', 'build'].includes(results.goal);
                const isCut   = ['mild_cut', 'aggressive_cut', 'contest_prep'].includes(results.goal);
                const isRecomp = results.goal === 'recomp';

                const calorieWhy = isGain
                  ? `Your maintenance is ${results.maintenanceKcal.toLocaleString()} kcal — what you need to stay the same weight. Adding a ${absPct}% surplus (+${surplusDelta} kcal) gives your muscles the extra energy and building blocks to grow. At ${rateAbs.toFixed(2)} kg/week projected gain, you're in the sweet spot: fast enough to accumulate lean mass, slow enough to keep fat gain minimal.`
                  : isCut
                  ? `Your maintenance is ${results.maintenanceKcal.toLocaleString()} kcal. A ${absPct}% deficit (−${Math.abs(surplusDelta)} kcal) puts you on track to ${rateDir} roughly ${rateAbs.toFixed(2)} kg/week. That rate is ${rateAbs <= 0.5 ? 'conservative — you\'ll lose mostly fat while retaining more muscle' : rateAbs <= 0.8 ? 'moderate — effective fat loss with manageable muscle risk' : 'aggressive — protein intake has been raised to protect lean mass'}. The key is consistency over weeks, not perfection each day.`
                  : `Your maintenance is ${results.maintenanceKcal.toLocaleString()} kcal. A slight ${Math.abs(absPct)}% deficit puts you in recomposition territory — just enough of a deficit to mobilise body fat as fuel, while high protein and training stimulus tell your body to hold (and even build) muscle. Progress is slower than a dedicated bulk or cut, but body composition improves simultaneously.`;

                const approachInfo = PROTEIN_APPROACHES[results.proteinApproach ?? 'optimised'];
                const approachRef =
                  results.proteinApproach === 'standard'
                    ? 'mainstream sports nutrition guidelines (ISSN)'
                    : results.proteinApproach === 'maximum'
                    ? 'the RP Hypertrophy / Helms et al. 2014 framework'
                    : 'current hypertrophy meta-analysis consensus (Morton et al. 2018)';
                const basisStr = results.proteinBasis === 'lbm'
                  ? `${results.proteinGPerKgLbm} g/kg lean mass`
                  : `${results.proteinGPerKg} g/kg bodyweight`;

                const proteinWhy = results.proteinBasis === 'lbm'
                  ? (() => {
                      const lbmLine = `You have roughly ${lbmKg} kg of lean mass. At ${results.proteinGPerKgLbm} g/kg lean mass, ${results.proteinG}g comes from ${approachRef}. `;
                      const scalingLine = `We scale to lean mass rather than total weight because fat tissue doesn't need protein to maintain — this gives a more precise target regardless of body-fat level. `;
                      const purposeLine = isGain
                        ? `Protein is the raw material your muscles rebuild with after every session. Research suggests gains plateau around 1.62 g/kg bodyweight (~2.0 g/kg LBM); at ${results.proteinGPerKgLbm} g/kg LBM you're above that threshold.`
                        : isRecomp
                        ? `High protein does two jobs in a recomp: amino acids for muscle protein synthesis, and a signal for your body to spare muscle even as the slight deficit encourages fat oxidation. This dual role is what separates "losing weight" from "changing body composition."`
                        : `In a deficit, the body can break down muscle for fuel — high protein is the primary tool to prevent this (anti-catabolism). ${results.proteinApproach === 'maximum' ? `Helms et al. 2014 found 2.3–3.1 g/kg LBM optimal for contest prep; at ${results.proteinGPerKgLbm} g/kg you're within that protective band.` : 'Your target keeps you well above the minimum needed to preserve lean mass.'}`;
                      return lbmLine + scalingLine + purposeLine;
                    })()
                  : (() => {
                      const bwLine = `At ${results.proteinGPerKg} g/kg bodyweight (${results.proteinG}g), your target is based on ${approachRef}. `;
                      const tipLine = `Tip: entering a measured body fat % (BIA, caliper, or DEXA) lets us scale to lean mass instead — more precise, especially if your body-fat % is high or low. `;
                      const purposeLine = isGain
                        ? `Protein is the raw material muscles rebuild with after every session. At ${results.proteinGPerKg} g/kg you're above the threshold where muscle protein synthesis is saturated, giving you a comfortable margin.`
                        : isRecomp
                        ? `High protein in a recomp provides amino acids for muscle protein synthesis while signalling your body to spare lean mass as fat is mobilised for energy.`
                        : `In a calorie deficit, muscle tissue becomes a fuel source if protein is too low — the primary driver of "skinny fat" outcomes. At ${results.proteinGPerKg} g/kg you're in the anti-catabolic range, and the high satiety of protein also helps adherence.`;
                      return bwLine + tipLine + purposeLine;
                    })();

                const fatWhy = `Fat has two non-negotiable roles: testosterone and sex hormone production depend on dietary fat, and vitamins A, D, E, and K are fat-soluble — meaning they can't be absorbed without it. We set yours to ${fatPct}% of your calories (${results.fatG}g), with a hard floor of ${fatFloorG}g. Dropping below that floor — even temporarily during a cut — can suppress testosterone and impair recovery. Think of fat as your hormonal infrastructure budget: it's the last macro to cut.`;

                const carbWhy = isGain
                  ? `Carbs are your primary training fuel. Glycogen (stored muscle carbohydrate) is what powers your working sets — by the fourth or fifth set, it's almost exclusively glycogen being used. Your ${results.carbsG}g gives you more than enough to top up glycogen between sessions and arrive at every workout ready to push hard. More training stimulus from better-fuelled sessions means more muscle growth stimulus — carbs in a surplus are the performance multiplier.`
                  : isCut
                  ? `After protein (muscle preservation) and fat (hormones) are set, carbs fill the remaining ${carbKcal} kcal. Carbs are reduced in a deficit because — unlike protein and fat — they don't have critical structural roles. Your ${results.carbsG}g still provides meaningful glycogen for training. If you notice performance declining significantly late in your cut, that's a signal to increase calories slightly. Timing carbs around your training sessions (pre- and post-workout) will get you the most performance per gram.`
                  : `Carbs fill the remaining ${carbKcal} kcal after protein and fat are set. In a recomp they're kept moderate — enough to fuel training and replenish glycogen, but not so many that they block the small deficit needed for fat loss. Prioritise carbs around your workouts: pre-session for fuel, post-session for glycogen replenishment. The rest of the day can be lower-carb without hurting performance.`;

                return (
                  <View style={styles.whyCard}>
                    <TouchableOpacity
                      style={styles.whyHeader}
                      onPress={() => setWhyExpanded(v => !v)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.whyHeaderLeft}>
                        <Ionicons name="school-outline" size={18} color={colors.primary} />
                        <Text style={styles.whyHeaderLabel}>Why these numbers for you?</Text>
                      </View>
                      <Ionicons name={whyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    {whyExpanded && (
                      <View style={styles.whyBody}>
                        <WhySection icon="flame-outline" color={colors.warning} title={`Calories — ${results.targetKcal.toLocaleString()} kcal`} body={calorieWhy} />
                        <WhySection icon="barbell-outline" color={colors.primary} title={`Protein — ${results.proteinG}g`} body={proteinWhy} />
                        <WhySection icon="water-outline" color={colors.success} title={`Fat — ${results.fatG}g`} body={fatWhy} />
                        <WhySection icon="leaf-outline" color="#A78BFA" title={`Carbs — ${results.carbsG}g`} body={carbWhy} />
                      </View>
                    )}
                  </View>
                );
              })()}

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
                  <View style={[styles.calcRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[styles.calcKey, { fontWeight: fontWeight.bold }]}>Macro method</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Protein basis</Text>
                    <Text style={styles.calcValue}>
                      {results.proteinBasis === 'lbm'
                        ? `${results.proteinGPerKgLbm ?? '—'} g/kg lean mass`
                        : `${results.proteinGPerKg ?? '—'} g/kg bodyweight`}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Fat</Text>
                    <Text style={styles.calcValue}>25% of calories (min 0.5 g/kg BW)</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Carbs</Text>
                    <Text style={styles.calcValue}>Remaining calories</Text>
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

  // ── Collapsed form summary ────────────────────────────────────────────────────────

  collapsedSummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collapsedText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reconfigureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  reconfigureBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // ── Protein approach ─────────────────────────────────────────────────────────

  approachNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  approachNoteText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },
  approachCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  approachCardActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  approachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  approachCardLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  approachCardLabelActive: { color: colors.primary },
  approachCardRange: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  approachCardRangeActive: { color: colors.primaryDim },
  approachCardDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  approachCardDescActive: { color: colors.primaryDim },
  recommendedBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  customProteinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  customProteinLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  customProteinInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    width: 90,
    textAlign: 'center',
  },
  customProteinUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },

  // ── Why these numbers ────────────────────────────────────────────────────────

  whyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  whyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whyHeaderLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  whyBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  whySection: {
    gap: spacing.sm,
  },
  whySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whySectionIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whySectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  whySectionBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingLeft: 32,
  },
});
