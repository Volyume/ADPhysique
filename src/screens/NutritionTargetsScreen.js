import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import { useToast } from '../components/Toast';
import { calculateNutritionTargets, PROTEIN_APPROACHES } from '../lib/nutritionEngine';
import { saveNutritionTargets, getNutritionTargets, logBodyMetric, getUserBodyProfile } from '../lib/database';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
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


const BF_SOURCES = [
  { key: 'visual',  label: 'Visual' },
  { key: 'bia',     label: 'BIA' },
  { key: 'caliper', label: 'Caliper' },
  { key: 'dexa',    label: 'DEXA' },
];

const GOALS = [
  { key: 'lean_gain',        label: 'Build muscle (slow)',   detail: '+10% surplus' },
  { key: 'build',            label: 'Build muscle (fast)',   detail: '+17% surplus' },
  { key: 'maintain',         label: 'Maintain weight',       detail: '0%' },
  { key: 'recomp',           label: 'Hold muscle, lose fat',  detail: '−5%' },
  { key: 'mild_cut',         label: 'Lose weight (steady)',  detail: '−13%' },
  { key: 'aggressive_cut',   label: 'Lose weight (fast)',    detail: '−22%' },
];

const PHASE_DESCRIPTIONS = {
  lean_gain:       'A modest calorie surplus supports steady muscle growth while keeping fat gain minimal.',
  build:           'A larger calorie surplus helps you recover from hard training and supports consistent muscle growth over time.',
  maintain:        'Enough calories to fuel your training and hold your current body composition.',
  recomp:          'A slight calorie reduction with high protein allows for gradual fat loss while holding muscle.',
  mild_cut:        'A moderate calorie reduction that preserves strength and muscle while steadily losing fat.',
  aggressive_cut:  'A significant calorie reduction for faster fat loss. Protein is raised to protect muscle during the deficit.',
  contest_prep:    'A steep calorie reduction for the run-in to a stage. Short-term by design. Protein is pushed hard to defend every kg of muscle.',
};

