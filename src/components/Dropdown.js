import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';

// Inline dropdown, expands in place, no modal needed. Shared by the Pro
// onboarding wizard and the change-goal screen so both training-setup flows
// pick experience, equipment, focus and recovery the same way.
//
// options: [{ value, label, sub? }]. onChange receives the chosen value.
export default function Dropdown({ label, hint, value, options, onChange, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.dropdownWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TouchableOpacity
        style={[styles.dropdownTrigger, value && styles.dropdownTriggerFilled, open && styles.dropdownTriggerOpen]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={value ? colors.primary : colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                value === opt.value && styles.dropdownItemActive,
                i < options.length - 1 && styles.dropdownItemBorder,
              ]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: value === opt.value }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownItemLabel, value === opt.value && styles.dropdownItemLabelActive]}>
                  {opt.label}
                </Text>
                {opt.sub ? <Text style={styles.dropdownItemSub}>{opt.sub}</Text> : null}
              </View>
              {value === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownWrap: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
  },
  dropdownTriggerFilled: { borderColor: withAlpha(colors.primary, 0.376) },
  dropdownTriggerOpen: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownValue: { fontSize: fontSize.md, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  dropdownPlaceholder: { color: colors.textDisabled },
  dropdownList: {
    backgroundColor: colors.surface, borderWidth: 1.5,
    borderColor: colors.primary, borderTopWidth: 0,
    borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.primaryBg },
  dropdownItemLabel: { ...type.body, color: colors.textSecondary, marginBottom: 1 },
  dropdownItemLabelActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  dropdownItemSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
});
