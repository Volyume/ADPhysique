/**
 * ExerciseRestSheet
 *
 * Picks how long to rest between sets of one exercise, opened from the rest
 * length control on an exercise's section header (12-BUILD-SPEC sections 3 and
 * 4, register D220). It is a dumb picker: it owns the draft while it is open
 * and nothing else, no persistence and no store.
 *
 * The length runs from 0:30 to 10:00 in 15 second steps. It reads as m:ss at
 * display size between a -15 and a +15 control, with a row of presets at
 * 1:00, 1:30, 2:00 and 3:00 below it, then Cancel and Save.
 *
 * Props
 *   visible  controls the sheet (the BottomSheet contract)
 *   value    the exercise's rest in seconds. Anything that is not a positive
 *            number opens at 90 seconds, the app's default rest, and anything
 *            outside 30 to 600 opens clamped to the nearest end. A value that
 *            sits between steps (say 100) opens as it is and is not snapped.
 *   onSave   called with the chosen whole seconds
 *   onClose  called after Save, by Cancel, and by the backdrop, a swipe down
 *            and hardware back
 *
 * Save calls onSave and then onClose, so the caller only has to store the
 * length and flip its own visible flag. Cancel only calls onClose and drops
 * the draft. The draft is seeded from `value` each time the sheet opens, and a
 * `value` that changes while the sheet is open does not move the draft.
 *
 * Built from the house Button, Chip (single-select, role radio) and
 * PressableCard. Nothing here knows about the rest timer or the store.
 */

import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from '../../BottomSheet';
import Button from '../../Button';
import Chip from '../../Chip';
import useTheme from '../../../hooks/useTheme';
import { spacing, iconSize } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
import { formatSeconds } from '../../../lib/workoutHelpers';
import { formatRoundRestWords } from '../../../lib/circuitRound';
import { selection as hapticSelection } from '../../../lib/haptics';

const MIN_SECONDS = 30;
const MAX_SECONDS = 600;
const STEP_SECONDS = 15;
const DEFAULT_SECONDS = 90;
const PRESETS = [60, 90, 120, 180];

function clampSeconds(seconds) {
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds));
}

function seedSeconds(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SECONDS;
  return clampSeconds(n);
}

// A 48 dp step in the rest strip's grammar (D220 addendum 30, audit D4): a
// 20 dp remove or add glyph and the step as a semibold label, primary ink,
// no box and no amber.
function StepButton({ icon, label, accessibilityLabel, disabled, onPress, testID }) {
  const t = useTheme();
  const ink = disabled ? t.colors.textDisabled : t.colors.textPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[styles.step, disabled && styles.stepDisabled]}
    >
      <Ionicons name={icon} size={iconSize.md} color={ink} />
      <Text style={{ ...t.type.w(t.type.num('label'), 'semibold'), color: ink }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ExerciseRestSheet({ visible, value, onSave, onClose }) {
  const t = useTheme();
  const live = useMemo(() => ({
    title: { ...t.type.title, color: t.colors.textPrimary },
    readout: { ...t.type.num('display'), color: t.colors.textPrimary },
  }), [t]);

  const [seconds, setSeconds] = useState(() => seedSeconds(value));
  // Reseed the draft on the closed-to-open edge, during render, so the first
  // painted frame of an open sheet already shows the saved length.
  const [wasVisible, setWasVisible] = useState(!!visible);
  if (!!visible !== wasVisible) {
    setWasVisible(!!visible);
    if (visible) setSeconds(seedSeconds(value));
  }

  const atMin = seconds <= MIN_SECONDS;
  const atMax = seconds >= MAX_SECONDS;

  function nudge(delta) {
    hapticSelection();
    setSeconds(current => clampSeconds(current + delta));
  }

  function pick(preset) {
    hapticSelection();
    setSeconds(preset);
  }

  function handleSave() {
    onSave?.(seconds);
    onClose?.();
  }

  function handleCancel() {
    onClose?.();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll accessibilityLabel="Rest between sets">
      <View style={styles.content}>
        <Text style={[styles.center, live.title]} accessibilityRole="header">Rest between sets</Text>

        <View style={styles.stepRow}>
          <StepButton
            icon="remove"
            label="15"
            accessibilityLabel="Remove 15 seconds"
            disabled={atMin}
            onPress={() => nudge(-STEP_SECONDS)}
            testID="volyume-exercise-rest-remove"
          />
          <Text
            style={[styles.readout, styles.center, live.readout]}
            accessibilityLabel={`Rest ${formatRoundRestWords(seconds)}`}
            testID="volyume-exercise-rest-readout"
          >
            {formatSeconds(seconds)}
          </Text>
          <StepButton
            icon="add"
            label="15"
            accessibilityLabel="Add 15 seconds"
            disabled={atMax}
            onPress={() => nudge(STEP_SECONDS)}
            testID="volyume-exercise-rest-add"
          />
        </View>

        <View style={styles.presets} accessibilityRole="radiogroup">
          {PRESETS.map(preset => (
            <Chip
              key={preset}
              label={formatSeconds(preset)}
              selected={seconds === preset}
              onPress={() => pick(preset)}
              accessibilityRole="radio"
              accessibilityLabel={`Set rest to ${formatRoundRestWords(preset)}`}
              style={styles.preset}
              testID={`volyume-exercise-rest-preset-${preset}`}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="secondary"
            fullWidth={false}
            style={styles.action}
            onPress={handleCancel}
            accessibilityLabel="Cancel rest length"
            testID="volyume-exercise-rest-cancel"
          />
          <Button
            title="Save"
            fullWidth={false}
            style={styles.action}
            onPress={handleSave}
            accessibilityLabel="Save rest length"
            testID="volyume-exercise-rest-save"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

// Layout only (theme-invariant). Type roles and colours come from the live
// theme above and inside StepButton.
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  center: { textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: {
    minWidth: touchTarget.minimum + spacing.lg,
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.5 },
  readout: { flex: 1 },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
