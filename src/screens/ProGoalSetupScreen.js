import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PHASES = [
  {
    value: 'agg_cut',
    title: 'Losing weight, faster pace',
    description: 'Dropping weight quickly before an event or deadline. Accepts more hunger.',
    icon: 'trending-down-outline',
    iconColor: colors.warning,
  },
  {
    value: 'mod_cut',
    title: 'Losing weight, steady pace',
    description: 'Consistent, sustainable fat loss while keeping strength. The default approach.',
    icon: 'trending-down-outline',
    iconColor: colors.warning,
  },
  {
    value: 'mild_cut',
    title: 'Losing a little weight',
    description: 'Slow, comfortable deficit. Prioritises muscle retention over speed.',
    icon: 'trending-down-outline',
    iconColor: colors.warning,
  },
  {
    value: 'maint',
    title: 'Maintaining weight',
    description: 'Not trying to lose or gain. Keeping performance and body composition stable.',
    icon: 'remove-outline',
    iconColor: colors.textSecondary,
  },
  {
    value: 'mild_bulk',
    title: 'Building muscle, controlled pace',
    description: 'Adding muscle slowly with minimal fat gain. 0.5–1% bodyweight per month.',
    icon: 'trending-up-outline',
    iconColor: colors.success,
  },
  {
    value: 'mod_bulk',
    title: 'Building muscle, standard pace',
    description: 'Faster muscle growth, some fat gain expected. Good for people who have been training consistently for a year or more.',
    icon: 'trending-up-outline',
    iconColor: colors.success,
  },
];

const STEP_OPTIONS = [6000, 8000, 10000, 12000, 14000];

function formatSteps(n) {
  return n.toLocaleString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function SectionSubtitle({ children }) {
  return <Text style={styles.sectionSubtitle}>{children}</Text>;
}

function PhaseCard({ phase, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.phaseCard, selected && styles.phaseCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={phase.title}
    >
      <View style={[styles.phaseIconWrap, { borderColor: phase.iconColor + '33' }]}>
        <Ionicons name={phase.icon} size={22} color={phase.iconColor} />
      </View>
      <View style={styles.phaseText}>
        <Text style={[styles.phaseTitle, selected && styles.phaseTitleSelected]}>
          {phase.title}
        </Text>
        <Text style={styles.phaseDescription}>{phase.description}</Text>
      </View>
      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={colors.primary}
          style={styles.phaseCheck}
        />
      )}
    </TouchableOpacity>
  );
}

function StepChip({ steps, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.stepChip, selected && styles.stepChipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${formatSteps(steps)} steps`}
    >
      <Text style={[styles.stepChipText, selected && styles.stepChipTextSelected]}>
        {formatSteps(steps)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProGoalSetupScreen({ navigation, route }) {
  const { user, userProfile, saveLocalProfile } = useAppStore();

  const fromCheckin = route.params?.fromCheckin ?? false;

  const [selectedPhase, setSelectedPhase] = useState(
    userProfile?.goalPhase ?? null,
  );
  const [selectedSteps, setSelectedSteps] = useState(
    userProfile?.stepsTarget ?? 8000,
  );
  const canSave = selectedPhase !== null;

  const handleSave = async () => {
    if (!canSave) return;
    const now = Date.now();
    await saveLocalProfile(user.id, {
      ...(userProfile || {}),
      goalPhase: selectedPhase,
      phaseStartedAt: now,
      stepsTarget: selectedSteps,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pro Goal Setup</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section 1: Current phase ── */}
        <SectionLabel>What's your current goal?</SectionLabel>

        {PHASES.map((phase) => (
          <PhaseCard
            key={phase.value}
            phase={phase}
            selected={selectedPhase === phase.value}
            onPress={() => setSelectedPhase(phase.value)}
          />
        ))}

        {/* ── Section 2: Daily step target ── */}
        <SectionLabel style={styles.sectionLabelSpaced}>Daily step target</SectionLabel>
        <SectionSubtitle>
          Helps Volyume work out how active you are each day. Pick the range you're currently hitting.
        </SectionSubtitle>

        <View style={styles.stepsRow}>
          {STEP_OPTIONS.map((steps) => (
            <StepChip
              key={steps}
              steps={steps}
              selected={selectedSteps === steps}
              onPress={() => setSelectedSteps(steps)}
            />
          ))}
        </View>

        {/* ── Footer note ── */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            You can change this anytime in Settings → Pro Setup. Volyume doesn't lock you into a phase.
          </Text>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={fromCheckin ? 'Save and start check-in' : 'Save'}
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            {fromCheckin ? 'Save and start check-in' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: 24,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  // Section labels
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
    marginBottom: spacing.md,
  },
  sectionLabelSpaced: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },

  // Phase cards
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  phaseCardSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  phaseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
    backgroundColor: colors.surface2,
  },
  phaseText: {
    flex: 1,
  },
  phaseTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  phaseTitleSelected: {
    color: colors.primary,
  },
  phaseDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: 18,
  },
  phaseCheck: {
    marginLeft: spacing.sm,
    flexShrink: 0,
  },

  // Step chips
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepChip: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stepChipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  stepChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  stepChipTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Footer note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  footerNoteText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: 18,
  },

  // Save button
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.surface2,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
});
