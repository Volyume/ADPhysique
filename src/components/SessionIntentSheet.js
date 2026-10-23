/**
 * SessionIntentSheet - the pre-workout "How are you feeling today?" sheet.
 * Moved out of HomeScreen.js verbatim under D231 (app layout rework, batch 2):
 * Repeat now starts from Train as well as Today's own "Start workout", and both
 * must ask the same question the same way, so the sheet is one component.
 *
 * What the sheet carries is unchanged from where it lived:
 *  - COMP-008: three optional readiness rows (soreness, sleep, energy), each a
 *    low / middle / high chip. Stored values match the scales the workout row and
 *    its readers expect: soreness on the existing 1-3 (Fresh/Mild/Sore) scale
 *    the adaptive engine and computeRecoveryEMAs read; sleep and energy on the
 *    1-5 domain (chips offer 2/3/4) so the weekly sleep_quality write and
 *    CoachReview's <2.5 thresholds stay valid. R2-10 (founder decision
 *    "Reorder", 2026-07-11): the rows sit ABOVE the intent options, compacted to
 *    one line each, because the intent tap starts the session instantly -
 *    anything beneath that trigger is unreachable.
 *  - three answers (Sharp, Average, Below par): one tap starts the session,
 *    carrying whatever readiness is set;
 *  - Skip: starts with null intent and no readiness;
 *  - D2 (founder decision 2026-07-03, Option A): the standing opt-out persists
 *    the flag, then starts exactly as Skip would, null intent, no readiness, no
 *    fabricated input. Reversible in Settings, Coaching. Coaching input is never
 *    fabricated.
 *  - EP-06/UI-01: `scroll` bounds the body by BottomSheet's own max height so
 *    every choice stays reachable on a short viewport.
 *
 * The caller owns what a choice does: `onConfirm(intent, readiness)` is called
 * with the intent ('sharp' | 'average' | 'below_par' | null) and the three
 * readiness answers (each null when unset). The readiness chips are cleared
 * every time the sheet opens, so each session starts from blank chips and no
 * remembered intent.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import BottomSheet from './BottomSheet';
import Chip from './Chip';
import PressableCard from './PressableCard';
import * as haptics from '../lib/haptics';

// COMP-008: the three pre-workout readiness rows shown above the intent
// options. `short` is the inline label; `label` stays the full accessible
// phrasing.
const READINESS_ROWS = [
  {
    key: 'soreness24hBefore',
    label: 'Soreness coming in',
    short: 'Soreness',
    chips: [{ label: 'Fresh', value: 1 }, { label: 'Mild', value: 2 }, { label: 'Sore', value: 3 }],
  },
  {
    key: 'sleepQuality',
    label: 'Sleep last night',
    short: 'Sleep',
    chips: [{ label: 'Poor', value: 2 }, { label: 'OK', value: 3 }, { label: 'Good', value: 4 }],
  },
  {
    key: 'energyScore',
    label: 'Energy today',
    short: 'Energy',
    chips: [{ label: 'Low', value: 2 }, { label: 'OK', value: 3 }, { label: 'High', value: 4 }],
  },
];

const NO_READINESS = { soreness24hBefore: null, sleepQuality: null, energyScore: null };

const INTENT_OPTIONS = [
  { key: 'sharp', label: 'Sharp', sub: 'Energised and ready', icon: 'flash-outline' },
  { key: 'average', label: 'Average', sub: 'Normal day, feeling fine', icon: 'remove-outline' },
  { key: 'below_par', label: 'Below par', sub: 'Tired, stressed, or off', icon: 'arrow-down-outline' },
];

export default function SessionIntentSheet({ visible, onClose, onConfirm }) {
  const t = useTheme();
  const userId = useAppStore(s => s.user?.id);
  const [readiness, setReadiness] = useState(NO_READINESS);

  // Clear any readiness from a previously-cancelled prompt so each session
  // starts from blank chips and no remembered intent.
  useEffect(() => {
    if (visible) setReadiness(NO_READINESS);
  }, [visible]);

  const live = {
    intentTitle: { ...t.type.h3, color: t.colors.textPrimary },
    intentSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    intentOption: { backgroundColor: t.colors.surface2 ?? t.colors.background, borderColor: t.colors.border },
    intentOptionIcon: { backgroundColor: t.colors.primaryBg },
    readinessGroupLabel: { ...t.type.overline, color: t.colors.textMuted },
    intentOptionLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    intentOptionSub: { ...t.type.caption, color: t.colors.textSecondary },
    readinessLabel: { ...t.type.caption, color: t.colors.textSecondary },
    intentSkipText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    intentOptOutText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    intentOptOutSub: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="How are you feeling today"
      scroll
    >
      <Text style={[styles.intentTitle, live.intentTitle]}>How are you feeling today?</Text>
      {/* C10C: the old line said the answers "shape how your sessions are
          read" without ever saying WHICH WAY. The direction is the part that
          matters to a user deciding whether to answer honestly: a rough night
          can ease the session, and a good one never adds to it. "Can" and
          "when coaching is active" keep it truthful - not every answer changes
          something, and the easing only happens where coaching is actually
          available. FOUNDER DECISION (fully free, no tier split): that easing
          is the coaching adjustment every user now gets, so this is the one
          sentence for everyone. */}
      <Text style={[styles.intentSub, live.intentSub]}>
        Takes a second. When coaching is active, poor sleep or heavy soreness can ease today's session. Answering well never makes it harder than planned.
      </Text>
      <Text style={[styles.readinessGroupLabel, live.readinessGroupLabel]}>
        Readiness (optional)
      </Text>
      {READINESS_ROWS.map(row => (
        <View key={row.key} style={styles.readinessRow}>
          <Text style={[styles.readinessLabel, live.readinessLabel]}>{row.short}</Text>
          <View style={styles.readinessChips} accessibilityRole="radiogroup" accessibilityLabel={row.label}>
            {row.chips.map(chip => {
              const selected = readiness[row.key] === chip.value;
              return (
                <Chip
                  key={chip.value}
                  label={chip.label}
                  selected={selected}
                  style={styles.readinessChipThird}
                  accessibilityRole="radio"
                  accessibilityLabel={`${row.label}: ${chip.label}`}
                  onPress={() => {
                    haptics.selection();
                    setReadiness(r => ({
                      // Tapping the selected chip again clears it, so the row
                      // stays genuinely optional.
                      ...r,
                      [row.key]: selected ? null : chip.value,
                    }));
                  }}
                />
              );
            })}
          </View>
        </View>
      ))}

      {/* The three answers: one tap starts the session instantly, carrying
          whatever readiness is set above. */}
      {INTENT_OPTIONS.map((opt, i) => (
        <PressableCard
          key={opt.key}
          style={[styles.intentOption, live.intentOption, i === 0 && styles.intentOptionFirst]}
          onPress={() => { haptics.selection(); onConfirm(opt.key, readiness); }}
          accessibilityLabel={`${opt.label}. ${opt.sub}. Starts the workout.`}
        >
          <View style={[styles.intentOptionIcon, live.intentOptionIcon]}>
            <Ionicons name={opt.icon} size={20} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.intentOptionLabel, live.intentOptionLabel]}>{opt.label}</Text>
            <Text style={[styles.intentOptionSub, live.intentOptionSub]}>{opt.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </PressableCard>
      ))}

      <TouchableOpacity
        style={styles.intentSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip and start without answering"
        onPress={() => { haptics.selection(); onConfirm(null, NO_READINESS); }}
      >
        <Text style={[styles.intentSkipText, live.intentSkipText]}>Skip</Text>
      </TouchableOpacity>

      {/* D2 (Option A): the standing opt-out. Persists, then starts this
          session exactly as Skip would, null intent, no readiness, no
          fabricated input. Reversible in Settings, Coaching. */}
      <TouchableOpacity
        style={styles.intentOptOut}
        onPress={() => {
          haptics.selection();
          // C14 job 2: the same one write path Settings uses, so this opt-out
          // is stamped and pushed rather than sitting locally until something
          // else happens to sync. The key is guarded now (its "off" state is a
          // delete), and an unstamped write there is what lets a stale device's
          // copy win a conflict.
          // eslint-disable-next-line global-require
          require('../lib/sync').setUserPref(userId, '@volyume_intent_prompt_off', 'true').catch(() => {});
          onConfirm(null, NO_READINESS);
        }}
        accessibilityRole="button"
        accessibilityLabel="Do not ask before each session"
      >
        <Text style={[styles.intentOptOutText, live.intentOptOutText]}>Do not ask before each session</Text>
        <Text style={[styles.intentOptOutSub, live.intentOptOutSub]}>
          Without it, sessions are not adjusted to how you are feeling, and your next block's set targets stay where they are rather than moving based on what this block showed. Turn it back on any time in Settings, Coaching.
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intentTitle: {
    ...type.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  intentSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  intentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2 ?? colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentOptionIcon: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  intentOptionLabel: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  intentOptionSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  // R2-10 ("Reorder"): the readiness block above the intent options. A quiet
  // overline heads it; each row is ONE line - fixed label column so the three
  // rows align, then three equal-width chips filling the rest.
  readinessGroupLabel: {
    ...type.overline,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readinessLabel: {
    ...type.caption,
    color: colors.textSecondary,
    width: 76,
  },
  readinessChips: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  // Equal thirds: overrides Chip's own alignSelf so the three chips share the
  // row evenly and every row's columns line up.
  readinessChipThird: {
    flex: 1,
    justifyContent: 'center',
  },
  // Breathing room between the optional block and the primary answers.
  intentOptionFirst: {
    marginTop: spacing.md,
  },
  intentSkip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  intentSkipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  intentOptOut: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  intentOptOutText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  intentOptOutSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
});
