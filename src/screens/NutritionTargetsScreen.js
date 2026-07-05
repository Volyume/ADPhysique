import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns/format';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, circle } from '../styles/theme';
import { formatEnergy, energyUnitLabel } from '../lib/format';
import BackHeader from '../components/BackHeader';
import InfoTooltip from '../components/InfoTooltip';
import Chip from '../components/Chip';
import SectionLabel from '../components/SectionLabel';
import ConsentCheckboxRow from '../components/ConsentCheckboxRow';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { calculateNutritionTargets, PROTEIN_APPROACHES } from '../lib/nutritionEngine';
import { saveNutritionTargets, getNutritionTargets, logBodyMetric, getUserBodyProfile, getLatestBodyWeight, getLatestBodyComposition } from '../lib/database';
import { daysToActivityLevel } from '../lib/coachingGoals';
import { hydrateLoadedTargets, getRecommendedMeals } from '../lib/nutritionTargetsView';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { femaleNutritionAwareness } from '../lib/femaleNutritionAwareness';
import { ageYearsFromDateOfBirth } from '../lib/profileAge';

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
  { key: 'lean_gain',        label: 'Build muscle (slow)',   detail: '~+10% surplus' },
  { key: 'build',            label: 'Build muscle (fast)',   detail: '~+17% surplus' },
  { key: 'maintain',         label: 'Maintain weight',       detail: '0%' },
  { key: 'recomp',           label: 'Hold muscle, lose fat',  detail: '−5%' },
  { key: 'mild_cut',         label: 'Lose weight (steady)',  detail: '−13%' },
  { key: 'aggressive_cut',   label: 'Lose weight (fast)',    detail: '−22%' },
];

const PHASE_DESCRIPTIONS = {
  lean_gain:       'A modest calorie surplus to gain muscle slowly while keeping fat gain low.',
  build:           'A larger calorie surplus to fuel hard training and build muscle faster.',
  maintain:        'Enough calories to fuel your training and hold your current body composition.',
  recomp:          'A slight calorie reduction with high protein allows for gradual fat loss while holding muscle.',
  mild_cut:        'A moderate calorie reduction that preserves strength and muscle while steadily losing fat.',
  aggressive_cut:  'A significant calorie reduction for faster fat loss. Protein is raised to protect muscle during the deficit.',
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
  return <SectionLabel variant="title" style={styles.sectionHeading}>{title}</SectionLabel>;
}

function PillGroup({ options, selected, onSelect, keyExtractor, labelExtractor }) {
  return (
    <View style={styles.pillWrap}>
      {options.map(opt => {
        const key   = keyExtractor ? keyExtractor(opt) : opt.key ?? opt;
        const label = labelExtractor ? labelExtractor(opt) : opt.label ?? String(opt);
        return (
          <Chip
            key={key}
            label={label}
            selected={selected === key}
            onPress={() => onSelect(key)}
          />
        );
      })}
    </View>
  );
}

function NumericField({ fieldStyle, inputStyle, ...props }) {
  return (
    <TextField
      surface={colors.inputBg}
      fieldStyle={[styles.numInputField, fieldStyle]}
      inputStyle={[styles.numInput, inputStyle]}
      placeholderTextColor={colors.textMuted}
      {...props}
    />
  );
}

