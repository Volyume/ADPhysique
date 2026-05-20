import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { formatBodyWeightShort } from '../lib/units';
import { computeEWMA } from '../lib/weeklyCoach';
import {
  logMorningWeight,
  saveWeeklyCheckin,
  getMorningWeightsLast14Days,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getNutritionTargets,
} from '../lib/database';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { requestNotificationPermissions, getNotificationPermissionStatus } from '../lib/notifications';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MIN_WEIGH_INS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentWeekStart() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function formatWeekRange(weekStart) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sun = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d) => `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  return `${fmt(weekStart)} – ${fmt(sun)}`;
}

function hasLoggedToday(weights) {
  if (!weights || weights.length === 0) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return weights.some((w) => {
    const ts = w.loggedAt ?? w.logged_at ?? w.createdAt ?? w.created_at;
    return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ current, total }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i < current && styles.stepDotDone,
            i === current && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );
}

function SectionLabel({ children, hint }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

function ChipRow({ options, selected, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipValue, isSelected && styles.chipValueSelected]}>
              {opt.value}
            </Text>
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function OptionRow({ options, selected, onSelect }) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const TOTAL_STEPS = 4;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyCheckInScreen({ navigation }) {
  const { user, userProfile, units, bodyWeightUnits } = useAppStore();
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [step, setStep] = useState(0); // 0–3

  // ─── Gate state ──────────────────────────────────────────────────────────────
  // 'loading' | 'wrong_day' | 'need_weights' | 'open'
  const [gateState, setGateState] = useState('loading');
  const [checkinDayNum, setCheckinDayNum] = useState(0); // 0=Sunday
  const [weighInsThisWeek, setWeighInsThisWeek] = useState(0);

  useEffect(() => {
    const hasGoals = userProfile?.trainingGoal || userProfile?.trainingPhase || userProfile?.goalPhase;
    if (!hasGoals) {
      navigation.replace('ProGoalSetup', { fromCheckin: true });
    }
  }, [userProfile?.trainingGoal, userProfile?.trainingPhase, userProfile?.goalPhase]);

  useEffect(() => {
    if (!user?.id) return;
    getNutritionTargets(user.id).then(t => setNutritionTargets(t ?? null)).catch(() => {});
  }, [user?.id]);

  const weekStart = getCurrentWeekStart();
  const weekLabel = formatWeekRange(weekStart);
  const bwu = bodyWeightUnits || 'st';

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Weight data
  const [weekWeights, setWeekWeights] = useState([]);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);

  // Step 1 — How are you?
  const [energyScore, setEnergyScore] = useState(null);   // 1–5
  const [stressScore, setStressScore] = useState(null);   // 1–5
  const [sleepHours, setSleepHours] = useState('');

  // Step 2 — This week
  const [calsAdherence, setCalsAdherence] = useState(null);
  const [stepsAdherence, setStepsAdherence] = useState(null);

  // Step 3 — Recovery
  const [sorenessScore, setSorenessScore] = useState(null); // 1–5
  const [soreMuscles, setSoreMuscles] = useState([]);       // muscle group keys
  const [jointPain, setJointPain] = useState(null);         // 'yes'|'no'
  const [notes, setNotes] = useState('');

  // Step 4 — Training
  const [trainingPerformance, setTrainingPerformance] = useState(null); // 'exceeded'|'hit'|'struggled'|'dropped'

  const hasNutritionTarget = Boolean(nutritionTargets?.targetKcal);
  const hasStepsTarget = Boolean(userProfile?.stepsTarget ?? userProfile?.steps_target);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!user?.id) return;

        // Load check-in day from notification prefs
        let scheduledDay = 0; // default Sunday
        try {
          const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
          if (raw) {
            const prefs = JSON.parse(raw);
            if (prefs.checkinDay !== undefined) scheduledDay = prefs.checkinDay;
          }
        } catch (_) {}
        if (!cancelled) setCheckinDayNum(scheduledDay);

        // Today's day of week (0=Sunday)
        const todayDay = new Date().getDay();

        const weights = await getMorningWeightsLast14Days(user.id);
        if (cancelled) return;
        setAlreadyLoggedToday(hasLoggedToday(weights));
        const weekAgo = Date.now() - 7 * 86400000;
        const thisWeek = weights.filter(w => (w.loggedAt ?? 0) >= weekAgo);
        setWeekWeights(thisWeek);
        setWeighInsThisWeek(thisWeek.length);

        // Gate evaluation
        if (todayDay !== scheduledDay) {
          setGateState('wrong_day');
        } else if (thisWeek.length < MIN_WEIGH_INS) {
          setGateState('need_weights');
        } else {
          setGateState('open');
        }
      } catch (e) {
        console.warn('[WeeklyCheckIn] failed to load', e);
        setGateState('open'); // fail open so users aren't permanently blocked
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Compute EMA trend weight from this week's weigh-ins
  const ewmaSeries = weekWeights.length > 0 ? computeEWMA(weekWeights) : [];
  const trendKg = ewmaSeries.length ? ewmaSeries[ewmaSeries.length - 1].ewmaKg : null;

  // Per-step completion gates
  const step1Complete = energyScore !== null && sorenessScore === null
    ? true  // stress + sleep are optional
    : energyScore !== null;
  const step2Complete = true; // nutrition and steps are optional
  const step3Complete = sorenessScore !== null;
  const step4Complete = trainingPerformance !== null;

  function stepCanAdvance(s) {
    if (s === 0) return energyScore !== null;
    if (s === 1) return true;
    if (s === 2) return sorenessScore !== null;
    if (s === 3) return trainingPerformance !== null;
    return false;
  }

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const userId = user?.id;
      if (!userId) return;

      await saveWeeklyCheckin(userId, {
        weekStart: weekStart.getTime(),
        energyScore,
        sorenessScore,
        stressScore,
        sleepHours: sleepHours.trim() ? parseFloat(sleepHours) : null,
        calsAdherence: calsAdherence ?? null,
        stepsAdherence: stepsAdherence ?? null,
        trainingPerformance: trainingPerformance ?? null,
        jointPain: jointPain === 'yes',
        soreMuscles: soreMuscles.length > 0 ? soreMuscles.join(',') : null,
        notes: [
          notes.trim(),
          jointPain === 'yes' ? 'Joint pain flagged this week.' : '',
          soreMuscles.length > 0 ? `Sore: ${soreMuscles.join(', ')}.` : '',
        ].filter(Boolean).join(' ') || null,
      });

      const goCoach = () => navigation.navigate('CoachOutput', { weekStart: weekStart.getTime() });
      const permStatus = await getNotificationPermissionStatus();
      if (permStatus === 'undetermined') {
        Alert.alert(
          'Daily weight reminders',
          'Logging your weight each morning makes your coaching more accurate. A 7-day trend is much more reliable than a single reading. Enable a daily nudge?',
          [
            { text: 'Not now', style: 'cancel', onPress: goCoach },
            {
              text: 'Yes please',
              onPress: async () => {
                await requestNotificationPermissions().catch(() => {});
                goCoach();
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        goCoach();
      }
    } catch (e) {
      console.warn('[WeeklyCheckIn] submit failed', e);
    } finally {
      setBusy(false);
    }
  }, [
    busy, user?.id, energyScore, sorenessScore, stressScore, sleepHours,
    calsAdherence, stepsAdherence, trainingPerformance, jointPain, notes, weekStart, navigation,
  ]);

  // ─── Step views ─────────────────────────────────────────────────────────────

  function renderStep0() {
    return (
      <>
        <Text style={styles.stepHeading}>How are you feeling?</Text>
        <Text style={styles.stepSubtitle}>How your body and mind are doing sets the context for everything else.</Text>

        <View style={styles.section}>
          <SectionLabel>Energy and motivation this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Below normal' },
              { value: 3, label: 'Normal' },
              { value: 4, label: 'Good' },
              { value: 5, label: 'High' },
            ]}
            selected={energyScore}
            onSelect={setEnergyScore}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Work, life, family, anything outside the gym">Stress level this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Mild' },
              { value: 3, label: 'Moderate' },
              { value: 4, label: 'High' },
              { value: 5, label: 'Very high' },
            ]}
            selected={stressScore}
            onSelect={setStressScore}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Optional">Average sleep hours</SectionLabel>
          <TextInput
            style={styles.shortInput}
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            maxLength={4}
          />
        </View>
      </>
    );
  }

  function renderStep1() {
    return (
      <>
        <Text style={styles.stepHeading}>This week's data</Text>
        <Text style={styles.stepSubtitle}>How well did you hit your targets?</Text>

        {/* Weight trend — read-only */}
        {!loading && (
          <View style={styles.section}>
            <SectionLabel
              hint="Your 7-day smoothed trend. More reliable than a single reading."
            >
              Morning weight trend
            </SectionLabel>
            {weekWeights.length > 0 ? (
              <View style={styles.weightSummaryRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.weightSummaryText}>
                  {weekWeights.length} {weekWeights.length === 1 ? 'day' : 'days'} logged
                  {trendKg ? ` · trend ${formatBodyWeightShort(trendKg, bwu)}` : ''}
                </Text>
                {!alreadyLoggedToday && (
                  <Text style={styles.weightSummaryMissed}>Not yet today</Text>
                )}
              </View>
            ) : (
              <Text style={styles.skipNote}>
                No morning weights logged this week. Log each morning from the Train tab. One reading per day makes the trend far more accurate.
              </Text>
            )}
          </View>
        )}

        {/* Nutrition adherence */}
        {hasNutritionTarget ? (
          <View style={styles.section}>
            <SectionLabel>Calorie target: how did you get on?</SectionLabel>
            <OptionRow
              options={[
                { value: 'yes', label: 'Hit it' },
                { value: 'no', label: 'Missed it' },
                { value: 'untracked', label: "Didn't track" },
              ]}
              selected={calsAdherence}
              onSelect={setCalsAdherence}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <SectionLabel>Calorie target</SectionLabel>
            <TouchableOpacity onPress={() => navigation.navigate('NutritionTargets')} activeOpacity={0.75}>
              <Text style={styles.skipNoteTappable}>
                Nutrition targets not set. Tap to set them up and unlock calorie coaching.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Steps */}
        {hasStepsTarget && (
          <View style={styles.section}>
            <SectionLabel>Steps target</SectionLabel>
            <OptionRow
              options={[
                { value: 'hit', label: 'Hit it' },
                { value: 'mostly', label: 'Mostly' },
                { value: 'missed', label: 'Missed it' },
              ]}
              selected={stepsAdherence}
              onSelect={setStepsAdherence}
            />
          </View>
        )}
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <Text style={styles.stepHeading}>Recovery and issues</Text>
        <Text style={styles.stepSubtitle}>Helps the coach decide whether to hold, push, or ease off training.</Text>

        <View style={styles.section}>
          <SectionLabel>Overall muscle soreness this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'None' },
              { value: 2, label: 'Mild' },
              { value: 3, label: 'Moderate' },
              { value: 4, label: 'High' },
              { value: 5, label: 'Very high' },
            ]}
            selected={sorenessScore}
            onSelect={setSorenessScore}
          />
        </View>

        {sorenessScore !== null && sorenessScore >= 2 && (
          <View style={styles.section}>
            <SectionLabel hint="Tap any that feel sore or fatigued (optional)">Which muscles?</SectionLabel>
            <View style={styles.muscleChipGrid}>
              {[
                'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
                'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
              ].map(muscle => {
                const sel = soreMuscles.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, sel && styles.muscleChipSelected]}
                    onPress={() =>
                      setSoreMuscles(prev =>
                        prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle],
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.muscleChipText, sel && styles.muscleChipTextSelected]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel hint="Joints and tendons, not normal muscle soreness">Any joint or tendon pain?</SectionLabel>
          <OptionRow
            options={[
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
            ]}
            selected={jointPain}
            onSelect={setJointPain}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Illness, travel, big life stress, anything unusual (optional)">Anything else to flag?</SectionLabel>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Anything Volyume should factor in this week…"
            placeholderTextColor={colors.textMuted}
            maxLength={280}
            textAlignVertical="top"
            returnKeyType="default"
          />
          <Text style={styles.charCount}>{notes.length}/280</Text>
        </View>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <Text style={styles.stepHeading}>Training performance</Text>
        <Text style={styles.stepSubtitle}>How did your sessions go compared to what you expected?</Text>

        <View style={styles.section}>
          <SectionLabel>This week's training felt like</SectionLabel>
          <View style={styles.perfGrid}>
            {[
              { value: 'exceeded', label: 'Beat my targets', icon: 'trending-up' },
              { value: 'hit', label: 'Hit targets as planned', icon: 'checkmark-circle-outline' },
              { value: 'struggled', label: 'Struggled to hit targets', icon: 'remove-circle-outline' },
              { value: 'dropped', label: 'Performance dropped', icon: 'trending-down' },
            ].map(opt => {
              const isSelected = trainingPerformance === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.perfCard, isSelected && styles.perfCardSelected]}
                  onPress={() => setTrainingPerformance(isSelected ? null : opt.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.perfCardText, isSelected && styles.perfCardTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  }

  const stepTitles = ['How are you?', 'This week', 'Recovery', 'Training'];

  // ─── Gate screens ──────────────────────────────────────────────────────────
  if (loading || gateState === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (gateState === 'wrong_day') {
    const dayName = DAYS_FULL[checkinDayNum];
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gateCenter}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.gateTitle}>Come back on {dayName}</Text>
          <Text style={styles.gateBody}>
            You set your check-in day to {dayName}. Your coaching runs on a weekly rhythm tied to that day, so the numbers compare like for like each time.
            {'\n\n'}
            In the meantime, log your weight each morning from the Train tab. Every reading makes the trend more accurate.
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.gateBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gateState === 'need_weights') {
    const dayName = DAYS_FULL[checkinDayNum];
    const remaining = MIN_WEIGH_INS - weighInsThisWeek;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gateCenter}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="scale-outline" size={32} color={colors.warning} />
          </View>
          <Text style={styles.gateTitle}>A few more weight readings needed</Text>
          <Text style={styles.gateBody}>
            You've logged {weighInsThisWeek} {weighInsThisWeek === 1 ? 'reading' : 'readings'} this week. Your coach needs at least {MIN_WEIGH_INS} to calculate a reliable trend.
            {'\n\n'}
            Body weight shifts naturally each day due to fluid, food, and hormones. Logging every other day gives enough readings to smooth out that noise and see what's actually changing. With fewer readings, the coaching adjustments won't be as accurate.
            {'\n\n'}
            Log {remaining} more {remaining === 1 ? 'reading' : 'readings'} from the Train tab and come back on {dayName}.
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.gateBtnText}>I'll log my weight first</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gateDeferBtn} onPress={() => setGateState('open')} activeOpacity={0.75}>
            <Text style={styles.gateDeferBtnText}>Check in anyway</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main check-in screen ──────────────────────────────────────────────────

  const todayDayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const checkinDayLabel = todayDayName === 'Sunday' ? 'Your Sunday check-in' : 'Your weekly check-in';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{checkinDayLabel}</Text>
          <StepBar current={step} total={TOTAL_STEPS} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Ritual intro — only on step 0 */}
          {step === 0 && (
            <View style={styles.ritualIntro}>
              <Text style={styles.ritualIntroTitle}>{checkinDayLabel}</Text>
              <Text style={styles.ritualIntroSub}>Four questions. Your coach reads them every week.</Text>
            </View>
          )}

          {/* Week label */}
          <Text style={styles.weekLabel}>{weekLabel}</Text>

          {/* Step content */}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation CTA */}
          <View style={styles.ctaRow}>
            {step < TOTAL_STEPS - 1 ? (
              <TouchableOpacity
                style={[styles.ctaBtn, !stepCanAdvance(step) && styles.ctaBtnDisabled]}
                onPress={() => setStep(s => s + 1)}
                disabled={!stepCanAdvance(step)}
                activeOpacity={0.85}
              >
                <Text style={[styles.ctaBtnText, !stepCanAdvance(step) && styles.ctaBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={!stepCanAdvance(step) ? colors.textMuted : colors.background}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.ctaBtn, !stepCanAdvance(step) && styles.ctaBtnDisabled]}
                onPress={handleSubmit}
                disabled={!stepCanAdvance(step) || busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.ctaBtnText, !stepCanAdvance(step) && styles.ctaBtnTextDisabled]}>
                    See this week's coaching
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {!stepCanAdvance(step) && step !== 1 && (
            <Text style={styles.ctaHint}>
              {step === 0 ? 'Rate your energy to continue.' : step === 2 ? 'Rate your soreness to continue.' : 'Pick how training felt to continue.'}
            </Text>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // ── Gate screens ────────────────────────────────────────────────────────────
  gateHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gateCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.lg,
  },
  gateIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  gateTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary,
    textAlign: 'center',
  },
  gateBody: {
    fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22,
    textAlign: 'center',
  },
  gateBtn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md,
  },
  gateBtnText: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background,
  },
  gateDeferBtn: {
    paddingVertical: spacing.md, alignItems: 'center',
  },
  gateDeferBtnText: {
    fontSize: fontSize.sm, color: colors.textMuted,
  },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center', gap: spacing.xs },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 32 },

  stepBar: { flexDirection: 'row', gap: spacing.xs },
  stepDot: {
    width: 20, height: 4, borderRadius: 2,
    backgroundColor: colors.surface3,
  },
  stepDotDone: { backgroundColor: colors.primary + '60' },
  stepDotActive: { backgroundColor: colors.primary },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  weekLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.lg,
    letterSpacing: 0.2,
  },
  stepHeading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },

  section: { marginBottom: spacing.xl },
  sectionLabelWrap: { marginBottom: spacing.sm, gap: 2 },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    flex: 1, minWidth: 52, minHeight: 52,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, gap: 2,
  },
  chipSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  chipValueSelected: { color: colors.primary },
  chipLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textMuted, textAlign: 'center' },
  chipLabelSelected: { color: colors.primary },

  optionRow: { flexDirection: 'row', gap: spacing.sm },
  optionBtn: {
    flex: 1, minHeight: 48,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
  },
  optionBtnSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  optionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, textAlign: 'center' },
  optionBtnTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },

  weightSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  weightSummaryText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  weightSummaryMissed: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },

  skipNote: {
    fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, lineHeight: 20,
  },
  skipNoteTappable: {
    fontSize: fontSize.sm, color: colors.primary,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary + '40',
  },

  shortInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, color: colors.textPrimary,
    fontWeight: fontWeight.medium, width: 120,
  },

  notesInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary,
    minHeight: 88, lineHeight: 22,
  },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },

  perfGrid: { gap: spacing.sm },
  perfCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  perfCardSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  perfCardText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, flex: 1 },
  perfCardTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },

  ctaRow: { marginTop: spacing.lg },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, height: 52,
  },
  ctaBtnDisabled: { backgroundColor: colors.surface3 },
  ctaBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background, letterSpacing: 0.3 },
  ctaBtnTextDisabled: { color: colors.textMuted },
  ctaHint: { textAlign: 'center', fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },

  bottomPad: { height: spacing.xxl },

  ritualIntro: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  muscleChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  muscleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full ?? 99,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2 ?? colors.surface,
  },
  muscleChipSelected: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  muscleChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  muscleChipTextSelected: {
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },

  ritualIntroTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ritualIntroSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
