import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];
const RPE_OPTIONS = [6, 7, 8, 9, 10];

const SET_TYPE_LABELS = {
  straight: 'Straight set',
  warmup: 'Warm-up',
  dropset: 'Drop set',
  superset: 'Superset',
  myo_reps: 'Myo-reps',
  rest_pause: 'Rest-pause',
  amrap: 'AMRAP',
};

export default function SetEntry({ value, onChange, units = 'kg', onOpenSetTypePicker }) {
  const { weight, reps, rir, rpe, setType } = value;

  function adjust(field, delta) {
    Haptics.selectionAsync();
    const steps = { weight: 2.5, reps: 1, rir: 1, rpe: 1 };
    const limits = {
      weight: [0, 500],
      reps: [1, 100],
      rir: [0, 5],
      rpe: [6, 10],
    };
    const current = value[field] || 0;
    const next = Math.min(Math.max(current + delta * (steps[field] || 1), limits[field][0]), limits[field][1]);
    onChange({ ...value, [field]: field === 'weight' ? Math.round(next * 100) / 100 : Math.round(next) });
  }

  function setField(field, val) {
    onChange({ ...value, [field]: val });
  }

  const setTypeLabel = SET_TYPE_LABELS[setType] || 'Straight set';

  return (
    <View style={styles.container}>
      {/* Weight Row */}
      <View style={styles.inputRow}>
        <Text style={styles.fieldLabel}>Weight ({units})</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjust('weight', -1)}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.valueInput}
            value={String(weight || '')}
            onChangeText={v => {
              const n = parseFloat(v);
              if (!isNaN(n)) setField('weight', n);
              else if (v === '' || v === '.') setField('weight', v);
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjust('weight', 1)}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reps Row */}
      <View style={styles.inputRow}>
        <Text style={styles.fieldLabel}>Reps</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjust('reps', -1)}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.valueInput}
            value={String(reps || '')}
            onChangeText={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) setField('reps', n);
              else if (v === '') setField('reps', '');
            }}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjust('reps', 1)}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RIR + RPE Row */}
      <View style={styles.dualRow}>
        <View style={styles.pickerGroup}>
          <Text style={styles.fieldLabel}>RIR</Text>
          <View style={styles.chipRow}>
            {RIR_OPTIONS.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, rir === v && styles.chipActive]}
                onPress={() => { Haptics.selectionAsync(); setField('rir', v); }}
              >
                <Text style={[styles.chipText, rir === v && styles.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.pickerGroup}>
          <Text style={styles.fieldLabel}>RPE</Text>
          <View style={styles.chipRow}>
            {RPE_OPTIONS.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, rpe === v && styles.chipActive]}
                onPress={() => { Haptics.selectionAsync(); setField('rpe', v); }}
              >
                <Text style={[styles.chipText, rpe === v && styles.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Set Type — compact inline row */}
      <TouchableOpacity style={styles.setTypeRow} onPress={onOpenSetTypePicker} activeOpacity={0.7}>
        <Text style={styles.setTypeLabel}>Set type</Text>
        <View style={styles.setTypeRight}>
          <Text style={styles.setTypeValue}>{setTypeLabel}</Text>
          <Text style={styles.setTypeChange}> · Change</Text>
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
  fieldLabel: {
    width: 90,
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
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  dualRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pickerGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
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
  setTypeChange: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
