import { memo, useRef, useEffect, useId } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, InputAccessoryView, Platform } from 'react-native';
import * as haptics from '../lib/haptics';
import { colors, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { formatSeconds, parseTimeToSeconds } from '../lib/workoutHelpers';
import Ionicons from '@expo/vector-icons/Ionicons';
import { workoutLoggerSize, touchTarget } from '../styles/layout';
import { parseDecimalInput } from '../lib/parseDecimalInput';

const STEPPER_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// D87: `recordLine` is the pure buildRecordLine() result (or null). The
// caller owns it because the set history lives on the screen; SetEntry only
// renders it. Absent (the logged-set edit sheet) = today's card, unchanged.
// `compact` (phase 2B density pass, founder S22 verdict): weight + reps
// side-by-side in ONE row with labels above, halving the entry's height.
// Same inputs, testIDs, keyboards, validation and focus chain - only the
// arrangement changes. Applies to weight_reps/weighted_bodyweight/reps_only;
// duration/distance keep their existing layout.
// `loadSemantics` (D107-2): what the entered weight MEANS for this exercise;
// only the field label changes - "per hand" for two-implement dumbbell work,
// "Assistance" for assistance machines (neutral, never body-noise), "Added
// weight" for loaded bodyweight movements. Entry, storage and validation are
// untouched.
function SetEntry({ value, onChange, units = 'kg', onSubmitComplete, exerciseType = 'weight_reps', weightStepKg = 2.5, recordLine = null, compact = false, loadSemantics = 'total' }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour/fontSize/
  // type-bearing keys only.
  const t = useTheme();
  const live = {
    fieldLabel: { ...t.type.label, color: t.colors.textSecondary },
    stepper: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    stepBtn: { backgroundColor: t.colors.surface2 },
    valueInput: { ...t.type.bodyStrong, fontVariant: ['tabular-nums'], color: t.colors.textPrimary },
    valueInputGhost: { color: t.colors.textMuted },
    keyboardDoneBar: { backgroundColor: t.colors.surface2, borderTopColor: t.colors.border },
    keyboardDoneText: { ...t.type.bodyStrong, color: t.colors.primary },
    recordRow: { backgroundColor: withAlpha(t.colors.gold, alpha.soft) },
    recordHeadline: { ...t.type.label, color: t.colors.gold },
    recordWhy: { ...t.type.caption, color: t.colors.textSecondary },
  };
  const { weight, reps, isGhost } = value;
  const repsRef = useRef(null);

  // Numeric-keypad dismissal (founder 2026-07-22 iOS walk). iOS decimal-pad
  // and number-pad have NO return/Done key, so the weight/distance/reps fields
  // could only be closed by tapping a bare patch of screen. Two dismissals,
  // both requested:
  //   1) A Done bar above the keyboard (InputAccessoryView, iOS only) -- one
  //      tap, always visible, never closes on its own.
  //   2) An 8s inactivity timeout as a safety net for walking away from the
  //      field. It resets on every keystroke and on focus, so it only fires
  //      when the field is genuinely left alone -- never mid-entry between
  //      weight and reps, which is the exact failure the 2026-07-13 Android
  //      walk rejected a naive timer for.
  const isIOS = Platform.OS === 'ios';
  const accessoryID = 'volyume-setentry-done-' + useId().replace(/:/g, '');
  const numericAccessory = isIOS ? { inputAccessoryViewID: accessoryID } : null;
  const idleTimer = useRef(null);
  function clearIdle() {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
  }
  function bumpIdle() {
    clearIdle();
    idleTimer.current = setTimeout(() => Keyboard.dismiss(), 8000);
  }
  // weighted_bodyweight renders byte-identically to weight_reps (weight field
  // + reps field, weight defaulting to 0). reps_only hides the weight field;
  // duration / distance swap in time/distance fields. Anything unrecognised
  // falls back to the safe weight_reps layout.
  const showWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';
  // D107-2: the one place the weight field says what its number means.
  const weightFieldLabel = loadSemantics === 'per_hand'
    ? `Weight (${units}, per hand)`
    : loadSemantics === 'assisted'
      ? `Assistance (${units})`
      : loadSemantics === 'added_bodyweight'
        ? `Added weight (${units})`
        : `Weight (${units})`;

  function adjustFrom(v, field, delta) {
    haptics.selection();
    // CL-6.3: the weight step honours the exercise's own increment
    // (exercise.incrementKg, e.g. 1.0 for dumbbell moves, 2.5 barbell
    // default). Gym weights are kg-only.
    const steps = { weight: Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5, reps: 1 };
    // Reps cap matches the TextInput's [1, 200] so a typed 150 doesn't
    // snap back to 100 when the user taps -.
    const limits = { weight: [0, 500], reps: [1, 200] };
    const fieldLimits = limits[field] || [0, 9999];
    // Coerce in case a previous code path wrote a string like '' or '.'
    // arithmetic on those produces NaN and the next clamp wedges at the
    // lower bound forever.
    const raw = v[field];
    const current = typeof raw === 'number' ? raw : (parseDecimalInput(raw) || 0);
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
  // plus/minus 15 pattern): hold to keep adjusting at 200ms, cleared on release and
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
  useEffect(() => () => { stopRepeat(); clearIdle(); }, []);


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

  // Phase 2B (founder ruling, screenshot failure 7): the live estimated-max
  // caption under the reps row is REMOVED - that routine copy repeated on
  // every surface and read as noise. The RECORD system is untouched:
  // recordLine.isRecord still renders the gold record flag below, and PR
  // detection/celebration live in the orchestrator.

  // Shared stepper groups so the compact and full layouts render the SAME
  // input elements (identity, testIDs, focus refs) - only placement differs.
  const weightStepper = (
        <View style={[styles.stepper, live.stepper]}>
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('weight', -1)}
            onLongPress={() => startRepeat('weight', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Decrease weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="remove" size={20} color={t.colors.primary} />
          </TouchableOpacity>
          <TextInput
            testID="volyume-weight-input"
            style={[styles.valueInput, live.valueInput, isGhost && [styles.valueInputGhost, live.valueInputGhost]]}
            // Render 0 as "0" not "" (was `String(weight || '')`, which hid
            // a legitimate zero-weight bodyweight set).
            value={weight == null || weight === '' ? '' : String(weight)}
            onChangeText={v => {
              bumpIdle();
              // Preserve in-progress decimal entry. The previous code did
              //   const n = parseFloat(v); setField('weight', n)
              // which stripped the trailing dot, typing "21." stored 21,
              // re-rendered "21", and the decimal separator was lost so
              // values like 21.25 kg (fractional plates) couldn't be typed.
              // Accept up to 3 integer digits and up to 2 decimals, max 500.
              if (v === '' || /^\d{0,3}\.?\d{0,2}$/.test(v)) {
                const n = parseDecimalInput(v);
                if (!isNaN(n) && n > 500) return; // refuse over-cap
                setField('weight', v); // keep raw string; parseFloat on read
              }
            }}
            onFocus={bumpIdle}
            onBlur={clearIdle}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => repsRef.current?.focus()}
            selectTextOnFocus
            accessibilityLabel={`Weight in ${units}`}
            {...numericAccessory}
          />
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('weight', 1)}
            onLongPress={() => startRepeat('weight', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Increase weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="add" size={20} color={t.colors.primary} />
          </TouchableOpacity>
        </View>
  );
  const repsStepper = (
        <View style={[styles.stepper, live.stepper]}>
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('reps', -1)}
            onLongPress={() => startRepeat('reps', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease reps by 1"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="remove" size={20} color={t.colors.primary} />
          </TouchableOpacity>
          <TextInput
            testID="volyume-reps-input"
            ref={repsRef}
            style={[styles.valueInput, live.valueInput, isGhost && [styles.valueInputGhost, live.valueInputGhost]]}
            value={reps == null || reps === '' ? '' : String(reps)}
            onChangeText={v => {
              bumpIdle();
              const n = parseInt(v, 10);
              if (!isNaN(n)) setField('reps', Math.min(Math.max(n, 1), 200));
              else if (v === '') setField('reps', '');
            }}
            onFocus={bumpIdle}
            onBlur={clearIdle}
            keyboardType="number-pad"
            returnKeyType="done"
            // Keyboard-completes-the-set (ULTIMATE-WR-1): reps is the last field,
            // so its Done key logs the set directly. Falls back to dismissing the
            // keyboard when no handler is supplied, so other call sites are
            // unaffected.
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Number of reps"
            {...numericAccessory}
          />
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('reps', 1)}
            onLongPress={() => startRepeat('reps', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase reps by 1"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="add" size={20} color={t.colors.primary} />
          </TouchableOpacity>
        </View>
  );

  return (
    <View style={styles.container}>
      {/* Weight Row, rendered for weight_reps and weighted_bodyweight only.
          This branch is BYTE-IDENTICAL to the original single-schema layout. */}
      {showWeightReps && !compact && (
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={[styles.fieldLabel, live.fieldLabel]}>{weightFieldLabel}</Text>
        </View>
        {weightStepper}
      </View>
      )}
      {(showWeightReps || exerciseType === 'reps_only') && compact && (
      <View style={styles.compactRow}>
        {showWeightReps && (
          <View style={styles.compactCol}>
            <Text style={[styles.fieldLabel, live.fieldLabel]}>{weightFieldLabel}</Text>
            {weightStepper}
          </View>
        )}
        <View style={styles.compactCol}>
          <Text style={[styles.fieldLabel, live.fieldLabel]}>Reps</Text>
          {repsStepper}
        </View>
      </View>
      )}

      {/* Duration, a mm:ss time field. Total seconds are stored in value.reps
          (reused as the seconds field), so the screen's existing reps->actual_reps
          write path persists the metric with no new set column. */}
      {exerciseType === 'duration' && (
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={[styles.fieldLabel, live.fieldLabel]}>Time (mm:ss)</Text>
        </View>
        <View style={[styles.stepper, live.stepper]}>
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjustSeconds(-5)}
            onLongPress={() => startSecondsRepeat(-5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="remove" size={20} color={t.colors.primary} />
          </TouchableOpacity>
          <TextInput
            testID="volyume-duration-input"
            style={[styles.valueInput, live.valueInput, isGhost && [styles.valueInputGhost, live.valueInputGhost]]}
            value={reps == null || reps === '' ? '' : formatSeconds(reps)}
            onChangeText={v => setField('reps', parseTimeToSeconds(v))}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Time in minutes and seconds"
          />
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjustSeconds(5)}
            onLongPress={() => startSecondsRepeat(5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="add" size={20} color={t.colors.primary} />
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
          <Text style={[styles.fieldLabel, live.fieldLabel]}>Distance ({units === 'kg' ? 'm' : 'yd'})</Text>
        </View>
        <View style={[styles.stepper, live.stepper]}>
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('weight', -1)}
            onLongPress={() => startRepeat('weight', -1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease distance"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="remove" size={20} color={t.colors.primary} />
          </TouchableOpacity>
          <TextInput
            testID="volyume-distance-input"
            style={[styles.valueInput, live.valueInput, isGhost && [styles.valueInputGhost, live.valueInputGhost]]}
            value={weight == null || weight === '' ? '' : String(weight)}
            onChangeText={v => {
              bumpIdle();
              if (v === '' || /^\d{0,5}\.?\d{0,2}$/.test(v)) setField('weight', v);
            }}
            onFocus={bumpIdle}
            onBlur={clearIdle}
            keyboardType="decimal-pad"
            returnKeyType="next"
            selectTextOnFocus
            accessibilityLabel="Distance"
            {...numericAccessory}
          />
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjust('weight', 1)}
            onLongPress={() => startRepeat('weight', 1)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase distance"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="add" size={20} color={t.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={[styles.fieldLabel, live.fieldLabel]}>Time (mm:ss)</Text>
        </View>
        <View style={[styles.stepper, live.stepper]}>
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjustSeconds(-5)}
            onLongPress={() => startSecondsRepeat(-5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Decrease time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="remove" size={20} color={t.colors.primary} />
          </TouchableOpacity>
          <TextInput
            testID="volyume-distance-time-input"
            style={[styles.valueInput, live.valueInput, isGhost && [styles.valueInputGhost, live.valueInputGhost]]}
            value={reps == null || reps === '' ? '' : formatSeconds(reps)}
            onChangeText={v => setField('reps', parseTimeToSeconds(v))}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={() => (onSubmitComplete ? onSubmitComplete() : Keyboard.dismiss())}
            selectTextOnFocus
            accessibilityLabel="Time in minutes and seconds"
          />
          <TouchableOpacity
            style={[styles.stepBtn, live.stepBtn]}
            onPress={() => adjustSeconds(5)}
            onLongPress={() => startSecondsRepeat(5)}
            onPressOut={stopRepeat}
            delayLongPress={300}
            hitSlop={STEPPER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Increase time"
            accessibilityHint="Hold to keep adjusting"
          >
            <Ionicons name="add" size={20} color={t.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      </>
      )}

      {/* Reps, rendered for weight_reps, weighted_bodyweight and reps_only.
          reps_only hides only the Weight Row above; the reps field itself is
          unchanged. */}
      {(showWeightReps || exerciseType === 'reps_only') && !compact && (
      <View style={styles.repsBlock}>
      <View style={styles.inputRow}>
        <View style={styles.fieldLabelWrap}>
          <Text style={[styles.fieldLabel, live.fieldLabel]}>Reps</Text>
        </View>
        {repsStepper}
      </View>
      </View>
      )}

      {/* D87: the record flag. Exists ONLY while what is dialled in would
          break a record, so the card stays exactly as it is on an ordinary
          set. Gold, not the primary amber: the Log set fill keeps the
          one-amber rule. buildRecordLine reuses detectPR, so this can never
          claim a record the celebration then withholds. */}
      {recordLine?.isRecord ? (
        <View
          style={[styles.recordRow, live.recordRow]}
          accessible
          accessibilityLabel={recordLine.a11y}
        >
          <Ionicons name="trophy" size={15} color={t.colors.gold} />
          <View style={styles.recordCopy}>
            <Text style={[styles.recordHeadline, live.recordHeadline]}>{recordLine.headline}</Text>
            {recordLine.reasons.length > 0 ? (
              <Text style={[styles.recordWhy, live.recordWhy]}>{recordLine.reasons.join(' · ')}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Effort picker removed, was rarely used in practice. RIR still
          gets recorded internally (defaulted in DEFAULT_SET) so the
          autoregulation engine keeps working; we just don't ask the
          user to set it per-set. */}

      {/* Set-type row removed (COMP-001): the card header's orientation
          row in ActiveWorkoutScreen is now the set-type picker's entry
          point. */}

      {/* Done bar over the numeric keypad (iOS only; InputAccessoryView is a
          no-op on Android). Gives the decimal-pad/number-pad fields a
          one-tap dismiss the OS keyboards do not provide. */}
      {isIOS && (
        <InputAccessoryView nativeID={accessoryID}>
          <View style={[styles.keyboardDoneBar, live.keyboardDoneBar]}>
            <TouchableOpacity
              onPress={() => { haptics.selection(); Keyboard.dismiss(); }}
              style={styles.keyboardDoneBtn}
              accessibilityRole="button"
              accessibilityLabel="Done, close keyboard"
            >
              <Text style={[styles.keyboardDoneText, live.keyboardDoneText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
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
    ...type.label,
    color: colors.textSecondary,
  },
  fieldLabelWrap: {
    minWidth: workoutLoggerSize.setEntryLabelWidth,
    flexBasis: workoutLoggerSize.setEntryLabelWidth,
    maxWidth: 100,
    flexShrink: 0,
    gap: 1,
  },
  // Phase 2B: the reps block survives (the record flag renders inside it
  // when a genuine record is dialled in); the R2-4 est-max caption styles
  // went with the removed routine copy.
  repsBlock: { gap: spacing.sm },
  // Phase 2B density pass: the compact side-by-side arrangement.
  compactRow: { flexDirection: 'row', gap: spacing.sm },
  compactCol: { flex: 1, gap: spacing.xxs },
  perSideHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  // D87 record flag. Gold tint, never the primary amber: the Log set fill is
  // the screen's one amber (one-amber rule), and gold is already the app's
  // record colour (PRCelebration trophy).
  recordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: withAlpha(colors.gold, alpha.soft),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recordCopy: { flex: 1, gap: 1 },
  recordHeadline: { ...type.label, color: colors.gold },
  recordWhy: { ...type.caption, color: colors.textSecondary },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface2,
  },
  valueInput: {
    flex: 1,
    textAlign: 'center',
    ...type.num('bodyStrong'),
    color: colors.textPrimary,
    paddingVertical: 0,
    minHeight: workoutLoggerSize.setEntryStepperButton,
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
    height: touchTarget.minimum,
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
    ...type.label,
    color: colors.textSecondary,
  },
  rirBtnTextActive: {
    color: colors.primary,
  },
  // Numeric-keypad Done bar (iOS InputAccessoryView). Colours come from `live`.
  keyboardDoneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  keyboardDoneBtn: {
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardDoneText: {
    ...type.bodyStrong,
    color: colors.primary,
  },
});
