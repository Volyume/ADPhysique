import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import InfoTooltip from './InfoTooltip';

const SET_TYPE_LABELS = {
  straight: 'Working',
  warmup: 'Warm-up',
  dropset: 'Drop Set',
  superset: 'Working',
  myo_reps: 'Working',
  rest_pause: 'Working',
  amrap: 'Working',
};

export default function SetEntry({ value, onChange, units = 'kg', onOpenSetTypePicker, isWarmup = false }) {
  const { weight, reps, setType } = value;
  const repsRef = useRef(null);

  // Warm-up sets don't need input — values are pre-filled and logged as-is
  if (isWarmup) return null;

  function adjust(field, delta) {
    Haptics.selectionAsync();
    const steps = { weight: 2.5, reps: 1 };
    const limits = { weight: [0, 500], reps: [1, 100] };
    const fieldLimits = limits[field] || [0, 9999];
    const current = value[field] || 0;
    const next = Math.min(Math.max(current + delta * (steps[field] || 1), fieldLimits[0]), fieldLimits[1]);
    onChange({ ...value, [field]: field === 'weight' ? Math.round(next * 100) / 100 : Math.round(next) });
  }

  function setField(field, val) {
    onChange({ ...value, [field]: val });
  }

  const setTypeLabel = SET_TYPE_LABELS[setType] || 'Working';

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
            style={styles.valueInput}
            value={String(weight || '')}
            onChangeText={v => {
              const n = parseFloat(v);
              if (!isNaN(n)) setField('weight', n);
              else if (v === '' || v === '.') setField('weight', v);
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
            style={styles.valueInput}
            value={String(reps || '')}
            onChangeText={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) setField('reps', n);
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

      {/* Effort Row — hidden for warm-up sets */}
      {!isWarmup && (
        <View style={styles.inputRow}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Effort</Text>
            <InfoTooltip size={12} text={
              'How hard did that set feel? Rate from 1 (easy) to 5 (all out).\n\n' +
              '1: Easy, plenty left in the tank\n' +
              '2: Moderate, could have done more\n' +
              '3: Hard, a couple of reps left\n' +
              '4: Very hard, barely one more\n' +
              '5: All out, nothing left\n\n' +
              'Aim for a 2 or 3 early in your training block. Push to 4–5 near the end. ' +
              'Volyume uses this to track intensity and suggest your next session targets.'
            } />
          </View>
          <View style={styles.rirRow}>
            {[null, 1, 2, 3, 4, 5].map(v => {
              const isActive = v === null ? value.rir === null : value.rir === (5 - v);
              return (
                <TouchableOpacity
                  key={String(v)}
                  style={[styles.rirBtn, isActive && styles.rirBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onChange({ ...value, rir: v === null ? null : 5 - v });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={v === null ? 'Effort not set' : v === 5 ? 'Maximum effort, all out' : `Effort level ${v} out of 5`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.rirBtnText, isActive && styles.rirBtnTextActive]}>
                    {v === null ? '—' : v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

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
});