function MacroCard({ label, grams, perKg, perKgLbm, basis, kcalPercent, barColor }) {
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
      {/* D3 (design audit 03): a thin proportional bar in the macro's
          category hue, sized by its share of the day's calories. Category
          identity only, never adherence, it does not change on hit/miss. */}
      {kcalPercent != null && barColor ? (
        <View style={styles.macroBarTrack}>
          <View
            style={[
              styles.macroBarFill,
              { width: `${Math.min(100, Math.max(0, kcalPercent))}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      ) : null}
      {ratioText ? (
        <Text style={styles.macroPerKg}>{ratioText}</Text>
      ) : null}
      {/* Descriptive %-of-calories this macro contributes (grams × its Atwater
          factor ÷ target kcal). Factual readout, not a judgement. */}
      {kcalPercent != null ? (
        <Text style={styles.macroPercent}>{`~${kcalPercent}% of kcal`}</Text>
      ) : null}
    </View>
  );
}

// D3 (design audit 03): each "why" compresses to its one bolded claim (the
// title carries the number) with the full paragraph behind a disclosure.
function WhySection({ icon, color, title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.whySection}>
      <TouchableOpacity
        style={styles.whySectionHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}. ${open ? 'Hide' : 'Show'} the explanation`}
      >
        <View style={[styles.whySectionIcon, { backgroundColor: withAlpha(color, 0.125) }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={styles.whySectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
      </TouchableOpacity>
      {open ? <Text style={styles.whySectionBody}>{body}</Text> : null}
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
  const { user, userProfile, energyUnit } = useAppStore(useShallow(s => ({ user: s.user, userProfile: s.userProfile, energyUnit: s.accessibility?.energyUnit ?? 'kcal' })));

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
  // U-C-1: the full form starts collapsed behind the "Set it for me" fast path;
  // "Fine-tune these numbers" (or "Adjust" after results) opens it.
  const [formCollapsed, setFormCollapsed] = useState(true);

  // ── Per-meal distribution, guidance only, daily totals unchanged ───────────────
  // Per-meal MPS window: ~0.4 g/kg (floor) to ~0.55 g/kg (above this, diminishing
  // returns). We pick the smallest meal count where per-meal protein stays at or
  // below the ceiling, so bodybuilders on high daily targets automatically split
  // across more feedings rather than overshooting the per-meal ceiling.
  const [mealsPerDay,     setMealsPerDay]     = useState(null);  // null = use recommended
  useEffect(() => {
    AsyncStorage.getItem('@volyume_meals_per_day')
      .then(v => { const n = parseInt(v, 10); if (n >= 3 && n <= 8) setMealsPerDay(n); })
      .catch(() => {});
  }, []);
  function changeMealsPerDay(n) {
    setMealsPerDay(n);
    AsyncStorage.setItem('@volyume_meals_per_day', String(n)).catch(() => {});
  }
  // Recommended meal count (getRecommendedMeals): smallest count keeping
  // per-meal protein ≤ 0.55 g/kg, falling back to 4 without bodyweight. Lives
  // in lib/nutritionTargetsView so the rule is locked with tests.

  // ── Load saved targets on mount, SQLite primary, AsyncStorage fallback ────────────
  useEffect(() => {
    // Fail CLOSED: read the raw wellbeing flag rather than getWellbeingMode()
    // (which swallows a storage read error down to 'unspecified'). A genuine
    // read failure must be treated as calm/suppressed, not unsuppressed.
    AsyncStorage.getItem(WELLBEING_KEY)
      .then(v => v || 'unspecified')
      .catch(() => 'read_failed')
      .then(m => {
        const c = isCalm(m) || m === 'read_failed';
        setCalm(c);
        // If the aggressive cut was previously selected, step back to a
        // gentler default when calmer experience is on.
        if (c) setGoal(g => (g === 'aggressive_cut' ? 'mild_cut' : g));
      });
  }, []);

  useEffect(() => {
    // Point the Adjust form's goal + protein approach at whatever was actually
    // saved, so the form can't show a different goal (e.g. "Build muscle (slow)")
    // than the calories were built from. Without this the form fell back to its
    // hardcoded defaults and read as inconsistent with the saved targets.
    const VALID_SYNC_GOALS = ['lean_gain', 'build', 'maintain', 'recomp', 'mild_cut', 'aggressive_cut'];
    function syncFormFromTargets(t) {
      // Prefer the goal key; the DB record only persists the phase label, so
      // fall back to inverting the label when the key is absent.
      let goalKey = (t?.goal && VALID_SYNC_GOALS.includes(t.goal)) ? t.goal : null;
      if (!goalKey && t?.phase) goalKey = GOALS.find(g => g.label === t.phase)?.key ?? null;
      if (goalKey) setGoal(goalKey);
      if (t?.proteinApproach && PROTEIN_APPROACHES[t.proteinApproach]) setProteinApproach(t.proteinApproach);
    }
    async function loadSaved() {
      try {
        // The rich AsyncStorage copy is written by the same save as the DB row
        // and carries goal + proteinApproach, which the DB columns don't. Read
        // it up front so we can backfill those onto a DB-loaded record.
        let rich = null;
        try {
          const r = await AsyncStorage.getItem(STORAGE_KEY);
          if (r) rich = JSON.parse(r);
        } catch (_) {}

        if (user?.id) {
          const fromDb = await getNutritionTargets(user.id).catch(() => null);
          if (fromDb?.targetKcal) {
            const lw = await getLatestBodyWeight(user.id).catch(() => null);
            const weightKg = lw?.weightKg ?? userProfile?.weightKg ?? null;
            const hydrated = hydrateLoadedTargets(fromDb, weightKg);
            if (rich && Number(rich.targetKcal) === Number(hydrated.targetKcal)) {
              if (hydrated.goal == null && rich.goal != null) hydrated.goal = rich.goal;
              if (hydrated.proteinApproach == null && rich.proteinApproach != null) hydrated.proteinApproach = rich.proteinApproach;
            }
            setResults(hydrated);
            syncFormFromTargets(hydrated);
            setFormCollapsed(true);
            return;
          }
        }
        if (rich?.targetKcal) {
          const hydrated = hydrateLoadedTargets(rich, userProfile?.weightKg ?? null);
          setResults(hydrated);
          syncFormFromTargets(hydrated);
          setFormCollapsed(true);
        }
      } catch (_) {}
    }
    loadSaved();
    // userProfile?.weightKg is only a fallback for the protein-per-kg ratio;
    // we deliberately do not reload the saved targets when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Pre-populate form from saved body profile so users don't re-enter stats
  useEffect(() => {
    async function prefill() {
      if (!user?.id) return;
      try {
        const profile = await getUserBodyProfile(user.id).catch(() => null);
        if (profile?.sex) setSex(profile.sex);
        if (profile?.heightCm) {
          const totalIn = Math.round(profile.heightCm / 2.54);
          setHeightFt(String(Math.floor(totalIn / 12)));
          setHeightIn(String(totalIn % 12));
        }
        if (profile?.dateOfBirth) {
          const ageNum = ageYearsFromDateOfBirth(profile.dateOfBirth);
          if (ageNum > 0 && ageNum < 100) setAge(String(ageNum));
        }

        // Weight and body fat aren't on user_body_profile, they live on the
        // body-metric log / store profile. Prefill them so the form shows the
        // user's real current numbers instead of blank fields.
        const lw = await getLatestBodyWeight(user.id).catch(() => null);
        const wkg = lw?.weightKg ?? userProfile?.weightKg ?? null;
        if (typeof wkg === 'number' && wkg > 0) setWeight(String(Math.round(wkg * 10) / 10));

        const comp = await getLatestBodyComposition(user.id).catch(() => null);
        const bf = comp?.bodyFatPercent ?? (typeof userProfile?.bodyFatPct === 'number' ? userProfile.bodyFatPct : null);
        const bfSrc = comp?.bodyFatSource ?? userProfile?.bodyFatSource ?? null;
        if (typeof bf === 'number' && bf > 0) {
          setBodyFat(String(bf));
          if (bfSrc && BF_SOURCES.some(s => s.key === bfSrc)) setBfSource(bfSrc);
        }

        // Activity should track how often the user actually trains, not a fixed
        // "moderate" default. 5 days/week is "active", not "moderate".
        if (typeof userProfile?.daysPerWeek === 'number' && userProfile.daysPerWeek > 0) {
          setActivity(daysToActivityLevel(userProfile.daysPerWeek));
        }
      } catch (_) {}
    }
    prefill();
    // Runs once per user. userProfile fields are read as one-shot prefill seeds,
    // we deliberately don't re-run when they change so we never stomp on a value
    // the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  async function handleCalculate(goalOverride) {
    if (!formComplete) return;
    const goalToUse = (typeof goalOverride === 'string') ? goalOverride : goal;

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
        goal: goalToUse,
        // Scale the surplus by training experience, matching onboarding and the
        // plan-update flow. Sourced from the profile since this form has no
        // experience field of its own.
        experienceLevel:    userProfile?.experience ?? 'intermediate',
        proteinApproach,
        customProteinGPerKg: proteinApproach === 'custom' && customProteinGPerKg.trim()
          ? parseFloat(customProteinGPerKg)
          : null,
      });

      setResults(targets);
      // Write to both stores: SQLite (primary) + AsyncStorage (read by other screens).
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      if (user?.id) {
        // FF-005: await the database save and surface a failure rather than
        // fire-and-forget. The AsyncStorage copy above is already written, so
        // the user keeps their targets locally; the toast tells them the full
        // save didn't complete and to recalculate to retry.
        try {
          await saveNutritionTargets(user.id, { ...targets, gdprConsented: true });
        } catch (e) {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('NutritionTargets.save', e, { userId: user.id }); } catch (_) {}
          toast.show('Targets calculated and saved on this device, but the full save didn\'t finish. Recalculate to retry.', { variant: 'warning', duration: 6000 });
        }
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Nutrition targets" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <InfoTooltip
              size={14}
              text={
                'How calories are calculated:\n' +
                '• Calorie baseline: a standard formula using your sex, age, height, and weight to estimate how many calories you burn at rest. If you enter a measured body fat percentage (from a scan or caliper test), we use a more accurate formula that accounts for your actual muscle mass.\n' +
                '• Maintenance: your baseline × an activity multiplier based on how much you move each day.\n' +
                '• Target: your maintenance adjusted for your goal (e.g. around +10% for slow muscle building, -13% for steady fat loss). Surplus amounts are scaled to your training experience.\n\n' +
                'How your targets are calculated:\n' +
                '• Protein: varies by your chosen approach (1.2 to 3.3 g/kg). Rates rise in deeper deficits to protect muscle. Select your approach in the Protein Target section.\n' +
                '• Fat: set by phase (0.7 to 1.0 g/kg bodyweight). Surplus phases use a lower fat target so carbs stay high for training performance. Deficit phases hold fat constant while carbs reduce first. Minimum 0.5 g/kg (never below 40 g) for hormonal health.\n' +
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

          {/* U-C-1: "Set it for me" fast path. Gives a usable daily target from
              the prefilled body stats before the full form. Reuses the single
              handleCalculate path (engine floors + calm-mode goal filtering
              unchanged); the full form is one tap away via "Fine-tune". */}
          {formCollapsed && !results ? (
            <View style={styles.fastCard}>
              <Text style={styles.fastTitle}>Set it for me</Text>
              <Text style={styles.fastSubtitle}>
                Answer a few quick questions and we'll set a starting daily target. You can fine-tune anything afterwards.
              </Text>

              <Text style={styles.fieldLabel}>Your goal</Text>
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
                      accessibilityLabel={`${g.label}, ${g.detail}`}
                    >
                      {active && (
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.goalCheck} />
                      )}
                      <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{g.label}</Text>
                      <Text style={[styles.goalDetail, active && styles.goalDetailActive]}>{g.detail}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* U-C-1: the minimum inputs the engine needs (sex, age, height,
                  weight, see formComplete) collected inline so the fast path
                  produces a real target instead of redirecting to the full form.
                  Prefilled from the saved body profile when available; activity,
                  protein approach and body fat % keep their defaults behind
                  "Fine-tune these numbers". */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Biological sex</Text>
                <PillGroup
                  options={[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }]}
                  selected={sex}
                  onSelect={setSex}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Age</Text>
                <NumericField
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 28"
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Age"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Height</Text>
                <View style={styles.heightRow}>
                  <View style={styles.heightUnit}>
                    <NumericField
                      value={heightFt}
                      onChangeText={setHeightFt}
                      placeholder="5"
                      keyboardType="number-pad"
                      maxLength={1}
                      accessibilityLabel="Height, feet"
                    />
                    <Text style={styles.unitLabel}>ft</Text>
                  </View>
                  <View style={styles.heightUnit}>
                    <NumericField
                      value={heightIn}
                      onChangeText={setHeightIn}
                      placeholder="10"
                      keyboardType="decimal-pad"
                      maxLength={4}
                      accessibilityLabel="Height, inches"
                    />
                    <Text style={styles.unitLabel}>in</Text>
                  </View>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Current weight (kg)</Text>
                <NumericField
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 82"
                  keyboardType="decimal-pad"
                  maxLength={5}
                  accessibilityLabel="Current weight in kilograms"
                />
              </View>

              {/* The same GDPR consent the full form requires, bound to the same
                  state, only one of the two ever renders at a time. */}
              <View style={styles.consentCard}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginTop: spacing.xxs }} />
                <View style={styles.consentBody}>
                  <Text style={styles.consentText}>
                    Your body data is stored only on this device. It is never shared and you can delete it at any time.
                  </Text>
                  <ConsentCheckboxRow
                    checked={consent}
                    onPress={() => setConsent(v => !v)}
                    label="I consent to storing this data on my device"
                    accessibilityLabel="I consent to storing this data on my device"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.calcBtn, (!formComplete || calculating) && styles.calcBtnDisabled]}
                onPress={handleCalculate}
                disabled={!formComplete || calculating}
                accessibilityRole="button"
                accessibilityState={{ disabled: !formComplete || calculating }}
                accessibilityLabel="Set my targets"
              >
                <Ionicons
                  name={calculating ? 'hourglass-outline' : 'sparkles-outline'}
                  size={20}
                  color={formComplete ? colors.onPrimary : colors.textDisabled}
                />
                <Text style={[styles.calcBtnText, !formComplete && styles.calcBtnTextDisabled]}>
                  {calculating ? 'Setting…' : 'Set my targets'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fineTuneLink}
                onPress={() => setFormCollapsed(false)}
                accessibilityRole="button"
                accessibilityLabel="Fine-tune these numbers"
              >
                <Ionicons name="options-outline" size={14} color={colors.primary} />
                <Text style={styles.fineTuneText}>Fine-tune these numbers</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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
            <NumericField
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
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
                <NumericField
                  value={heightFt}
                  onChangeText={setHeightFt}
                  placeholder="5"
                  keyboardType="number-pad"
                  maxLength={1}
                  accessibilityLabel="Height, feet"
                />
                <Text style={styles.unitLabel}>ft</Text>
              </View>
              <View style={styles.heightUnit}>
                <NumericField
                  value={heightIn}
                  onChangeText={setHeightIn}
                  placeholder="10"
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
            <NumericField
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 82"
              keyboardType="decimal-pad"
              maxLength={5}
              accessibilityLabel="Current weight in kilograms"
            />
          </View>

          {/* Body fat */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Body fat % <Text style={styles.optional}>(optional)</Text></Text>
            <NumericField
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="e.g. 15"
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
              "There is no single right answer. The level you can consistently hit every day will produce better results than an aggressive target you miss half the time.\n\n" +
              "The approaches below are the specific targets Volyume uses; they sit towards the higher end of these ranges, where muscle retention is strongest."
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
                    <NumericField
                      fieldStyle={styles.customProteinInputField}
                      inputStyle={styles.customProteinInput}
                      value={customProteinGPerKg}
                      onChangeText={setCustomProteinGPerKg}
                      placeholder="e.g. 2.0"
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
              <ConsentCheckboxRow
                checked={consent}
                onPress={() => setConsent(v => !v)}
                label="I consent to storing this data on my device"
                accessibilityLabel="I consent to storing this data on my device"
              />
            </View>
          </View>

          </>) : null}

          {formCollapsed && results ? (
            <View style={styles.collapsedSummary}>
              <View style={styles.collapsedRow}>
                <Ionicons name="nutrition" size={14} color={colors.textMuted} />
                <Text style={styles.collapsedText} numberOfLines={1}>
                  {age && weight && heightFt
                    ? `${sex === 'male' ? 'Male' : 'Female'} · ${age}yrs · ${heightFt}ft${heightIn ? ` ${heightIn}in` : ''} · ${weight}kg · ${results?.phase ?? GOALS.find(g => g.key === goal)?.label ?? goal}`
                    : `${results?.phase ?? GOALS.find(g => g.key === goal)?.label ?? 'Targets set during coaching setup'}`}
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
                color={formComplete ? colors.onPrimary : colors.textDisabled}
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
                      {formatEnergy(tk, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                    <Text style={styles.heroRange}>
                      Estimated range: {formatEnergy(kMin, energyUnit)} – {formatEnergy(kMax, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                    {/* NU-7: make the floor's action legible. floorApplied is the
                        engine's structured signal that a safety system raised
                        this target (sex floor or the 1.5% rate gate). */}
                    {results.floorApplied ? (
                      <View style={styles.heroFloorRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                        <Text style={styles.heroFloorText}>Held at your safe minimum</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })()}

              {/* Macro cards. The %-of-kcal subline is descriptive: each macro's
                  grams × its Atwater factor (P/C 4, F 9) ÷ the target kcal. */}
              {(() => {
                const tk = Math.round(Number(results.targetKcal) || 0);
                const pct = (grams, factor) =>
                  tk > 0 && grams > 0 ? Math.round(((grams * factor) / tk) * 100) : null;
                return (
                  <View style={styles.macroRow}>
                    <MacroCard
                      label="Protein"
                      grams={results.proteinG}
                      perKg={results.proteinGPerKg}
                      perKgLbm={results.proteinGPerKgLbm}
                      basis={results.proteinBasis}
                      kcalPercent={pct(results.proteinG, 4)}
                      barColor={colors.macroProtein}
                    />
                    <MacroCard label="Carbs" grams={results.carbsG} kcalPercent={pct(results.carbsG, 4)} barColor={colors.macroCarb} />
                    <MacroCard label="Fat"   grams={results.fatG}   kcalPercent={pct(results.fatG, 9)}   barColor={colors.macroFat} />
                  </View>
                );
              })()}

              {/* ── Per-meal protein distribution ───────────────────
                  Guidance only, daily total unchanged. Splits the
                  prescribed daily protein across 3 to 6 feedings, with
                  the recommended count chosen to keep per-meal in the
                  0.4 to 0.55 g/kg muscle protein synthesis window. */}
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
                          'The effective window per meal is roughly 0.4 to 0.55 g of protein per kilogram of bodyweight. Below that, the meal does not give you the full muscle-building benefit. Above it, the extra protein mostly goes to waste at that meal.\n\n' +
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
                        {[3, 4, 5, 6, 7, 8].map(n => {
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

              {/* ── How we got here (D3, design audit 03): the rationale,
                  phase and confidence merged into ONE card instead of three
                  same-shape siblings. Every element is unchanged; only the
                  grouping and header treatment moved. ── */}
              <View style={styles.howCard}>
              <Text style={styles.howCardTitle}>How we got here</Text>

              {/* Phase, may be absent when loaded from DB */}
              {(results.goal || results.phase) ? (
                <View style={styles.howPhaseBlock}>
                  <Text style={styles.phaseTitle}>
                    {results.phase || GOALS.find(g => g.key === results.goal)?.label || ''}
                  </Text>
                  <Text style={styles.phaseDesc}>
                    {PHASE_DESCRIPTIONS[results.goal] ?? ''}
                  </Text>
                </View>
              ) : null}

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
                // Mirror the engine's fat floor exactly (nutritionEngine.js:
                // fatFloor = max(0.5 * weight, 40)). Showing 30 here understated
                // the real floor the engine enforces for sub-80 kg users.
                const fatFloorG = weightKg ? Math.round(Math.max(0.5 * weightKg, 40)) : 40;
                const carbKcal = results.carbsG * 4;

                // Goal-aware text helpers. Maintain (0% deficit) and
                // Recomp (~5% deficit) need separate copy, they're
                // different intents. Maintain used to inherit the
                // recomp template which rendered "A slight 0% deficit"
                //, nonsense.
                const isGain     = ['lean_gain', 'build'].includes(results.goal);
                const isCut      = ['mild_cut', 'aggressive_cut'].includes(results.goal);
                const isRecomp   = results.goal === 'recomp';
                const isMaintain = results.goal === 'maintain';

                const calorieWhy = isGain
                  ? `Your maintenance is ${formatEnergy(maintenanceKcal, energyUnit)} ${energyUnitLabel(energyUnit)}. That is what you need to stay the same weight. Adding a ${absPct}% surplus (+${formatEnergy(surplusDelta, energyUnit)} ${energyUnitLabel(energyUnit)}) puts you on track to gain roughly ${rateAbs.toFixed(2)} kg/week. ${rateAbs <= 0.3 ? 'That rate is slow and lean. Most of what you gain will be muscle, with very little fat alongside it.' : rateAbs <= 0.5 ? 'That rate is steady. Some fat alongside the muscle is inevitable, but the ratio stays favourable.' : 'That rate is on the faster side. Muscle gain is quicker but more fat comes along with it.'} Consistency over weeks matters far more than perfection each day.`
                  : isCut
                  ? `Your maintenance is ${formatEnergy(maintenanceKcal, energyUnit)} ${energyUnitLabel(energyUnit)}. A ${absPct}% deficit (${formatEnergy(Math.abs(surplusDelta), energyUnit)} ${energyUnitLabel(energyUnit)} below maintenance) puts you on track to ${rateDir} roughly ${rateAbs.toFixed(2)} kg/week. That rate is ${rateAbs <= 0.5 ? 'conservative. You will lose mostly fat while holding onto more muscle' : rateAbs <= 0.8 ? 'moderate. Effective fat loss with manageable risk to muscle' : 'aggressive. Protein has been set higher to protect your muscle'}. Consistency over weeks matters far more than perfection each day.`
                  : isMaintain
                  ? `Your target is ${formatEnergy(results.targetKcal ?? 0, energyUnit)} ${energyUnitLabel(energyUnit)}, which matches your maintenance level. Eating at maintenance gives you the energy to recover hard and train hard, without gaining fat. With high protein and consistent training, you can still build muscle slowly and improve body composition. No deficit, no surplus: a steady baseline.`
                  : isRecomp
                  ? `Your maintenance is ${formatEnergy(maintenanceKcal, energyUnit)} ${energyUnitLabel(energyUnit)}. A small ${Math.abs(absPct)}% deficit (${formatEnergy(Math.abs(surplusDelta), energyUnit)} ${energyUnitLabel(energyUnit)} below maintenance) gives just enough of a calorie gap to use body fat as fuel, while high protein and consistent training keep muscle on. Progress is slower than a dedicated muscle building or fat loss phase, but your body composition improves at the same time.`
                  : `Your target is ${formatEnergy(results.targetKcal ?? 0, energyUnit)} ${energyUnitLabel(energyUnit)} based on your maintenance of ${formatEnergy(maintenanceKcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`;

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
                        : `In a calorie deficit, muscle tissue can become a fuel source if protein is too low. This target keeps you well above that threshold, and protein keeps you fuller, which makes it easier to stick to your calories.`;
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
                  <View style={styles.whyGroup}>
                    <TouchableOpacity
                      style={styles.whyHeader}
                      onPress={() => setWhyExpanded(v => !v)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: whyExpanded }}
                      accessibilityLabel="Why these numbers for you?"
                    >
                      <View style={styles.whyHeaderLeft}>
                        <Ionicons name="school-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.whyHeaderLabel}>Why these numbers for you?</Text>
                      </View>
                      <Ionicons name={whyExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    {whyExpanded && (
                      <View style={styles.whyBody}>
                        <WhySection icon="flame-outline" color={colors.warning} title={`Calories: ${formatEnergy(results.targetKcal ?? 0, energyUnit)} ${energyUnitLabel(energyUnit)}`} body={calorieWhy} />
                        <WhySection icon="barbell-outline" color={colors.primary} title={`Protein: ${results.proteinG}g`} body={proteinWhy} />
                        <WhySection icon="water-outline" color={colors.success} title={`Fat: ${results.fatG}g`} body={fatWhy} />
                        <WhySection icon="leaf-outline" color={colors.primary} title={`Carbs: ${results.carbsG}g`} body={carbWhy} />
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Confidence, only shown when available. Keeps its status icon
                  colour; the per-confidence tinted border retired with the
                  card merge (D3). */}
              {results.confidence ? (
                <View style={styles.confidenceRow}>
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

              </View>

              {/* Warnings. NU-7: when a floor raised the target, the technical
                  floor lines collapse into one plain-register explanation (the
                  phrase checks below are DISPLAY-ONLY routing; every structural
                  decision still gates on results.floorApplied, the engine's
                  contract). Remaining warnings de-duplicate before stacking. */}
              {(() => {
                const all = [...new Set(results.warnings ?? [])];
                const isFloorLine = (w) =>
                  w.includes('Raising to floor') || w.includes('hard gate');
                const rest = results.floorApplied ? all.filter(w => !isFloorLine(w)) : all;
                return (
                  <>
                    {results.floorApplied ? (
                      <View style={styles.floorBanner}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                        <Text style={styles.floorBannerText}>
                          Your numbers came out below the minimum we hold targets at, so we
                          raised them. The target above is your safe minimum. Eating below it
                          would work against your training, recovery and health.
                        </Text>
                      </View>
                    ) : null}
                    {rest.map((w, i) => (
                      <View key={i} style={styles.warningBanner}>
                        <Ionicons name="warning-outline" size={16} color={colors.warning} />
                        <Text style={styles.warningText}>{w}</Text>
                      </View>
                    ))}
                  </>
                );
              })()}

              {/* U3: one-tap nudge to ease the deficit when energy availability is
                  low. Steps the goal down one notch and recalculates. Only ever
                  RAISES calories; the hard floors are unchanged either way. */}
              {results.eaCaution?.suggestedKcal ? (() => {
                const easedGoal = { aggressive_cut: 'mild_cut', mild_cut: 'recomp', recomp: 'maintain' }[results.goal];
                if (!easedGoal) return null;
                return (
                  <TouchableOpacity
                    style={styles.easeNudge}
                    onPress={() => { setGoal(easedGoal); handleCalculate(easedGoal); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Ease this cut to about ${formatEnergy(results.eaCaution.suggestedKcal, energyUnit)} ${energyUnit === 'kj' ? 'kilojoules' : 'kilocalories'}`}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
                    <Text style={styles.easeNudgeText}>Ease this cut to about {formatEnergy(results.eaCaution.suggestedKcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
                  </TouchableOpacity>
                );
              })() : null}

              {/* U6: iron / micronutrient awareness for female athletes.
                  Awareness only (no tracking, no schema); female-only via the
                  helper, which returns null for everyone else. */}
              {(() => {
                const awareness = femaleNutritionAwareness(sex);
                if (!awareness) return null;
                return (
                  <View style={styles.awarenessCard}>
                    <View style={styles.awarenessHeader}>
                      <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
                      <Text style={styles.awarenessTitle}>{awareness.title}</Text>
                    </View>
                    <Text style={styles.awarenessIntro}>{awareness.intro}</Text>
                    {awareness.nutrients.map(n => (
                      <View key={n.key} style={styles.awarenessNutrient}>
                        <Text style={styles.awarenessNutrientName}>{n.name}</Text>
                        <Text style={styles.awarenessNutrientBody}>{n.why}</Text>
                        <Text style={styles.awarenessNutrientFoods}>{n.foods}</Text>
                      </View>
                    ))}
                    <Text style={styles.awarenessFootnote}>{awareness.footnote}</Text>
                  </View>
                );
              })()}

              {/* How calculated (expandable) */}
              <TouchableOpacity accessibilityRole="button"
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
                    <Text style={styles.calcValue}>{formatEnergy(results.bmrKcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcKey}>Maintenance calories</Text>
                    <Text style={styles.calcValue}>{formatEnergy(results.maintenanceKcal ?? results.targetKcal ?? 0, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
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
                    <Text style={styles.calcValue}>Per phase (0.7 to 1.0 g/kg BW) · min 0.5 g/kg</Text>
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
              <TouchableOpacity accessibilityRole="button"
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
  // D3: neutral edge, a static education row does not spend the amber.
  eduCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  // U-C-1: "Set it for me" fast-path card.
  fastCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md, gap: spacing.md },
  fastTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  fastSubtitle: { ...type.bodySm, color: colors.textSecondary },
  fineTuneLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, minHeight: 44 },
  fineTuneText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  eduIconWrap: { width: 32, height: 32, borderRadius: circle(32), backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  eduTitle: { ...type.label, color: colors.textPrimary },
  eduBody: { ...type.captionTight, color: colors.textSecondary, marginTop: spacing.xxs },
  pageSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },

  // ── Section heading ───────────────────────────────────────────────────────────────────

  // D3: real section headers (design audit 03 rule 3), using the shared
  // SectionLabel title variant so heading scale stays centralized.
  sectionHeading: {
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
  numInputField: {
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  numInput: {
    ...type.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    ...type.bodySm,
    color: colors.textSecondary,
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
    color: colors.onPrimary,
  },
  calcBtnTextDisabled: {
    color: colors.textDisabled,
  },

  // ── Results section ──────────────────────────────────────────────────────────────────

  resultsSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  // D3: surfaceElevated ranks the hero (design audit 03 rule 4); the amber
  // lives in the kcal numeral itself, so the border is neutral.
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
  macroPercent: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  // D3: thin proportional bar in the macro's category hue (identity, never
  // adherence), sized by the macro's share of the day's calories.
  macroBarTrack: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: radius.hair,
    backgroundColor: colors.surface3,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: radius.hair,
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
    // D3: neutral, the daily kcal numeral is this screen's one amber
    // object; a second amber hero numeral competed with it.
    color: colors.textPrimary,
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
    borderRadius: circle(8),
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
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mealCountChip: {
    width: 44,
    height: 44,
    borderRadius: circle(44),
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
    borderRadius: circle(6),
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
    ...type.captionTight,
    flex: 1,
    color: colors.textSecondary,
  },

  phaseTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  phaseDesc: {
    ...type.bodySm,
    color: colors.textSecondary,
  },

  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  confidenceText: {
    ...type.bodySm,
    flex: 1,
    color: colors.textSecondary,
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
    ...type.bodySm,
    flex: 1,
    color: colors.warning,
  },
  // NU-7: the floor explanation reads as protection, not alarm.
  floorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.success, 0.251),
  },
  floorBannerText: {
    ...type.bodySm,
    flex: 1,
    color: colors.textSecondary,
  },
  heroFloorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  heroFloorText: {
    ...type.bodySm,
    color: colors.success,
  },

  easeNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.strong),
    backgroundColor: colors.primaryBg,
  },
  easeNudgeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // U6: female iron/micronutrient awareness card. D3: neutral surface,
  // only warnings and the EA ease-nudge keep tint (design audit 03).
  awarenessCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  awarenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  awarenessTitle: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  awarenessIntro: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  awarenessNutrient: {
    gap: 2,
    marginTop: spacing.xs,
  },
  awarenessNutrientName: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  awarenessNutrientBody: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  awarenessNutrientFoods: {
    ...type.bodySm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  awarenessFootnote: {
    ...type.captionTight,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
    ...type.captionTight,
    color: colors.textMuted,
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
    ...type.captionTight,
    flex: 1,
    color: colors.textMuted,
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
    ...type.captionTight,
    color: colors.textSecondary,
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
  customProteinInputField: {
    width: 90,
    minWidth: 90,
    borderRadius: radius.md,
  },
  customProteinInput: {
    ...type.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  customProteinUnit: {
    ...type.label,
    color: colors.textSecondary,
  },

  // ── How we got here (D3: whys + phase + confidence in one card) ─────────────

  howCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  howCardTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  howPhaseBlock: {
    gap: spacing.xs,
  },
  whyGroup: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
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
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  whySection: {
    gap: spacing.sm,
  },
  whySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  whySectionIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whySectionTitle: {
    flex: 1,
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
