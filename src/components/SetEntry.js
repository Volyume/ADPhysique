import { memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import * as haptics from '../lib/haptics';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { calculate1RM } from '../lib/algorithms';
import { formatSeconds, parseTimeToSeconds } from '../lib/workoutHelpers';
import InfoTooltip from './InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import { workoutLoggerSize } from '../styles/layout';

const STEPPER_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function SetEntry({ value, onChange, units = 'kg', isWarmup = false, onSubmitComplete, exerciseType = 'weight_reps', weightStepKg = 2.5 }) {
  const { weight, reps, isGhost } = value;
  const repsRef = useRef(null);
  // weighted_bodyweight renders byte-identically to weight_reps (weight field
  // + reps field, weight defaulting to 0). reps_only hides the weight field;
  // duration / distance swap in time/distance fields. Anything unrecognised
  // falls back to the safe weight_reps layout.
  const showWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';

  function adjustFrom(v, field, delta) {
    haptics.selection();
    // CL-6.3: the weight step honours the exercise's own increment
    // (exercise.incrementKg, e.g. 1.0 for dumbbell moves, 2.5 barbell
    // default). Gym weights are kg-only.
    const steps = { weight: Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5, reps: 1 };
    // Reps cap matches the TextInput's [1, 200] so a typed 150 doesn't
    // snap back to 100 when the user taps −.
    const limits = { weight: [0, 500], reps: [1, 200] };
    const fieldLimits = limits[field] || [0, 9999];
    // Coerce in case a previous code path wrote a string like '' or '.'
    // arithmetic on those produces NaN and the next clamp wedges at the
    // lower bound forever.
    const raw = v[field];
    const current = typeof raw === 'number' ? raw : (parseFloat(raw) || 0);
    const next = Math.min(Math.max(current + delta * (steps[field] || 1), fieldLimits[0]), fieldLimits[1]);
    onChange({ ...v, [field]: field === 'weight' ? Math.round(next * 100) / 100 : Math.round(next), isGhost: false });
  }

  function adjust(field, delta) {
    adjustFrom(valueRef.current, field, delta);
  }

  function setField(field, val) {
    onChange({ ...value, [field]: val, isGhost: false });
  }

  // CL-6.3: long-press repeat on the weight/reps steppers (the RestTimer
  // ±15 pattern): hold to keep adjusting at 200ms, cleared on release and
  // unmount. `adjust` reads the CURRENT value from props each call via the
  // ref below, so a held button never clamps against a stale closure.
  const valueRef = useRef(value);
  valueRef.current = value;
  const repeatRef = useRef(null);
  function stopRepeat() {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }
  function startRepeat(field, delta) {
    stopRepeat();
    repeatRef.current = setInterval(() => adjustFrom(valueRef.current, field, delta), 200);
  }
  useEffect(() => () => stopRepeat(), []);


  // Time stepper for the duration / distance schemas. Steps the seconds count
  // (stored in value.reps) by `delta` seconds, clamped to [0, 5999] (99:59).
  function adjustSecondsFrom(v, delta) {
    haptics.selection();
    const raw = v.reps;
    const current = typeof raw === 'number' ? raw : (parseInt(raw, 10) || 0);
    const next = Math.min(Math.max(current + delta, 0), 5999);
    onChange({ ...v, reps: next, isGhost: false });
  }

  function adjustSeconds(delta) {
    adjustSecondsFrom(valueRef.current, delta);
  }

  function startSecondsRepeat(delta) {
    stopRepeat();
    repeatRef.current = setInterval(() => adjustSecondsFrom(valueRef.current, delta), 200);
  }

  const liveWeight = parseFloat(value.weight);
  const liveReps = parseInt(value.actualReps || value.reps, 10);
  // Only weight_reps / weighted_bodyweight have a meaningful Est. 1RM. A
  // reps_only set carrying a stray weight (e.g. left over from a mid-session
  // type change) must not surface a bogus estimate.
  const live1RM = (showWeightReps && liveWeight > 0 && liveReps > 0 && !isWarmup)
    ? calculate1RM(liveWeight, liveReps)
    : null;

  return (
    <View style={styles.container}>
      {/* Weight Row, rendered for weight_reps and weighted_bodyweight only.
          This branch is BYTE-IDENTICAL to the original single-schema layout. */}
      {showWeightReps && (
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={styles.fieldLabel}>Weight ({units})</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('weight', -1)}
            onLongPress={() => startRepeat('weight', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Decrease weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-weight-input"
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            maxFontSizeMultiplier={1.3}
            // Render 0 as "0" not "" (was `String(weight || '')`, which hid
            // a legitimate zero-weight bodyweight set).
            value={weight == null || weight === '' ? '' : String(weight)}
            onChangeText={v => {
              // Preserve in-progress decimal entry. The previous code did
              //   const n = parseFloat(v); setField('weight', n)
              // which stripped the trailing dot, typing "21." stored 21,
              // re-rendered "21", and the decimal separator was lost so
              // values like 21.25 kg (fractional plates) couldn't be typed.
              // Accept up to 3 integer digits and up to 2 decimals, max 500.
              if (v === '' || /^\d{0,3}\.?\d{0,2}$/.test(v)) {
                const n = parseFloat(v);
                if (!isNaN(n) && n > 500) return; // refuse over-cap
                setField('weight', v); // keep raw string; parseFloat on read
              }
            }}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => repsRef.current?.focus()}
            selectTextOnFocus
            accessibilityLabel={`Weight in ${units}`}
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('weight', 1)}
            onLongPress={() => startRepeat('weight', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Increase weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Duration, a mm:ss time field. Total seconds are stored in value.reps
          (reused as the seconds field), so the screen's existing reps->actual_reps
          write path persists the metric with no new set column. */}
      {exerciseType === 'duration' && (
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={styles.fieldLabel}>Time (mm:ss)</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustSeconds(-5)}
            onLongPress={() => startSecondsRepeat(-5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-duration-input"
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            maxFontSizeMultiplier={1.3}
            value={reps == null || reps === '' ? '' : formatSeconds(reps)}
            onChangeText={v => setField('reps', parseTimeToSeconds(v))}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Time in minutes and seconds"
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustSeconds(5)}
            onLongPress={() => startSecondsRepeat(5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Distance, distance (in the user's units) + a mm:ss time field.
          Distance is stored in value.weight (reused) and seconds in value.reps,
          so both metrics persist through the screen's existing weight/reps
          write path with no new set column. */}
      {exerciseType === 'distance' && (
      <>
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={styles.fieldLabel}>Distance ({units === 'kg' ? 'm' : 'yd'})</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('weight', -1)}
            onLongPress={() => startRepeat('weight', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease distance"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-distance-input"
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            maxFontSizeMultiplier={1.3}
            value={weight == null || weight === '' ? '' : String(weight)}
            onChangeText={v => {
              if (v === '' || /^\d{0,5}\.?\d{0,2}$/.test(v)) setField('weight', v);
            }}
            keyboardType="decimal-pad"
            returnKeyType="next"
            selectTextOnFocus
            accessibilityLabel="Distance"
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('weight', 1)}
            onLongPress={() => startRepeat('weight', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase distance"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={styles.fieldLabel}>Time (mm:ss)</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustSeconds(-5)}
            onLongPress={() => startSecondsRepeat(-5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-distance-time-input"
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            maxFontSizeMultiplier={1.3}
            value={reps == null || reps === '' ? '' : formatSeconds(reps)}
            onChangeText={v => setField('reps', parseTimeToSeconds(v))}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Time in minutes and seconds"
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustSeconds(5)}
            onLongPress={() => startSecondsRepeat(5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      </>
      )}

      {/* Reps, rendered for weight_reps, weighted_bodyweight and reps_only.
          reps_only hides only the Weight Row above; the reps field itself is
          unchanged. */}
      {(showWeightReps || exerciseType === 'reps_only') && (
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={styles.fieldLabel}>Reps</Text>
          {live1RM != null && live1RM > 0 && (
            <View style={styles.e1rmRow}>
              <Text style={styles.e1rmHint}>Est. max ≈{Math.round(live1RM)}{units}</Text>
              {/* U-F-5: plain-English gloss for the estimated-1RM jargon. */}
              <InfoTooltip text={GLOSSARY.estMax} size={13} />
            </View>
          )}
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('reps', -1)}
            onLongPress={() => startRepeat('reps', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease reps by 1"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-reps-input"
            ref={repsRef}
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            maxFontSizeMultiplier={1.3}
            value={reps == null || reps === '' ? '' : String(reps)}
            onChangeText={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) setField('reps', Math.min(Math.max(n, 1), 200));
              else if (v === '') setField('reps', '');
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            // Keyboard-completes-the-set (ULTIMATE-WR-1): reps is the last field,
            // so its Done key logs the set directly. Falls back to dismissing the
            // keyboard when no handler is supplied, so other call sites are
            // unaffected.
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Number of reps"
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('reps', 1)}
            onLongPress={() => startRepeat('reps', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase reps by 1"
            accessibilityHint="Hold to keep adjusting"
          >
            <Text style={styles.stepBtnText} maxFontSizeMultiplier={1.3}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Effort picker removed, was rarely used in practice. RIR still
          gets recorded internally (defaulted in DEFAULT_SET) so the
          autoregulation engine keeps working; we just don't ask the
          user to set it per-set. */}

      {/* Set-type row removed (COMP-001): the card header's orientation
          row in ActiveWorkoutScreen is now the set-type picker's entry
          point. The duplicate 1RM chip went with it; the inline e1rmHint
          beside the Reps label is the single in-card estimate. */}
    </View>
  );
}

export default memo(SetEntry);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
  },
  fieldLabelRow: {
    minWidth: workoutLoggerSize.setEntryLabelWidth,
    flexBasis: workoutLoggerSize.setEntryLabelWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  fieldLabelWrap: {
    minWidth: workoutLoggerSize.setEntryLabelWidth,
    flexBasis: workoutLoggerSize.setEntryLabelWidth,
    maxWidth: 88,
    flexShrink: 0,
    gap: 1,
  },
  e1rmRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  e1rmHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  perSideHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepBtn: {
    minWidth: workoutLoggerSize.setEntryStepperButton,
    minHeight: workoutLoggerSize.setEntryStepperButton,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  stepBtnText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
  },
  valueInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    paddingVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  valueInputGhost: {
    color: colors.textMuted,
  },
  rirRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rirBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rirBtnActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  rirBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  rirBtnTextActive: {
    color: colors.primary,
  },
});
