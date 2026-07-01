import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { setGoalLockAdvanced, getGoalLockAdvanced, recordEngineTelemetry } from '../lib/database';

/**
 * GoalLockConsentScreen (Move #2).
 *
 * Shown inside Pro onboarding when the selected goal is
 * physique_competition or advanced_recomp, and also reachable
 * from the You tab as an edit surface. Locked copy lives in
 * ONBOARDING_SEQUENCE_LOCKED.md Screen 6.
 *
 * The user picks one of two options:
 *
 *   advanced  -> "I have prior experience or I'm working with a coach"
 *                Raises the ED-pattern detector threshold from 2
 *                signals to 3. FFM floor still applies.
 *   standard  -> "I'm new to this and want the standard safety checks"
 *                Default. 2-signal threshold.
 *
 * Routing:
 * - Used as part of ProOnboarding stack: tap Continue advances to
 *   the next step via `route.params.onContinue` if provided.
 * - Used from You tab: shows a "Save" button that pops back.
 */
export default function GoalLockConsentScreen({ navigation, route }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const onContinue = route?.params?.onContinue;
  const editMode = route?.params?.editMode === true;
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);

  // In edit mode we want to show the current value as the default.
  useEffect(() => {
    let cancelled = false;
    if (!editMode || !user?.id) return;
    (async () => {
      try {
        const current = await getGoalLockAdvanced(user.id);
        if (!cancelled) setChoice(current ? 'advanced' : 'standard');
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [editMode, user?.id]);

  async function save() {
    if (!choice || busy) return;
    setBusy(true);
    const advanced = choice === 'advanced';
    try {
      if (user?.id) {
        await setGoalLockAdvanced(user.id, advanced);
        await recordEngineTelemetry(user.id, advanced ? 'goal_lock_set' : 'goal_lock_cleared', {
          source: editMode ? 'you_tab_edit' : 'onboarding',
        }).catch(() => {});
      }
      if (onContinue) {
        onContinue(advanced);
      } else if (navigation?.goBack) {
        navigation.goBack();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>A note about aggressive cuts</Text>
        <Text style={styles.body}>
          You picked a goal that involves aggressive calorie cuts. That's fine. Volyume can support that, but it also has safety checks that hold a cut when your body is telling us something's wrong. We want you to know they're there.
        </Text>

        <Text style={styles.fieldLabel}>Confirm one of these</Text>

        <View accessibilityRole="radiogroup" accessibilityLabel="Confirm your experience with aggressive cuts">
        <Pressable
          onPress={() => setChoice('advanced')}
          style={[styles.optionCard, choice === 'advanced' && styles.optionCardActive]}
          accessibilityRole="radio"
          accessibilityState={{ selected: choice === 'advanced' }}
        >
          <View style={[styles.radio, choice === 'advanced' && styles.radioActive]}>
            {choice === 'advanced' ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.optionText}>
            I have prior experience managing aggressive cuts safely, or I'm working with a coach.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setChoice('standard')}
          style={[styles.optionCard, choice === 'standard' && styles.optionCardActive]}
          accessibilityRole="radio"
          accessibilityState={{ selected: choice === 'standard' }}
        >
          <View style={[styles.radio, choice === 'standard' && styles.radioActive]}>
            {choice === 'standard' ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.optionText}>
            I'm new to this and want Volyume's standard safety checks to apply.
          </Text>
        </Pressable>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.noteText}>
            You can change this any time from You → Goal lock.
          </Text>
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={!choice || busy}
          style={[styles.cta, (!choice || busy) && styles.ctaDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !choice || busy }}
          accessibilityLabel={editMode ? 'Save' : 'Continue'}
        >
          <Text style={styles.ctaText}>{editMode ? 'Save' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  title: {
    ...type.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  radio: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: { borderColor: colors.primary },
  radioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  noteText: { ...type.caption, color: colors.textMuted, flex: 1 },
  cta: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { ...type.bodyStrong, color: colors.onPrimary },
});
