import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { upsertUserProfile } from '../lib/supabase';
import useAppStore from '../store/useAppStore';

const STEPS = [
  {
    id: 'focus',
    title: "What's your training focus?",
    subtitle: 'This helps us personalise your experience.',
    field: 'training_focus',
    options: [
      { value: 'bodybuilding', label: 'Bodybuilding', desc: 'Maximum muscle size and symmetry', icon: 'body' },
      { value: 'hypertrophy', label: 'General Hypertrophy', desc: 'Build muscle efficiently', icon: 'fitness' },
      { value: 'strength_hypertrophy', label: 'Strength + Hypertrophy', desc: 'Strength with muscle gain', icon: 'barbell' },
      { value: 'physique', label: 'Physique / Aesthetic', desc: 'Visual physique improvements', icon: 'star' },
    ],
  },
  {
    id: 'age',
    title: 'How long have you been training?',
    subtitle: 'Your training age affects volume recommendations.',
    field: 'training_age',
    options: [
      { value: 1, label: 'Less than 1 year', desc: 'Beginner — still learning the basics', icon: 'leaf' },
      { value: 2, label: '1–3 years', desc: 'Intermediate — solid foundation built', icon: 'trending-up' },
      { value: 4, label: '3–5 years', desc: 'Experienced — advanced techniques needed', icon: 'flame' },
      { value: 6, label: '5+ years', desc: 'Veteran — optimising every detail', icon: 'trophy' },
    ],
  },
  {
    id: 'gym',
    title: 'Where do you train?',
    subtitle: 'Used to suggest relevant exercises.',
    field: 'primary_equipment',
    options: [
      { value: 'commercial', label: 'Commercial Gym', desc: 'Full range of equipment', icon: 'business' },
      { value: 'home', label: 'Home Gym', desc: 'Limited but dedicated setup', icon: 'home' },
      { value: 'both', label: 'Both', desc: 'Mix of commercial and home', icon: 'repeat' },
    ],
  },
  {
    id: 'units',
    title: 'Preferred weight unit?',
    subtitle: 'You can change this later in settings.',
    field: 'units',
    options: [
      { value: 'kg', label: 'Kilograms (kg)', desc: 'Used in most countries', icon: 'scale' },
      { value: 'lbs', label: 'Pounds (lbs)', desc: 'Used in the US', icon: 'scale' },
    ],
  },
];

function OptionButton({ option, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={option.icon} size={22} color={selected ? colors.background : colors.primary} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.optionDesc}>{option.desc}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { user, setUnits } = useAppStore();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    training_focus: 'bodybuilding',
    training_age: 2,
    primary_equipment: 'commercial',
    units: 'kg',
  });
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];

  function selectOption(value) {
    setSelections(prev => ({ ...prev, [currentStep.field]: value }));
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }
    if (!user) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }
    setLoading(true);
    try {
      if (!user?.isLocal) {
        await upsertUserProfile(user.id, selections).catch(() => {});
      }
      setUnits(selections.units);
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepNum}>Step {step + 1} of {STEPS.length}</Text>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

        <View style={styles.options}>
          {currentStep.options.map(option => (
            <OptionButton
              key={String(option.value)}
              option={option}
              selected={selections[currentStep.field] === option.value}
              onPress={() => selectOption(option.value)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(s => s - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && styles.nextBtnFull, loading && styles.btnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {isLastStep ? 'Start Logging!' : 'Next'}
              </Text>
              {!isLastStep && <Ionicons name="arrow-forward" size={20} color={colors.background} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface2,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  stepNum: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  nextBtnFull: {
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
});
