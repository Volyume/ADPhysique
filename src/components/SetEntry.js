import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import InfoTooltip from './InfoTooltip';
import { calculate1RM } from '../lib/algorithms';

const SET_TYPE_LABELS = {
  straight: 'Working',
  warmup: 'Warm-up',
  dropset: 'Working',
  superset: 'Working',
  myo_reps: 'Working',
  rest_pause: 'Working',
  amrap: 'Working',
};

export default function SetEntry({ value, onChange, units = 'kg', onOpenSetTypePicker, isWarmup = false }) {
  const { weight, reps, setType, isGhost } = value;
  const repsRef = useRef(null);

  function adjust(field, delta) {
    Haptics.selectionAsync().catch(() => {});
    const steps = { weight: 2.5, reps: 1 };
    // Reps cap matches the TextInput's [1, 200] so a typed 150 doesn't
    // snap back to 100 when the user taps −.
    const limits = { weight: [0, 500], reps: [1, 200] };
    const fieldLimits = limits[field] || [0, 9999];
    // Coerce in case a previous code path wrote a string like '' or '.' —
    // arithmetic on those produces NaN and the next clamp wedges at the
    // lower bound forever.
    const raw = value[field];
    const current = typeof raw === 'number' ? raw : (parseFloat(raw) || 0);
    const next = Math.min(Math.max(current + delta * (steps[field] || 1), fieldLimits[0]), fieldLimits[1]);
    onChange({ ...value, [field]: field === 'weight' ? Math.round(next * 100) / 100 : Math.round(next), isGhost: false });
  }

  function setField(field, val) {
    onChange({ ...value, [field]: val, isGhost: false });
  }

  const setTypeLabel = SET_TYPE_LABELS[setType] || 'Working';

  const liveWeight = parseFloat(value.weight);
  const liveReps = parseInt(value.actualReps || value.reps, 10);
  const live1RM = (liveWeight > 0 && liveReps > 0 && !isWarmup)
    ? calculate1RM(liveWeight, liveReps)
    : null;

  return (
    <View style={styles.container}>
      {/* Weight Row */}
      <View style={styles.inputRow}>
        <Text style={styles.fieldLabel}>Weight ({units})</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('weight', -1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease weight"
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-weight-input"
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            // Render 0 as "0" not "" (was `String(weight || '')`, which hid
            // a legitimate zero-weight bodyweight set).
            value={weight == null || weight === '' ? '' : String(weight)}
            onChangeText={v => {
              // Preserve in-progress decimal entry. The previous code did
              //   const n = parseFloat(v); setField('weight', n)
              // which stripped the trailing dot — typing "21." stored 21,
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
            accessibilityRole="button"
            accessibilityLabel="Increase weight"
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reps Row */}
      <View style={styles.inputRow}>
        <Text style={styles.fieldLabel}>Reps</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('reps', -1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease reps"
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            testID="volyume-reps-input"
            ref={repsRef}
            style={[styles.valueInput, isGhost && styles.valueInputGhost]}
            value={reps == null || reps === '' ? '' : String(reps)}
            onChangeText={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) setField('reps', Math.min(Math.max(n, 1), 200));
              else if (v === '') setField('reps', '');
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            selectTextOnFocus
            accessibilityLabel="Number of reps"
          />
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjust('reps', 1)}
            accessibilityRole="button"
            accessibilityLabel="Increase reps"
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live estimated 1RM chip — shown when weight and reps are present, not a warm-up */}
      {live1RM > 0 && liveReps >= 1 && liveReps <= 15 && !isWarmup && (
        <View
          style={styles.oneRmChip}
          accessible
          accessibilityLabel={`Estimated one rep max ${Math.round(live1RM)} ${units}`}
        >
          <Ionicons name="trending-up-outline" size={12} color={colors.textMuted} />
          <Text style={styles.oneRmChipText}>
            Est. max ≈ {Math.round(live1RM)}{units}
          </Text>
        </View>
      )}

      {/* Effort picker removed — was rarely used in practice. RIR still
          gets recorded internally (defaulted in DEFAULT_SET) so the
          autoregulation engine keeps working; we just don't ask the
          user to set it per-set. */}

      {/* Set Type — compact inline row */}
      <TouchableOpacity
        testID="volyume-set-type-btn"
        style={styles.setTypeRow}
        onPress={onOpenSetTypePicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Set type: ${setTypeLabel}, tap to change`}
      >
        <Text style={styles.setTypeLabel}>Set type</Text>
        <View style={styles.setTypeRight}>
          <Text style={styles.setTypeValue}>{setTypeLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} style={{ marginLeft: 2 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fieldLabelRow: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  stepBtnText: {
    fontSize: fontSize.xxl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  valueInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
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
  setTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setTypeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  setTypeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setTypeValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  oneRmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  oneRmChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
});