const CONFIDENCE_LABELS = {
  high:   'High confidence. Body fat measured by a precise method.',
  medium: 'Medium confidence. Based on a formula estimate.',
  low:    'Low confidence. Body fat estimated visually.',
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
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={typeof label === 'string' ? label : undefined}
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
        <View style={[styles.whySectionIcon, { backgroundColor: withAlpha(color, 0.125) }]}>
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

export default function NutritionTargetsScreen({ navigation }) {
  const toast = useToast();
  // Use a shallow selector instead of useAppStore() with no args. The
  // bare call subscribes to the entire store object, so every store
  // mutation (rest timer ticks, sync events, etc.) re-renders this
  // huge screen. Selecting just the two fields we read means we only
  // re-render when those change.
  const { user, userProfile } = useAppStore(useShallow(s => ({ user: s.user, userProfile: s.userProfile })));

  // ── Form state ────────────────────────────────────────────────────────────────
  const [sex,            setSex]            = useState('male');
  const [age,            setAge]            = useState('');
  const [heightFt,       setHeightFt]       = useState('');
  const [heightIn,       setHeightIn]       = useState('');
  const [weight,         setWeight]         = useState('');
  const [bodyFat,        setBodyFat]        = useState('');
  const [bfSource,       setBfSource]       = useState('visual');
  const [activity,       setActivity]       = useState('moderate');
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

  // ── Per-meal distribution, guidance only, daily totals unchanged ───────────────
  // Per-meal MPS window: ~0.4 g/kg (floor) to ~0.55 g/kg (above this, diminishing
  // returns). We pick the smallest meal count where per-meal protein stays at or
  // below the ceiling, so bodybuilders on high daily targets automatically split
  // across more feedings rather than overshooting the per-meal ceiling.
  const [mealsPerDay,     setMealsPerDay]     = useState(null);  // null = use recommended
  useEffect(() => {
    AsyncStorage.getItem('@volyume_meals_per_day')
      .then(v => { const n = parseInt(v, 10); if (n >= 3 && n <= 6) setMealsPerDay(n); })
      .catch(() => {});
  }, []);
  function changeMealsPerDay(n) {
    setMealsPerDay(n);
    AsyncStorage.setItem('@volyume_meals_per_day', String(n)).catch(() => {});
  }
  // Recommended meal count: smallest count keeping per-meal protein ≤ 0.55 g/kg.
  // Falls back to 4 when bodyweight isn't available.
  function getRecommendedMeals(proteinG, weightKg) {
    if (!proteinG || !weightKg) return 4;
    const upperPerMeal = weightKg * 0.55;
    const minCount = Math.ceil(proteinG / upperPerMeal);
    return Math.max(3, Math.min(6, minCount));
  }

  // ── Load saved targets on mount, SQLite primary, AsyncStorage fallback ────────────
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
        if (user?.id) {
          const fromDb = await getNutritionTargets(user.id).catch(() => null);
          if (fromDb?.targetKcal) {
            setResults(fromDb);
            setFormCollapsed(true);
            return;
          }
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.targetKcal) {
            setResults(parsed);
            setFormCollapsed(true);
          }
        }
      } catch (_) {}
    }
    loadSaved();
  }, [user?.id]);

  // Pre-populate form from saved body profile so users don't re-enter stats
  useEffect(() => {
    async function prefill() {
      if (!user?.id) return;
      try {
        const profile = await getUserBodyProfile(user.id).catch(() => null);
        if (!profile) return;
        if (profile.sex) setSex(profile.sex);
        if (profile.heightCm) {
          const totalIn = Math.round(profile.heightCm / 2.54);
          setHeightFt(String(Math.floor(totalIn / 12)));
          setHeightIn(String(totalIn % 12));
        }
        if (profile.dateOfBirth) {
          const ageNum = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
          if (ageNum > 0 && ageNum < 100) setAge(String(ageNum));
        }
      } catch (_) {}
    }
    prefill();
  }, [user?.id]);

  // Pre-fill goal from profile (userProfile.goal stores the nutritionKey directly)
  useEffect(() => {
    const VALID_GOALS = ['lean_gain', 'build', 'maintain', 'recomp', 'mild_cut', 'aggressive_cut'];
    const profileGoal = userProfile?.goal;
    if (profileGoal && VALID_GOALS.includes(profileGoal)) setGoal(profileGoal);
  }, [userProfile?.goal]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const formComplete =
    sex && age.trim() && heightFt.trim() && weight.trim() && consent;

  // ── Calculate ──────────────────────────────────────────────────────────────
  async function handleCalculate() {
    if (!formComplete) return;

    const ageNum    = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    // Number.isFinite so a partial entry like "." (parseFloat('.') === NaN)
    // resolves to null rather than flowing a NaN body fat into the engine,
    // which produced NaN calorie/macro targets that then persisted.
    const bfParsed  = parseFloat(bodyFat);
    const bfNum     = bodyFat.trim() && Number.isFinite(bfParsed) ? bfParsed : null;
    const ftNum     = parseInt(heightFt, 10) || 0;
    const inNum     = parseFloat(heightIn) || 0;
    const heightNum = ftNum * 30.48 + inNum * 2.54; // convert to cm

    if (!ageNum || !heightNum || !weightNum) {
      toast.show('Age, height and weight must be valid numbers', { variant: 'error' });
      return;
    }

    // Custom protein approach without a g/kg value used to crash the
    // engine. The engine now falls back, but warn here so the user knows
    // their custom value didn't take effect.
    if (proteinApproach === 'custom') {
      const customNum = parseFloat(customProteinGPerKg);
      if (!customNum || customNum <= 0) {
        toast.show('Enter a protein value in g/kg, or switch to Optimised', { variant: 'warning' });
        return;
      }
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
      toast.show(e.message || 'Could not calculate targets', { variant: 'error' });
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Text style={styles.pageTitle}>Nutrition Targets</Text>
            <InfoTooltip
              size={14}
              text={
                'How calories are calculated:\n' +
                '• Calorie baseline: a standard formula using your sex, age, height, and weight to estimate how many calories you burn at rest. If you enter a measured body fat percentage (from a scan or caliper test), we use a more accurate formula that accounts for your actual muscle mass.\n' +
                '• Maintenance: your baseline × an activity multiplier based on how much you move each day.\n' +
                '• Target: your maintenance adjusted for your goal (e.g. +10% for slow muscle building, -13% for steady fat loss).\n\n' +
                'How your targets are calculated:\n' +
                '• Protein: varies by your chosen approach (1.2 to 3.3 g/kg). Rates rise in deeper deficits to protect muscle. Select your approach in the Protein Target section.\n' +
                '• Fat: set by phase (0.7–1.0 g/kg bodyweight). Surplus phases use a lower fat target so carbs stay high for training performance. Deficit phases hold fat constant while carbs reduce first. Minimum 0.5 g/kg for hormonal health.\n' +
                '• Carbs: all remaining calories after protein and fat are set.\n\n' +
                'These are estimates. Adjust based on real-world progress over 2 to 4 weeks.'
              }
            />
          </View>
          <Text style={styles.pageSubtitle}>
            Calculate your personalised daily calorie and protein targets.
          </Text>

          {/* Education entry point, surfaces a 5-min nutrition primer for
              users new to tracking. Doesn't change targets, just teaches. */}
          <TouchableOpacity
            style={styles.eduCard}
            onPress={() => navigation.navigate('NutritionEducation')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="New to calories and macros? Open the 5-minute guide"
          >
            <View style={styles.eduIconWrap}>
              <Ionicons name="book-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eduTitle}>New to calories and macros?</Text>
              <Text style={styles.eduBody}>5-minute guide to what these numbers mean and how to actually use them.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {!formCollapsed ? (
          <>

          {/* ── SECTION 1: ABOUT YOU ───────────────────────────────────────────────────── */}

          <SectionHeading title="About you" />

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
              accessibilityLabel="Age"
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
                  accessibilityLabel="Height, feet"
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
                  accessibilityLabel="Height, inches"
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
              accessibilityLabel="Current weight in kilograms"
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
              accessibilityLabel="Body fat percentage"
            />
          </View>

          {/* BF Source, only shown when BF is entered */}
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

          <SectionHeading title="Activity & training" />

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Activity level</Text>
            <PillGroup
              options={ACTIVITY_OPTIONS}
              selected={activity}
              onSelect={setActivity}
            />
          </View>

          {/* ── SECTION 3: GOAL & PHASE ────────────────────────────────────────────────────── */}

          <SectionHeading title="Goal & phase" />

          <View style={styles.goalGrid}>
            {GOALS.filter(g => !(calm && g.key === 'aggressive_cut')).map(g => {
              const active = goal === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalCard, active && styles.goalCardActive]}
                  onPress={() => setGoal(g.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={g.label}
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

          <SectionHeading title="Protein target" />

          <View style={styles.approachNote}>
            <InfoTooltip size={12} text={
              "Different guidelines recommend different protein targets:\n\n" +
              "• 1.2 to 1.5 g/kg: general athletic guidelines. Adequate for muscle growth and easy to hit day-to-day.\n\n" +
              "• 1.6 to 2.2 g/kg: the range most commonly recommended for building muscle. Research suggests gains plateau around 1.62 g/kg bodyweight; the upper end gives a comfortable buffer without being excessive.\n\n" +
              "• 2.2 to 3.3 g/kg: the upper end, used by serious athletes and people cutting aggressively. Effective at preserving muscle, but harder to sustain day-to-day.\n\n" +
              "There is no single right answer. The level you can consistently hit every day will produce better results than an aggressive target you miss half the time."
            } />
            <Text style={styles.approachNoteText}>Different guidelines use different targets. Pick the level you can consistently sustain.</Text>
          </View>

          {['standard', 'optimised', 'advanced', 'custom'].map(key => {
            const ap = PROTEIN_APPROACHES[key];
            const active = proteinApproach === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.approachCard, active && styles.approachCardActive]}
                onPress={() => setProteinApproach(key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={ap.label}
              >
                <View style={styles.approachCardHeader}>
                  {active && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: spacing.xs }} />}
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
                      accessibilityLabel="Protein target, grams per kilogram"
                    />
                    <Text style={styles.customProteinUnit}>g / kg</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* ── GDPR Consent ───────────────────────────────────────────────────────────────────── */}

          <View style={styles.consentCard}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginTop: spacing.xxs }} />
            <View style={styles.consentBody}>
              <Text style={styles.consentText}>
                Your body data is stored only on this device. It is never shared and you can delete it at any time.
              </Text>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsent(v => !v)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                accessibilityLabel="I consent to storing this data on my device"
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
                <Ionicons name="nutrition" size={14} color={colors.textMuted} />
                <Text style={styles.collapsedText} numberOfLines={1}>
                  {age && weight && heightFt
                    ? `${sex === 'male' ? 'Male' : 'Female'} · ${age}yrs · ${heightFt}ft${heightIn ? ` ${heightIn}in` : ''} · ${weight}kg · ${GOALS.find(g => g.key === goal)?.label ?? goal}`
                    : `${GOALS.find(g => g.key === goal)?.label ?? 'Targets set during coaching setup'}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormCollapsed(false)} style={styles.reconfigureBtn} accessibilityRole="button" accessibilityLabel="Adjust">
                <Ionicons name="settings-outline" size={13} color={colors.primary} />
                <Text style={styles.reconfigureBtnText}>Adjust</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Calculate button, only shown when form is open ───────────────────────────── */}

          {!formCollapsed && (
            <TouchableOpacity
              style={[styles.calcBtn, (!formComplete || calculating) && styles.calcBtnDisabled]}
              onPress={handleCalculate}
              disabled={!formComplete || calculating}
              accessibilityRole="button"
              accessibilityState={{ disabled: !formComplete || calculating }}
              accessibilityLabel="Calculate targets"
            >
              <Ionicons
                name={calculating ? 'hourglass-outline' : 'calculator-outline'}
                size={20}
                color={formComplete ? colors.background : colors.textDisabled}
              />
              <Text style={[styles.calcBtnText, !formComplete && styles.calcBtnTextDisabled]}>
                {calculating ? 'Calculating…' : 'Calculate targets'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── RESULTS ─────────────────────────────────────────────────────────────────────── */}

          {results ? (
            <View style={styles.resultsSection}>
              {/* Hero card. targetKcal is persisted but the ±10% range is
                  not, so a record loaded from the DB has no kcalMin/kcalMax
                 , derive them rather than crash on undefined. */}
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

              {/* ── Per-meal protein distribution ───────────────────
                  Guidance only, daily total unchanged. Splits the
                  prescribed daily protein across 3–6 feedings, with
                  the recommended count chosen to keep per-meal in the
                  0.4–0.55 g/kg muscle protein synthesis window. */}
              {results.proteinG > 0 && (() => {
                // Derive bodyweight from form or back-calculate from results
                const formWeightKg = parseFloat(weight) > 0 ? parseFloat(weight) : null;
                const derivedWeightKg = (results.proteinGPerKg > 0)
                  ? Math.round(results.proteinG / results.proteinGPerKg)
                  : null;
                const weightKg = formWeightKg ?? derivedWeightKg;
                const recommended = getRecommendedMeals(results.proteinG, weightKg);
                const effectiveMeals = mealsPerDay ?? recommended;
                const perMeal = Math.round(results.proteinG / effectiveMeals);
                const perMealPerKg = weightKg ? perMeal / weightKg : null;

                // Window hint: only surface if user has manually picked a sub-optimal count
                let windowHint = null;
                if (mealsPerDay !== null && weightKg) {
                  if (perMealPerKg > 0.55) {
                    windowHint = `${perMeal}g is over the per-meal sweet spot. ${recommended} meals (${Math.round(results.proteinG / recommended)}g each) hits it better.`;
                  } else if (perMealPerKg < 0.4 && results.proteinG / Math.max(3, effectiveMeals - 1) <= weightKg * 0.55) {
                    windowHint = `${perMeal}g is below the per-meal threshold that maximises growth. Try fewer meals.`;
                  }
                }

                return (
                  <View style={styles.perMealCard}>
                    <View style={styles.perMealHeader}>
                      <Text style={styles.perMealHeading}>PER MEAL</Text>
                      <InfoTooltip
                        size={12}
                        text={
                          'How to split your daily protein across the day.\n\n' +
                          'Each meal should land in a window of roughly 0.4 to 0.55 g of protein per kilogram of bodyweight. Below that, the meal does not give you the full muscle-building benefit. Above it, the extra protein mostly goes to waste at that meal.\n\n' +
                          'Volyume picks the smallest meal count that keeps every meal at or below the ceiling, so your daily target is hit without overshooting per-meal. Your daily total stays exactly the same. This is purely how to split it.'
                        }
                      />
                    </View>

                    <View style={styles.perMealCenter}>
                      <Text style={styles.perMealValue}>{perMeal}g</Text>
                      <Text style={styles.perMealUnit}>protein per meal</Text>
                    </View>

                    <View style={styles.mealDotsRow}>
                      {Array.from({ length: effectiveMeals }).map((_, i) => (
                        <View key={i} style={styles.mealDot} />
                      ))}
                    </View>

                    <View style={styles.mealCountRow}>
                      <Text style={styles.mealCountLabel}>Across</Text>
                      <View style={styles.mealCountChips}>
                        {[3, 4, 5, 6].map(n => {
                          const active = effectiveMeals === n;
                          const isRecommended = recommended === n;
                          return (
                            <TouchableOpacity
                              key={n}
                              style={[styles.mealCountChip, active && styles.mealCountChipActive]}
                              onPress={() => changeMealsPerDay(n)}
                              accessibilityRole="button"
                              accessibilityLabel={`${n} meals per day${isRecommended ? ', recommended' : ''}`}
                              accessibilityState={{ selected: active }}
                            >
                              <Text style={[styles.mealCountChipText, active && styles.mealCountChipTextActive]}>
                                {n}
                              </Text>
                              {isRecommended && (
                                <View style={styles.mealCountRecDot} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.mealCountLabel}>feedings</Text>
                    </View>

                    <Text style={styles.mealCountRecCaption}>
                      <Text style={styles.mealCountRecCaptionDot}>●</Text>
                      {' '}Recommended for your protein target
                    </Text>

                    {windowHint && (
                      <View style={styles.perMealHint}>
                        <Ionicons name="information-circle-outline" size={13} color={colors.warning} />
                        <Text style={styles.perMealHintText}>{windowHint}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* ── Why these numbers for you? ─────────────────────── */}
              {(() => {
                // Derive weight, form state is preferred; fall back to back-calculation
                const formWeightKg = parseFloat(weight) > 0 ? parseFloat(weight) : null;
                // proteinGPerKg may be absent when results come from the DB (DB stores
                // only core numbers). Derive it from proteinG / weightKg as a fallback.
                const safeProteinGPerKg = results.proteinGPerKg != null
                  ? results.proteinGPerKg
                  : (formWeightKg && results.proteinG)
                    ? parseFloat((results.proteinG / formWeightKg).toFixed(2))
                    : null;
                const weightKg = formWeightKg
                  ?? (safeProteinGPerKg > 0 ? Math.round(results.proteinG / safeProteinGPerKg) : null);
                const lbmKg = results.proteinBasis === 'lbm' && results.proteinGPerKgLbm > 0
                  ? Math.round(results.proteinG / results.proteinGPerKgLbm * 10) / 10
                  : null;
                const maintenanceKcal = results.maintenanceKcal ?? results.targetKcal ?? 0;
                const surplusDelta = Math.round((results.targetKcal ?? 0) - maintenanceKcal);
                const absPct = maintenanceKcal > 0 ? Math.round(Math.abs(surplusDelta / maintenanceKcal) * 100) : 0;
                const rateAbs = Math.abs(results.targetRateKgPerWeek);
                const rateDir = results.targetRateKgPerWeek >= 0 ? 'gain' : 'lose';
                const fatFloorG = weightKg ? Math.round(Math.max(0.5 * weightKg, 30)) : 30;
                const carbKcal = results.carbsG * 4;

                // Goal-aware text helpers. Maintain (0% deficit) and
                // Recomp (~5% deficit) need separate copy, they're
                // different intents. Maintain used to inherit the
                // recomp template which rendered "A slight 0% deficit"
                //, nonsense.
                const isGain     = ['lean_gain', 'build'].includes(results.goal);
                const isCut      = ['mild_cut', 'aggressive_cut', 'contest_prep'].includes(results.goal);
                const isRecomp   = results.goal === 'recomp';
                const isMaintain = results.goal === 'maintain';

                const calorieWhy = isGain
                  ? `Your maintenance is ${maintenanceKcal.toLocaleString()} kcal. That is what you need to stay the same weight. Adding a ${absPct}% surplus (+${surplusDelta} kcal) puts you on track to gain roughly ${rateAbs.toFixed(2)} kg/week. ${rateAbs <= 0.3 ? 'That rate is slow and lean. Most of what you gain will be muscle, with very little fat alongside it.' : rateAbs <= 0.5 ? 'That rate is steady. Some fat alongside the muscle is inevitable, but the ratio stays favourable.' : 'That rate is on the faster side. Muscle gain is quicker but more fat comes along with it.'} Consistency over weeks matters far more than perfection each day.`
                  : isCut
                  ? `Your maintenance is ${maintenanceKcal.toLocaleString()} kcal. A ${absPct}% deficit (${Math.abs(surplusDelta)} kcal below maintenance) puts you on track to ${rateDir} roughly ${rateAbs.toFixed(2)} kg/week. That rate is ${rateAbs <= 0.5 ? 'conservative. You will lose mostly fat while holding onto more muscle' : rateAbs <= 0.8 ? 'moderate. Effective fat loss with manageable risk to muscle' : 'aggressive. Protein has been set higher to protect your muscle'}. Consistency over weeks matters far more than perfection each day.`
                  : isMaintain
                  ? `Your target is ${(results.targetKcal ?? 0).toLocaleString()} kcal, which matches your maintenance level. Eating at maintenance gives you the energy to recover hard and train hard, without gaining fat. With high protein and consistent training, you can still build muscle slowly and improve body composition. No deficit, no surplus: a clean baseline.`
                  : isRecomp
                  ? `Your maintenance is ${maintenanceKcal.toLocaleString()} kcal. A small ${Math.abs(absPct)}% deficit (${Math.abs(surplusDelta)} kcal below maintenance) gives just enough of a calorie gap to use body fat as fuel, while high protein and consistent training keep muscle on. Progress is slower than a dedicated muscle building or fat loss phase, but your body composition improves at the same time.`
                  : `Your target is ${(results.targetKcal ?? 0).toLocaleString()} kcal based on your maintenance of ${maintenanceKcal.toLocaleString()} kcal.`;

                const approachLabel =
                  results.proteinApproach === 'standard'
                    ? 'general athletic guidelines'
                    : results.proteinApproach === 'advanced'
                    ? 'a higher-end competitive protocol'
                    : results.proteinApproach === 'custom'
                    ? 'your custom target'
                    : 'the most commonly recommended range for building muscle';

                const proteinWhy = results.proteinBasis === 'lbm'
                  ? (() => {
                      const lbmLine = `You have roughly ${lbmKg} kg of muscle and bone. At ${results.proteinGPerKgLbm} g per kg of that muscle mass, ${results.proteinG}g is based on ${approachLabel}. `;
                      const scalingLine = `We scale to muscle mass rather than total weight because fat tissue doesn't need protein to maintain itself. This gives a more precise target regardless of your body-fat level. `;
                      const purposeLine = isGain
                        ? `Protein is the raw material your muscles rebuild with after every session. Your target is above the threshold where muscle repair and growth is fully supported.`
                        : isRecomp
                        ? `High protein does two things: it gives your muscles what they need to rebuild after training, and it signals your body to hold on to muscle even as the slight calorie gap burns fat. That combination is what separates losing weight from actually improving how you look.`
                        : isMaintain
                        ? `Even at maintenance, protein is the raw material your muscles rebuild with after every session. Hitting this target consistently is what lets you add muscle slowly even on a stable bodyweight.`
                        : `In a deficit, the body can start breaking down muscle for fuel. High protein is the main way to prevent that. Your target keeps you well above the amount needed to preserve muscle.`;
                      return lbmLine + scalingLine + purposeLine;
                    })()
                  : (() => {
                      const bwLine = safeProteinGPerKg != null
                        ? `At ${safeProteinGPerKg} g/kg bodyweight (${results.proteinG}g), your target is based on ${approachLabel}. `
                        : `Your target of ${results.proteinG}g is based on ${approachLabel}. `;
                      const tipLine = `Tip: entering a measured body fat % (from a scan or body fat caliper) lets us scale to your muscle mass instead of total weight. That gives a more precise target, especially if your body-fat % is high or low. `;
                      const purposeLine = isGain
                        ? `Protein is the raw material muscles rebuild with after every session. At this target you're above the threshold where muscle repair and growth is fully supported.`
                        : isRecomp
                        ? `When you are trying to hold muscle while losing fat, high protein provides the amino acids needed for muscle repair while telling your body to use fat as fuel instead.`
                        : isMaintain
                        ? `At maintenance, protein supplies the amino acids your muscles need to rebuild after each session. Hitting this target consistently is what lets you add muscle slowly on a stable bodyweight.`
                        : `In a calorie deficit, muscle tissue can become a fuel source if protein is too low. This target keeps you well above that threshold, and the high satiety of protein makes it easier to stick to your calories.`;
                      return bwLine + tipLine + purposeLine;
                    })();

                const fatWhy = `Fat does two essential jobs: it supports hormone production, and lets your body absorb vitamins A, D, E, and K. Your ${results.fatG}g target is set by your phase rather than a fixed percentage of calories. ${isGain ? 'In a surplus we keep fat moderate so carbs can take the lion\'s share and fuel hard training.' : isCut ? 'In a deficit fat holds reasonably steady while carbs come down first, since carbs are easier to reduce without affecting hormonal recovery.' : isMaintain ? 'At maintenance fat sits at a comfortable middle, leaving carbs as your main training fuel.' : 'Fat is held moderate so carbs can cover most of your training fuel needs.'} The hard floor is ${fatFloorG}g. Sustained drops below that can disrupt hormonal recovery.`;

                const carbWhy = isGain
                  ? `Carbs are your main training fuel. Glycogen (the carbohydrate stored in muscle) powers you through your sets. By the fourth or fifth set it is almost exclusively glycogen being used. Your ${results.carbsG}g gives you plenty to top up between sessions and arrive at every workout ready to push hard. Better-fuelled sessions mean better training, which means more muscle growth.`
                  : isCut
                  ? `After protein and fat are set, carbs fill the remaining ${carbKcal} kcal. They get reduced in a deficit because, unlike protein and fat, they do not have critical structural roles in the body. Your ${results.carbsG}g still provides meaningful glycogen for training. If performance drops significantly late in your cut, that is a signal to bring calories up slightly. Timing carbs around your sessions (before and after training) will give you the most out of each gram.`
                  : isMaintain
                  ? `Carbs fill the remaining ${carbKcal} kcal after protein and fat are set. At maintenance there's no need to restrict them. Your ${results.carbsG}g keeps glycogen full so every session has the fuel to push hard. Timing the bulk of them around training is the only nuance worth bothering with.`
                  : `Carbs fill the remaining ${carbKcal} kcal after protein and fat are set. When holding muscle while losing fat, carbs are kept moderate: enough to fuel your sessions and top up your energy stores, but not so many that they cancel the small deficit needed for fat loss. Eat most of your carbs around your training sessions. The rest of the day can be lower-carb without affecting performance.`;

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
                        <WhySection icon="flame-outline" color={colors.warning} title={`Calories: ${(results.targetKcal ?? 0).toLocaleString()} kcal`} body={calorieWhy} />
                        <WhySection icon="barbell-outline" color={colors.primary} title={`Protein: ${results.proteinG}g`} body={proteinWhy} />
                        <WhySection icon="water-outline" color={colors.success} title={`Fat: ${results.fatG}g`} body={fatWhy} />
                        <WhySection icon="leaf-outline" color={colors.primary} title={`Carbs: ${results.carbsG}g`} body={carbWhy} />
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Phase card, phase/goal may be absent when loaded from DB */}
              {(results.goal || results.phase) ? (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>
                    {results.phase || GOALS.find(g => g.key === results.goal)?.label || ''}
                  </Text>
                  <Text style={styles.phaseDesc}>
                    {PHASE_DESCRIPTIONS[results.goal] ?? ''}
                  </Text>
                </View>
              ) : null}

              {/* Confidence card, only shown when confidence is available */}
              {results.confidence ? (
                <View style={[styles.confidenceCard, { borderColor: withAlpha(CONFIDENCE_COLORS[results.confidence] ?? colors.border, 0.251) }]}>
                  <Ionicons
                    name={CONFIDENCE_ICONS[results.confidence] ?? 'information-circle'}
                    size={20}
                    color={CONFIDENCE_COLORS[results.confidence] ?? colors.textMuted}
                  />
                  <Text style={styles.confidenceText}>
                    {CONFIDENCE_LABELS[results.confidence]}
                  </Text>
                </View>
              ) : null}

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
                    <Text style={styles.calcKey}>Resting calorie burn</Text>
                    <Text style={styles.calcValue}>{results.bmrKcal} kcal</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Maintenance calories</Text>
                    <Text style={styles.calcValue}>{results.maintenanceKcal ?? results.targetKcal ?? 0} kcal</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Phase adjustment</Text>
                    <Text style={styles.calcValue}>{results.phase}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Projected weekly change</Text>
                    <Text style={styles.calcValue}>
                      {results.targetRateKgPerWeek > 0 ? '+' : ''}
                      {results.targetRateKgPerWeek} kg/week
                    </Text>
                  </View>
                  <View style={[styles.calcRow, { marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[styles.calcKey, { fontWeight: fontWeight.bold }]}>Macro method</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Protein basis</Text>
                    <Text style={styles.calcValue}>
                      {results.proteinBasis === 'lbm'
                        ? `${results.proteinGPerKgLbm ?? 'n/a'} g/kg muscle mass`
                        : `${results.proteinGPerKg ?? 'n/a'} g/kg bodyweight`}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Fat</Text>
                    <Text style={styles.calcValue}>Per phase (0.7–1.0 g/kg BW) · min 0.5 g/kg</Text>
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
  eduCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: spacing.md, marginTop: spacing.sm },
  eduIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  eduTitle: { ...type.label, color: colors.textPrimary },
  eduBody: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xxs, lineHeight: 17 },
  pageSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: -spacing.sm,
  },

  // ── Section heading ───────────────────────────────────────────────────────────────────

  sectionHeading: {
    ...type.label,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // ── Form groups ────────────────────────────────────────────────────────────────────

  formGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  optional: {
    fontWeight: fontWeight.regular,
    color: colors.textMuted,
  },
  numInput: {
    ...type.body,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    ...type.bodyStrong,
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
    ...type.label,
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
    gap: spacing.xxs,
  },
  goalCardActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  goalCheck: {
    marginBottom: spacing.xxs,
  },
  goalLabel: {
    ...type.label,
    color: colors.textPrimary,
  },
  goalLabelActive: {
    color: colors.primary,
  },
  goalDetail: {
    ...type.caption,
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
    ...type.label,
    flex: 1,
    color: colors.textPrimary,
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
    ...type.title,
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
    borderColor: withAlpha(colors.primary, 0.251),
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  heroKcal: {
    ...type.num('display'),
    color: colors.primary,
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
    gap: spacing.xxs,
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
    letterSpacing: 0.2,
  },
  macroPerKg: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  // Per-meal protein card, distribution guidance, daily total unchanged
  perMealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  perMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  perMealHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  perMealCenter: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  perMealValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.primary,
    lineHeight: 38,
  },
  perMealUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  mealDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  mealCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mealCountLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  mealCountChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mealCountChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mealCountChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  mealCountChipText: {
    ...type.num('bodyStrong'),
    color: colors.textSecondary,
  },
  mealCountChipTextActive: {
    color: colors.primary,
  },
  mealCountRecDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  mealCountRecCaption: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  mealCountRecCaptionDot: {
    color: colors.primary,
    fontSize: fontSize.micro,
  },
  perMealHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.251),
  },
  perMealHintText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
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
    ...type.bodyStrong,
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
    borderColor: withAlpha(colors.warning, 0.251),
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
    ...type.label,
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
    ...type.label,
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
    borderColor: withAlpha(colors.primary, 0.314),
  },
  recalcBtnText: {
    ...type.label,
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
    borderColor: withAlpha(colors.primary, 0.314),
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
    backgroundColor: withAlpha(colors.primary, 0.125),
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  recommendedBadgeText: {
    fontSize: fontSize.micro,
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
    ...type.body,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    width: 90,
    textAlign: 'center',
  },
  customProteinUnit: {
    ...type.label,
    color: colors.textSecondary,
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
    ...type.bodyStrong,
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
    paddingLeft: spacing.xxl,
  },
});
