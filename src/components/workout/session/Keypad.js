/**
 * Keypad
 *
 * The docked number pad that replaces the steppers and the system keyboard for
 * the active row and for editing a logged row (12-BUILD-SPEC sections 1.5, 2
 * and 3, register D220). It is stateless: it draws the keys and reports presses;
 * the screen writes the value through its own handler, so the ghost seed and the
 * typed-entry provenance keep their meaning there.
 *
 * Props
 *   field             'weight' | 'reps': which field is being edited
 *   value             that field's current value (string or number), used to
 *                     grey the point key once it holds one, and Clear and
 *                     backspace while it is empty
 *   step              the step size, shown on the step keys ("-2.5", "+2.5")
 *   unit              the weight unit, e.g. "kg": the first tab and the words in
 *                     the step key labels
 *   onKey             called with '0' to '9', '.' (weight only) or 'backspace'
 *                     (the exported KEY_BACKSPACE)
 *   onStep            called with the signed step: -step or +step
 *   onClear           called with no arguments
 *   onNext            weight field only: the middle key of the bottom row reads
 *                     "Next" and calls this (moves to reps)
 *   onDone            reps field only: the same key reads "Done" and calls this
 *   onSystemKeyboard  the keyboard toggle at the top left
 *   safeBottom        optional bottom inset in dp (default 0), added under the
 *                     keys the way the old bottom bar did, so the pad clears the
 *                     gesture bar
 *
 * The drawing has one key for Next, and the device checklist reads "Next moves
 * to reps; Done closes", so the one key is Next on weight and Done on reps.
 * The tabs show which field is being edited; the spec gives them no callback, so
 * they are not controls. The keyboard glyph is Ionicons' keypad glyph: Ionicons
 * has no keyboard glyph.
 *
 * TalkBack: every key on the pad has role keyboardkey with a spoken label
 * ("Add 2.5 kilograms", "Remove 2.5 kilograms", "Delete"); Clear and the
 * keyboard toggle are buttons.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { radius, spacing } from '../../../styles/theme';

export const KEY_BACKSPACE = 'backspace';
export const KEY_POINT = '.';

// Spec section 2: keys 52 dp; the top row is the drawing's 44 dp with 44 by 40
// wells for the toggle and Clear (taken to 48 dp by their slop).
const KEY_HEIGHT = 52;
const TOP_ROW_MIN_HEIGHT = 44;
const TOGGLE_WIDTH = 44;
const WELL_HEIGHT = 40;
const WELL_HIT_SLOP = { top: 4, bottom: 4, left: 2, right: 2 };
const KEY_GLYPH = 22;
const MINUS = '\u2212';
const KEY_ROLE = 'keyboardkey';
const DIGIT_ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

function spokenUnit(unit) {
  if (unit === 'kg') return 'kilograms';
  if (unit === 'lb' || unit === 'lbs') return 'pounds';
  return unit;
}

function repWord(count) {
  return Number(count) === 1 ? 'rep' : 'reps';
}

function KeyButton({ text, icon, accessibilityLabel, accessibilityHint, onPress, disabled = false, textStyle, glyphColor, live }) {
  return (
    <TouchableOpacity
      style={[styles.key, live.key, disabled && styles.keyDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={KEY_ROLE}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {icon ? (
        <Ionicons name={icon} size={KEY_GLYPH} color={glyphColor} />
      ) : (
        <Text style={textStyle} numberOfLines={1}>{text}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function Keypad({
  field,
  value,
  step,
  unit = 'kg',
  onKey,
  onStep,
  onClear,
  onNext,
  onDone,
  onSystemKeyboard,
  safeBottom = 0,
}) {
  const t = useTheme();
  const live = useMemo(() => {
    const c = t.colors;
    return {
      panel: { backgroundColor: c.surface, borderTopColor: c.borderSubtle },
      well: { backgroundColor: c.background, borderColor: c.borderSubtle },
      key: { backgroundColor: c.background, borderColor: c.borderSubtle },
      digit: { ...t.type.w(t.type.num('h3'), 'semibold'), color: c.textPrimary },
      stepText: { ...t.type.w(t.type.num('bodyStrong'), 'semibold'), color: c.primary },
      actionText: { ...t.type.w(t.type.bodyStrong, 'semibold'), color: c.textPrimary },
      tabActive: { ...t.type.bodyStrong, color: c.textPrimary },
      tabIdle: { ...t.type.bodyStrong, color: c.textMuted },
      clearText: { ...t.type.w(t.type.label, 'semibold'), color: c.textPrimary },
    };
  }, [t]);

  const isWeight = field === 'weight';
  const valueText = value == null ? '' : String(value);
  const isEmpty = valueText.length === 0;
  const hasPoint = valueText.includes('.');
  const stepText = String(step);
  const quantity = isWeight ? spokenUnit(unit) : repWord(step);
  const editing = isWeight ? 'weight' : 'reps';
  const spokenValue = isEmpty
    ? 'empty'
    : isWeight ? `${valueText} ${spokenUnit(unit)}` : `${valueText} ${repWord(valueText)}`;

  const stepDown = () => onStep && onStep(-step);
  const stepUp = () => onStep && onStep(step);

  return (
    <View style={[styles.panel, live.panel, { paddingBottom: Math.max(spacing.md, safeBottom + spacing.sm) }]}>
      <View style={styles.top}>
        <TouchableOpacity
          style={[styles.toggle, live.well]}
          onPress={onSystemKeyboard}
          hitSlop={WELL_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Use the phone keyboard"
          accessibilityHint="Opens your phone's own keyboard to type the number"
        >
          <Ionicons name="keypad-outline" size={KEY_GLYPH} color={t.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.tabs} accessible accessibilityLabel={`Editing ${editing}, ${spokenValue}`}>
          <Text style={isWeight ? live.tabActive : live.tabIdle}>{unit}</Text>
          <Text style={isWeight ? live.tabIdle : live.tabActive}>Reps</Text>
        </View>
        <TouchableOpacity
          style={[styles.clear, live.well, isEmpty && styles.keyDisabled]}
          onPress={onClear}
          disabled={isEmpty}
          hitSlop={WELL_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Clear"
          accessibilityState={{ disabled: isEmpty }}
        >
          <Text style={live.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {DIGIT_ROWS.map((digits) => (
          <View key={digits[0]} style={styles.keyRow}>
            {digits.map((d) => (
              <KeyButton
                key={d}
                text={d}
                accessibilityLabel={d}
                onPress={() => onKey && onKey(d)}
                textStyle={live.digit}
                live={live}
              />
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          <KeyButton
            text={`${MINUS}${stepText}`}
            accessibilityLabel={`Remove ${stepText} ${quantity}`}
            onPress={stepDown}
            textStyle={live.stepText}
            live={live}
          />
          <KeyButton
            text="0"
            accessibilityLabel="0"
            onPress={() => onKey && onKey('0')}
            textStyle={live.digit}
            live={live}
          />
          <KeyButton
            text={`+${stepText}`}
            accessibilityLabel={`Add ${stepText} ${quantity}`}
            onPress={stepUp}
            textStyle={live.stepText}
            live={live}
          />
        </View>
        <View style={styles.keyRow}>
          {isWeight ? (
            <KeyButton
              text={KEY_POINT}
              accessibilityLabel="Decimal point"
              onPress={() => onKey && onKey(KEY_POINT)}
              disabled={hasPoint}
              textStyle={live.digit}
              live={live}
            />
          ) : (
            <View style={styles.keyGap} importantForAccessibility="no-hide-descendants" />
          )}
          <KeyButton
            text={isWeight ? 'Next' : 'Done'}
            accessibilityLabel={isWeight ? 'Next' : 'Done'}
            accessibilityHint={isWeight ? 'Moves to reps' : 'Closes the keypad'}
            onPress={isWeight ? onNext : onDone}
            textStyle={live.actionText}
            live={live}
          />
          <KeyButton
            icon="backspace-outline"
            accessibilityLabel="Delete"
            onPress={() => onKey && onKey(KEY_BACKSPACE)}
            disabled={isEmpty}
            glyphColor={t.colors.textPrimary}
            live={live}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
  },
  top: {
    minHeight: TOP_ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggle: {
    width: TOGGLE_WIDTH,
    height: WELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  clear: {
    minHeight: WELL_HEIGHT,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  grid: { gap: spacing.sm, marginTop: spacing.sm },
  keyRow: { flexDirection: 'row', gap: spacing.sm },
  key: {
    flex: 1,
    height: KEY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  keyGap: { flex: 1, height: KEY_HEIGHT },
  keyDisabled: { opacity: 0.5 },
});
